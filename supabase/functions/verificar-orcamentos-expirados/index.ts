import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("orcamentos")
    .update({ expirado: true })
    .lt("data_validade", today)
    .eq("expirado", false)
    .not("status", "in", '("aprovado","emitido","pago","perdido")')
    .select("id");

  if (error) {
    console.error("Erro ao marcar expirados:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const count = data?.length ?? 0;
  console.log(`Orçamentos marcados como expirados: ${count}`);
  return new Response(JSON.stringify({ expirados: count }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
