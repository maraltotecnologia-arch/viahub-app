import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const N8N_WEBHOOK_URL =
  "https://primary-production-1ae06.up.railway.app/webhook/viahub-copilot";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Não autorizado", code: "AUTH009" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(
        JSON.stringify({ error: "Não autorizado", code: "AUTH009" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { mensagem, agencia_id } = await req.json();

    if (!mensagem) {
      return new Response(
        JSON.stringify({ error: "mensagem é obrigatória" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate agencia_id matches user's agency
    const { data: userProfile } = await supabase
      .from("usuarios")
      .select("agencia_id")
      .eq("id", user.id)
      .single();

    const validAgenciaId = userProfile?.agencia_id || agencia_id;

    // Fetch markup_voos from configuracoes_markup
    let markup_voos = 10; // default

    if (validAgenciaId) {

      const { data } = await supabase
        .from("configuracoes_markup")
        .select("markup_percentual")
        .eq("agencia_id", agencia_id)
        .eq("tipo_servico", "voo")
        .eq("ativo", true)
        .maybeSingle();

      if (data?.markup_percentual) {
        markup_voos = Number(data.markup_percentual);
      }
    }

    // Call n8n webhook
    const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mensagem, markup_voos }),
    });

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      console.error("n8n error:", n8nResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: `Erro no webhook n8n [${n8nResponse.status}]` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const n8nData = await n8nResponse.json();

    // Extract content from Claude response: content[0].text
    let resposta = "";
    if (n8nData?.content?.[0]?.text) {
      resposta = n8nData.content[0].text;
    } else if (n8nData?.candidates?.[0]?.content?.parts?.[0]?.text) {
      resposta = n8nData.candidates[0].content.parts[0].text;
    } else if (typeof n8nData === "string") {
      resposta = n8nData;
    } else {
      resposta = JSON.stringify(n8nData);
    }

    // Strip wrapping ```markdown ... ``` delimiters
    resposta = resposta.replace(/^```(?:markdown)?\s*\n?/i, "").replace(/\n?```\s*$/i, "");

    // Try to parse structured JSON from the response
    let structured = null;
    try {
      // Check if the response itself is JSON
      const parsed = JSON.parse(resposta);
      if (parsed && parsed.itens_orcamento) {
        structured = parsed;
        // Use texto_formatado if available, otherwise keep resposta
        if (parsed.texto_formatado) {
          resposta = parsed.texto_formatado;
        }
      }
    } catch {
      // Check if there's a JSON block embedded in the text
      const jsonMatch = resposta.match(/```json\s*\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        try {
          const embedded = JSON.parse(jsonMatch[1]);
          if (embedded && embedded.itens_orcamento) {
            structured = embedded;
          }
        } catch {
          // ignore parse errors
        }
      }
    }

    const responseBody: Record<string, unknown> = { resposta };
    if (structured) {
      responseBody.structured = structured;
    }

    return new Response(
      JSON.stringify(responseBody),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("copilot-webhook error:", error);
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
