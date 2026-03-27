import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ASAAS_BASE = "https://sandbox.asaas.com/api/v3";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const asaasKey = Deno.env.get("ASAAS_API_KEY");
    if (!asaasKey) {
      return new Response(JSON.stringify({ error: "ASAAS_API_KEY não configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { payment_id } = await req.json();
    if (!payment_id) {
      return new Response(JSON.stringify({ error: "payment_id é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[asaas-gerar-qrcode-pix] Buscando pagamento ${payment_id}`);

    // Step 1: Get payment details
    const paymentRes = await fetch(`${ASAAS_BASE}/payments/${payment_id}`, {
      headers: { "User-Agent": "ViaHub/1.0", "access_token": asaasKey },
    });
    const paymentData = await paymentRes.json();

    if (!paymentRes.ok) {
      console.error("[asaas-gerar-qrcode-pix] Pagamento não encontrado:", JSON.stringify(paymentData));
      return new Response(JSON.stringify({ error: "Pagamento não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[asaas-gerar-qrcode-pix] Status: ${paymentData.status}, billingType: ${paymentData.billingType}`);

    // Step 2: Check if already paid
    if (paymentData.status === "RECEIVED" || paymentData.status === "CONFIRMED") {
      console.log("[asaas-gerar-qrcode-pix] Pagamento já confirmado");
      return new Response(JSON.stringify({ alreadyPaid: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 3: Get QR Code
    console.log(`[asaas-gerar-qrcode-pix] Buscando QR Code para ${payment_id}`);
    const qrRes = await fetch(`${ASAAS_BASE}/payments/${payment_id}/pixQrCode`, {
      headers: { "User-Agent": "ViaHub/1.0", "access_token": asaasKey },
    });
    const qrData = await qrRes.json();

    if (!qrRes.ok || !qrData.encodedImage) {
      console.error("[asaas-gerar-qrcode-pix] Erro ao obter QR Code:", JSON.stringify(qrData));
      return new Response(JSON.stringify({ error: "Erro ao gerar QR Code PIX" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[asaas-gerar-qrcode-pix] QR Code gerado com sucesso");

    // Step 4: Update DB with QR code data
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await supabaseAdmin
      .from("asaas_pagamentos")
      .update({
        pix_qr_code: qrData.encodedImage,
        pix_copia_cola: qrData.payload,
      })
      .eq("asaas_payment_id", payment_id);

    return new Response(JSON.stringify({
      encodedImage: qrData.encodedImage,
      payload: qrData.payload,
      expirationDate: qrData.expirationDate || null,
      value: paymentData.value,
      dueDate: paymentData.dueDate,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[asaas-gerar-qrcode-pix] Erro:", (err as Error).message);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
