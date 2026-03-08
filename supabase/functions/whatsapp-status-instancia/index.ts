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
      return new Response(
        JSON.stringify({ error: "Configuração do servidor incompleta", code: "SYS001" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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
      return new Response(
        JSON.stringify({ status: "not_configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const instanceName = instancia.instance_name;
    console.log("[whatsapp-status] Verificando:", instanceName, "DB status:", instancia.status);

    // Step 1: Get connection state
    let realStatus = "disconnected";
    let numero: string | null = instancia.numero || null;
    let qrcode: string | null = null;

    try {
      const stateRes = await fetch(
        `${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`,
        { headers: { apikey: EVOLUTION_API_KEY } }
      );

      if (stateRes.ok) {
        const stateData = await stateRes.json();
        const state = stateData?.instance?.state || stateData?.state || "close";
        console.log("[whatsapp-status] Evolution state:", state);

        if (state === "open") {
          realStatus = "connected";
        } else if (state === "connecting") {
          realStatus = "connecting";
        } else {
          realStatus = "disconnected";
        }
      }
    } catch (e) {
      console.warn("[whatsapp-status] Erro connectionState:", (e as Error).message);
    }

    // Step 2: If connected, fetch phone number
    if (realStatus === "connected") {
      try {
        const fetchRes = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
          headers: { apikey: EVOLUTION_API_KEY },
        });
        if (fetchRes.ok) {
          const instances = await fetchRes.json();
          const found = Array.isArray(instances)
            ? instances.find((i: any) => i.instance?.instanceName === instanceName)
            : null;
          if (found?.instance?.owner) {
            numero = found.instance.owner.replace("@s.whatsapp.net", "");
          }
        }
      } catch (e) {
        console.warn("[whatsapp-status] Erro fetchInstances:", (e as Error).message);
      }
    }

    // Step 3: If connecting, fetch QR code with kickstart logic
    if (realStatus === "connecting") {
      qrcode = await fetchQrWithKickstart(EVOLUTION_API_URL, EVOLUTION_API_KEY, instanceName);
    }

    // Sync DB
    const dbStatus = realStatus === "connected" ? "open" : realStatus;
    await supabaseAdmin
      .from("whatsapp_instancias")
      .update({
        status: dbStatus,
        numero: numero || null,
        ultima_verificacao: new Date().toISOString(),
      })
      .eq("agencia_id", agencia_id);

    console.log("[whatsapp-status] Final:", realStatus, "QR:", !!qrcode);

    return new Response(
      JSON.stringify({ status: realStatus, numero, instanceName, qrcode }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[whatsapp-status] Erro fatal:", (err as Error).message);
    return new Response(
      JSON.stringify({ error: (err as Error).message, code: "SYS001" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Fetch QR code from Evolution API with "kickstart" logic.
 * If Baileys is stuck (returns count:0), force logout and retry.
 */
async function fetchQrWithKickstart(
  baseUrl: string,
  apikey: string,
  instanceName: string
): Promise<string | null> {
  // Attempt 1: GET /instance/connect
  let base64 = await tryGetQr(baseUrl, apikey, instanceName);
  if (base64) {
    console.log("[whatsapp-status] QR obtido na primeira tentativa");
    return base64;
  }

  // If we got here, Baileys is likely stuck. Execute kickstart.
  console.log("[whatsapp-status] Baileys travado (count:0). Executando Force Logout kickstart...");

  try {
    await fetch(`${baseUrl}/instance/logout/${instanceName}`, {
      method: "DELETE",
      headers: { apikey },
    });
  } catch (e) {
    console.warn("[whatsapp-status] Kickstart logout falhou:", (e as Error).message);
  }

  // Wait for Baileys to reset
  await new Promise((r) => setTimeout(r, 1500));

  // Attempt 2: Try connect again after kickstart
  base64 = await tryGetQr(baseUrl, apikey, instanceName);
  if (base64) {
    console.log("[whatsapp-status] QR obtido após kickstart!");
    return base64;
  }

  console.warn("[whatsapp-status] QR ainda não disponível após kickstart.");
  return null;
}

async function tryGetQr(
  baseUrl: string,
  apikey: string,
  instanceName: string
): Promise<string | null> {
  try {
    const res = await fetch(`${baseUrl}/instance/connect/${instanceName}`, {
      headers: { apikey },
    });

    if (!res.ok) {
      console.log("[whatsapp-status] GET /connect retornou:", res.status);
      return null;
    }

    const data = await res.json();
    console.log("[whatsapp-status] Payload /connect:", JSON.stringify(data).slice(0, 200));

    // Extract base64 from multiple possible paths
    const b64 =
      data?.base64 ||
      data?.qrcode?.base64 ||
      (typeof data?.qrcode === "string" && data.qrcode.length > 100 ? data.qrcode : null);

    if (b64) return b64;

    // Check if stuck (count: 0)
    if (data?.count === 0 || data?.qrcode?.count === 0) {
      console.log("[whatsapp-status] Baileys retornou count:0 (travado)");
    }

    return null;
  } catch (e) {
    console.warn("[whatsapp-status] Erro GET /connect:", (e as Error).message);
    return null;
  }
}
