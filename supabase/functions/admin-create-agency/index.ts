import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify caller is superadmin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

    // Verify caller with anon client
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await anonClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check superadmin
    const { data: callerProfile } = await anonClient
      .from("usuarios")
      .select("cargo")
      .eq("id", caller.id)
      .single();

    if (callerProfile?.cargo !== "superadmin") {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      nome_fantasia,
      cnpj,
      email_agencia,
      telefone,
      plano,
      email_admin,
      senha,
    } = body;

    if (!nome_fantasia || !email_agencia || !email_admin || !senha) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios faltando" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // 1. Create agency
    const { data: agencia, error: agenciaError } = await adminClient
      .from("agencias")
      .insert({
        nome_fantasia,
        cnpj: cnpj || null,
        email: email_agencia,
        telefone: telefone || null,
        plano: plano || "starter_a",
        onboarding_completo: false,
      })
      .select()
      .single();

    if (agenciaError) {
      return new Response(
        JSON.stringify({ error: "Erro ao criar agência: " + agenciaError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2. Create auth user
    const { data: authData, error: authError } =
      await adminClient.auth.admin.createUser({
        email: email_admin,
        password: senha,
        email_confirm: true,
      });

    if (authError) {
      // Rollback agency
      await adminClient.from("agencias").delete().eq("id", agencia.id);
      return new Response(
        JSON.stringify({ error: "Erro ao criar usuário: " + authError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3. Create usuario record
    const { error: usuarioError } = await adminClient
      .from("usuarios")
      .insert({
        id: authData.user.id,
        email: email_admin,
        nome: nome_fantasia,
        agencia_id: agencia.id,
        cargo: "admin",
      });

    if (usuarioError) {
      await adminClient.auth.admin.deleteUser(authData.user.id);
      await adminClient.from("agencias").delete().eq("id", agencia.id);
      return new Response(
        JSON.stringify({ error: "Erro ao vincular usuário: " + usuarioError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        agencia_id: agencia.id,
        user_id: authData.user.id,
        message: "Agência criada com sucesso",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Erro interno: " + (err as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
