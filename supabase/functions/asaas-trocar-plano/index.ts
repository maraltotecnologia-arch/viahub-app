import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ASAAS_BASE = "https://sandbox.asaas.com/api/v3";
const PLANO_VALOR: Record<string, number> = { starter: 397, pro: 697, elite: 1997 };
const PLANO_LABEL: Record<string, string> = { starter: "Starter", pro: "Pro", elite: "Elite" };

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

    const { agencia_id, novo_plano } = await req.json();

    if (!agencia_id || !novo_plano || !PLANO_VALOR[novo_plano]) {
      return new Response(JSON.stringify({ error: "Dados inválidos", code: "PAG007" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: agencia, error: agErr } = await supabaseAdmin
      .from("agencias")
      .select("asaas_subscription_id, plano")
      .eq("id", agencia_id)
      .single();

    if (agErr || !agencia?.asaas_subscription_id) {
      return new Response(JSON.stringify({ error: "Assinatura não encontrada", code: "PAG008" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (agencia.plano === novo_plano) {
      return new Response(JSON.stringify({ error: "Já está neste plano", code: "PAG007" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const novoValor = PLANO_VALOR[novo_plano];

    // Update subscription in Asaas
    const res = await fetch(`${ASAAS_BASE}/subscriptions/${agencia.asaas_subscription_id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "access_token": asaasKey },
      body: JSON.stringify({
        value: novoValor,
        description: `ViaHub — Plano ${PLANO_LABEL[novo_plano]}`,
      }),
    });

    const resData = await res.json();
    console.log("[asaas-trocar-plano] Asaas response:", JSON.stringify(resData));

    if (!res.ok) {
      return new Response(JSON.stringify({ error: resData.errors?.[0]?.description || "Erro ao atualizar assinatura", code: "PAG007" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update local database
    await supabaseAdmin.from("agencias").update({ plano: novo_plano }).eq("id", agencia_id);

    return new Response(JSON.stringify({ success: true, plano: novo_plano }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[asaas-trocar-plano] Erro:", (err as Error).message);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
