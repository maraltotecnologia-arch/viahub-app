import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 1x1 transparent GIF
const PIXEL_GIF_BASE64 = "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
const PIXEL_GIF = Uint8Array.from(atob(PIXEL_GIF_BASE64), (c) => c.charCodeAt(0));

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const orcamentoId = url.searchParams.get("id");

  if (orcamentoId) {
    try {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      // Only set email_aberto_em if not already set (first open)
      const { data: orc } = await supabaseAdmin
        .from("orcamentos")
        .select("email_aberto_em")
        .eq("id", orcamentoId)
        .maybeSingle();

      if (orc && !orc.email_aberto_em) {
        await supabaseAdmin
          .from("orcamentos")
          .update({ email_aberto_em: new Date().toISOString() })
          .eq("id", orcamentoId);

        console.log(`[rastrear-email] Email aberto: ${orcamentoId}`);
      }
    } catch (err) {
      console.error("[rastrear-email] Erro:", (err as Error).message);
    }
  }

  return new Response(PIXEL_GIF, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
});
