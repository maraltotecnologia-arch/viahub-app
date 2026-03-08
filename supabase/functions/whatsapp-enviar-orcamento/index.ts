import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function formatarTelefone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 13) return null;

  let tel = digits.startsWith("55") ? digits : `55${digits}`;

  if (tel.length === 12) {
    const ddd = tel.slice(2, 4);
    const numero = tel.slice(4);
    if (!numero.startsWith("9")) {
      tel = `55${ddd}9${numero}`;
    }
  }

  return tel;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL")?.replace(/\/+$/, "") || "";
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      console.error("[whatsapp-enviar] Variáveis EVOLUTION não configuradas");
      return new Response(
        JSON.stringify({ error: "Configuração do servidor incompleta", code: "SYS001" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      SUPABASE_URL,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado", code: "AUTH009" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) {
      return new Response(
        JSON.stringify({ error: "Não autorizado", code: "AUTH009" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { orcamento_id, agencia_id, telefone_destino, pdf_base64, link_orcamento, nome_agente } = await req.json();

    // Validate phone
    const telFormatado = formatarTelefone(telefone_destino || "");
    if (!telFormatado) {
      return new Response(
        JSON.stringify({ error: "Número de telefone inválido", code: "WPP004" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[whatsapp-enviar] Telefone formatado:", telFormatado);

    // Check instance
    const { data: instancia } = await supabaseAdmin
      .from("whatsapp_instancias")
      .select("instance_name, status")
      .eq("agencia_id", agencia_id)
      .maybeSingle();

    if (!instancia) {
      return new Response(
        JSON.stringify({ error: "WhatsApp não conectado", code: "WPP001" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify real connection state before sending
    let isConnected = instancia.status === "open" || instancia.status === "connected";

    if (!isConnected) {
      try {
        const stateRes = await fetch(
          `${EVOLUTION_API_URL}/instance/connectionState/${instancia.instance_name}`,
          { headers: { apikey: EVOLUTION_API_KEY } }
        );
        if (stateRes.ok) {
          const stateData = await stateRes.json();
          const state = stateData?.instance?.state || stateData?.state || "close";
          isConnected = state === "open";
          if (isConnected) {
            await supabaseAdmin
              .from("whatsapp_instancias")
              .update({ status: "open" })
              .eq("agencia_id", agencia_id);
          }
        }
      } catch (e) {
        console.warn("[whatsapp-enviar] Erro ao verificar estado:", (e as Error).message);
      }
    }

    if (!isConnected) {
      await supabaseAdmin
        .from("whatsapp_instancias")
        .update({ status: "disconnected" })
        .eq("agencia_id", agencia_id);
      return new Response(
        JSON.stringify({ error: "WhatsApp não conectado", code: "WPP001" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch quote data
    const { data: orcData } = await supabaseAdmin
      .from("orcamentos")
      .select("numero_orcamento, valor_final, cliente_id, agencia_id, status, titulo")
      .eq("id", orcamento_id)
      .single();

    let clienteNome = "Cliente";
    if (orcData?.cliente_id) {
      const { data: cli } = await supabaseAdmin
        .from("clientes")
        .select("nome")
        .eq("id", orcData.cliente_id)
        .single();
      clienteNome = cli?.nome || "Cliente";
    }

    const { data: agenciaData } = await supabaseAdmin
      .from("agencias")
      .select("nome_fantasia, whatsapp_mensagem_orcamento")
      .eq("id", agencia_id)
      .single();

    const agenciaNome = agenciaData?.nome_fantasia || "";
    const templateMsg =
      agenciaData?.whatsapp_mensagem_orcamento ||
      "Olá, {nome_cliente} 😀\n\nO seu orçamento referente a {titulo_orcamento} está pronto. Confira todas os valores e condições abaixo.\n\nAcessando o link, você consegue aprovar o orçamento ou falar novamente com o seu agente. ⬇️\n\n{link_orcamento}\n\nCaso não consiga acessar o link, o anexo em PDF contém todas as informações para você.\n\nQualquer dúvida ficamos à disposição. 🫱🏼‍🫲🏼\nAtenciosamente, {nome_agente}\n{nome_agencia}";

    const mensagem = templateMsg
      .replace(/\{nome_cliente\}/g, clienteNome)
      .replace(/\{numero_orcamento\}/g, orcData?.numero_orcamento || "")
      .replace(/\{titulo_orcamento\}/g, orcData?.titulo || "sua viagem")
      .replace(/\{link_orcamento\}/g, link_orcamento || "")
      .replace(/\{nome_agente\}/g, nome_agente || "nossa equipe")
      .replace(/\{nome_agencia\}/g, agenciaNome);

    console.log("[whatsapp-enviar] Enviando texto para:", telFormatado);

    // Send text message
    const sendRes = await fetch(
      `${EVOLUTION_API_URL}/message/sendText/${instancia.instance_name}`,
      {
        method: "POST",
        headers: {
          apikey: EVOLUTION_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ number: telFormatado, text: mensagem }),
      }
    );

    if (!sendRes.ok) {
      const errBody = await sendRes.text();
      console.error("[whatsapp-enviar] Erro ao enviar texto:", sendRes.status, errBody);

      await supabaseAdmin
        .from("whatsapp_instancias")
        .update({ status: "disconnected" })
        .eq("agencia_id", agencia_id);

      return new Response(
        JSON.stringify({
          error: "Conexão com WhatsApp perdida. Reconecte em Configurações → WhatsApp.",
          code: "WPP001",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await sendRes.json();
    console.log("[whatsapp-enviar] Texto enviado com sucesso");

    // Send PDF if provided by frontend
    let pdfFailed = false;
    if (pdf_base64) {
      try {
        console.log("[whatsapp-enviar] Enviando PDF via base64, tamanho:", pdf_base64.length);
        const mediaRes = await fetch(
          `${EVOLUTION_API_URL}/message/sendMedia/${instancia.instance_name}`,
          {
            method: "POST",
            headers: {
              apikey: EVOLUTION_API_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              number: telFormatado,
              mediatype: "document",
              mimetype: "application/pdf",
              caption: `📄 Orçamento ${orcData?.numero_orcamento || ""}`,
              media: pdf_base64,
              fileName: `orcamento_${orcData?.numero_orcamento || "sem-numero"}.pdf`,
            }),
          }
        );

        if (!mediaRes.ok) {
          const mediaErr = await mediaRes.text();
          console.error("[whatsapp-enviar] Erro Evolution sendMedia:", mediaRes.status, mediaErr);
          pdfFailed = true;
        } else {
          console.log("[whatsapp-enviar] PDF enviado com sucesso");
        }
      } catch (e) {
        console.warn("[whatsapp-enviar] Erro ao enviar PDF:", (e as Error).message);
        pdfFailed = true;
      }
    } else {
      console.warn("[whatsapp-enviar] pdf_base64 não fornecido, enviando apenas texto");
      pdfFailed = true;
    }

    // Update quote flags
    const updates: Record<string, any> = {
      enviado_whatsapp: true,
      enviado_whatsapp_em: new Date().toISOString(),
    };

    if (orcData?.status === "rascunho") {
      updates.status = "enviado";
    }

    await supabaseAdmin.from("orcamentos").update(updates).eq("id", orcamento_id);

    // Register history
    await supabaseAdmin.from("historico_orcamento").insert({
      orcamento_id,
      usuario_id: user.id,
      agencia_id,
      tipo: "enviado_whatsapp",
      descricao: `Orçamento enviado via WhatsApp para ${telFormatado}`,
    });

    if (updates.status === "enviado") {
      await supabaseAdmin.from("historico_orcamento").insert({
        orcamento_id,
        usuario_id: user.id,
        agencia_id,
        tipo: "status_alterado",
        status_anterior: "rascunho",
        status_novo: "enviado",
        descricao: "Status alterado de Rascunho para Enviado",
      });
    }

    console.log("[whatsapp-enviar] SUCESSO. pdfFailed:", pdfFailed);

    return new Response(
      JSON.stringify({ success: true, pdfFailed, statusChanged: updates.status === "enviado" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[whatsapp-enviar] Erro fatal:", (err as Error).message, (err as Error).stack);
    return new Response(
      JSON.stringify({ error: (err as Error).message, code: "WPP003" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
