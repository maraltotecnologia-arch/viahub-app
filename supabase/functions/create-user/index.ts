import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildEmailHtml } from "../_shared/email-html.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LIMITE_USUARIOS: Record<string, number> = {
  starter: 3,
  pro: 10,
  elite: 999,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  console.log("[create-user] ========== INÍCIO ==========");

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is admin or superadmin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[create-user] Sem header Authorization");
      return new Response(JSON.stringify({ error: "Não autorizado", code: "AUTH009" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !caller) {
      console.error("[create-user] Auth error:", authError?.message);
      return new Response(JSON.stringify({ error: "Não autorizado", code: "AUTH009" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[create-user] Caller:", caller.id, caller.email);

    // Check caller is admin or superadmin
    const { data: callerProfile } = await supabaseAdmin
      .from("usuarios")
      .select("cargo, agencia_id")
      .eq("id", caller.id)
      .single();

    if (!callerProfile || !["admin", "superadmin"].includes(callerProfile.cargo)) {
      console.error("[create-user] Sem permissão. Cargo:", callerProfile?.cargo);
      return new Response(JSON.stringify({ error: "Sem permissão", code: "AUTH010" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { email, password, nome, nome_agencia, agencia_id } = body;

    // Use agencia_id from body or from caller profile
    const targetAgenciaId = agencia_id || callerProfile.agencia_id;

    console.log("[create-user] Body recebido:", JSON.stringify({
      email,
      nome,
      agencia_id: targetAgenciaId,
      has_senha: !!password,
    }));

    if (!email || !password) {
      console.error("[create-user] Email ou senha ausentes");
      return new Response(JSON.stringify({ error: "Email e senha são obrigatórios", code: "USR001" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check plan user limit
    if (targetAgenciaId) {
      const { data: agencia } = await supabaseAdmin
        .from("agencias")
        .select("plano")
        .eq("id", targetAgenciaId)
        .single();

      const limite = LIMITE_USUARIOS[agencia?.plano || "starter"] || 3;

      const { count } = await supabaseAdmin
        .from("usuarios")
        .select("*", { count: "exact", head: true })
        .eq("agencia_id", targetAgenciaId)
        .eq("ativo", true);

      console.log("[create-user] Plano:", agencia?.plano, "Usuarios ativos:", count, "Limite:", limite);

      if (count !== null && count >= limite) {
        console.error("[create-user] Limite de usuários atingido:", count, "/", limite);
        return new Response(JSON.stringify({
          error: `Limite de ${limite} usuários do plano ${agencia?.plano || "starter"} atingido`,
          code: "USR006",
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((u) => u.email === email);
    if (existing) {
      console.error("[create-user] Email já cadastrado:", email);
      return new Response(JSON.stringify({ error: "Este email já está cadastrado", code: "USR005" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create user with email confirmed
    console.log("[create-user] Criando usuário Auth...");
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      console.error("[create-user] Erro ao criar Auth user:", JSON.stringify(error));
      return new Response(JSON.stringify({ error: error.message, code: "USR001" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[create-user] Auth user criado:", data.user.id);

    // Mark pre-existing notifications as read for the new user
    if (targetAgenciaId) {
      try {
        const { data: oldNotifs } = await supabaseAdmin
          .from("notificacoes_sistema")
          .select("id")
          .or(`agencia_id.eq.${targetAgenciaId},agencia_id.is.null`)
          .eq("ativo", true);

        if (oldNotifs && oldNotifs.length > 0) {
          await supabaseAdmin
            .from("notificacoes_lidas")
            .insert(oldNotifs.map((n: any) => ({
              notificacao_id: n.id,
              usuario_id: data.user.id,
            })));
          console.log("[create-user] Marcou", oldNotifs.length, "notificações antigas como lidas");
        }
      } catch (e) {
        console.warn("[create-user] Erro ao marcar notificações antigas:", (e as Error).message);
      }
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

    console.log("[create-user] ========== SUCESSO ==========");

    return new Response(JSON.stringify({ user: { id: data.user.id, email: data.user.email } }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[create-user] Erro inesperado:", (err as Error).message);
    return new Response(JSON.stringify({ error: "Erro interno do servidor", code: "SYS001" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
