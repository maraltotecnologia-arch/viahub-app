import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY")!;
const ASAAS_BASE = "https://sandbox.asaas.com/api/v3";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { agencia_id } = await req.json();
    console.log("[asaas-atualizar-cliente] agencia_id:", agencia_id);

    if (!agencia_id) {
      return new Response(
        JSON.stringify({ error: "agencia_id obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: agencia, error: agErr } = await supabaseAdmin
      .from("agencias")
      .select("nome_fantasia, email, telefone, cnpj, asaas_customer_id")
      .eq("id", agencia_id)
      .single();

    if (agErr || !agencia) {
      console.error("[asaas-atualizar-cliente] Agência não encontrada:", agErr);
      return new Response(
        JSON.stringify({ error: "Agência não encontrada", code: "AGE003" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!agencia.asaas_customer_id) {
      console.log("[asaas-atualizar-cliente] Sem customer_id, pulando sync");
      return new Response(
        JSON.stringify({ success: true, skipped: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const telefoneLimpo = (agencia.telefone || "").replace(/\D/g, "");
    const telefoneValido = telefoneLimpo.length >= 10 ? telefoneLimpo : undefined;

    const body: Record<string, unknown> = {
      name: agencia.nome_fantasia,
    };
    if (agencia.email) body.email = agencia.email;
    if (agencia.cnpj) body.cpfCnpj = agencia.cnpj.replace(/\D/g, "");
    if (telefoneValido) body.mobilePhone = telefoneValido;

    console.log("[asaas-atualizar-cliente] Atualizando Asaas:", JSON.stringify(body));

    const asaasRes = await fetch(`${ASAAS_BASE}/customers/${agencia.asaas_customer_id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: ASAAS_API_KEY,
      },
      body: JSON.stringify(body),
    });

    const asaasData = await asaasRes.text();
    console.log("[asaas-atualizar-cliente] Resposta Asaas:", asaasRes.status, asaasData);

    if (!asaasRes.ok) {
      return new Response(
        JSON.stringify({ error: "Erro ao atualizar no Asaas", details: asaasData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[asaas-atualizar-cliente] Erro:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno", code: "SYS001" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
