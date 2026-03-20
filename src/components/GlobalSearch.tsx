import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, FileText, Users, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import StatusBadge from "@/components/StatusBadge";
import { useIsMobile } from "@/hooks/use-mobile";

interface OrcamentoResult {
  id: string;
  numero_orcamento: string | null;
  titulo: string | null;
  status: string | null;
  valor_final: number | null;
  cliente_nome?: string;
}

interface ClienteResult {
  id: string;
  nome: string;
  email: string | null;
  orcamentos_count: number;
}

export default function GlobalSearch() {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const shortcutLabel = isMac ? '⌘K' : 'Ctrl+K';
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [orcamentos, setOrcamentos] = useState<OrcamentoResult[]>([]);
  const [clientes, setClientes] = useState<ClienteResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const search = useCallback(async (term: string) => {
    if (term.length < 2) {
      setOrcamentos([]);
      setClientes([]);
      return;
    }
    setLoading(true);
    try {
      const [orcRes, cliRes] = await Promise.all([
        supabase
          .from("orcamentos")
          .select("id, numero_orcamento, titulo, status, valor_final, clientes(nome)")
          .or(`numero_orcamento.ilike.%${term}%,titulo.ilike.%${term}%`)
          .limit(4),
        supabase
          .from("clientes")
          .select("id, nome, email, orcamentos(id)")
          .or(`nome.ilike.%${term}%,email.ilike.%${term}%`)
          .limit(4),
      ]);

      setOrcamentos(
        (orcRes.data || []).map((o: any) => ({
          id: o.id,
          numero_orcamento: o.numero_orcamento,
          titulo: o.titulo,
          status: o.status,
          valor_final: o.valor_final,
          cliente_nome: o.clientes?.nome,
        }))
      );

      setClientes(
        (cliRes.data || []).map((c: any) => ({
          id: c.id,
          nome: c.nome,
          email: c.email,
          orcamentos_count: Array.isArray(c.orcamentos) ? c.orcamentos.length : 0,
        }))
      );
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search]);

  const goTo = (path: string) => {
    navigate(path);
    setOpen(false);
    setQuery("");
  };

  const hasResults = orcamentos.length > 0 || clientes.length > 0;
  const showDropdown = open && query.length >= 2;

  const formatCurrency = (v: number | null) =>
    v != null
      ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
      : "—";

  if (isMobile && !open) {
    return (
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="p-2 rounded-xl bg-muted text-muted-foreground hover:text-foreground transition-colors"
      >
        <Search className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex items-center gap-2 h-9 px-3 rounded-xl bg-muted transition-all duration-200">
        <Search className="w-4 h-4 shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); if (!open) setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={`Buscar orçamentos, clientes... ${shortcutLabel}`}
          className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground"
        />
        {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        {query && !loading && (
          <button onClick={() => setQuery("")} className="p-0.5">
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
        {!isMobile && !query && (
          <kbd className="hidden md:inline-flex items-center gap-0.5 rounded-lg px-1.5 py-0.5 text-[10px] font-medium bg-background text-muted-foreground border border-border/20">
            {shortcutLabel}
          </kbd>
        )}
      </div>

      {showDropdown && (
        <div
          className="absolute top-full left-0 right-0 mt-2 rounded-xl overflow-hidden z-50 bg-card/80 backdrop-blur-xl border border-border/15 shadow-[0_20px_50px_-12px_rgba(0,88,190,0.15)]"
          style={{ maxHeight: 420, overflowY: "auto" }}
        >
          {!hasResults && !loading && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Nenhum resultado encontrado
            </div>
          )}

          {orcamentos.length > 0 && (
            <div>
              <div className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground bg-muted/50">
                <FileText className="w-3.5 h-3.5" /> Orçamentos
              </div>
              {orcamentos.map((o) => (
                <button
                  key={o.id}
                  onClick={() => goTo(`/orcamentos/${o.id}`)}
                  className="w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors duration-150 hover:bg-muted/50 text-foreground"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold truncate">
                        {o.numero_orcamento || "Sem número"}
                      </span>
                      {o.status && <StatusBadge status={o.status} />}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs truncate text-muted-foreground">
                        {o.cliente_nome || o.titulo || "—"}
                      </span>
                    </div>
                  </div>
                  <span className="text-sm font-medium shrink-0 text-muted-foreground">
                    {formatCurrency(o.valor_final)}
                  </span>
                </button>
              ))}
              <button
                onClick={() => goTo("/orcamentos")}
                className="w-full text-left px-4 py-2 text-xs font-bold text-primary hover:bg-primary/[0.08] transition-colors"
              >
                Ver todos em Orçamentos →
              </button>
            </div>
          )}

          {clientes.length > 0 && (
            <div>
              <div className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground bg-muted/50">
                <Users className="w-3.5 h-3.5" /> Clientes
              </div>
              {clientes.map((c) => (
                <button
                  key={c.id}
                  onClick={() => goTo(`/clientes/${c.id}`)}
                  className="w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors duration-150 hover:bg-muted/50 text-foreground"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold truncate block">{c.nome}</span>
                    <span className="text-xs truncate block text-muted-foreground">
                      {c.email || "Sem email"}
                    </span>
                  </div>
                  <span className="text-xs shrink-0 text-muted-foreground">
                    {c.orcamentos_count} orç.
                  </span>
                </button>
              ))}
              <button
                onClick={() => goTo("/clientes")}
                className="w-full text-left px-4 py-2 text-xs font-bold text-primary hover:bg-primary/[0.08] transition-colors"
              >
                Ver todos em Clientes →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
