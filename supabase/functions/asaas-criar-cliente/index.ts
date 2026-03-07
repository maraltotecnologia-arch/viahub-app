import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ASAAS_BASE = "https://sandbox.asaas.com/api/v3";

const PLANO_VALOR: Record<string, number> = {
  starter: 397,
  pro: 697,
  elite: 1997,
};

const PLANO_LABEL: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  elite: "Elite",
};

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
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { agencia_id } = await req.json();
    if (!agencia_id) {
      return new Response(JSON.stringify({ error: "agencia_id é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch ALL agency fields
    const { data: agencia, error: agError } = await supabaseAdmin
      .from("agencias")
      .select("*")
      .eq("id", agencia_id)
      .single();

    if (agError || !agencia) {
      console.error("[asaas-criar-cliente] Agência não encontrada:", agError);
      return new Response(JSON.stringify({ error: "Agência não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[asaas-criar-cliente] Campos da agência:", JSON.stringify(agencia));

    // Map fields
    const nome = agencia.nome_fantasia;
    const email = agencia.email || undefined;
    const cnpjLimpo = agencia.cnpj?.replace(/\D/g, "") || "";
    const telefone = agencia.telefone?.replace(/\D/g, "") || undefined;

    // Validate CNPJ
    if (!cnpjLimpo || cnpjLimpo.length < 11) {
      console.error("[asaas-criar-cliente] CNPJ inválido ou ausente:", cnpjLimpo);
      return new Response(JSON.stringify({ error: "CNPJ obrigatório para criar assinatura" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const plano = agencia.plano || "starter";
    const valor = PLANO_VALOR[plano] || 397;

    // Calculate next due date
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
      // Customer already exists — update with CNPJ
      console.log(`[asaas-criar-cliente] Cliente já existe (${customerId}), atualizando com CNPJ...`);
      const updateRes = await fetch(`${ASAAS_BASE}/customers/${customerId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "access_token": asaasKey,
        },
        body: JSON.stringify({
          cpfCnpj: cnpjLimpo,
          name: nome,
          email,
          phone: telefone,
        }),
      });

      const updateData = await updateRes.json();
      if (!updateRes.ok) {
        console.error("[asaas-criar-cliente] Erro ao atualizar cliente:", updateData);
        return new Response(JSON.stringify({ error: "Erro ao atualizar cliente no Asaas", details: updateData }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.log("[asaas-criar-cliente] Cliente atualizado com CNPJ");
    } else {
      // Create new customer with CNPJ
      console.log("[asaas-criar-cliente] Criando cliente no Asaas...");
      const customerRes = await fetch(`${ASAAS_BASE}/customers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "access_token": asaasKey,
        },
        body: JSON.stringify({
          name: nome,
          email,
          cpfCnpj: cnpjLimpo,
          phone: telefone,
          externalReference: agencia_id,
        }),
      });

      const customerData = await customerRes.json();
      if (!customerRes.ok) {
        console.error("[asaas-criar-cliente] Erro ao criar cliente:", customerData);
        return new Response(JSON.stringify({ error: "Erro ao criar cliente no Asaas", details: customerData }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      customerId = customerData.id;
      console.log("[asaas-criar-cliente] Cliente criado:", customerId);

      await supabaseAdmin
        .from("agencias")
        .update({ asaas_customer_id: customerId })
        .eq("id", agencia_id);
    }

    // Check if subscription already exists
    if (agencia.asaas_subscription_id) {
      console.log("[asaas-criar-cliente] Assinatura já existe:", agencia.asaas_subscription_id);
      return new Response(JSON.stringify({ success: true, customer_id: customerId, subscription_id: agencia.asaas_subscription_id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create subscription
    console.log("[asaas-criar-cliente] Criando assinatura...", { plano, valor, nextDueStr });
    const subRes = await fetch(`${ASAAS_BASE}/subscriptions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token": asaasKey,
      },
      body: JSON.stringify({
        customer: customerId,
        billingType: "UNDEFINED",
        value: valor,
        nextDueDate: nextDueStr,
        cycle: "MONTHLY",
        description: `ViaHub — Plano ${PLANO_LABEL[plano] || plano}`,
      }),
    });

    const subData = await subRes.json();
    if (!subRes.ok) {
      console.error("[asaas-criar-cliente] Erro ao criar assinatura:", subData);
      return new Response(JSON.stringify({ error: "Erro ao criar assinatura", details: subData }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[asaas-criar-cliente] Assinatura criada:", subData.id);

    await supabaseAdmin
      .from("agencias")
      .update({
        asaas_subscription_id: subData.id,
        data_proximo_vencimento: nextDueStr,
      })
      .eq("id", agencia_id);

    return new Response(JSON.stringify({ success: true, customer_id: customerId, subscription_id: subData.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[asaas-criar-cliente] Erro:", (err as Error).message);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
