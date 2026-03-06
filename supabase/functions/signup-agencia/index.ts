import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildEmailHtml } from "../_shared/email-html.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function enviarEmailNaoBloqueante(to: string, subject: string, html: string, type: string) {
  try {
    console.log(`[signup-agencia] Iniciando envio de email (${type}) para ${to}`);
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) { console.error("[signup-agencia] RESEND_API_KEY ausente"); return; }
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "ViaHub <noreply@viahub.app>", to: [to], subject, html }),
    });
    if (!res.ok) console.error(`[signup-agencia] Email error (${type}):`, await res.text());
    else console.log(`[signup-agencia] Email enviado com sucesso: ${type} -> ${to}`);
  } catch (e) {
    console.error(`[signup-agencia] Erro email (${type}):`, (e as Error).message, e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("[signup-agencia] ========== INÍCIO DA EXECUÇÃO ==========");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { email, password, nome_agencia, nome_admin, telefone, cnpj, plano } = body;

    console.log("[signup-agencia] Dados recebidos:", JSON.stringify({
      email,
      nome_agencia,
      nome_admin,
      telefone,
      cnpj: cnpj || null,
      plano,
      has_password: !!password,
      password_length: password?.length || 0,
    }));

    if (!email || !password || !nome_agencia || !nome_admin || !telefone || !plano) {
      console.error("[signup-agencia] Campos obrigatórios faltando:", {
        email: !!email, password: !!password, nome_agencia: !!nome_agencia,
        nome_admin: !!nome_admin, telefone: !!telefone, plano: !!plano,
      });
      return new Response(JSON.stringify({ error: "Campos obrigatórios não preenchidos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (password.length < 8) {
      console.error("[signup-agencia] Senha muito curta:", password.length);
      return new Response(JSON.stringify({ error: "Senha deve ter no mínimo 8 caracteres" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if email already exists
    console.log("[signup-agencia] Verificando se email já existe...");
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) {
      console.error("[signup-agencia] Erro ao listar usuários:", listError.message, listError);
    }
    const existing = existingUsers?.users?.find((u) => u.email === email);
    if (existing) {
      console.log("[signup-agencia] Email já cadastrado:", email);
      return new Response(JSON.stringify({ error: "Este email já está cadastrado no ViaHub." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log("[signup-agencia] Email disponível, prosseguindo...");

    // Step 1: Create auth user
    console.log("[signup-agencia] [STEP 1] Criando usuário no Auth...");
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
    });

    if (authError || !authData.user) {
      console.error("[signup-agencia] [STEP 1 FALHOU] Erro ao criar usuário no Auth:", authError?.message, authError);
      return new Response(JSON.stringify({ error: authError?.message || "Erro ao criar usuário", details: authError }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authData.user.id;
    console.log("[signup-agencia] [STEP 1 OK] Usuário criado no Auth, userId:", userId);

    // Step 2: Create agencia
    console.log("[signup-agencia] [STEP 2] Inserindo agência...");
    const { data: agencia, error: agenciaError } = await supabaseAdmin
      .from("agencias")
      .insert({
        nome_fantasia: nome_agencia,
        telefone,
        cnpj: cnpj || null,
        plano,
        onboarding_completo: false,
      })
      .select("id")
      .single();

    if (agenciaError || !agencia) {
      console.error("[signup-agencia] [STEP 2 FALHOU] Erro ao criar agência:", agenciaError?.message, agenciaError);
      console.log("[signup-agencia] Rollback: deletando usuário auth", userId);
      await supabaseAdmin.auth.admin.deleteUser(userId);

      // CNPJ duplicado
      if (agenciaError?.code === "23505" && agenciaError?.message?.includes("cnpj")) {
        return new Response(JSON.stringify({ error: "Este CNPJ já está cadastrado no ViaHub." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Erro ao criar agência: " + (agenciaError?.message || ""), details: agenciaError }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[signup-agencia] [STEP 2 OK] Agência criada, agenciaId:", agencia.id);

    // Step 3: Create usuario profile
    console.log("[signup-agencia] [STEP 3] Inserindo perfil do usuário...");
    const { error: usuarioError } = await supabaseAdmin
      .from("usuarios")
      .insert({
        id: userId,
        agencia_id: agencia.id,
        nome: nome_admin,
        email,
        cargo: "admin",
        ativo: true,
      });

    if (usuarioError) {
      console.error("[signup-agencia] [STEP 3 FALHOU] Erro ao criar perfil:", usuarioError.message, usuarioError);
      console.log("[signup-agencia] Rollback: deletando agência", agencia.id, "e usuário auth", userId);
      await supabaseAdmin.from("agencias").delete().eq("id", agencia.id);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({ error: "Erro ao criar perfil: " + usuarioError.message, details: usuarioError }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[signup-agencia] [STEP 3 OK] Perfil do usuário criado com sucesso");

    // Step 4: Send OTP for email confirmation (instead of welcome email)
    console.log("[signup-agencia] [STEP 4] Disparando OTP de confirmação...");
    const { error: otpError } = await supabaseAdmin.auth.signInWithOtp({
      email: email,
      options: {
        shouldCreateUser: false,
      },
    });

    if (otpError) {
      console.error("[signup-agencia] [STEP 4 AVISO] Erro ao enviar OTP:", otpError.message);
      // Non-blocking: user can resend from the verification page
    } else {
      console.log("[signup-agencia] [STEP 4 OK] OTP enviado com sucesso para:", email);
    }

    console.log("[signup-agencia] ========== SUCESSO - Cadastro completo ==========");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const error = err as Error;
    console.error("[signup-agencia] ========== ERRO NÃO TRATADO ==========");
    console.error("[signup-agencia] Message:", error.message);
    console.error("[signup-agencia] Stack:", error.stack);
    console.error("[signup-agencia] Full error:", err);
    return new Response(JSON.stringify({ error: error.message, details: String(error.stack) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
