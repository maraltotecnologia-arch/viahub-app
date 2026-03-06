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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Calculate last week range (Mon-Sun)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun
    const lastMonday = new Date(now);
    lastMonday.setDate(now.getDate() - dayOfWeek - 6); // Previous Monday
    lastMonday.setHours(0, 0, 0, 0);

    const lastSunday = new Date(lastMonday);
    lastSunday.setDate(lastMonday.getDate() + 6);
    lastSunday.setHours(23, 59, 59, 999);

    const startISO = lastMonday.toISOString();
    const endISO = lastSunday.toISOString();

    const formatDate = (d: Date) =>
      `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;

    const weekLabel = `${formatDate(lastMonday)} a ${formatDate(lastSunday)}`;

    // Get all active agencies
    const { data: agencias } = await supabase
      .from("agencias")
      .select("id, nome_fantasia")
      .eq("ativo", true);

    if (!agencias || agencias.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhuma agência ativa" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;

    for (const agencia of agencias) {
      // Find admin email
      const { data: admin } = await supabase
        .from("usuarios")
        .select("email, nome")
        .eq("agencia_id", agencia.id)
        .eq("cargo", "admin")
        .eq("ativo", true)
        .limit(1)
        .maybeSingle();

      if (!admin?.email) continue;

      // Get metrics
      const { data: orcamentos } = await supabase
        .from("orcamentos")
        .select("status, valor_final, criado_em, pago_em")
        .eq("agencia_id", agencia.id)
        .gte("criado_em", startISO)
        .lte("criado_em", endISO);

      const criados = orcamentos?.length || 0;
      const aprovados = orcamentos?.filter((o) => o.status === "aprovado" || o.status === "pago").length || 0;

      // Paid in the period
      const { data: pagos } = await supabase
        .from("orcamentos")
        .select("valor_final")
        .eq("agencia_id", agencia.id)
        .eq("status", "pago")
        .gte("pago_em", startISO)
        .lte("pago_em", endISO);

      const qtdPagos = pagos?.length || 0;
      const valorTotal = pagos?.reduce((sum, o) => sum + (o.valor_final || 0), 0) || 0;
      const valorFormatado = valorTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

      const html = buildEmailHtml({
        title: "Resumo da semana",
        body: `
          <p>Olá ${admin.nome || ""},</p>
          <p>Confira o resumo da <strong>${agencia.nome_fantasia}</strong> na semana de <strong>${weekLabel}</strong>:</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0">
            <tr>
              <td style="padding:12px 16px;background:#F9FAFB;border-radius:6px;border:1px solid #E5E7EB;text-align:center;width:25%">
                <div style="font-size:24px;font-weight:700;color:#2563EB">${criados}</div>
                <div style="font-size:12px;color:#6B7280;margin-top:4px">Criados</div>
              </td>
              <td style="width:8px"></td>
              <td style="padding:12px 16px;background:#F9FAFB;border-radius:6px;border:1px solid #E5E7EB;text-align:center;width:25%">
                <div style="font-size:24px;font-weight:700;color:#16A34A">${aprovados}</div>
                <div style="font-size:12px;color:#6B7280;margin-top:4px">Aprovados</div>
              </td>
              <td style="width:8px"></td>
              <td style="padding:12px 16px;background:#F9FAFB;border-radius:6px;border:1px solid #E5E7EB;text-align:center;width:25%">
                <div style="font-size:24px;font-weight:700;color:#7C3AED">${qtdPagos}</div>
                <div style="font-size:12px;color:#6B7280;margin-top:4px">Pagos</div>
              </td>
              <td style="width:8px"></td>
              <td style="padding:12px 16px;background:#F9FAFB;border-radius:6px;border:1px solid #E5E7EB;text-align:center;width:25%">
                <div style="font-size:18px;font-weight:700;color:#1F2937">${valorFormatado}</div>
                <div style="font-size:12px;color:#6B7280;margin-top:4px">Recebido</div>
              </td>
            </tr>
          </table>
        `,
        ctaText: "Ver relatório completo",
        ctaUrl: "https://viahub.app/relatorios",
      });

      // Fire-and-forget email
      try {
        const resendKey = Deno.env.get("RESEND_API_KEY");
        if (resendKey) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "ViaHub <noreply@viahub.app>",
              to: [admin.email],
              subject: `📊 Seu resumo semanal ViaHub — semana de ${weekLabel}`,
              html,
            }),
          });
          sent++;
        }
      } catch (e) {
        console.error(`[relatorio-semanal] Erro ao enviar para ${admin.email}:`, (e as Error).message);
      }
    }

    return new Response(JSON.stringify({ success: true, sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[relatorio-semanal] Erro:", (err as Error).message);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
