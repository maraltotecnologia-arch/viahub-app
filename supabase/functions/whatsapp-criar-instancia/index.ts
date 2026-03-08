import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  console.log("[whatsapp-criar-instancia] INÍCIO");

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
    if (!agencia_id) {
      return new Response(JSON.stringify({ error: "agencia_id obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[whatsapp-criar-instancia] agencia_id:", agencia_id);

    // Check existing instance
    const { data: existing } = await supabaseAdmin
      .from("whatsapp_instancias")
      .select("*")
      .eq("agencia_id", agencia_id)
      .maybeSingle();

    if (existing) {
      if (existing.status === "open" || existing.status === "connected") {
        console.log("[whatsapp-criar-instancia] Já conectado");
        return new Response(JSON.stringify({ alreadyConnected: true }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Delete old instance from Evolution
      console.log("[whatsapp-criar-instancia] Deletando instância antiga:", existing.instance_name);
      try {
        await fetch(`${EVOLUTION_API_URL}/instance/delete/${existing.instance_name}`, {
          method: "DELETE",
          headers: { apikey: EVOLUTION_API_KEY },
        });
      } catch (e) {
        console.warn("[whatsapp-criar-instancia] Erro ao deletar instância antiga (ignorado):", (e as Error).message);
      }

      await supabaseAdmin.from("whatsapp_instancias").delete().eq("id", existing.id);
    }

    // Generate unique name
    const instanceName = `viahub_${agencia_id.replace(/-/g, "").slice(0, 12)}`;
    console.log("[whatsapp-criar-instancia] Criando instância:", instanceName);

    // Create instance
    const createRes = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
      method: "POST",
      headers: { apikey: EVOLUTION_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        instanceName,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
      }),
    });

    const createData = await createRes.json();
    console.log("[whatsapp-criar-instancia] Create response status:", createRes.status);

    if (!createRes.ok) {
      console.error("[whatsapp-criar-instancia] Erro ao criar:", JSON.stringify(createData));
      return new Response(JSON.stringify({ error: "Erro ao criar instância", code: "WPP002", details: createData }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch QR code
    console.log("[whatsapp-criar-instancia] Buscando QR Code...");
    const qrRes = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
      headers: { apikey: EVOLUTION_API_KEY },
    });
    const qrData = await qrRes.json();
    console.log("[whatsapp-criar-instancia] QR response status:", qrRes.status);

    // Save to database
    await supabaseAdmin.from("whatsapp_instancias").insert({
      agencia_id,
      instance_name: instanceName,
      status: "connecting",
    });

    const qrcode = qrData?.base64 || qrData?.qrcode?.base64 || qrData?.qrcode || null;

    console.log("[whatsapp-criar-instancia] SUCESSO. QR disponível:", !!qrcode);

    return new Response(JSON.stringify({
      instanceName,
      qrcode,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[whatsapp-criar-instancia] Erro:", (err as Error).message);
    return new Response(JSON.stringify({ error: (err as Error).message, code: "WPP002" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
