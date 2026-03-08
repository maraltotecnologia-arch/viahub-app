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
      return new Response(JSON.stringify({ status: "not_configured" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check real status on Evolution
    let realStatus = "disconnected";
    let numero: string | null = null;
    let qrcode: string | null = null;

    try {
      const stateRes = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instancia.instance_name}`, {
        headers: { apikey: EVOLUTION_API_KEY },
      });
      const stateData = await stateRes.json();
      const state = stateData?.instance?.state || stateData?.state || "close";

      if (state === "open") realStatus = "connected";
      else if (state === "connecting") realStatus = "connecting";
      else realStatus = "disconnected";
    } catch (e) {
      console.warn("[whatsapp-status] Erro ao consultar Evolution:", (e as Error).message);
    }

    // Fetch number if connected
    if (realStatus === "connected") {
      try {
        const fetchRes = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
          headers: { apikey: EVOLUTION_API_KEY },
        });
        const instances = await fetchRes.json();
        const found = Array.isArray(instances)
          ? instances.find((i: any) => i.instance?.instanceName === instancia.instance_name)
          : null;
        numero = found?.instance?.owner || found?.instance?.profilePictureUrl ? instancia.numero : null;
        if (found?.instance?.owner) {
          numero = found.instance.owner.replace("@s.whatsapp.net", "");
        }
      } catch (_) { /* ignore */ }
    }

    // Fetch new QR if connecting
    if (realStatus === "connecting") {
      try {
        const qrRes = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instancia.instance_name}`, {
          headers: { apikey: EVOLUTION_API_KEY },
        });
        const qrData = await qrRes.json();
        qrcode = qrData?.base64 || qrData?.qrcode?.base64 || qrData?.qrcode || null;
      } catch (_) { /* ignore */ }
    }

    // Update database
    await supabaseAdmin.from("whatsapp_instancias").update({
      status: realStatus === "connected" ? "open" : realStatus,
      numero: numero || null,
      ultima_verificacao: new Date().toISOString(),
    }).eq("agencia_id", agencia_id);

    return new Response(JSON.stringify({
      status: realStatus,
      numero,
      instanceName: instancia.instance_name,
      qrcode,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[whatsapp-status] Erro:", (err as Error).message);
    return new Response(JSON.stringify({ error: (err as Error).message, code: "SYS001" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
