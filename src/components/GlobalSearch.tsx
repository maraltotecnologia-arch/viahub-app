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
        className="p-2 rounded-xl hover:bg-surface-container-high text-on-surface-variant transition-colors"
      >
        <Search className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-on-surface-variant/50" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); if (!open) setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={`Buscar orçamentos, clientes...`}
          className="w-full text-sm font-body px-4 py-2 pl-9 bg-surface-container-high rounded-xl border-none text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary/30 transition-all"
        />
        {loading && <Loader2 className="absolute right-3 top-2.5 w-4 h-4 animate-spin text-on-surface-variant" />}
        {query && !loading && (
          <button onClick={() => setQuery("")} className="absolute right-3 top-2.5 p-0.5">
            <X className="w-3.5 h-3.5 text-on-surface-variant" />
          </button>
        )}
        {!isMobile && !query && !loading && (
          <kbd className="absolute right-3 top-2 hidden md:inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium font-label bg-surface-container text-on-surface-variant/40">
            {shortcutLabel}
          </kbd>
        )}
      </div>

      {showDropdown && (
        <div
          className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-50 bg-surface-container-lowest shadow-ambient dark:bg-surface-container"
          style={{ maxHeight: 420, overflowY: "auto" }}
        >
          {!hasResults && !loading && (
            <div className="px-4 py-6 text-center text-sm text-on-surface-variant font-body">
              Nenhum resultado encontrado
            </div>
          )}

          {orcamentos.length > 0 && (
            <div>
              <div className="flex items-center gap-2 px-4 py-2 text-[10px] font-bold font-label uppercase tracking-widest text-on-surface-variant/50 bg-surface-container-low">
                <FileText className="w-3.5 h-3.5" /> Orçamentos
              </div>
              {orcamentos.map((o) => (
                <button
                  key={o.id}
                  onClick={() => goTo(`/orcamentos/${o.id}`)}
                  className="w-full text-left px-3 py-2 flex items-center gap-3 transition-colors hover:bg-surface-container-high text-on-surface cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold font-headline truncate">
                        {o.numero_orcamento || "Sem número"}
                      </span>
                      {o.status && <StatusBadge status={o.status} />}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs truncate text-on-surface-variant font-body">
                        {o.cliente_nome || o.titulo || "—"}
                      </span>
                    </div>
                  </div>
                  <span className="text-sm font-medium shrink-0 text-on-surface-variant font-body">
                    {formatCurrency(o.valor_final)}
                  </span>
                </button>
              ))}
              <button
                onClick={() => goTo("/orcamentos")}
                className="w-full text-left px-3 py-2 text-xs font-medium font-label text-primary hover:bg-surface-container-high transition-colors"
              >
                Ver todos em Orçamentos →
              </button>
            </div>
          )}

          {clientes.length > 0 && (
            <div>
              <div className="flex items-center gap-2 px-4 py-2 text-[10px] font-bold font-label uppercase tracking-widest text-on-surface-variant/50 bg-surface-container-low">
                <Users className="w-3.5 h-3.5" /> Clientes
              </div>
              {clientes.map((c) => (
                <button
                  key={c.id}
                  onClick={() => goTo(`/clientes/${c.id}`)}
                  className="w-full text-left px-3 py-2 flex items-center gap-3 transition-colors hover:bg-surface-container-high text-on-surface cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold font-headline truncate block">{c.nome}</span>
                    <span className="text-xs truncate block text-on-surface-variant font-body">
                      {c.email || "Sem email"}
                    </span>
                  </div>
                  <span className="text-xs shrink-0 text-on-surface-variant font-label">
                    {c.orcamentos_count} orç.
                  </span>
                </button>
              ))}
              <button
                onClick={() => goTo("/clientes")}
                className="w-full text-left px-3 py-2 text-xs font-medium font-label text-primary hover:bg-surface-container-high transition-colors"
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
