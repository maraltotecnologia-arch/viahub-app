import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildEmailHtml } from "../_shared/email-html.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const RESEND_KEY = Deno.env.get("RESEND_API_KEY");

    if (!RESEND_KEY) {
      console.error("[enviar-orcamento-email] RESEND_API_KEY não configurada");
      return new Response(
        JSON.stringify({ error: "Serviço de email não configurado" }),
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
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { orcamento_id, agencia_id, email_destino, mensagem_personalizada, pdf_base64 } = await req.json();

    if (!orcamento_id || !agencia_id) {
      return new Response(
        JSON.stringify({ error: "orcamento_id e agencia_id são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate agency access
    const { data: userProfile } = await supabaseAdmin
      .from("usuarios")
      .select("agencia_id, cargo")
      .eq("id", user.id)
      .single();

    if (!userProfile || (userProfile.cargo !== "superadmin" && userProfile.agencia_id !== agencia_id)) {
      return new Response(
        JSON.stringify({ error: "Acesso negado" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch orcamento + cliente
    const { data: orc } = await supabaseAdmin
      .from("orcamentos")
      .select("*, clientes(nome, email)")
      .eq("id", orcamento_id)
      .single();

    if (!orc) {
      return new Response(
        JSON.stringify({ error: "Orçamento não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch agencia
    const { data: agencia } = await supabaseAdmin
      .from("agencias")
      .select("nome_fantasia, email")
      .eq("id", agencia_id)
      .single();

    const agenciaNome = agencia?.nome_fantasia || "Agência";
    const clienteNome = (orc.clientes as any)?.nome || "Cliente";
    const clienteEmail = (orc.clientes as any)?.email;

    const destinatario = email_destino || clienteEmail;
    if (!destinatario) {
      return new Response(
        JSON.stringify({ error: "Nenhum email de destino disponível. Informe email_destino ou cadastre o email do cliente." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const numeroOrc = orc.numero_orcamento || "";
    const tituloOrc = orc.titulo || "sua viagem";
    const valorFinal = Number(orc.valor_final || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: orc.moeda || "BRL",
    });
    const linkOrcamento = orc.token_publico
      ? `${SUPABASE_URL.replace("https://", "https://").replace(".supabase.co", "")}.viahub.app/orcamento/${orc.token_publico}`
      : null;

    // Build tracking pixel URL
    const trackingPixelUrl = `${SUPABASE_URL}/functions/v1/rastrear-email?id=${orcamento_id}`;

    // Build email body
    const msgCustom = mensagem_personalizada
      ? `<p style="background:#F0F9FF;border-left:3px solid #2563EB;padding:12px 16px;border-radius:4px;margin:16px 0;font-style:italic">${mensagem_personalizada.replace(/\n/g, "<br/>")}</p>`
      : "";

    const linkHtml = linkOrcamento
      ? `<p style="margin:8px 0">Você pode visualizar e aprovar seu orçamento acessando o link:</p>`
      : "";

    const emailBody = `
<p>Olá, <strong>${clienteNome}</strong>!</p>
<p>O seu orçamento está pronto. Confira os detalhes abaixo:</p>
${msgCustom}
<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
  <tr style="background:#F9FAFB">
    <td style="padding:10px 12px;border:1px solid #E5E7EB;color:#6B7280;width:40%">Número do orçamento</td>
    <td style="padding:10px 12px;border:1px solid #E5E7EB;font-weight:600">${numeroOrc}</td>
  </tr>
  <tr>
    <td style="padding:10px 12px;border:1px solid #E5E7EB;color:#6B7280">Descrição</td>
    <td style="padding:10px 12px;border:1px solid #E5E7EB">${tituloOrc}</td>
  </tr>
  <tr style="background:#F9FAFB">
    <td style="padding:10px 12px;border:1px solid #E5E7EB;color:#6B7280">Valor total</td>
    <td style="padding:10px 12px;border:1px solid #E5E7EB;font-weight:700;color:#1D4ED8">${valorFinal}</td>
  </tr>
  ${orc.validade ? `<tr>
    <td style="padding:10px 12px;border:1px solid #E5E7EB;color:#6B7280">Válido até</td>
    <td style="padding:10px 12px;border:1px solid #E5E7EB">${orc.validade.split("-").reverse().join("/")}</td>
  </tr>` : ""}
  ${orc.forma_pagamento ? `<tr style="background:#F9FAFB">
    <td style="padding:10px 12px;border:1px solid #E5E7EB;color:#6B7280">Forma de pagamento</td>
    <td style="padding:10px 12px;border:1px solid #E5E7EB">${orc.forma_pagamento}</td>
  </tr>` : ""}
</table>
${linkHtml}
<p style="font-size:13px;color:#6B7280;margin-top:24px">O PDF completo do orçamento está anexado a este email.<br/>Qualquer dúvida, estamos à disposição.</p>
<p style="margin:0">Atenciosamente,<br/><strong>${agenciaNome}</strong></p>
<img src="${trackingPixelUrl}" width="1" height="1" style="display:block;width:1px;height:1px;border:0" alt="" />
`;

    const html = buildEmailHtml({
      title: `Orçamento ${numeroOrc} — ${agenciaNome}`,
      body: emailBody,
      ctaText: linkOrcamento ? "Ver orçamento online" : undefined,
      ctaUrl: linkOrcamento || undefined,
    });

    const subject = `Orçamento ${numeroOrc} — ${agenciaNome}`;
    const filename = `orcamento-${numeroOrc || orcamento_id.slice(0, 8)}.pdf`;

    // Build Resend payload
    const resendBody: Record<string, unknown> = {
      from: "ViaHub <noreply@viahub.app>",
      to: [destinatario],
      subject,
      html,
    };

    if (pdf_base64) {
      resendBody.attachments = [
        { filename, content: pdf_base64 },
      ];
    }

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(resendBody),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error("[enviar-orcamento-email] Resend error:", resendData);
      return new Response(
        JSON.stringify({ error: "Falha ao enviar email", detail: resendData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const messageId = resendData?.id || null;
    console.log(`[enviar-orcamento-email] Enviado para ${destinatario}, id=${messageId}`);

    // Update orcamento flags
    const updates: Record<string, unknown> = {
      enviado_email: true,
      enviado_email_em: new Date().toISOString(),
    };
    if (orc.status === "rascunho") {
      updates.status = "enviado";
    }
    await supabaseAdmin.from("orcamentos").update(updates).eq("id", orcamento_id);

    // Register history
    await supabaseAdmin.from("historico_orcamento").insert({
      orcamento_id,
      usuario_id: user.id,
      agencia_id,
      tipo: "enviado_email",
      descricao: `Orçamento enviado por email para ${destinatario}`,
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

    return new Response(
      JSON.stringify({ success: true, message_id: messageId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[enviar-orcamento-email] Erro fatal:", (err as Error).message);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
