import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildEmailHtml } from "../_shared/email-html.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { token, nome } = await req.json();

    if (!token || !nome || nome.trim().length < 2) {
      return new Response(JSON.stringify({ error: "Token e nome são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Find the orcamento by token
    const { data: orc, error: findErr } = await supabase
      .from("orcamentos")
      .select("id, agencia_id, status, numero_orcamento, valor_final")
      .eq("token_publico", token)
      .maybeSingle();

    if (findErr || !orc) {
      return new Response(JSON.stringify({ error: "Orçamento não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (orc.status !== "enviado") {
      return new Response(JSON.stringify({ error: "Orçamento não está disponível para aprovação" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date().toISOString();
    const trimmedName = nome.trim();

    // 2. Update status + approval fields
    const { error: updateErr } = await supabase
      .from("orcamentos")
      .update({
        status: "aprovado",
        aprovado_pelo_cliente_em: now,
        aprovado_pelo_cliente_nome: trimmedName,
      })
      .eq("id", orc.id);

    if (updateErr) throw updateErr;

    // 3. Register history
    await supabase.from("historico_orcamento").insert({
      orcamento_id: orc.id,
      usuario_id: null,
      agencia_id: orc.agencia_id,
      tipo: "status_alterado",
      status_anterior: "enviado",
      status_novo: "aprovado",
      descricao: `Orçamento aprovado pelo cliente: ${trimmedName}`,
    });

    // 4. Notify agency
    await supabase.from("notificacoes_sistema").insert({
      tipo: "info",
      titulo: "Orçamento aprovado pelo cliente",
      mensagem: `O orçamento ${orc.numero_orcamento || ""} foi aprovado por ${trimmedName} via link público.`,
      agencia_id: orc.agencia_id,
      destinatario: "admins",
    });

    // 5. Send email to agency admin (non-blocking)
    try {
      const { data: admin } = await supabase
        .from("usuarios")
        .select("email, nome")
        .eq("agencia_id", orc.agencia_id)
        .eq("cargo", "admin")
        .eq("ativo", true)
        .limit(1)
        .maybeSingle();

      if (admin?.email) {
        const valorFormatado = (orc.valor_final || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
        const dataAprovacao = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

        const html = buildEmailHtml({
          title: "Um orçamento foi aprovado!",
          body: `
            <p>O cliente <strong>${trimmedName}</strong> aprovou o orçamento <strong>${orc.numero_orcamento || ""}</strong> no valor de <strong>${valorFormatado}</strong> em ${dataAprovacao}.</p>
          `,
          ctaText: "Ver orçamento",
          ctaUrl: `https://viahub.app/orcamentos/${orc.id}`,
        });

        const resendKey = Deno.env.get("RESEND_API_KEY");
        if (resendKey) {
          fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: "ViaHub <noreply@viahub.app>",
              to: [admin.email],
              subject: `✅ Orçamento ${orc.numero_orcamento || ""} aprovado pelo cliente!`,
              html,
            }),
          }).catch((e) => console.error("[aprovar] Email error:", e.message));
        }
      }
    } catch (emailErr) {
      console.error("[aprovar] Erro ao enviar email:", (emailErr as Error).message);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Erro ao aprovar:", e);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
