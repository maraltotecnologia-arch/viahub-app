import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ASAAS_BASE = "https://sandbox.asaas.com/api/v3";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("[asaas-verificar-bloqueio] Iniciando verificação...");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const asaasKey = Deno.env.get("ASAAS_API_KEY");

    // ========================================
    // STEP 1: Check if any pending boletos were compensated
    // ========================================
    let activatedCount = 0;

    if (asaasKey) {
      // Get all agencies with status pendente or inadimplente
      const { data: agenciasPendentes } = await supabaseAdmin
        .from("agencias")
        .select("id, nome_fantasia")
        .in("status_pagamento", ["pendente", "inadimplente"])
        .eq("ativo", true);

      if (agenciasPendentes && agenciasPendentes.length > 0) {
        console.log(`[asaas-verificar-bloqueio] ${agenciasPendentes.length} agências com pagamento pendente/inadimplente`);

        for (const ag of agenciasPendentes) {
          // Get pending boleto payments for this agency
          const { data: pagamentos } = await supabaseAdmin
            .from("asaas_pagamentos")
            .select("asaas_payment_id, forma_pagamento, status")
            .eq("agencia_id", ag.id)
            .in("status", ["PENDING", "OVERDUE"])
            .eq("forma_pagamento", "BOLETO");

          if (!pagamentos || pagamentos.length === 0) continue;

          for (const pag of pagamentos) {
            if (!pag.asaas_payment_id) continue;

            try {
              const res = await fetch(`${ASAAS_BASE}/payments/${pag.asaas_payment_id}`, {
                headers: { "access_token": asaasKey },
              });
              const data = await res.json();

              if (data.status === "RECEIVED" || data.status === "CONFIRMED") {
                console.log(`[asaas-verificar-bloqueio] Boleto ${pag.asaas_payment_id} compensado para ${ag.nome_fantasia}`);

                // Update payment record
                await supabaseAdmin.from("asaas_pagamentos").update({
                  status: data.status,
                  pago_em: new Date().toISOString(),
                }).eq("asaas_payment_id", pag.asaas_payment_id);

                // Activate agency
                await supabaseAdmin.from("agencias").update({
                  status_pagamento: "ativo",
                  data_bloqueio: null,
                }).eq("id", ag.id);

                // Create notification
                await supabaseAdmin.from("notificacoes_sistema").insert({
                  agencia_id: ag.id,
                  destinatario: "agencia",
                  tipo: "cobranca",
                  titulo: "Pagamento confirmado",
                  mensagem: "Seu boleto foi compensado e o acesso ao sistema foi liberado. Obrigado!",
                });

                activatedCount++;
                break; // Agency already activated, no need to check other payments
              }
            } catch (e) {
              console.error(`[asaas-verificar-bloqueio] Erro ao consultar Asaas para ${pag.asaas_payment_id}:`, e);
            }
          }
        }
      }
    }

    console.log(`[asaas-verificar-bloqueio] ${activatedCount} agências ativadas por compensação de boleto`);

    // ========================================
    // STEP 2: Block agencies that are inadimplente for 3+ days
    // ========================================
    const { data: agencias, error } = await supabaseAdmin
      .from("agencias")
      .select("id, nome_fantasia, email, data_proximo_vencimento, status_pagamento")
      .eq("status_pagamento", "inadimplente")
      .eq("ativo", true);

    if (error) {
      console.error("[asaas-verificar-bloqueio] Erro ao buscar agências:", error);
      throw error;
    }

    let blockedCount = 0;

    if (agencias && agencias.length > 0) {
      const now = new Date();

      for (const ag of agencias) {
        if (!ag.data_proximo_vencimento) continue;

        const venc = new Date(ag.data_proximo_vencimento);
        const diffDays = Math.floor((now.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays > 3) {
          console.log(`[asaas-verificar-bloqueio] Bloqueando ${ag.nome_fantasia} (${diffDays} dias de atraso)`);

          await supabaseAdmin.from("agencias").update({
            status_pagamento: "bloqueado",
            data_bloqueio: now.toISOString(),
          }).eq("id", ag.id);

          // Send blocked email
          try {
            await supabaseAdmin.functions.invoke("enviar-email", {
              body: {
                to: ag.email,
                subject: "Acesso suspenso — regularize sua situação",
                type: "acesso_bloqueado",
                html: buildBlockedHtml(ag.nome_fantasia),
              },
            });
          } catch (e) {
            console.error("[asaas-verificar-bloqueio] Erro ao enviar email:", e);
          }

          // Create notification
          await supabaseAdmin.from("notificacoes_sistema").insert({
            agencia_id: ag.id,
            destinatario: "agencia",
            tipo: "cobranca",
            titulo: "Acesso suspenso por inadimplência",
            mensagem: "O acesso ao sistema foi temporariamente suspenso. Regularize sua situação para continuar utilizando o ViaHub.",
          });

          blockedCount++;
        }
      }
    }

    console.log(`[asaas-verificar-bloqueio] ${blockedCount} agências bloqueadas`);

    return new Response(JSON.stringify({ ok: true, activated: activatedCount, blocked: blockedCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[asaas-verificar-bloqueio] Erro:", (err as Error).message);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function buildBlockedHtml(nome: string): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <div style="background:#1E3A5F;padding:20px;text-align:center;border-radius:8px 8px 0 0;">
        <h1 style="color:#fff;margin:0;font-size:24px;">ViaHub</h1>
      </div>
      <div style="background:#fff;padding:30px;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 8px 8px;">
        <h2 style="color:#DC2626;margin-top:0;">🔒 Acesso suspenso</h2>
        <p>Olá, <strong>${nome}</strong>!</p>
        <p>Infelizmente, seu acesso ao ViaHub foi temporariamente suspenso por inadimplência.</p>
        <p>Para regularizar sua situação e recuperar o acesso:</p>
        <ol style="color:#334155;">
          <li>Acesse o sistema — você será direcionado à tela de pagamento</li>
          <li>Realize o pagamento via PIX, boleto ou cartão</li>
          <li>O acesso será liberado automaticamente em até 1 hora</li>
        </ol>
        <p style="color:#64748B;font-size:14px;margin-top:20px;">Em caso de dúvidas: <a href="mailto:suporte@viahub.app">suporte@viahub.app</a></p>
      </div>
    </div>
  `;
}
