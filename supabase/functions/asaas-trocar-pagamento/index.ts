import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ASAAS_BASE = "https://sandbox.asaas.com/api/v3";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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

    const body = await req.json();
    const { agencia_id, novo_metodo, cardNumber, cardHolderName, cardExpiryMonth, cardExpiryYear, cardCvv } = body;

    if (!agencia_id || !novo_metodo || !["CREDIT_CARD", "PIX", "BOLETO"].includes(novo_metodo)) {
      return new Response(JSON.stringify({ error: "Dados inválidos" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (novo_metodo === "CREDIT_CARD" && (!cardNumber || !cardHolderName || !cardExpiryMonth || !cardExpiryYear || !cardCvv)) {
      return new Response(JSON.stringify({ error: "Dados do cartão incompletos" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[asaas-trocar-pagamento] Buscando agência ${agencia_id}`);

    const { data: agencia, error: agErr } = await supabaseAdmin
      .from("agencias")
      .select("asaas_subscription_id, email, cnpj, cep, telefone")
      .eq("id", agencia_id)
      .single();

    if (agErr || !agencia?.asaas_subscription_id) {
      console.error("[asaas-trocar-pagamento] Agência/assinatura não encontrada:", agErr);
      return new Response(JSON.stringify({ error: "Assinatura não encontrada" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[asaas-trocar-pagamento] Atualizando para ${novo_metodo} na subscription ${agencia.asaas_subscription_id}`);

    let asaasBody: Record<string, unknown> = { billingType: novo_metodo };

    if (novo_metodo === "CREDIT_CARD") {
      asaasBody = {
        ...asaasBody,
        creditCard: {
          holderName: cardHolderName,
          number: cardNumber.replace(/\s/g, ""),
          expiryMonth: cardExpiryMonth,
          expiryYear: cardExpiryYear,
          ccv: cardCvv,
        },
        creditCardHolderInfo: {
          name: cardHolderName,
          email: agencia.email || "",
          cpfCnpj: agencia.cnpj?.replace(/\D/g, "") || "",
          postalCode: agencia.cep?.replace(/\D/g, "") || "00000000",
          addressNumber: "0",
          phone: agencia.telefone?.replace(/\D/g, "") || undefined,
        },
      };
    }

    const res = await fetch(`${ASAAS_BASE}/subscriptions/${agencia.asaas_subscription_id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "access_token": asaasKey },
      body: JSON.stringify(asaasBody),
    });

    const resData = await res.json();
    console.log("[asaas-trocar-pagamento] Asaas response:", JSON.stringify(resData));

    if (!res.ok) {
      const errorMsg = resData.errors?.[0]?.description || "Erro ao atualizar método de pagamento";
      console.error("[asaas-trocar-pagamento] Erro Asaas:", errorMsg);
      return new Response(JSON.stringify({ error: errorMsg }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Atualizar forma_pagamento no último registro de pagamento
    const { data: ultimoPag } = await supabaseAdmin
      .from("asaas_pagamentos")
      .select("id")
      .eq("agencia_id", agencia_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (ultimoPag) {
      await supabaseAdmin
        .from("asaas_pagamentos")
        .update({ forma_pagamento: novo_metodo })
        .eq("id", ultimoPag.id);
      console.log("[asaas-trocar-pagamento] Atualizado forma_pagamento no pagamento", ultimoPag.id);
    }

    console.log("[asaas-trocar-pagamento] Sucesso!");
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[asaas-trocar-pagamento] Erro:", (err as Error).message);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
