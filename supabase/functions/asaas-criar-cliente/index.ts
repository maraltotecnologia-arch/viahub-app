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

    // Fetch agency data
    const { data: agencia, error: agError } = await supabaseAdmin
      .from("agencias")
      .select("id, nome_fantasia, email, cnpj, plano, telefone")
      .eq("id", agencia_id)
      .single();

    if (agError || !agencia) {
      console.error("[asaas-criar-cliente] Agência não encontrada:", agError);
      return new Response(JSON.stringify({ error: "Agência não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if already has customer
    if (agencia.asaas_customer_id) {
      console.log("[asaas-criar-cliente] Agência já possui customer_id:", agencia.asaas_customer_id);
      return new Response(JSON.stringify({ success: true, already_exists: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1: Create customer in Asaas
    console.log("[asaas-criar-cliente] Criando cliente no Asaas...");
    const customerRes = await fetch(`${ASAAS_BASE}/customers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token": asaasKey,
      },
      body: JSON.stringify({
        name: agencia.nome_fantasia,
        email: agencia.email || undefined,
        cpfCnpj: agencia.cnpj?.replace(/\D/g, "") || undefined,
        phone: agencia.telefone?.replace(/\D/g, "") || undefined,
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

    const customerId = customerData.id;
    console.log("[asaas-criar-cliente] Cliente criado:", customerId);

    // Save customer ID
    await supabaseAdmin
      .from("agencias")
      .update({ asaas_customer_id: customerId })
      .eq("id", agencia_id);

    // Step 2: Create subscription
    const plano = agencia.plano || "starter";
    const valor = PLANO_VALOR[plano] || 397;

    // Next due date: day 10 of current or next month
    const now = new Date();
    let nextDue: Date;
    if (now.getDate() <= 10) {
      nextDue = new Date(now.getFullYear(), now.getMonth(), 10);
    } else {
      nextDue = new Date(now.getFullYear(), now.getMonth() + 1, 10);
    }
    const nextDueStr = nextDue.toISOString().split("T")[0];

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

    // Save subscription ID and next due date
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
