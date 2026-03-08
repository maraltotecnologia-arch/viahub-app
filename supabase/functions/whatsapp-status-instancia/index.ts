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
    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL")?.replace(/\/+$/, "") || "";
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      console.error("[whatsapp-status] Variáveis EVOLUTION não configuradas");
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

    // Fetch instance from DB
    const { data: instancia } = await supabaseAdmin
      .from("whatsapp_instancias")
      .select("*")
      .eq("agencia_id", agencia_id)
      .maybeSingle();

    if (!instancia) {
      return new Response(
        JSON.stringify({ status: "not_configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[whatsapp-status] Verificando instância:", instancia.instance_name, "status DB:", instancia.status);

    // Check real status on Evolution API
    let realStatus = "disconnected";
    let numero: string | null = instancia.numero || null;
    let qrcode: string | null = null;

    try {
      const stateRes = await fetch(
        `${EVOLUTION_API_URL}/instance/connectionState/${instancia.instance_name}`,
        { headers: { apikey: EVOLUTION_API_KEY } }
      );

      if (stateRes.ok) {
        const stateData = await stateRes.json();
        const state = stateData?.instance?.state || stateData?.state || "close";
        console.log("[whatsapp-status] Evolution state:", state, "raw:", JSON.stringify(stateData));

        if (state === "open") {
          realStatus = "connected";
        } else if (state === "connecting") {
          realStatus = "connecting";
        } else {
          realStatus = "disconnected";
        }
      } else {
        console.warn("[whatsapp-status] Evolution retornou status:", stateRes.status);
        realStatus = "disconnected";
      }
    } catch (e) {
      console.warn("[whatsapp-status] Erro ao consultar Evolution:", (e as Error).message);
      realStatus = "disconnected";
    }

    // Fetch connected phone number if open
    if (realStatus === "connected") {
      try {
        const fetchRes = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
          headers: { apikey: EVOLUTION_API_KEY },
        });

        if (fetchRes.ok) {
          const instances = await fetchRes.json();
          const found = Array.isArray(instances)
            ? instances.find((i: any) => i.instance?.instanceName === instancia.instance_name)
            : null;

          if (found?.instance?.owner) {
            numero = found.instance.owner.replace("@s.whatsapp.net", "");
            console.log("[whatsapp-status] Número encontrado:", numero);
          }
        }
      } catch (e) {
        console.warn("[whatsapp-status] Erro ao buscar número:", (e as Error).message);
      }
    }

    // If connecting, fetch a fresh QR code
    if (realStatus === "connecting") {
      try {
        const qrRes = await fetch(
          `${EVOLUTION_API_URL}/instance/connect/${instancia.instance_name}`,
          { headers: { apikey: EVOLUTION_API_KEY } }
        );

        if (qrRes.ok) {
          const qrData = await qrRes.json();
          qrcode = qrData?.base64 || qrData?.qrcode?.base64 || qrData?.qrcode || null;
          console.log("[whatsapp-status] QR atualizado:", !!qrcode);
        }
      } catch (e) {
        console.warn("[whatsapp-status] Erro ao buscar QR:", (e as Error).message);
      }
    }

    // Sync database with real status
    const dbStatus = realStatus === "connected" ? "open" : realStatus;
    await supabaseAdmin
      .from("whatsapp_instancias")
      .update({
        status: dbStatus,
        numero: numero || null,
        ultima_verificacao: new Date().toISOString(),
      })
      .eq("agencia_id", agencia_id);

    console.log("[whatsapp-status] Sincronizado. Status:", realStatus, "Número:", numero);

    return new Response(
      JSON.stringify({
        status: realStatus,
        numero,
        instanceName: instancia.instance_name,
        qrcode,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[whatsapp-status] Erro fatal:", (err as Error).message, (err as Error).stack);
    return new Response(
      JSON.stringify({ error: (err as Error).message, code: "SYS001" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
