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

    // Check agency payment status
    const { data: agencia } = await supabaseAdmin
      .from("agencias")
      .select("status_pagamento")
      .eq("id", usuario.agencia_id)
      .single();

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
              headers: { "access_token": asaasKey },
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
