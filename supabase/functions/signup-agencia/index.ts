import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildEmailHtml } from "../_shared/email-html.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function enviarEmailNaoBloqueante(to: string, subject: string, html: string, type: string) {
  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) { console.error("[signup-agencia] RESEND_API_KEY ausente"); return; }
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "ViaHub <noreply@viahub.app>", to: [to], subject, html }),
    });
    if (!res.ok) console.error(`[signup-agencia] Email error (${type}):`, await res.text());
    else console.log(`[signup-agencia] Email enviado: ${type} -> ${to}`);
  } catch (e) {
    console.error(`[signup-agencia] Erro email (${type}):`, (e as Error).message);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { email, password, nome_agencia, nome_admin, telefone, cnpj, plano } = await req.json();

    if (!email || !password || !nome_agencia || !nome_admin || !telefone || !plano) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios não preenchidos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (password.length < 8) {
      return new Response(JSON.stringify({ error: "Senha deve ter no mínimo 8 caracteres" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if email already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((u) => u.email === email);
    if (existing) {
      return new Response(JSON.stringify({ error: "Este email já está cadastrado" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1: Create auth user (email NOT confirmed — user must verify)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
    });

    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: authError?.message || "Erro ao criar usuário" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authData.user.id;

    // Step 2: Create agencia
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
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({ error: "Erro ao criar agência: " + (agenciaError?.message || "") }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 3: Create usuario profile
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
      await supabaseAdmin.from("agencias").delete().eq("id", agencia.id);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({ error: "Erro ao criar perfil: " + usuarioError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // OTP verification is now handled client-side via signInWithOtp
    // No need to generate a confirmation link here

    // Send welcome email via Resend (non-blocking)
    const welcomeHtml = buildEmailHtml({
      title: "Sua agência foi cadastrada com sucesso!",
      body: `
        <p>Olá <strong>${nome_admin}</strong>,</p>
        <p>Sua agência <strong>${nome_agencia}</strong> já está ativa no ViaHub.</p>
        <p>Após confirmar seu email, você terá acesso completo à plataforma para gerenciar orçamentos, clientes e muito mais.</p>
        <p style="margin-top:16px;color:#6B7280;font-size:13px">Precisa de ajuda? Entre em contato: <a href="mailto:suporte@viahub.app" style="color:#2563EB">suporte@viahub.app</a></p>
      `,
      ctaText: "Acessar minha conta",
      ctaUrl: "https://viahub.app/login",
    });

    // Fire-and-forget: don't await or block
    enviarEmailNaoBloqueante(email, "Bem-vindo ao ViaHub! Confirme seu acesso", welcomeHtml, "welcome");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
