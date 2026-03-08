import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  customer?: string | null;
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

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: agencias, error: agenciasError } = await supabaseAdmin
      .from("agencias")
      .select("asaas_customer_id")
      .not("asaas_customer_id", "is", null);

    if (agenciasError) throw agenciasError;

    const allowedCustomers = new Set((agencias ?? []).map((a) => a.asaas_customer_id).filter(Boolean));

    if (allowedCustomers.size === 0) {
      return new Response(JSON.stringify({ total: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const startDate = String(start).slice(0, 10);
    const endDate = String(end).slice(0, 10);

    const sumStatus = async (status: "RECEIVED" | "CONFIRMED") => {
      let offset = 0;
      const limit = 100;
      let hasMore = true;
      let subtotal = 0;

      while (hasMore) {
        const url = new URL(`${ASAAS_BASE}/payments`);
        url.searchParams.set("status", status);
        url.searchParams.set("paymentDate[ge]", startDate);
        url.searchParams.set("paymentDate[le]", endDate);
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
          throw new Error("Falha ao consultar Asaas");
        }

        const payload = (await res.json()) as AsaasListResponse;
        const rows = payload.data ?? [];

        subtotal += rows.reduce((acc, item) => {
          if (!item.customer || !allowedCustomers.has(item.customer)) return acc;
          return acc + Number(item.netValue ?? item.value ?? 0);
        }, 0);

        hasMore = Boolean(payload.hasMore);
        offset += limit;
      }

      return subtotal;
    };

    const total = (await sumStatus("RECEIVED")) + (await sumStatus("CONFIRMED"));

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
