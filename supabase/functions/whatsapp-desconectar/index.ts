import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      console.error("[whatsapp-desconectar] Variáveis EVOLUTION não configuradas");
      return new Response(
        JSON.stringify({ error: "Configuração do servidor incompleta", code: "SYS001" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado", code: "AUTH009" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) {
      return new Response(
        JSON.stringify({ error: "Não autorizado", code: "AUTH009" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { agencia_id } = await req.json();

    const { data: instancia } = await supabaseAdmin
      .from("whatsapp_instancias")
      .select("*")
      .eq("agencia_id", agencia_id)
      .maybeSingle();

    if (!instancia) {
      console.log("[whatsapp-desconectar] Nenhuma instância encontrada, retornando sucesso");
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[whatsapp-desconectar] Desconectando:", instancia.instance_name);

    // Logout from Evolution (ignore errors)
    try {
      const logoutRes = await fetch(
        `${EVOLUTION_API_URL}/instance/logout/${instancia.instance_name}`,
        { method: "DELETE", headers: { apikey: EVOLUTION_API_KEY } }
      );
      console.log("[whatsapp-desconectar] Logout status:", logoutRes.status);
    } catch (e) {
      console.warn("[whatsapp-desconectar] Logout falhou (ignorado):", (e as Error).message);
    }

    // Delete instance from Evolution (ignore errors)
    try {
      const deleteRes = await fetch(
        `${EVOLUTION_API_URL}/instance/delete/${instancia.instance_name}`,
        { method: "DELETE", headers: { apikey: EVOLUTION_API_KEY } }
      );
      console.log("[whatsapp-desconectar] Delete status:", deleteRes.status);
    } catch (e) {
      console.warn("[whatsapp-desconectar] Delete falhou (ignorado):", (e as Error).message);
    }

    // Update database
    await supabaseAdmin
      .from("whatsapp_instancias")
      .update({ status: "disconnected", numero: null })
      .eq("agencia_id", agencia_id);

    console.log("[whatsapp-desconectar] SUCESSO");

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[whatsapp-desconectar] Erro fatal:", (err as Error).message, (err as Error).stack);
    return new Response(
      JSON.stringify({ error: (err as Error).message, code: "WPP005" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
