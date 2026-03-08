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
    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL")!;
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY")!;
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado", code: "AUTH009" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado", code: "AUTH009" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { agencia_id } = await req.json();

    const { data: instancia } = await supabaseAdmin
      .from("whatsapp_instancias")
      .select("*")
      .eq("agencia_id", agencia_id)
      .maybeSingle();

    if (!instancia) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Logout from Evolution
    try {
      await fetch(`${EVOLUTION_API_URL}/instance/logout/${instancia.instance_name}`, {
        method: "DELETE",
        headers: { apikey: EVOLUTION_API_KEY },
      });
    } catch (_) { /* ignore */ }

    // Delete instance from Evolution
    try {
      await fetch(`${EVOLUTION_API_URL}/instance/delete/${instancia.instance_name}`, {
        method: "DELETE",
        headers: { apikey: EVOLUTION_API_KEY },
      });
    } catch (_) { /* ignore */ }

    // Update database
    await supabaseAdmin.from("whatsapp_instancias").update({
      status: "disconnected",
      numero: null,
    }).eq("agencia_id", agencia_id);

    console.log("[whatsapp-desconectar] Desconectado:", instancia.instance_name);

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[whatsapp-desconectar] Erro:", (err as Error).message);
    return new Response(JSON.stringify({ error: (err as Error).message, code: "WPP005" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
