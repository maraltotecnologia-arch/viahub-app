import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  console.log("[whatsapp-enviar] INÍCIO");

  try {
    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL")!;
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY")!;
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado", code: "AUTH009" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado", code: "AUTH009" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { orcamento_id, agencia_id, telefone_destino } = await req.json();

    // Validate phone
    const digits = (telefone_destino || "").replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 13) {
      return new Response(JSON.stringify({ error: "Número de telefone inválido", code: "WPP004" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const telFormatado = digits.startsWith("55") ? digits : `55${digits}`;

    // Check instance
    const { data: instancia } = await supabaseAdmin
      .from("whatsapp_instancias")
      .select("instance_name, status")
      .eq("agencia_id", agencia_id)
      .maybeSingle();

    if (!instancia) {
      return new Response(JSON.stringify({ error: "WhatsApp não conectado", code: "WPP001" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify real connection state
    if (instancia.status !== "open" && instancia.status !== "connected") {
      try {
        const stateRes = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instancia.instance_name}`, {
          headers: { apikey: EVOLUTION_API_KEY },
        });
        const stateData = await stateRes.json();
        const state = stateData?.instance?.state || stateData?.state || "close";
        if (state !== "open") {
          await supabaseAdmin.from("whatsapp_instancias").update({ status: "disconnected" }).eq("agencia_id", agencia_id);
          return new Response(JSON.stringify({ error: "WhatsApp não conectado", code: "WPP001" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (_) {
        return new Response(JSON.stringify({ error: "WhatsApp não conectado", code: "WPP001" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fetch quote data
    const { data: orcData } = await supabaseAdmin
      .from("orcamentos")
      .select("numero_orcamento, valor_final, cliente_id, agencia_id")
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
    const templateMsg = (agenciaData as any)?.whatsapp_mensagem_orcamento ||
      "Olá {nome_cliente}! 😊 Segue em anexo o orçamento *{numero_orcamento}* referente à sua solicitação. Qualquer dúvida estamos à disposição! — {nome_agencia}";

    const mensagem = templateMsg
      .replace(/\{nome_cliente\}/g, clienteNome)
      .replace(/\{numero_orcamento\}/g, orcData?.numero_orcamento || "")
      .replace(/\{nome_agencia\}/g, agenciaNome);

    console.log("[whatsapp-enviar] Enviando para:", telFormatado);

    // Send text message
    const sendRes = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instancia.instance_name}`, {
      method: "POST",
      headers: { apikey: EVOLUTION_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ number: telFormatado, text: mensagem }),
    });

    if (!sendRes.ok) {
      const errData = await sendRes.json().catch(() => ({}));
      console.error("[whatsapp-enviar] Erro ao enviar:", JSON.stringify(errData));
      await supabaseAdmin.from("whatsapp_instancias").update({ status: "disconnected" }).eq("agencia_id", agencia_id);
      return new Response(JSON.stringify({ error: "Erro ao enviar mensagem", code: "WPP003", details: errData }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    await sendRes.json();

    // Update quote
    const updates: Record<string, any> = {
      enviado_whatsapp: true,
      enviado_whatsapp_em: new Date().toISOString(),
    };

    // Check current status
    if (orcData) {
      const { data: currentOrc } = await supabaseAdmin
        .from("orcamentos")
        .select("status")
        .eq("id", orcamento_id)
        .single();
      if (currentOrc?.status === "rascunho") {
        updates.status = "enviado";
      }
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

    console.log("[whatsapp-enviar] SUCESSO");

    return new Response(JSON.stringify({ success: true, statusChanged: updates.status === "enviado" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[whatsapp-enviar] Erro:", (err as Error).message);
    return new Response(JSON.stringify({ error: (err as Error).message, code: "WPP003" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
