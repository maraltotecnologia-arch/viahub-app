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
    const webhookToken = Deno.env.get("ASAAS_WEBHOOK_TOKEN");
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    if (webhookToken && token !== webhookToken) {
      console.error("[asaas-webhook] Token inválido");
      return new Response("Unauthorized", { status: 401 });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const event = body.event;
    const payment = body.payment;
    const subscription = body.subscription;

    if (!event) {
      return new Response(JSON.stringify({ error: "Payload inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[asaas-webhook] Evento: ${event}`, JSON.stringify({ paymentId: payment?.id, subscriptionId: subscription?.id }));

    // Handle subscription events
    if (event === "SUBSCRIPTION_CREATED") {
      const subId = subscription?.id;
      const customerId = subscription?.customer;
      console.log(`[asaas-webhook] Assinatura criada: ${subId}, customer: ${customerId}`);

      if (subId && customerId) {
        const { data: agencia } = await supabaseAdmin
          .from("agencias")
          .select("id")
          .eq("asaas_customer_id", customerId)
          .single();

        if (agencia) {
          await supabaseAdmin.from("agencias").update({
            asaas_subscription_id: subId,
          }).eq("id", agencia.id);
          console.log(`[asaas-webhook] Agência ${agencia.id} atualizada com subscription ${subId}`);
        }
      }

      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For payment events, require payment field
    if (!payment) {
      console.log(`[asaas-webhook] Evento sem payment, ignorando: ${event}`);
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find agency by customer ID
    const { data: agencia } = await supabaseAdmin
      .from("agencias")
      .select("id, nome_fantasia, email, plano, status_pagamento")
      .eq("asaas_customer_id", payment.customer)
      .single();

    if (!agencia) {
      console.error("[asaas-webhook] Agência não encontrada para customer:", payment.customer);
      return new Response(JSON.stringify({ received: true, skipped: "agency_not_found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    switch (event) {
      case "PAYMENT_CREATED": {
        console.log(`[asaas-webhook] Novo pagamento criado: ${payment.id}, billingType: ${payment.billingType}`);
        await supabaseAdmin.from("asaas_pagamentos").upsert({
          asaas_payment_id: payment.id,
          agencia_id: agencia.id,
          valor: payment.value,
          status: payment.status,
          forma_pagamento: payment.billingType,
          vencimento: payment.dueDate,
          pix_qr_code: payment.pixQrCode?.encodedImage || null,
          pix_copia_cola: payment.pixQrCode?.payload || null,
          boleto_url: payment.bankSlipUrl || null,
          boleto_linha_digitavel: payment.nossoNumero || null,
        }, { onConflict: "asaas_payment_id" });

        // Update data_proximo_vencimento
        if (payment.dueDate) {
          await supabaseAdmin.from("agencias").update({
            data_proximo_vencimento: payment.dueDate,
          }).eq("id", agencia.id);
          console.log(`[asaas-webhook] data_proximo_vencimento atualizada para ${payment.dueDate}`);
        }

        // Send boleto email if BOLETO
        if (payment.billingType === "BOLETO" && payment.bankSlipUrl) {
          try {
            await supabaseAdmin.functions.invoke("enviar-email", {
              body: {
                to: agencia.email,
                subject: "Seu boleto do mês está disponível 📄",
                type: "boleto_disponivel",
                html: buildBoletoDisponibleHtml(agencia.nome_fantasia, payment.value, payment.dueDate, payment.bankSlipUrl),
              },
            });
            console.log("[asaas-webhook] Email de boleto enviado");
          } catch (e) {
            console.error("[asaas-webhook] Erro ao enviar email boleto:", e);
          }
        }
        break;
      }

      case "PAYMENT_RECEIVED":
      case "PAYMENT_CONFIRMED": {
        console.log(`[asaas-webhook] Pagamento confirmado: ${payment.id}`);

        await supabaseAdmin.from("asaas_pagamentos").upsert({
          asaas_payment_id: payment.id,
          agencia_id: agencia.id,
          valor: payment.value,
          status: "RECEIVED",
          forma_pagamento: payment.billingType,
          vencimento: payment.dueDate,
          pago_em: new Date().toISOString(),
        }, { onConflict: "asaas_payment_id" });

        const dueDate = new Date(payment.dueDate);
        const nextDue = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, dueDate.getDate());

        const wasPending = agencia.status_pagamento === "pendente";
        const wasBlocked = agencia.status_pagamento === "bloqueado" || agencia.status_pagamento === "inadimplente";

        await supabaseAdmin.from("agencias").update({
          status_pagamento: "ativo",
          data_bloqueio: null,
          data_proximo_vencimento: nextDue.toISOString().split("T")[0],
        }).eq("id", agencia.id);

        try {
          if (wasPending) {
            await supabaseAdmin.functions.invoke("enviar-email", {
              body: {
                to: agencia.email,
                subject: "Seu acesso ao ViaHub foi liberado! 🎉",
                type: "acesso_liberado",
                html: buildAccessGrantedHtml(agencia.nome_fantasia),
              },
            });
          } else {
            await supabaseAdmin.functions.invoke("enviar-email", {
              body: {
                to: agencia.email,
                subject: "Pagamento recebido! ✓",
                type: "pagamento_confirmado",
                html: buildPaymentConfirmedHtml(agencia.nome_fantasia, payment.value, agencia.plano, nextDue),
              },
            });
          }

          if (wasBlocked) {
            await supabaseAdmin.from("notificacoes_sistema").insert({
              agencia_id: agencia.id,
              destinatario: "agencia",
              tipo: "cobranca",
              titulo: "Acesso restaurado",
              mensagem: "Seu pagamento foi confirmado e o acesso ao sistema foi restaurado!",
            });
          }
        } catch (e) {
          console.error("[asaas-webhook] Erro ao enviar email:", e);
        }
        break;
      }

      case "PAYMENT_OVERDUE": {
        console.log(`[asaas-webhook] Pagamento em atraso: ${payment.id}`);

        await supabaseAdmin.from("asaas_pagamentos").upsert({
          asaas_payment_id: payment.id,
          agencia_id: agencia.id,
          valor: payment.value,
          status: "OVERDUE",
          forma_pagamento: payment.billingType,
          vencimento: payment.dueDate,
        }, { onConflict: "asaas_payment_id" });

        await supabaseAdmin.from("agencias").update({
          status_pagamento: "inadimplente",
        }).eq("id", agencia.id);

        try {
          const isPixOverdue = payment.billingType === "PIX";
          await supabaseAdmin.functions.invoke("enviar-email", {
            body: {
              to: agencia.email,
              subject: isPixOverdue ? "Seu PIX venceu — gere um novo QR Code" : "Sua mensalidade está em atraso",
              type: "pagamento_vencido",
              html: isPixOverdue
                ? buildPixOverdueHtml(agencia.nome_fantasia, payment.value, payment.dueDate)
                : buildPaymentOverdueHtml(agencia.nome_fantasia, payment.value, payment.dueDate),
            },
          });
        } catch (e) {
          console.error("[asaas-webhook] Erro ao enviar email:", e);
        }

        await supabaseAdmin.from("notificacoes_sistema").insert({
          agencia_id: agencia.id,
          destinatario: "admins",
          tipo: "cobranca",
          titulo: "Mensalidade em atraso",
          mensagem: `A mensalidade de ${agencia.nome_fantasia} está em atraso desde ${payment.dueDate}.`,
        });
        break;
      }

      case "PAYMENT_REFUNDED":
      case "PAYMENT_REFUSED": {
        console.log(`[asaas-webhook] Pagamento recusado/estornado: ${payment.id}`);

        await supabaseAdmin.from("asaas_pagamentos").upsert({
          asaas_payment_id: payment.id,
          agencia_id: agencia.id,
          valor: payment.value,
          status: event === "PAYMENT_REFUSED" ? "REFUSED" : "REFUNDED",
          forma_pagamento: payment.billingType,
          vencimento: payment.dueDate,
        }, { onConflict: "asaas_payment_id" });

        if (event === "PAYMENT_REFUSED") {
          await supabaseAdmin.from("agencias").update({
            status_pagamento: "inadimplente",
          }).eq("id", agencia.id);

          try {
            await supabaseAdmin.functions.invoke("enviar-email", {
              body: {
                to: agencia.email,
                subject: "Cartão recusado — atualize seus dados de pagamento",
                type: "cartao_recusado",
                html: buildCardRefusedHtml(agencia.nome_fantasia, payment.value),
              },
            });
          } catch (e) {
            console.error("[asaas-webhook] Erro ao enviar email:", e);
          }

          await supabaseAdmin.from("notificacoes_sistema").insert({
            agencia_id: agencia.id,
            destinatario: "agencia",
            tipo: "cobranca",
            titulo: "Cartão de crédito recusado",
            mensagem: "Seu cartão foi recusado. Atualize seus dados de pagamento em Configurações → Assinatura.",
          });
        }
        break;
      }

      default:
        console.log(`[asaas-webhook] Evento não tratado: ${event}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    // CRITICAL: Always return 200 to prevent Asaas from re-queuing webhooks in a loop
    console.error("[asaas-webhook] Erro:", (err as Error).message, (err as Error).stack);
    return new Response(JSON.stringify({ received: true, error: (err as Error).message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ─── Email templates ───

function buildPaymentConfirmedHtml(nome: string, valor: number, plano: string | null, proxVenc: Date): string {
  const fmtValor = valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const fmtData = proxVenc.toLocaleDateString("pt-BR");
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <div style="background:#1E3A5F;padding:20px;text-align:center;border-radius:8px 8px 0 0;">
        <h1 style="color:#fff;margin:0;font-size:24px;">ViaHub</h1>
      </div>
      <div style="background:#fff;padding:30px;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 8px 8px;">
        <h2 style="color:#16A34A;margin-top:0;">Pagamento confirmado! ✓</h2>
        <p>Olá, <strong>${nome}</strong>!</p>
        <p>Recebemos seu pagamento com sucesso.</p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0;">
          <tr><td style="padding:8px 0;color:#64748B;">Valor pago</td><td style="padding:8px 0;font-weight:bold;">${fmtValor}</td></tr>
          <tr><td style="padding:8px 0;color:#64748B;">Plano</td><td style="padding:8px 0;font-weight:bold;">${(plano || "starter").charAt(0).toUpperCase() + (plano || "starter").slice(1)}</td></tr>
          <tr><td style="padding:8px 0;color:#64748B;">Próximo vencimento</td><td style="padding:8px 0;font-weight:bold;">${fmtData}</td></tr>
        </table>
        <p style="color:#64748B;font-size:14px;">Obrigado por usar o ViaHub!</p>
      </div>
    </div>
  `;
}

function buildPaymentOverdueHtml(nome: string, valor: number, dueDate: string): string {
  const fmtValor = valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const fmtData = new Date(dueDate).toLocaleDateString("pt-BR");
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <div style="background:#1E3A5F;padding:20px;text-align:center;border-radius:8px 8px 0 0;">
        <h1 style="color:#fff;margin:0;font-size:24px;">ViaHub</h1>
      </div>
      <div style="background:#fff;padding:30px;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 8px 8px;">
        <h2 style="color:#EAB308;margin-top:0;">⚠️ Mensalidade em atraso</h2>
        <p>Olá, <strong>${nome}</strong>!</p>
        <p>Identificamos que sua mensalidade de <strong>${fmtValor}</strong> com vencimento em <strong>${fmtData}</strong> ainda não foi paga.</p>
        <p style="color:#DC2626;font-weight:bold;">Atenção: Após 3 dias de atraso, o acesso ao sistema será temporariamente suspenso.</p>
        <p>Para regularizar, acesse o ViaHub e realize o pagamento.</p>
        <p style="color:#64748B;font-size:14px;margin-top:20px;">Em caso de dúvidas: <a href="mailto:suporte@viahub.app">suporte@viahub.app</a></p>
      </div>
    </div>
  `;
}

function buildPixOverdueHtml(nome: string, valor: number, dueDate: string): string {
  const fmtValor = valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const fmtData = new Date(dueDate).toLocaleDateString("pt-BR");
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <div style="background:#1E3A5F;padding:20px;text-align:center;border-radius:8px 8px 0 0;">
        <h1 style="color:#fff;margin:0;font-size:24px;">ViaHub</h1>
      </div>
      <div style="background:#fff;padding:30px;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 8px 8px;">
        <h2 style="color:#EAB308;margin-top:0;">⚠️ Seu PIX venceu</h2>
        <p>Olá, <strong>${nome}</strong>!</p>
        <p>O PIX de <strong>${fmtValor}</strong> com vencimento em <strong>${fmtData}</strong> expirou sem pagamento.</p>
        <p>Para regularizar, acesse o sistema e gere um novo QR Code em <strong>Configurações → Assinatura</strong>.</p>
        <p style="color:#DC2626;font-weight:bold;">Atenção: Após 3 dias de atraso, o acesso ao sistema será temporariamente suspenso.</p>
        <p style="color:#64748B;font-size:14px;margin-top:20px;">Em caso de dúvidas: <a href="mailto:suporte@viahub.app">suporte@viahub.app</a></p>
      </div>
    </div>
  `;
}

function buildAccessGrantedHtml(nome: string): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <div style="background:#1E3A5F;padding:20px;text-align:center;border-radius:8px 8px 0 0;">
        <h1 style="color:#fff;margin:0;font-size:24px;">ViaHub</h1>
      </div>
      <div style="background:#fff;padding:30px;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 8px 8px;">
        <h2 style="color:#16A34A;margin-top:0;">Pagamento confirmado! 🎉</h2>
        <p>Olá, <strong>${nome}</strong>!</p>
        <p>Seu pagamento foi compensado e seu acesso ao ViaHub está liberado.</p>
        <p>Clique no botão abaixo para fazer seu primeiro login.</p>
        <div style="text-align:center;margin:30px 0;">
          <a href="https://viahubapp.lovable.app/login" style="background:#2563EB;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">
            Acessar o ViaHub
          </a>
        </div>
        <p style="color:#64748B;font-size:14px;">Obrigado por escolher o ViaHub!</p>
      </div>
    </div>
  `;
}

function buildCardRefusedHtml(nome: string, valor: number): string {
  const fmtValor = valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <div style="background:#1E3A5F;padding:20px;text-align:center;border-radius:8px 8px 0 0;">
        <h1 style="color:#fff;margin:0;font-size:24px;">ViaHub</h1>
      </div>
      <div style="background:#fff;padding:30px;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 8px 8px;">
        <h2 style="color:#DC2626;margin-top:0;">❌ Cartão recusado</h2>
        <p>Olá, <strong>${nome}</strong>!</p>
        <p>A cobrança de <strong>${fmtValor}</strong> no seu cartão de crédito foi recusada.</p>
        <p>Para evitar a suspensão do acesso, atualize seus dados de pagamento:</p>
        <div style="text-align:center;margin:30px 0;">
          <a href="https://viahubapp.lovable.app/configuracoes/assinatura" style="background:#2563EB;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">
            Atualizar pagamento
          </a>
        </div>
        <p style="color:#64748B;font-size:14px;margin-top:20px;">Em caso de dúvidas: <a href="mailto:suporte@viahub.app">suporte@viahub.app</a></p>
      </div>
    </div>
  `;
}

function buildBoletoDisponibleHtml(nome: string, valor: number, dueDate: string, boletoUrl: string): string {
  const fmtValor = valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const fmtData = new Date(dueDate).toLocaleDateString("pt-BR");
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <div style="background:#1E3A5F;padding:20px;text-align:center;border-radius:8px 8px 0 0;">
        <h1 style="color:#fff;margin:0;font-size:24px;">ViaHub</h1>
      </div>
      <div style="background:#fff;padding:30px;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 8px 8px;">
        <h2 style="color:#1E3A5F;margin-top:0;">📄 Seu boleto do mês está disponível</h2>
        <p>Olá, <strong>${nome}</strong>!</p>
        <p>Sua mensalidade de <strong>${fmtValor}</strong> com vencimento em <strong>${fmtData}</strong> já está disponível.</p>
        <div style="text-align:center;margin:30px 0;">
          <a href="${boletoUrl}" style="background:#2563EB;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">
            Baixar boleto
          </a>
        </div>
        <p>Você também pode acessar o boleto em <strong>Configurações → Assinatura</strong>.</p>
        <p style="color:#64748B;font-size:14px;margin-top:20px;">Em caso de dúvidas: <a href="mailto:suporte@viahub.app">suporte@viahub.app</a></p>
      </div>
    </div>
  `;
}
