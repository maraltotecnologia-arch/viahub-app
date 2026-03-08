const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ASAAS_BASE = "https://sandbox.asaas.com/api/v3";

type AsaasPayment = {
  value?: number;
  netValue?: number;
  paymentDate?: string | null;
  clientPaymentDate?: string | null;
};

type AsaasListResponse = {
  data?: AsaasPayment[];
  hasMore?: boolean;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const asaasKey = Deno.env.get("ASAAS_API_KEY");
    if (!asaasKey) {
      return new Response(JSON.stringify({ error: "ASAAS_API_KEY não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { start, end } = await req.json();
    if (!start || !end) {
      return new Response(JSON.stringify({ error: "Período inválido", code: "SYS002" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let offset = 0;
    const limit = 100;
    let hasMore = true;
    let total = 0;

    while (hasMore) {
      const url = new URL(`${ASAAS_BASE}/payments`);
      url.searchParams.set("status", "RECEIVED");
      url.searchParams.set("paymentDate[ge]", start);
      url.searchParams.set("paymentDate[le]", end);
      url.searchParams.set("limit", String(limit));
      url.searchParams.set("offset", String(offset));

      const res = await fetch(url.toString(), {
        headers: {
          access_token: asaasKey,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("[asaas-total-recebido] erro API Asaas:", errText);
        return new Response(JSON.stringify({ error: "Falha ao consultar Asaas" }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const payload = (await res.json()) as AsaasListResponse;
      const rows = payload.data ?? [];

      total += rows.reduce((acc, item) => acc + Number(item.netValue ?? item.value ?? 0), 0);

      hasMore = Boolean(payload.hasMore);
      offset += limit;
    }

    return new Response(JSON.stringify({ total }), {
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
