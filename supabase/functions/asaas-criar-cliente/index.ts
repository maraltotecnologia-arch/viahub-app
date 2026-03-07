import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ASAAS_BASE = "https://sandbox.asaas.com/api/v3";

const PLANO_VALOR: Record<string, number> = { starter: 397, pro: 697, elite: 1997 };
const PLANO_LABEL: Record<string, string> = { starter: "Starter", pro: "Pro", elite: "Elite" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const asaasKey = Deno.env.get("ASAAS_API_KEY");
    if (!asaasKey) {
      return new Response(JSON.stringify({ error: "ASAAS_API_KEY não configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { agencia_id, billingType: requestedBillingType, creditCard, cep, reusar_cliente } = await req.json();
    if (!agencia_id) {
      return new Response(JSON.stringify({ error: "agencia_id é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const billingType = requestedBillingType || "UNDEFINED";
    console.log("[asaas-criar-cliente] agencia_id:", agencia_id, "billingType:", billingType, "has_creditCard:", !!creditCard);

    // Fetch agency
    const { data: agencia, error: agError } = await supabaseAdmin
      .from("agencias").select("*").eq("id", agencia_id).single();

    if (agError || !agencia) {
      console.error("[asaas-criar-cliente] Agência não encontrada:", agError);
      return new Response(JSON.stringify({ error: "Agência não encontrada" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[asaas-criar-cliente] Dados agência:", JSON.stringify(agencia));

    // Fallback email from admin user
    let emailAgencia = agencia.email;
    if (!emailAgencia) {
      const { data: adminUser } = await supabaseAdmin
        .from("usuarios").select("email").eq("agencia_id", agencia_id).eq("cargo", "admin").limit(1).single();
      emailAgencia = adminUser?.email || undefined;
    }

    const nome = agencia.nome_fantasia;
    const email = emailAgencia || undefined;
    const cnpjLimpo = agencia.cnpj?.replace(/\D/g, "") || "";
    const telefoneLimpo = agencia.telefone?.replace(/\D/g, "") || "";
    const telefone = (telefoneLimpo.length >= 10 && telefoneLimpo.length <= 11) ? telefoneLimpo : undefined;

    if (!cnpjLimpo || cnpjLimpo.length < 11) {
      console.error("[asaas-criar-cliente] CNPJ inválido:", cnpjLimpo);
      return new Response(JSON.stringify({ error: "CNPJ obrigatório para criar assinatura" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const plano = agencia.plano || "starter";
    const valor = PLANO_VALOR[plano] || 397;

    // Next due date — today (date of registration)
    // Use manual components to avoid UTC timezone shift
    const todayUTC = new Date();
    const year = todayUTC.getFullYear();
    const month = String(todayUTC.getMonth() + 1).padStart(2, "0");
    const day = String(todayUTC.getDate()).padStart(2, "0");
    const nextDueStr = `${year}-${month}-${day}`;
    console.log("[asaas-criar-cliente] nextDueDate:", nextDueStr);

    // --- Create or update customer ---
    let customerId = agencia.asaas_customer_id;

    if (reusar_cliente && customerId) {
      console.log(`[asaas-criar-cliente] Reusando cliente existente ${customerId} (reusar_cliente=true)`);
      // Skip customer creation/update — go straight to subscription
    } else if (customerId) {
      console.log(`[asaas-criar-cliente] Atualizando cliente existente ${customerId}...`);
      const updateBody: Record<string, unknown> = { cpfCnpj: cnpjLimpo, name: nome, email };
      if (telefone) updateBody.mobilePhone = telefone;
      const updateRes = await fetch(`${ASAAS_BASE}/customers/${customerId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "access_token": asaasKey },
        body: JSON.stringify(updateBody),
      });
      if (!updateRes.ok) {
        const updateData = await updateRes.json();
        const isPhoneError = updateData.errors?.every((e: any) => e.code === "invalid_phone" || e.code === "invalid_mobilePhone");
        if (isPhoneError) {
          console.warn("[asaas-criar-cliente] Telefone inválido no update, tentando sem telefone...");
          delete updateBody.mobilePhone;
          const retryRes = await fetch(`${ASAAS_BASE}/customers/${customerId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "access_token": asaasKey },
            body: JSON.stringify(updateBody),
          });
          if (!retryRes.ok) {
            const retryData = await retryRes.json();
            console.error("[asaas-criar-cliente] Erro update cliente (retry):", JSON.stringify(retryData));
            return new Response(JSON.stringify({ error: "Erro ao atualizar cliente", details: retryData }), {
              status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } else {
          console.error("[asaas-criar-cliente] Erro update cliente:", JSON.stringify(updateData));
          return new Response(JSON.stringify({ error: "Erro ao atualizar cliente", details: updateData }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
      console.log("[asaas-criar-cliente] Cliente atualizado");
    } else {
      console.log("[asaas-criar-cliente] Criando cliente...");
      const bodyCliente: Record<string, unknown> = { name: nome, email, cpfCnpj: cnpjLimpo, externalReference: agencia_id };
      if (telefone) bodyCliente.mobilePhone = telefone;
      const customerRes = await fetch(`${ASAAS_BASE}/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "access_token": asaasKey },
        body: JSON.stringify(bodyCliente),
      });
      const customerData = await customerRes.json();
      if (!customerRes.ok) {
        const isPhoneError = customerData.errors?.every((e: any) => e.code === "invalid_phone" || e.code === "invalid_mobilePhone");
        if (isPhoneError) {
          console.warn("[asaas-criar-cliente] Telefone inválido, tentando sem telefone...");
          delete bodyCliente.mobilePhone;
          const retryRes = await fetch(`${ASAAS_BASE}/customers`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "access_token": asaasKey },
            body: JSON.stringify(bodyCliente),
          });
          const retryData = await retryRes.json();
          if (!retryRes.ok) {
            console.error("[asaas-criar-cliente] Erro criar cliente (retry):", JSON.stringify(retryData));
            return new Response(JSON.stringify({ error: "Erro ao criar cliente", details: retryData }), {
              status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          customerId = retryData.id;
        } else {
          console.error("[asaas-criar-cliente] Erro criar cliente:", JSON.stringify(customerData));
          return new Response(JSON.stringify({ error: "Erro ao criar cliente", details: customerData }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        customerId = customerData.id;
      }
      console.log("[asaas-criar-cliente] Cliente criado:", customerId);
      await supabaseAdmin.from("agencias").update({ asaas_customer_id: customerId }).eq("id", agencia_id);
    }

    // Check existing subscription
    if (agencia.asaas_subscription_id) {
      console.log("[asaas-criar-cliente] Assinatura já existe:", agencia.asaas_subscription_id);
      return new Response(JSON.stringify({ success: true, customer_id: customerId, subscription_id: agencia.asaas_subscription_id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- PIX: Create standalone payment first, then UNDEFINED subscription ---
    if (billingType === "PIX") {
      console.log("[asaas-criar-cliente] Criando cobrança PIX avulsa...");
      const pixPaymentRes = await fetch(`${ASAAS_BASE}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "access_token": asaasKey },
        body: JSON.stringify({
          customer: customerId,
          billingType: "PIX",
          value: valor,
          dueDate: nextDueStr,
          description: `ViaHub — Plano ${PLANO_LABEL[plano] || plano} (1ª mensalidade)`,
          externalReference: agencia_id,
        }),
      });
      const pixPaymentData = await pixPaymentRes.json();
      console.log("[asaas-criar-cliente] PIX response completo:", JSON.stringify(pixPaymentData));

      if (!pixPaymentRes.ok) {
        console.error("[asaas-criar-cliente] Erro cobrança PIX:", JSON.stringify(pixPaymentData));
        return new Response(JSON.stringify({ error: "Erro ao criar cobrança PIX", details: pixPaymentData }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const pixPaymentId = pixPaymentData.id;
      console.log("[asaas-criar-cliente] Cobrança PIX criada:", pixPaymentId);

      // Get PIX QR Code from separate endpoint
      let pixQrCode = "";
      let pixPayload = "";
      let pixExpirationDate = "";
      try {
        const qrRes = await fetch(`${ASAAS_BASE}/payments/${pixPaymentId}/pixQrCode`, {
          headers: { "access_token": asaasKey },
        });
        const qrData = await qrRes.json();
        console.log("[asaas-criar-cliente] QR Code response:", JSON.stringify(qrData));
        pixQrCode = qrData.encodedImage || "";
        pixPayload = qrData.payload || "";
        pixExpirationDate = qrData.expirationDate || "";
      } catch (e) {
        console.error("[asaas-criar-cliente] Erro QR Code:", (e as Error).message);
      }

      // Save payment
      await supabaseAdmin.from("asaas_pagamentos").insert({
        agencia_id,
        asaas_payment_id: pixPaymentId,
        status: pixPaymentData.status,
        valor: pixPaymentData.value,
        vencimento: pixPaymentData.dueDate,
        forma_pagamento: "PIX",
        pix_qr_code: pixQrCode,
        pix_copia_cola: pixPayload,
      });

      // Create PIX subscription for future months
      const futureMonth = todayUTC.getMonth() + 2; // +2 because getMonth is 0-based and we want next month
      const futureYear = futureMonth > 12 ? year + 1 : year;
      const futureMonthStr = String(futureMonth > 12 ? futureMonth - 12 : futureMonth).padStart(2, "0");
      const futureDateStr = `${futureYear}-${futureMonthStr}-${day}`;

      const subRes = await fetch(`${ASAAS_BASE}/subscriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "access_token": asaasKey },
        body: JSON.stringify({
          customer: customerId,
          billingType: "PIX",
          value: valor,
          nextDueDate: futureDateStr,
          cycle: "MONTHLY",
          description: `ViaHub — Plano ${PLANO_LABEL[plano] || plano}`,
        }),
      });
      const subData = await subRes.json();
      console.log("[asaas-criar-cliente] Assinatura PIX response:", JSON.stringify(subData));

      if (subRes.ok) {
        await supabaseAdmin.from("agencias").update({
          asaas_subscription_id: subData.id,
          data_proximo_vencimento: nextDueStr,
        }).eq("id", agencia_id);
      }

      return new Response(JSON.stringify({
        success: true,
        customer_id: customerId,
        subscription_id: subData?.id,
        paymentId: pixPaymentId,
        pixQrCode,
        pixPayload,
        pixExpirationDate,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- CREDIT CARD or BOLETO subscription ---
    const subscriptionBody: Record<string, unknown> = {
      customer: customerId,
      billingType: billingType === "CREDIT_CARD" ? "CREDIT_CARD" : billingType,
      value: valor,
      nextDueDate: nextDueStr,
      cycle: "MONTHLY",
      description: `ViaHub — Plano ${PLANO_LABEL[plano] || plano}`,
    };

    if (billingType === "CREDIT_CARD" && creditCard) {
      console.log("[asaas-criar-cliente] Preparando dados do cartão...", {
        holderName: creditCard.holderName,
        numberLength: creditCard.number?.replace(/\s/g, "")?.length,
        expiryMonth: creditCard.expiryMonth,
        expiryYear: creditCard.expiryYear,
        hasCcv: !!creditCard.ccv,
      });

      subscriptionBody.creditCard = {
        holderName: creditCard.holderName,
        number: creditCard.number?.replace(/\s/g, ""),
        expiryMonth: creditCard.expiryMonth,
        expiryYear: creditCard.expiryYear,
        ccv: creditCard.ccv,
      };
      const cepLimpo = cep?.replace(/\D/g, "") || agencia.cep?.replace(/\D/g, "") || "";
      subscriptionBody.creditCardHolderInfo = {
        name: creditCard.holderName,
        email: email || "",
        cpfCnpj: cnpjLimpo,
        postalCode: cepLimpo || "00000000",
        addressNumber: "0",
        mobilePhone: telefone || "00000000000",
      };
    }

    console.log("[asaas-criar-cliente] Criando assinatura...", { plano, valor, nextDueStr, billingType });
    const subRes = await fetch(`${ASAAS_BASE}/subscriptions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "access_token": asaasKey },
      body: JSON.stringify(subscriptionBody),
    });

    const subData = await subRes.json();
    console.log("[asaas-criar-cliente] Cartão/Boleto response completo:", JSON.stringify(subData));

    if (!subRes.ok) {
      console.error("[asaas-criar-cliente] Erro assinatura:", JSON.stringify(subData));
      const errorMsg = subData.errors?.[0]?.description || "Erro ao criar assinatura";
      return new Response(JSON.stringify({ error: errorMsg, details: subData }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[asaas-criar-cliente] Assinatura criada:", subData.id);

    await supabaseAdmin.from("agencias").update({
      asaas_subscription_id: subData.id,
      data_proximo_vencimento: nextDueStr,
    }).eq("id", agencia_id);

    // Get first payment
    let invoiceUrl: string | undefined;
    let boletoUrl: string | undefined;
    let boletoLinhaDigitavel: string | undefined;
    let paymentId: string | undefined;

    try {
      const paymentsRes = await fetch(`${ASAAS_BASE}/subscriptions/${subData.id}/payments?limit=1`, {
        headers: { "access_token": asaasKey },
      });
      const paymentsData = await paymentsRes.json();
      console.log("[asaas-criar-cliente] Primeiro pagamento response:", JSON.stringify(paymentsData));

      if (paymentsData?.data?.length > 0) {
        const firstPayment = paymentsData.data[0];
        invoiceUrl = firstPayment.invoiceUrl;
        boletoUrl = firstPayment.bankSlipUrl;
        boletoLinhaDigitavel = firstPayment.identificationField || firstPayment.nossoNumero;
        paymentId = firstPayment.id;

        await supabaseAdmin.from("asaas_pagamentos").insert({
          agencia_id,
          asaas_payment_id: firstPayment.id,
          status: firstPayment.status,
          valor: firstPayment.value,
          vencimento: firstPayment.dueDate,
          forma_pagamento: billingType,
          boleto_url: firstPayment.bankSlipUrl || null,
          boleto_linha_digitavel: boletoLinhaDigitavel || null,
        });
      }
    } catch (e) {
      console.error("[asaas-criar-cliente] Erro ao buscar pagamento:", (e as Error).message);
    }

    return new Response(JSON.stringify({
      success: true,
      customer_id: customerId,
      subscription_id: subData.id,
      invoiceUrl,
      boletoUrl,
      boletoLinhaDigitavel,
      paymentId,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[asaas-criar-cliente] Erro geral:", (err as Error).message, (err as Error).stack);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
