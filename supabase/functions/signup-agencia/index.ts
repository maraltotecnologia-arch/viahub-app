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
    console.log("[signup-agencia] ========== INÍCIO ==========");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { email, password, nome_agencia, nome_admin, telefone, cnpj, cep, plano, forma_pagamento, creditCard } = body;

    console.log("[signup-agencia] Dados:", JSON.stringify({
      email, nome_agencia, nome_admin, telefone, cnpj, plano, forma_pagamento,
      has_password: !!password, has_creditCard: !!creditCard,
    }));

    if (!email || !password || !nome_agencia || !nome_admin || !telefone || !plano || !cnpj) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios não preenchidos" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (password.length < 8) {
      return new Response(JSON.stringify({ error: "Senha deve ter no mínimo 8 caracteres" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check existing email
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((u) => u.email === email);
    if (existing) {
      return new Response(JSON.stringify({ error: "Este email já está cadastrado. Faça login ou use outro email." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check existing CNPJ
    if (cnpj) {
      const cnpjLimpo = cnpj.replace(/\D/g, "");
      const { data: existingCnpj } = await supabaseAdmin
        .from("agencias")
        .select("id")
        .eq("cnpj", cnpjLimpo)
        .maybeSingle();
      if (existingCnpj) {
        return new Response(JSON.stringify({ error: "Este CNPJ já está cadastrado no ViaHub." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Map billingType
    const billingTypeMap: Record<string, string> = {
      cartao: "CREDIT_CARD",
      pix: "PIX",
      boleto: "BOLETO",
    };
    const billingType = billingTypeMap[forma_pagamento] || "UNDEFINED";

    // Step 1: Create auth user
    console.log("[signup-agencia] [STEP 1] Criando usuário Auth...");
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email, password, email_confirm: false,
    });
    if (authError || !authData.user) {
      console.error("[signup-agencia] Erro Auth:", authError);
      return new Response(JSON.stringify({ error: authError?.message || "Erro ao criar usuário" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = authData.user.id;
    console.log("[signup-agencia] [STEP 1 OK] userId:", userId);

    // Step 2: Create agencia
    console.log("[signup-agencia] [STEP 2] Criando agência...");
    const isBoleto = forma_pagamento === "boleto";
    const statusPagamento = isBoleto ? "pendente" : "ativo";
    console.log("[signup-agencia] forma_pagamento recebido:", forma_pagamento);
    console.log("[signup-agencia] status_pagamento definido:", statusPagamento);
    const { data: agencia, error: agenciaError } = await supabaseAdmin
      .from("agencias")
      .insert({
        nome_fantasia: nome_agencia,
        email,
        telefone,
        cnpj: cnpj || null,
        cep: cep?.replace(/\D/g, "") || null,
        plano,
        onboarding_completo: false,
        status_pagamento: statusPagamento,
      })
      .select("id")
      .single();

    if (agenciaError || !agencia) {
      console.error("[signup-agencia] Erro agência:", agenciaError);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      if (agenciaError?.code === "23505" && agenciaError?.message?.includes("cnpj")) {
        return new Response(JSON.stringify({ error: "Este CNPJ já está cadastrado no ViaHub." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Erro ao criar agência: " + (agenciaError?.message || "") }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log("[signup-agencia] [STEP 2 OK] agenciaId:", agencia.id);

    // Step 3: Create usuario profile
    console.log("[signup-agencia] [STEP 3] Criando perfil...");
    const { error: usuarioError } = await supabaseAdmin
      .from("usuarios")
      .insert({ id: userId, agencia_id: agencia.id, nome: nome_admin, email, cargo: "admin", ativo: true });

    if (usuarioError) {
      console.error("[signup-agencia] Erro perfil:", usuarioError);
      await supabaseAdmin.from("agencias").delete().eq("id", agencia.id);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({ error: "Erro ao criar perfil: " + usuarioError.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log("[signup-agencia] [STEP 3 OK]");

    // Step 4: Create Asaas customer + subscription (blocking)
    console.log("[signup-agencia] [STEP 4] Criando assinatura Asaas...");
    let invoiceUrl: string | undefined;
    let boletoUrl: string | undefined;
    let boletoLinhaDigitavel: string | undefined;
    let pixQrCode: string | undefined;
    let pixPayload: string | undefined;
    let paymentId: string | undefined;

    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

      const asaasBody: Record<string, unknown> = { agencia_id: agencia.id, billingType, cep: cep?.replace(/\D/g, "") || null };

      // Pass credit card data if present
      if (creditCard && billingType === "CREDIT_CARD") {
        asaasBody.creditCard = {
          holderName: creditCard.holderName,
          number: creditCard.number,
          expiryMonth: creditCard.expiryMonth,
          expiryYear: creditCard.expiryYear,
          ccv: creditCard.ccv,
        };
      }

      const res = await fetch(`${supabaseUrl}/functions/v1/asaas-criar-cliente`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify(asaasBody),
      });

      const asaasResult = await res.json();
      console.log("[signup-agencia] [STEP 4] Asaas result:", JSON.stringify(asaasResult));

      if (res.ok && asaasResult) {
        invoiceUrl = asaasResult.invoiceUrl;
        boletoUrl = asaasResult.boletoUrl;
        boletoLinhaDigitavel = asaasResult.boletoLinhaDigitavel;
        pixQrCode = asaasResult.pixQrCode;
        pixPayload = asaasResult.pixPayload;
        paymentId = asaasResult.paymentId;

        if (asaasResult.error) {
          console.error("[signup-agencia] Asaas error:", asaasResult.error);
          // Don't fail the whole signup, but pass the error
        }
      }
    } catch (e) {
      console.error("[signup-agencia] [STEP 4 AVISO] Erro Asaas:", (e as Error).message);
    }

    console.log("[signup-agencia] ========== SUCESSO ==========");

    return new Response(JSON.stringify({
      success: true,
      invoiceUrl,
      boletoUrl,
      boletoLinhaDigitavel,
      pixQrCode,
      pixPayload,
      paymentId,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const error = err as Error;
    console.error("[signup-agencia] ERRO:", error.message, error.stack);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
