import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ASAAS_BASE = "https://sandbox.asaas.com/api/v3";

const PLANO_LABEL: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  elite: "Elite",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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

    const body = await req.json();
    const { agencia_id, novo_metodo, cardNumber, cardHolderName, cardExpiryMonth, cardExpiryYear, cardCvv } = body;

    if (!agencia_id || !novo_metodo || !["CREDIT_CARD", "PIX", "BOLETO"].includes(novo_metodo)) {
      return new Response(JSON.stringify({ error: "Dados inválidos" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (novo_metodo === "CREDIT_CARD" && (!cardNumber || !cardHolderName || !cardExpiryMonth || !cardExpiryYear || !cardCvv)) {
      return new Response(JSON.stringify({ error: "Dados do cartão incompletos" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[asaas-trocar-pagamento] Buscando agência ${agencia_id}`);

    const { data: agencia, error: agErr } = await supabaseAdmin
      .from("agencias")
      .select("asaas_subscription_id, asaas_customer_id, email, cnpj, cep, telefone, plano")
      .eq("id", agencia_id)
      .single();

    if (agErr || !agencia?.asaas_customer_id) {
      console.error("[asaas-trocar-pagamento] Agência/cliente não encontrada:", agErr);
      return new Response(JSON.stringify({ error: "Agência não encontrada" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let subscriptionId = agencia.asaas_subscription_id;
    const customerId = agencia.asaas_customer_id;
    const planoLabel = PLANO_LABEL[agencia.plano || "starter"] || "Starter";
    const PLANO_VALOR: Record<string, number> = { starter: 397, pro: 697, elite: 1997 };
    const planoValor = PLANO_VALOR[agencia.plano || "starter"] || 397;

    // ─── STEP 0: Verify subscription exists in Asaas ───
    let subscriptionExists = false;

    if (subscriptionId) {
      console.log(`[asaas-trocar-pagamento] Verificando assinatura ${subscriptionId} no Asaas`);
      const checkRes = await fetch(`${ASAAS_BASE}/subscriptions/${subscriptionId}`, {
        headers: { "access_token": asaasKey },
      });

      if (checkRes.ok) {
        const checkData = await checkRes.json();
        if (checkData.deleted === true || checkData.status === "INACTIVE" || checkData.status === "EXPIRED") {
          console.log(`[asaas-trocar-pagamento] Assinatura ${subscriptionId} deletada/inativa no Asaas`);
          subscriptionExists = false;
        } else {
          subscriptionExists = true;
        }
      } else {
        console.log(`[asaas-trocar-pagamento] Assinatura ${subscriptionId} não encontrada no Asaas (${checkRes.status})`);
        subscriptionExists = false;
      }
    }

    // If subscription doesn't exist, create a new one
    if (!subscriptionExists) {
      console.log("[asaas-trocar-pagamento] Assinatura não existe, criando nova...");

      // Clear old subscription ID
      await supabaseAdmin.from("agencias").update({ asaas_subscription_id: null }).eq("id", agencia_id);

      // Calculate next due date
      const todayUTC = new Date();
      const year = todayUTC.getFullYear();
      const month = String(todayUTC.getMonth() + 1).padStart(2, "0");
      const day = String(todayUTC.getDate()).padStart(2, "0");
      const nextDueStr = `${year}-${month}-${day}`;

      const newSubBody: Record<string, unknown> = {
        customer: customerId,
        billingType: novo_metodo,
        value: planoValor,
        nextDueDate: nextDueStr,
        cycle: "MONTHLY",
        description: `ViaHub — Plano ${planoLabel}`,
      };

      if (novo_metodo === "CREDIT_CARD" && cardNumber) {
        newSubBody.creditCard = {
          holderName: cardHolderName,
          number: cardNumber.replace(/\s/g, ""),
          expiryMonth: cardExpiryMonth,
          expiryYear: cardExpiryYear,
          ccv: cardCvv,
        };
        newSubBody.creditCardHolderInfo = {
          name: cardHolderName,
          email: agencia.email || "",
          cpfCnpj: agencia.cnpj?.replace(/\D/g, "") || "",
          postalCode: agencia.cep?.replace(/\D/g, "") || "01310100",
          addressNumber: "0",
          phone: agencia.telefone?.replace(/\D/g, "") || undefined,
        };
      }

      const newSubRes = await fetch(`${ASAAS_BASE}/subscriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "access_token": asaasKey },
        body: JSON.stringify(newSubBody),
      });
      const newSubData = await newSubRes.json();

      if (!newSubRes.ok) {
        const errorMsg = newSubData.errors?.[0]?.description || "Erro ao criar nova assinatura";
        console.error("[asaas-trocar-pagamento] Erro ao criar subscription:", errorMsg);
        return new Response(JSON.stringify({ error: errorMsg }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      subscriptionId = newSubData.id;
      console.log(`[asaas-trocar-pagamento] Nova assinatura criada: ${subscriptionId}`);

      await supabaseAdmin.from("agencias").update({
        asaas_subscription_id: subscriptionId,
        data_proximo_vencimento: nextDueStr,
        status_pagamento: novo_metodo === "BOLETO" ? "pendente" : "ativo",
      }).eq("id", agencia_id);

      // Get first payment of new subscription
      try {
        const paymentsRes = await fetch(`${ASAAS_BASE}/subscriptions/${subscriptionId}/payments?limit=1`, {
          headers: { "access_token": asaasKey },
        });
        const paymentsData = await paymentsRes.json();

        if (paymentsData?.data?.length > 0) {
          const firstPayment = paymentsData.data[0];

          await supabaseAdmin.from("asaas_pagamentos").insert({
            agencia_id,
            asaas_payment_id: firstPayment.id,
            status: firstPayment.status,
            valor: firstPayment.value,
            vencimento: firstPayment.dueDate,
            forma_pagamento: novo_metodo,
            boleto_url: firstPayment.bankSlipUrl || null,
            boleto_linha_digitavel: firstPayment.identificationField || firstPayment.nossoNumero || null,
          });

          // If PIX, get QR code
          if (novo_metodo === "PIX") {
            const pixRes = await fetch(`${ASAAS_BASE}/payments/${firstPayment.id}/pixQrCode`, {
              headers: { "access_token": asaasKey },
            });
            const pixData = await pixRes.json();

            if (pixRes.ok && pixData.encodedImage) {
              await supabaseAdmin.from("asaas_pagamentos").update({
                pix_qr_code: pixData.encodedImage,
                pix_copia_cola: pixData.payload,
              }).eq("asaas_payment_id", firstPayment.id);

              return new Response(JSON.stringify({
                success: true,
                nova_assinatura: true,
                metodo: "PIX",
                pixQrCodeImage: pixData.encodedImage,
                pixCopiaECola: pixData.payload,
                pixPaymentId: firstPayment.id,
              }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
          }

          if (novo_metodo === "BOLETO") {
            return new Response(JSON.stringify({
              success: true,
              nova_assinatura: true,
              metodo: "BOLETO",
              boletoUrl: firstPayment.bankSlipUrl || null,
              boletoLinhaDigitavel: firstPayment.identificationField || firstPayment.nossoNumero || null,
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      } catch (e) {
        console.error("[asaas-trocar-pagamento] Erro ao buscar pagamento da nova subscription:", (e as Error).message);
      }

      return new Response(JSON.stringify({ success: true, nova_assinatura: true, metodo: novo_metodo }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── STEP 1: Update existing subscription billingType ───
    console.log(`[asaas-trocar-pagamento] Atualizando billingType para ${novo_metodo} na subscription ${subscriptionId}`);

    let subBody: Record<string, unknown> = { billingType: novo_metodo };

    if (novo_metodo === "CREDIT_CARD") {
      subBody = {
        ...subBody,
        creditCard: {
          holderName: cardHolderName,
          number: cardNumber.replace(/\s/g, ""),
          expiryMonth: cardExpiryMonth,
          expiryYear: cardExpiryYear,
          ccv: cardCvv,
        },
        creditCardHolderInfo: {
          name: cardHolderName,
          email: agencia.email || "",
          cpfCnpj: agencia.cnpj?.replace(/\D/g, "") || "",
          postalCode: agencia.cep?.replace(/\D/g, "") || "01310100",
          addressNumber: "0",
          phone: agencia.telefone?.replace(/\D/g, "") || undefined,
        },
      };
    }

    const subRes = await fetch(`${ASAAS_BASE}/subscriptions/${subscriptionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "access_token": asaasKey },
      body: JSON.stringify(subBody),
    });

    const subData = await subRes.json();
    if (!subRes.ok) {
      const errorMsg = subData.errors?.[0]?.description || "Erro ao atualizar método de pagamento";
      console.error("[asaas-trocar-pagamento] Erro ao atualizar subscription:", errorMsg);
      return new Response(JSON.stringify({ error: errorMsg }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log("[asaas-trocar-pagamento] Subscription atualizada com sucesso");

    // ─── STEP 2: Find pending payment ───
    console.log(`[asaas-trocar-pagamento] Buscando cobranças PENDING da subscription ${subscriptionId}`);

    const pendingRes = await fetch(
      `${ASAAS_BASE}/subscriptions/${subscriptionId}/payments?status=PENDING&limit=5`,
      { headers: { "access_token": asaasKey } }
    );
    const pendingData = await pendingRes.json();
    const pendingPayments = (pendingData.data || []).filter((p: any) => p.status === "PENDING");

    let dueDate: string | null = null;
    let value: number | null = null;
    let cancelledPaymentAsaasId: string | null = null;

    if (pendingPayments.length > 0) {
      const pending = pendingPayments[0];
      dueDate = pending.dueDate;
      value = pending.value;
      cancelledPaymentAsaasId = pending.id;

      console.log(`[asaas-trocar-pagamento] Cobrança pendente encontrada: ${pending.id}, dueDate=${dueDate}, value=${value}`);

      // Cancel the pending payment
      const delRes = await fetch(`${ASAAS_BASE}/payments/${pending.id}`, {
        method: "DELETE",
        headers: { "access_token": asaasKey },
      });
      const delData = await delRes.json();
      console.log(`[asaas-trocar-pagamento] Cobrança ${pending.id} cancelada:`, JSON.stringify(delData));

      if (!delRes.ok) {
        console.error("[asaas-trocar-pagamento] Erro ao cancelar cobrança:", JSON.stringify(delData));
        return new Response(JSON.stringify({ error: "Erro ao cancelar cobrança pendente" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      console.log("[asaas-trocar-pagamento] Nenhuma cobrança PENDING encontrada");
    }

    // ─── STEP 3: Create new payment with new method ───
    let newPaymentResult: Record<string, any> | null = null;

    if (dueDate && value) {
      console.log(`[asaas-trocar-pagamento] Criando nova cobrança: método=${novo_metodo}, dueDate=${dueDate}, value=${value}`);

      const newPaymentBody: Record<string, unknown> = {
        customer: customerId,
        billingType: novo_metodo,
        value,
        dueDate,
        description: `ViaHub — Plano ${planoLabel} (troca de método)`,
        externalReference: agencia_id,
      };

      if (novo_metodo === "CREDIT_CARD") {
        newPaymentBody.creditCard = {
          holderName: cardHolderName,
          number: cardNumber.replace(/\s/g, ""),
          expiryMonth: cardExpiryMonth,
          expiryYear: cardExpiryYear,
          ccv: cardCvv,
        };
        newPaymentBody.creditCardHolderInfo = {
          name: cardHolderName,
          email: agencia.email || "",
          cpfCnpj: agencia.cnpj?.replace(/\D/g, "") || "",
          postalCode: agencia.cep?.replace(/\D/g, "") || "01310100",
          addressNumber: "0",
          phone: agencia.telefone?.replace(/\D/g, "") || undefined,
        };
      }

      const createRes = await fetch(`${ASAAS_BASE}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "access_token": asaasKey },
        body: JSON.stringify(newPaymentBody),
      });
      newPaymentResult = await createRes.json();

      if (!createRes.ok) {
        const errorMsg = newPaymentResult?.errors?.[0]?.description || "Erro ao criar nova cobrança";
        console.error("[asaas-trocar-pagamento] Erro ao criar cobrança:", errorMsg);
        return new Response(JSON.stringify({ error: errorMsg }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`[asaas-trocar-pagamento] Nova cobrança criada: id=${newPaymentResult.id}, método=${novo_metodo}, dueDate=${dueDate}`);

      // ─── STEP 4: Update asaas_pagamentos table ───
      // Mark old payment as cancelled
      if (cancelledPaymentAsaasId) {
        await supabaseAdmin
          .from("asaas_pagamentos")
          .update({ status: "CANCELLED" })
          .eq("asaas_payment_id", cancelledPaymentAsaasId);
        console.log(`[asaas-trocar-pagamento] Pagamento antigo ${cancelledPaymentAsaasId} marcado como CANCELLED`);
      }

      // Insert new payment record
      await supabaseAdmin.from("asaas_pagamentos").insert({
        agencia_id,
        asaas_payment_id: newPaymentResult.id,
        status: newPaymentResult.status,
        valor: newPaymentResult.value,
        vencimento: newPaymentResult.dueDate,
        forma_pagamento: novo_metodo,
        boleto_url: newPaymentResult.bankSlipUrl || null,
        boleto_linha_digitavel: newPaymentResult.nossoNumero || null,
        pix_copia_cola: null,
        pix_qr_code: null,
      });
      console.log("[asaas-trocar-pagamento] Novo registro inserido na tabela asaas_pagamentos");

      // If PIX, fetch QR code
      if (novo_metodo === "PIX" && newPaymentResult.id) {
        const pixRes = await fetch(`${ASAAS_BASE}/payments/${newPaymentResult.id}/pixQrCode`, {
          headers: { "access_token": asaasKey },
        });
        const pixData = await pixRes.json();

        if (pixRes.ok && pixData.encodedImage) {
          // Update the record with PIX data
          await supabaseAdmin
            .from("asaas_pagamentos")
            .update({
              pix_qr_code: pixData.encodedImage,
              pix_copia_cola: pixData.payload,
            })
            .eq("asaas_payment_id", newPaymentResult.id);

          console.log("[asaas-trocar-pagamento] QR Code PIX obtido e salvo");

          return new Response(JSON.stringify({
            success: true,
            metodo: "PIX",
            pixQrCodeImage: pixData.encodedImage,
            pixCopiaECola: pixData.payload,
            pixPaymentId: newPaymentResult.id,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // If BOLETO, return boleto data
      if (novo_metodo === "BOLETO") {
        return new Response(JSON.stringify({
          success: true,
          metodo: "BOLETO",
          boletoUrl: newPaymentResult.bankSlipUrl || null,
          boletoLinhaDigitavel: newPaymentResult.nossoNumero || null,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // No pending payment found — just update the last payment record's forma_pagamento
      const { data: ultimoPag } = await supabaseAdmin
        .from("asaas_pagamentos")
        .select("id")
        .eq("agencia_id", agencia_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (ultimoPag) {
        await supabaseAdmin
          .from("asaas_pagamentos")
          .update({ forma_pagamento: novo_metodo })
          .eq("id", ultimoPag.id);
        console.log("[asaas-trocar-pagamento] Atualizado forma_pagamento no pagamento", ultimoPag.id);
      }
    }

    // CREDIT_CARD or fallback
    console.log("[asaas-trocar-pagamento] Sucesso!");
    return new Response(JSON.stringify({ success: true, metodo: novo_metodo }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[asaas-trocar-pagamento] Erro:", (err as Error).message);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
