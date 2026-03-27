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
    const asaasKey = Deno.env.get("ASAAS_API_KEY");
    if (!asaasKey) {
      return new Response(JSON.stringify({ error: "ASAAS_API_KEY não configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { agencia_id } = await req.json();
    if (!agencia_id) {
      return new Response(JSON.stringify({ error: "agencia_id é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log(`[asaas-verificar-assinatura] Buscando agência ${agencia_id}`);

    const { data: agencia, error: agErr } = await supabaseAdmin
      .from("agencias")
      .select("asaas_customer_id, asaas_subscription_id, plano, email, cnpj, telefone, cep")
      .eq("id", agencia_id)
      .single();

    if (agErr || !agencia) {
      console.error("[asaas-verificar-assinatura] Agência não encontrada:", agErr);
      return new Response(JSON.stringify({ error: "Agência não encontrada" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: Check if subscription ID exists locally
    if (!agencia.asaas_subscription_id) {
      console.log("[asaas-verificar-assinatura] Sem asaas_subscription_id no banco");
      return new Response(JSON.stringify({ exists: false, reason: "no_subscription_id" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const subscriptionId = agencia.asaas_subscription_id;
    console.log(`[asaas-verificar-assinatura] Consultando Asaas: ${subscriptionId}`);

    // Step 3: Query Asaas
    const subRes = await fetch(`${ASAAS_BASE}/subscriptions/${subscriptionId}`, {
      headers: { "User-Agent": "ViaHub/1.0", "access_token": asaasKey },
    });

    // Step 4: Handle 404 or deleted
    if (!subRes.ok) {
      console.log(`[asaas-verificar-assinatura] Asaas retornou ${subRes.status} para ${subscriptionId}`);
      
      // Clear subscription ID from DB
      await supabaseAdmin
        .from("agencias")
        .update({ asaas_subscription_id: null })
        .eq("id", agencia_id);
      console.log("[asaas-verificar-assinatura] asaas_subscription_id limpo do banco");

      return new Response(JSON.stringify({ exists: false, reason: "deleted" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const subData = await subRes.json();
    console.log(`[asaas-verificar-assinatura] Status da assinatura: ${subData.status}, deleted: ${subData.deleted}`);

    if (subData.deleted === true) {
      console.log("[asaas-verificar-assinatura] Assinatura marcada como deleted no Asaas");
      
      await supabaseAdmin
        .from("agencias")
        .update({ asaas_subscription_id: null })
        .eq("id", agencia_id);
      console.log("[asaas-verificar-assinatura] asaas_subscription_id limpo do banco");

      return new Response(JSON.stringify({ exists: false, reason: "deleted" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 5: Check for inactive/expired
    if (subData.status === "INACTIVE" || subData.status === "EXPIRED") {
      console.log(`[asaas-verificar-assinatura] Assinatura ${subData.status}`);
      return new Response(JSON.stringify({ exists: false, reason: "inactive" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 6: Active
    console.log("[asaas-verificar-assinatura] Assinatura ACTIVE");
    return new Response(JSON.stringify({ exists: true, subscription: subData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[asaas-verificar-assinatura] Erro:", (err as Error).message);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
