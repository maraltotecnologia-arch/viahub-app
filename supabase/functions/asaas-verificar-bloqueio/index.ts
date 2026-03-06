import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Find agencies that are "inadimplente"
    const { data: agencias, error } = await supabaseAdmin
      .from("agencias")
      .select("id, nome_fantasia, email, data_proximo_vencimento, status_pagamento")
      .eq("status_pagamento", "inadimplente")
      .eq("ativo", true);

    if (error) {
      console.error("[asaas-verificar-bloqueio] Erro ao buscar agências:", error);
      throw error;
    }

    if (!agencias || agencias.length === 0) {
      console.log("[asaas-verificar-bloqueio] Nenhuma agência inadimplente");
      return new Response(JSON.stringify({ ok: true, blocked: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    let blockedCount = 0;

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

    console.log(`[asaas-verificar-bloqueio] ${blockedCount} agências bloqueadas`);

    return new Response(JSON.stringify({ ok: true, blocked: blockedCount }), {
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
