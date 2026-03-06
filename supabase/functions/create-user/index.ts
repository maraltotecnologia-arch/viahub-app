import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildEmailHtml } from "../_shared/email-html.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is admin or superadmin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check caller is admin or superadmin
    const { data: callerProfile } = await supabaseAdmin
      .from("usuarios")
      .select("cargo, agencia_id")
      .eq("id", caller.id)
      .single();

    if (!callerProfile || !["admin", "superadmin"].includes(callerProfile.cargo)) {
      return new Response(JSON.stringify({ error: "Sem permissão" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, password, nome, nome_agencia } = await req.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ error: "Email e senha são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((u) => u.email === email);
    if (existing) {
      return new Response(JSON.stringify({ error: "Este email já está cadastrado" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create user with email confirmed
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send credentials email (non-blocking)
    try {
      const agencyName = nome_agencia || "";
      const userName = nome || "";

      const html = buildEmailHtml({
        title: `Você foi adicionado à ${agencyName} no ViaHub!`,
        body: `
          <p>Olá <strong>${userName}</strong>,</p>
          <p>Suas credenciais de acesso ao ViaHub:</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:6px">
            <tr><td style="padding:12px 16px;border-bottom:1px solid #E5E7EB">
              <span style="font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px">Email</span><br/>
              <span style="font-size:15px;font-weight:600;color:#1F2937">${email}</span>
            </td></tr>
            <tr><td style="padding:12px 16px">
              <span style="font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px">Senha temporária</span><br/>
              <span style="font-size:15px;font-weight:600;color:#1F2937;font-family:monospace">${password}</span>
            </td></tr>
          </table>
          <p style="color:#6B7280;font-size:13px">⚠️ Recomendamos alterar sua senha no primeiro acesso em <strong>Configurações → Segurança</strong>.</p>
        `,
        ctaText: "Acessar agora",
        ctaUrl: "https://viahub.app/login",
      });

      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey) {
        fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "ViaHub <noreply@viahub.app>",
            to: [email],
            subject: "Seu acesso ao ViaHub está pronto",
            html,
          }),
        }).catch((e) => console.error("[create-user] Email error:", e.message));
      }
    } catch (emailErr) {
      console.error("[create-user] Erro email:", (emailErr as Error).message);
    }

    return new Response(JSON.stringify({ user: { id: data.user.id, email: data.user.email } }), {
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
