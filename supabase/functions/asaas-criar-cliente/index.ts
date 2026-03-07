import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ASAAS_BASE = "https://sandbox.asaas.com/api/v3";

const PLANO_VALOR: Record<string, number> = { starter: 397, pro: 697, elite: 1997 };
const PLANO_LABEL: Record<string, string> = { starter: "Starter", pro: "Pro", elite: "Elite" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const asaasKey = Deno.env.get("ASAAS_API_KEY");
    if (!asaasKey) {
      return new Response(JSON.stringify({ error: "ASAAS_API_KEY não configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { agencia_id, billingType: requestedBillingType } = await req.json();
    if (!agencia_id) {
      return new Response(JSON.stringify({ error: "agencia_id é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const billingType = requestedBillingType || "UNDEFINED";
    console.log("[asaas-criar-cliente] agencia_id:", agencia_id, "billingType:", billingType);

    // Fetch agency
    const { data: agencia, error: agError } = await supabaseAdmin
      .from("agencias").select("*").eq("id", agencia_id).single();

    if (agError || !agencia) {
      console.error("[asaas-criar-cliente] Agência não encontrada:", agError);
      return new Response(JSON.stringify({ error: "Agência não encontrada" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[asaas-criar-cliente] Dados agência:", JSON.stringify(agencia));

    // Fallback email from admin user
    let emailAgencia = agencia.email;
    if (!emailAgencia) {
      const { data: adminUser } = await supabaseAdmin
        .from("usuarios").select("email").eq("agencia_id", agencia_id).eq("cargo", "admin").limit(1).single();
      emailAgencia = adminUser?.email || undefined;
    }

    const nome = agencia.nome_fantasia;
    const email = emailAgencia || undefined;
    const cnpjLimpo = agencia.cnpj?.replace(/\D/g, "") || "";
    const telefone = agencia.telefone?.replace(/\D/g, "") || undefined;

    if (!cnpjLimpo || cnpjLimpo.length < 11) {
      console.error("[asaas-criar-cliente] CNPJ inválido:", cnpjLimpo);
      return new Response(JSON.stringify({ error: "CNPJ obrigatório para criar assinatura" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const plano = agencia.plano || "starter";
    const valor = PLANO_VALOR[plano] || 397;

    // Next due date
    const now = new Date();
    let nextDue: Date;
    if (now.getDate() <= 10) {
      nextDue = new Date(now.getFullYear(), now.getMonth(), 10);
    } else {
      nextDue = new Date(now.getFullYear(), now.getMonth() + 1, 10);
    }
    const nextDueStr = nextDue.toISOString().split("T")[0];

    let customerId = agencia.asaas_customer_id;

    if (customerId) {
      console.log(`[asaas-criar-cliente] Atualizando cliente existente ${customerId}...`);
      const updateRes = await fetch(`${ASAAS_BASE}/customers/${customerId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "access_token": asaasKey },
        body: JSON.stringify({ cpfCnpj: cnpjLimpo, name: nome, email, phone: telefone, mobilePhone: telefone }),
      });
      const updateData = await updateRes.json();
      if (!updateRes.ok) {
        console.error("[asaas-criar-cliente] Erro update cliente:", updateData);
        return new Response(JSON.stringify({ error: "Erro ao atualizar cliente", details: updateData }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.log("[asaas-criar-cliente] Cliente atualizado");
    } else {
      console.log("[asaas-criar-cliente] Criando cliente...");
      const customerRes = await fetch(`${ASAAS_BASE}/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "access_token": asaasKey },
        body: JSON.stringify({ name: nome, email, cpfCnpj: cnpjLimpo, phone: telefone, mobilePhone: telefone, externalReference: agencia_id }),
      });
      const customerData = await customerRes.json();
      if (!customerRes.ok) {
        console.error("[asaas-criar-cliente] Erro criar cliente:", customerData);
        return new Response(JSON.stringify({ error: "Erro ao criar cliente", details: customerData }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      customerId = customerData.id;
      console.log("[asaas-criar-cliente] Cliente criado:", customerId);
      await supabaseAdmin.from("agencias").update({ asaas_customer_id: customerId }).eq("id", agencia_id);
    }

    // Check existing subscription
    if (agencia.asaas_subscription_id) {
      console.log("[asaas-criar-cliente] Assinatura já existe:", agencia.asaas_subscription_id);
      return new Response(JSON.stringify({ success: true, customer_id: customerId, subscription_id: agencia.asaas_subscription_id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create subscription with billingType
    console.log("[asaas-criar-cliente] Criando assinatura...", { plano, valor, nextDueStr, billingType });
    const subRes = await fetch(`${ASAAS_BASE}/subscriptions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "access_token": asaasKey },
      body: JSON.stringify({
        customer: customerId,
        billingType,
        value: valor,
        nextDueDate: nextDueStr,
        cycle: "MONTHLY",
        description: `ViaHub — Plano ${PLANO_LABEL[plano] || plano}`,
      }),
    });

    const subData = await subRes.json();
    if (!subRes.ok) {
      console.error("[asaas-criar-cliente] Erro assinatura:", subData);
      return new Response(JSON.stringify({ error: "Erro ao criar assinatura", details: subData }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[asaas-criar-cliente] Assinatura criada:", subData.id);

    await supabaseAdmin.from("agencias").update({
      asaas_subscription_id: subData.id,
      data_proximo_vencimento: nextDueStr,
    }).eq("id", agencia_id);

    // Get first payment to return invoiceUrl
    let invoiceUrl: string | undefined;
    let boletoUrl: string | undefined;

    try {
      console.log("[asaas-criar-cliente] Buscando primeiro pagamento...");
      const paymentsRes = await fetch(`${ASAAS_BASE}/subscriptions/${subData.id}/payments?limit=1`, {
        headers: { "access_token": asaasKey },
      });
      const paymentsData = await paymentsRes.json();
      console.log("[asaas-criar-cliente] Payments:", JSON.stringify(paymentsData));

      if (paymentsData?.data?.length > 0) {
        const firstPayment = paymentsData.data[0];
        invoiceUrl = firstPayment.invoiceUrl;
        boletoUrl = firstPayment.bankSlipUrl;

        // Save payment to asaas_pagamentos
        await supabaseAdmin.from("asaas_pagamentos").insert({
          agencia_id,
          asaas_payment_id: firstPayment.id,
          status: firstPayment.status,
          valor: firstPayment.value,
          vencimento: firstPayment.dueDate,
          forma_pagamento: billingType,
          boleto_url: firstPayment.bankSlipUrl || null,
          boleto_linha_digitavel: firstPayment.nossoNumero || null,
        });
      }
    } catch (e) {
      console.error("[asaas-criar-cliente] Erro ao buscar pagamento:", (e as Error).message);
    }

    return new Response(JSON.stringify({
      success: true,
      customer_id: customerId,
      subscription_id: subData.id,
      invoiceUrl,
      boletoUrl,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[asaas-criar-cliente] Erro:", (err as Error).message);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
