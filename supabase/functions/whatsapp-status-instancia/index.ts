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

    // Step 1: Get connection state
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

    // Step 2: If connected, fetch phone number
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

    // Step 3: If connecting, try MULTIPLE approaches to get QR code
    if (realStatus === "connecting") {
      // Approach 1: GET /instance/connect/{name} (standard endpoint)
      try {
        const qrRes = await fetch(
          `${EVOLUTION_API_URL}/instance/connect/${instancia.instance_name}`,
          { headers: { apikey: EVOLUTION_API_KEY } }
        );

        if (qrRes.ok) {
          const qrData = await qrRes.json();
          console.log("[whatsapp-status] Payload do connect (GET):", JSON.stringify(qrData));

          // Check multiple paths for base64
          const base64Image = qrData?.base64 
            || qrData?.qrcode?.base64 
            || (typeof qrData?.qrcode === "string" && qrData.qrcode.length > 100 ? qrData.qrcode : null)
            || null;

          if (base64Image) {
            qrcode = base64Image;
            console.log("[whatsapp-status] QR Code resgatado via GET /connect, length:", qrcode!.length);
          } else {
            console.log("[whatsapp-status] GET /connect sem QR. count:", qrData?.count);
          }
        }
      } catch (e) {
        console.warn("[whatsapp-status] Erro GET /connect:", (e as Error).message);
      }

      // Approach 2: If GET didn't return QR, try fetchInstances (some versions expose QR there)
      if (!qrcode) {
        try {
          const fetchRes = await fetch(
            `${EVOLUTION_API_URL}/instance/fetchInstances?instanceName=${instancia.instance_name}`,
            { headers: { apikey: EVOLUTION_API_KEY } }
          );

          if (fetchRes.ok) {
            const fetchData = await fetchRes.json();
            console.log("[whatsapp-status] fetchInstances payload:", JSON.stringify(fetchData).slice(0, 500));

            // Try to find QR in fetchInstances response
            const instanceData = Array.isArray(fetchData)
              ? fetchData.find((i: any) => i.instance?.instanceName === instancia.instance_name)
              : fetchData;

            const base64FromFetch = instanceData?.qrcode?.base64
              || instanceData?.qrcode?.pairingCode
              || instanceData?.qrcode
              || null;

            if (base64FromFetch && typeof base64FromFetch === "string" && base64FromFetch.length > 100) {
              qrcode = base64FromFetch;
              console.log("[whatsapp-status] QR Code resgatado via fetchInstances, length:", qrcode!.length);
            }
          }
        } catch (e) {
          console.warn("[whatsapp-status] Erro fetchInstances:", (e as Error).message);
        }
      }

      // Approach 3: Try POST /instance/connect (some v2 versions require POST)
      if (!qrcode) {
        try {
          const qrResPost = await fetch(
            `${EVOLUTION_API_URL}/instance/connect/${instancia.instance_name}`,
            {
              method: "POST",
              headers: {
                apikey: EVOLUTION_API_KEY,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({}),
            }
          );

          if (qrResPost.ok) {
            const qrDataPost = await qrResPost.json();
            console.log("[whatsapp-status] Payload do connect (POST):", JSON.stringify(qrDataPost));

            const base64Post = qrDataPost?.base64
              || qrDataPost?.qrcode?.base64
              || (typeof qrDataPost?.qrcode === "string" && qrDataPost.qrcode.length > 100 ? qrDataPost.qrcode : null)
              || null;

            if (base64Post) {
              qrcode = base64Post;
              console.log("[whatsapp-status] QR Code resgatado via POST /connect, length:", qrcode!.length);
            } else {
              console.log("[whatsapp-status] POST /connect sem QR. Payload keys:", Object.keys(qrDataPost || {}));
            }
          } else {
            console.log("[whatsapp-status] POST /connect retornou:", qrResPost.status);
          }
        } catch (e) {
          console.warn("[whatsapp-status] Erro POST /connect:", (e as Error).message);
        }
      }

      if (!qrcode) {
        console.warn("[whatsapp-status] NENHUM método retornou QR Code. Possível bug Evolution API v2 (issue #2430).");
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

    console.log("[whatsapp-status] Sincronizado. Status:", realStatus, "Número:", numero, "QR:", !!qrcode);

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
