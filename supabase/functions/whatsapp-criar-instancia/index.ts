import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { fetchWithTimeout } from "../_shared/fetch-with-timeout.ts";

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
        JSON.stringify({ error: "ID da agência não fornecido", code: "SYS002" }),
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
      // Check real state in Evolution API before deciding
      let evolutionState = "unknown";
      try {
        const stateRes = await fetch(
          `${EVOLUTION_API_URL}/instance/connectionState/${existing.instance_name}`,
          { headers: { apikey: EVOLUTION_API_KEY } }
        );
        if (stateRes.ok) {
          const stateData = await stateRes.json();
          evolutionState = stateData?.instance?.state || stateData?.state || "unknown";
        }
      } catch (e) {
        console.warn("[whatsapp-criar] Erro ao checar estado:", (e as Error).message);
      }

      console.log("[whatsapp-criar] Instância existente:", existing.instance_name, "state:", evolutionState);

      // If already open or connecting, reuse — don't delete/recreate
      if (evolutionState === "open" || evolutionState === "connecting") {
        const status = evolutionState === "open" ? "connected" : "connecting";
        console.log("[whatsapp-criar] Reaproveitando instância existente. Status:", status);
        return new Response(
          JSON.stringify({
            success: true,
            instanceName: existing.instance_name,
            status,
            alreadyExists: true,
            alreadyConnected: evolutionState === "open",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Only delete if close/disconnected/unknown
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
      // Check if Evolution API says instance already exists — recover instead of failing
      const errMsg = JSON.stringify(createData).toLowerCase();
      if (errMsg.includes("already") || errMsg.includes("exists") || errMsg.includes("já existe")) {
        console.log("[whatsapp-criar] Evolution diz que instância já existe. Recuperando...");
        const { error: upsertErr } = await supabaseAdmin.from("whatsapp_instancias").upsert({
          agencia_id,
          instance_name: instanceName,
          status: "connecting",
        }, { onConflict: "agencia_id" });
        if (upsertErr) console.warn("[whatsapp-criar] Upsert recovery error:", upsertErr.message);
        return new Response(
          JSON.stringify({ success: true, instanceName, status: "connecting", alreadyExists: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          error: "Erro ao criar instância WhatsApp",
          code: "WPP002",
          details: createData,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
