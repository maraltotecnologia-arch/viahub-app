import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    if (!agencia_id) {
      return new Response(
        JSON.stringify({ error: "ID da agência não fornecido", code: "SYS002" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
    console.log("[whatsapp-status] Verificando:", instanceName);

    let evolutionState = "close";
    try {
      const stateRes = await fetch(
        `${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`,
        { headers: { apikey: EVOLUTION_API_KEY } }
      );
      if (stateRes.ok) {
        const stateData = await stateRes.json();
        evolutionState = stateData?.instance?.state || stateData?.state || "close";
        console.log("[whatsapp-status] Evolution state:", evolutionState);
      }
    } catch (e) {
      console.warn("[whatsapp-status] Erro connectionState:", (e as Error).message);
    }

    let status = "disconnected";
    let numero: string | null = instancia.numero || null;
    let qrcode: string | null = null;

    if (evolutionState === "open") {
      status = "connected";
      try {
        const fetchRes = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
          headers: { apikey: EVOLUTION_API_KEY },
        });
        if (fetchRes.ok) {
          const instances = await fetchRes.json();
          const found = Array.isArray(instances)
            ? instances.find((i: any) => i.instance?.instanceName === instanceName || i.name === instanceName)
            : null;
          const owner = found?.instance?.owner || found?.ownerJid || null;
          if (owner) {
            numero = String(owner).replace("@s.whatsapp.net", "");
          }
        }
      } catch (e) {
        console.warn("[whatsapp-status] Erro ao buscar número:", (e as Error).message);
      }
    } else if (evolutionState === "connecting" || evolutionState === "close") {
      status = "connecting";

      const first = await requestConnect(EVOLUTION_API_URL, EVOLUTION_API_KEY, instanceName);
      qrcode = first.base64Image;

      // Fallback for Baileys socket hang (count:0)
      if (!qrcode && first.isStuck) {
        console.warn("[whatsapp-status] Baileys travado (count:0). Executando reset leve (logout + reconnect)");

        try {
          await fetch(`${EVOLUTION_API_URL}/instance/logout/${instanceName}`, {
            method: "DELETE",
            headers: { apikey: EVOLUTION_API_KEY },
          });
        } catch (e) {
          console.warn("[whatsapp-status] Logout de recuperação falhou:", (e as Error).message);
        }

        await new Promise((r) => setTimeout(r, 1000));

        const second = await requestConnect(EVOLUTION_API_URL, EVOLUTION_API_KEY, instanceName);
        qrcode = second.base64Image;
      }

      if (!qrcode) {
        qrcode = await tryExtractQrFromFetchInstances(EVOLUTION_API_URL, EVOLUTION_API_KEY, instanceName);
      }

      if (qrcode) {
        console.log("[whatsapp-status] QR Code resgatado com sucesso");
      }
    }

    // Only update DB if status or numero actually changed
    const newDbStatus = status === "connected" ? "open" : status;
    const dbStatusChanged = instancia.status !== newDbStatus;
    const dbNumeroChanged = (numero || null) !== (instancia.numero || null);

    if (dbStatusChanged || dbNumeroChanged) {
      await supabaseAdmin
        .from("whatsapp_instancias")
        .update({
          status: newDbStatus,
          numero: numero || null,
          ultima_verificacao: new Date().toISOString(),
        })
        .eq("agencia_id", agencia_id);
    }

    return new Response(
      JSON.stringify({ status, numero, instanceName, qrcode }),
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

async function requestConnect(baseUrl: string, apiKey: string, instanceName: string) {
  try {
    const connectRes = await fetch(`${baseUrl}/instance/connect/${instanceName}`, {
      headers: { apikey: apiKey },
    });

    if (!connectRes.ok) {
      console.log("[whatsapp-status] /connect retornou:", connectRes.status);
      return { base64Image: null as string | null, isStuck: false };
    }

    const qrData = await connectRes.json();
    console.log("[whatsapp-status] Payload /connect:", JSON.stringify(qrData));

    const base64Image =
      qrData?.base64 ||
      qrData?.qrcode?.base64 ||
      (typeof qrData?.qrcode === "string" && qrData.qrcode.length > 100 ? qrData.qrcode : null) ||
      null;

    const count = qrData?.count ?? qrData?.qrcode?.count;
    const isStuck = !base64Image && count === 0;

    if (!base64Image) {
      console.log("[whatsapp-status] /connect sem QR ainda. count:", count);
    }

    return { base64Image, isStuck };
  } catch (e) {
    console.warn("[whatsapp-status] Erro /connect:", (e as Error).message);
    return { base64Image: null as string | null, isStuck: false };
  }
}

async function tryExtractQrFromFetchInstances(baseUrl: string, apiKey: string, instanceName: string): Promise<string | null> {
  try {
    const fetchRes = await fetch(`${baseUrl}/instance/fetchInstances`, {
      headers: { apikey: apiKey },
    });

    if (!fetchRes.ok) return null;

    const instances = await fetchRes.json();
    const found = Array.isArray(instances)
      ? instances.find((i: any) => i.instance?.instanceName === instanceName || i.name === instanceName)
      : instances;

    const base64Image =
      found?.qrcode?.base64 ||
      found?.qrcode?.pairingCode ||
      found?.qrcode ||
      found?.instance?.qrcode?.base64 ||
      null;

    if (typeof base64Image === "string" && base64Image.length > 100) {
      console.log("[whatsapp-status] QR recuperado via fetchInstances");
      return base64Image;
    }

    return null;
  } catch (e) {
    console.warn("[whatsapp-status] Erro fetchInstances fallback:", (e as Error).message);
    return null;
  }
}
