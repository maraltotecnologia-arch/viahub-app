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
    const { token, nome } = await req.json();

    if (!token || !nome || nome.trim().length < 2) {
      return new Response(JSON.stringify({ error: "Token e nome são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Find the orcamento by token
    const { data: orc, error: findErr } = await supabase
      .from("orcamentos")
      .select("id, agencia_id, status, numero_orcamento")
      .eq("token_publico", token)
      .maybeSingle();

    if (findErr || !orc) {
      return new Response(JSON.stringify({ error: "Orçamento não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (orc.status !== "enviado") {
      return new Response(JSON.stringify({ error: "Orçamento não está disponível para aprovação" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date().toISOString();
    const trimmedName = nome.trim();

    // 2. Update status + approval fields
    const { error: updateErr } = await supabase
      .from("orcamentos")
      .update({
        status: "aprovado",
        aprovado_pelo_cliente_em: now,
        aprovado_pelo_cliente_nome: trimmedName,
      })
      .eq("id", orc.id);

    if (updateErr) throw updateErr;

    // 3. Register history
    await supabase.from("historico_orcamento").insert({
      orcamento_id: orc.id,
      usuario_id: null,
      agencia_id: orc.agencia_id,
      tipo: "status_alterado",
      status_anterior: "enviado",
      status_novo: "aprovado",
      descricao: `Orçamento aprovado pelo cliente: ${trimmedName}`,
    });

    // 4. Notify agency
    await supabase.from("notificacoes_sistema").insert({
      tipo: "info",
      titulo: "Orçamento aprovado pelo cliente",
      mensagem: `O orçamento ${orc.numero_orcamento || ""} foi aprovado por ${trimmedName} via link público.`,
      agencia_id: orc.agencia_id,
      destinatario: "admins",
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Erro ao aprovar:", e);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
