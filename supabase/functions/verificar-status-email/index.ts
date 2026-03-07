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
    const { email } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Email obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find user by email in usuarios table
    const { data: usuario, error: userError } = await supabaseAdmin
      .from("usuarios")
      .select("agencia_id, cargo")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    if (userError || !usuario) {
      // Don't reveal if user exists or not — just say "ok"
      return new Response(JSON.stringify({ bloqueado: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Superadmin always passes
    if (usuario.cargo === "superadmin") {
      return new Response(JSON.stringify({ bloqueado: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!usuario.agencia_id) {
      return new Response(JSON.stringify({ bloqueado: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check agency payment status
    const { data: agencia } = await supabaseAdmin
      .from("agencias")
      .select("status_pagamento")
      .eq("id", usuario.agencia_id)
      .single();

    const bloqueado = agencia?.status_pagamento === "pendente" || agencia?.status_pagamento === "bloqueado";

    return new Response(JSON.stringify({ bloqueado, status: agencia?.status_pagamento }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Erro:", err);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
