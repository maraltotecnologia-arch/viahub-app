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
      console.error("[whatsapp-criar] Variáveis EVOLUTION não configuradas");
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
    if (!agencia_id) {
      return new Response(
        JSON.stringify({ error: "agencia_id obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[whatsapp-criar] agencia_id:", agencia_id);

    // Check existing instance
    const { data: existing } = await supabaseAdmin
      .from("whatsapp_instancias")
      .select("*")
      .eq("agencia_id", agencia_id)
      .maybeSingle();

    if (existing) {
      if (existing.status === "open" || existing.status === "connected") {
        console.log("[whatsapp-criar] Já conectado");
        return new Response(
          JSON.stringify({ alreadyConnected: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Delete old instance from Evolution
      console.log("[whatsapp-criar] Removendo instância antiga:", existing.instance_name);
      try {
        await fetch(`${EVOLUTION_API_URL}/instance/logout/${existing.instance_name}`, {
          method: "DELETE",
          headers: { apikey: EVOLUTION_API_KEY },
        });
      } catch (e) {
        console.warn("[whatsapp-criar] Logout falhou (ignorado):", (e as Error).message);
      }

      try {
        await fetch(`${EVOLUTION_API_URL}/instance/delete/${existing.instance_name}`, {
          method: "DELETE",
          headers: { apikey: EVOLUTION_API_KEY },
        });
      } catch (e) {
        console.warn("[whatsapp-criar] Delete falhou (ignorado):", (e as Error).message);
      }

      await supabaseAdmin.from("whatsapp_instancias").delete().eq("id", existing.id);
      console.log("[whatsapp-criar] Registro antigo removido do banco");
    }

    const cleanAgencia = agencia_id.replace(/-/g, "");
    const suffix = Date.now().toString(36).slice(-6);
    const instanceName = `viahub_${cleanAgencia.slice(0, 8)}_${suffix}`;
    console.log("[whatsapp-criar] Criando instância:", instanceName);

    // Create instance WITHOUT qrcode: true to avoid race condition
    const createRes = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
      method: "POST",
      headers: {
        apikey: EVOLUTION_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        instanceName,
        integration: "WHATSAPP-BAILEYS",
      }),
    });

    const createData = await createRes.json();
    console.log("[whatsapp-criar] Create status:", createRes.status, "response:", JSON.stringify(createData));

    if (!createRes.ok) {
      return new Response(
        JSON.stringify({
          error: "Erro ao criar instância WhatsApp",
          code: "WPP002",
          details: createData,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Save to database - polling will handle QR code retrieval
    const { error: insertErr } = await supabaseAdmin.from("whatsapp_instancias").insert({
      agencia_id,
      instance_name: instanceName,
      status: "connecting",
    });

    if (insertErr) {
      console.error("[whatsapp-criar] Erro ao salvar no banco:", insertErr.message);
      return new Response(
        JSON.stringify({ error: "Erro ao salvar instância", code: "WPP002", details: insertErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[whatsapp-criar] SUCESSO. QR Code será buscado pelo polling de status.");

    return new Response(
      JSON.stringify({ instanceName }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[whatsapp-criar] Erro fatal:", (err as Error).message, (err as Error).stack);
    return new Response(
      JSON.stringify({ error: (err as Error).message, code: "WPP002" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
