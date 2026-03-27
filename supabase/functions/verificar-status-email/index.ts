import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ASAAS_BASE = "https://sandbox.asaas.com/api/v3";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ error: "Email e senha obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // STEP 1: Validate credentials without creating a persistent session on the client
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const { data: authData, error: authError } = await supabaseAuth.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    });

    if (authError) {
      console.log("[verificar-status-email] Credenciais inválidas:", authError.message);

      let userMessage = "Email ou senha incorretos.";
      if (authError.message?.includes("Email not confirmed") || (authError as any).code === "email_not_confirmed") {
        userMessage = "Seu email ainda não foi confirmado. Verifique sua caixa de entrada.";
      }

      return new Response(JSON.stringify({ 
        allowed: false, 
        reason: "invalid_credentials",
        message: userMessage,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sign out the session we just created on the backend (cleanup)
    if (authData.session) {
      await supabaseAuth.auth.signOut();
    }

    // STEP 2: Credentials OK — check agency payment status
    const { data: usuario } = await supabaseAdmin
      .from("usuarios")
      .select("agencia_id, cargo")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    if (!usuario) {
      return new Response(JSON.stringify({ allowed: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Superadmin always passes
    if (usuario.cargo === "superadmin") {
      return new Response(JSON.stringify({ allowed: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!usuario.agencia_id) {
      return new Response(JSON.stringify({ allowed: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check agency status and payment
    const { data: agencia } = await supabaseAdmin
      .from("agencias")
      .select("status_pagamento, ativo, asaas_subscription_id")
      .eq("id", usuario.agencia_id)
      .single();

    // STEP 3: Check if agency was deactivated by superadmin
    if (agencia?.ativo === false) {
      return new Response(JSON.stringify({ 
        allowed: false,
        reason: "agency_deactivated",
        message: "Sua agência foi desativada. Entre em contato com o suporte para mais informações.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // STEP 3.5: Check subscription status in Asaas for admin users
    if (usuario.cargo === "admin" && agencia?.asaas_subscription_id && agencia?.status_pagamento === "ativo") {
      const asaasKey = Deno.env.get("ASAAS_API_KEY");
      if (asaasKey) {
        try {
          console.log(`[verificar-status-email] Verificando assinatura ${agencia.asaas_subscription_id} no Asaas`);
          const subRes = await fetch(`${ASAAS_BASE}/subscriptions/${agencia.asaas_subscription_id}`, {
            headers: { "User-Agent": "ViaHub/1.0", "access_token": asaasKey },
          });

          let subscriptionDeleted = false;

          if (!subRes.ok) {
            console.log(`[verificar-status-email] Assinatura retornou ${subRes.status}`);
            subscriptionDeleted = true;
          } else {
            const subData = await subRes.json();
            console.log(`[verificar-status-email] Assinatura status: ${subData.status}, deleted: ${subData.deleted}`);
            if (subData.deleted === true || subData.status === "INACTIVE" || subData.status === "EXPIRED") {
              subscriptionDeleted = true;
            }
          }

          if (subscriptionDeleted) {
            // Clear subscription ID
            await supabaseAdmin
              .from("agencias")
              .update({ asaas_subscription_id: null })
              .eq("id", usuario.agencia_id);

            console.log("[verificar-status-email] Assinatura deletada/inativa — redirecionando admin para reativar");
            return new Response(JSON.stringify({
              allowed: false,
              reason: "subscription_deleted",
              message: "redirect_reativar",
              agencia_id: usuario.agencia_id,
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } catch (e) {
          console.error("[verificar-status-email] Erro ao verificar assinatura:", (e as Error).message);
          // Don't block login if Asaas check fails
        }
      }
    }

    // STEP 3.6: For non-admin, non-superadmin users — check if agency has active subscription
    if (usuario.cargo !== "admin" && usuario.cargo !== "superadmin") {
      if (!agencia?.asaas_subscription_id || agencia?.status_pagamento === "cancelado") {
        console.log("[verificar-status-email] Usuário não-admin sem assinatura ativa");
        return new Response(JSON.stringify({
          allowed: false,
          reason: "no_active_subscription",
          message: "Não foi localizado plano ativo para essa agência. Comunique seu administrador para solicitar um novo plano.",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const statusPagamento = agencia?.status_pagamento;

    // If status is pendente, check Asaas to see if boleto was compensated
    if (statusPagamento === "pendente") {
      const asaasKey = Deno.env.get("ASAAS_API_KEY");
      if (asaasKey) {
        const { data: pagamento } = await supabaseAdmin
          .from("asaas_pagamentos")
          .select("asaas_payment_id, forma_pagamento")
          .eq("agencia_id", usuario.agencia_id)
          .in("status", ["PENDING", "OVERDUE"])
          .eq("forma_pagamento", "BOLETO")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (pagamento?.asaas_payment_id) {
          console.log(`[verificar-status-email] Consultando Asaas para pagamento ${pagamento.asaas_payment_id}`);

          try {
            const asaasRes = await fetch(`${ASAAS_BASE}/payments/${pagamento.asaas_payment_id}`, {
              headers: { "User-Agent": "ViaHub/1.0", "access_token": asaasKey },
            });
            const asaasData = await asaasRes.json();

            console.log(`[verificar-status-email] Status Asaas: ${asaasData.status}`);

            if (asaasData.status === "RECEIVED" || asaasData.status === "CONFIRMED") {
              console.log(`[verificar-status-email] Boleto compensado! Ativando agência ${usuario.agencia_id}`);

              await supabaseAdmin.from("agencias").update({
                status_pagamento: "ativo",
                data_bloqueio: null,
              }).eq("id", usuario.agencia_id);

              await supabaseAdmin.from("asaas_pagamentos").update({
                status: asaasData.status,
                pago_em: new Date().toISOString(),
              }).eq("asaas_payment_id", pagamento.asaas_payment_id);

              // Boleto compensated — allow login
              return new Response(JSON.stringify({ allowed: true }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
          } catch (e) {
            console.error("[verificar-status-email] Erro ao consultar Asaas:", e);
          }
        }
      }
    }

    const bloqueado = statusPagamento === "pendente" || statusPagamento === "bloqueado";

    if (bloqueado) {
      return new Response(JSON.stringify({ 
        allowed: false,
        reason: "payment_pending",
        message: "Pagamento em processamento: Seu boleto está aguardando compensação no banco. O prazo é de até 3 dias úteis.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ allowed: true }), {
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
