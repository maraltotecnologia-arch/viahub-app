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
    console.log("[whatsapp-status] Verificando:", instanceName);

    // Step 1: Get connection state from Evolution
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

    let status: string;
    let numero: string | null = instancia.numero || null;
    let qrcode: string | null = null;

    if (evolutionState === "open") {
      // ---- CONNECTED ----
      status = "connected";
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
            console.log("[whatsapp-status] Número:", numero);
          }
        }
      } catch (e) {
        console.warn("[whatsapp-status] Erro fetchInstances:", (e as Error).message);
      }
    } else if (evolutionState === "connecting" || evolutionState === "close") {
      // ---- CONNECTING or CLOSE: always call /connect to wake up Baileys ----
      status = "connecting";
      console.log("[whatsapp-status] Estado", evolutionState, "- chamando /instance/connect para acordar Baileys");

      try {
        const connectRes = await fetch(
          `${EVOLUTION_API_URL}/instance/connect/${instanceName}`,
          { headers: { apikey: EVOLUTION_API_KEY } }
        );

        if (connectRes.ok) {
          const qrData = await connectRes.json();
          console.log("[whatsapp-status] Payload /connect:", JSON.stringify(qrData).slice(0, 300));

          const base64Image = qrData?.base64
            || qrData?.qrcode?.base64
            || (typeof qrData?.qrcode === "string" && qrData.qrcode.length > 100 ? qrData.qrcode : null);

          if (base64Image) {
            qrcode = base64Image;
            console.log("[whatsapp-status] QR Code resgatado com sucesso, length:", qrcode!.length);
          } else {
            console.log("[whatsapp-status] /connect sem QR ainda. count:", qrData?.count);
          }
        } else {
          console.log("[whatsapp-status] /connect retornou:", connectRes.status);
        }
      } catch (e) {
        console.warn("[whatsapp-status] Erro /connect:", (e as Error).message);
      }
    } else {
      // ---- Any other state: disconnected ----
      status = "disconnected";
      console.log("[whatsapp-status] Estado não mapeado:", evolutionState, "-> disconnected");
    }

    // Sync DB
    const dbStatus = status === "connected" ? "open" : status;
    await supabaseAdmin
      .from("whatsapp_instancias")
      .update({
        status: dbStatus,
        numero: numero || null,
        ultima_verificacao: new Date().toISOString(),
      })
      .eq("agencia_id", agencia_id);

    console.log("[whatsapp-status] Final:", status, "QR:", !!qrcode);

    return new Response(
      JSON.stringify({ status, numero, instanceName, qrcode }),
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
