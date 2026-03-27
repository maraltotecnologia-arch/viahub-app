import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, ChevronLeft, ChevronRight, Users, Loader2, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import useAgenciaId from "@/hooks/useAgenciaId";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import SortableTableHead from "@/components/SortableTableHead";
import EmptyState from "@/components/EmptyState";
import { formatarApenasDatabrasilia } from "@/lib/date-utils";
import ClienteTagBadges from "@/components/clientes/ClienteTagBadges";
import TemperaturaBadge from "@/components/clientes/TemperaturaBadge";
import TemperaturaControl from "@/components/clientes/TemperaturaControl";
import ClienteTagsInput, { SUGESTOES_TAGS } from "@/components/clientes/ClienteTagsInput";
import { formatError } from "@/lib/errors";
import { maskTelefone, maskCPFouCNPJ } from "@/lib/masks";
import { clienteSchema, validarCPF } from "@/lib/validators";
import { diasParaAniversario, formatarDiaMes } from "@/lib/aniversario";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const PAGE_SIZE = 20;

function AnivIcon({ dateStr }: { dateStr: string | null | undefined }) {
  const dias = diasParaAniversario(dateStr);
  if (dias === null || dias > 7) return null;
  const label = dias === 0 ? "Aniversário hoje! 🎉" : `Aniversário em ${dias} dia${dias !== 1 ? "s" : ""} — ${formatarDiaMes(dateStr!)}`;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-sm leading-none cursor-default" aria-label={label}>🎂</span>
        </TooltipTrigger>
        <TooltipContent side="top">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

const ORIGENS = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook",  label: "Facebook"  },
  { value: "indicacao", label: "Indicação"  },
  { value: "google",    label: "Google"     },
  { value: "site",      label: "Site"       },
  { value: "whatsapp",  label: "WhatsApp"   },
  { value: "email",     label: "Email"      },
  { value: "outros",    label: "Outros"     },
] as const;

const TEMP_OPTIONS = [
  { value: "frio",   label: "🔵 Frio"   },
  { value: "morno",  label: "🟡 Morno"  },
  { value: "quente", label: "🔴 Quente" },
] as const;

export default function Clientes() {
  const agenciaId = useAgenciaId();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();

  // ── filter state from URL ────────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState(() => params.get("q") || "");
  const search     = params.get("q")      || "";
  const origemFilter = params.get("origem") || "";
  const tempFilter   = params.get("temp")   || "";
  const tagsFilter   = params.get("tags") ? params.get("tags")!.split(",") : [];
  const page         = Number(params.get("page") || "0");

  // ── create dialog state ──────────────────────────────────────────────────
  const [open, setOpen]           = useState(false);
  const [nome, setNome]           = useState("");
  const [email, setEmail]         = useState("");
  const [telefone, setTelefone]   = useState("");
  const [cpf, setCpf]             = useState("");
  const [origemLead, setOrigemLead] = useState("");
  const [temperatura, setTemperatura] = useState("frio");
  const [newTags, setNewTags]     = useState<string[]>([]);
  const [saving, setSaving]       = useState(false);
  const [ordenacao, setOrdenacao] = useState({ campo: "criado_em", direcao: "desc" as "asc" | "desc" });

  // ── helpers ──────────────────────────────────────────────────────────────
  const setFilter = (key: string, value: string | null) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value); else next.delete(key);
      next.delete("page");
      return next;
    });
  };

  const goToPage = (p: number) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (p === 0) next.delete("page"); else next.set("page", String(p));
      return next;
    });
  };

  const toggleTagFilter = (tag: string) => {
    const next = tagsFilter.includes(tag)
      ? tagsFilter.filter((t) => t !== tag)
      : [...tagsFilter, tag];
    setFilter("tags", next.length > 0 ? next.join(",") : null);
  };

  const hasActiveFilters = !!(origemFilter || tempFilter || tagsFilter.length > 0 || search);

  const clearFilters = () => {
    setSearchInput("");
    setParams({});
  };

  // debounce search input → URL param
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilter("q", searchInput || null);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleSort = (campo: string, direcao: "asc" | "desc") => {
    setOrdenacao({ campo, direcao });
    goToPage(0);
  };

  // ── query ────────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ["clientes", agenciaId, search, page, ordenacao.campo, ordenacao.direcao, origemFilter, tempFilter, tagsFilter.join(",")],
    enabled: !!agenciaId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      let query: any = supabase
        .from("clientes")
        .select("id, nome, email, telefone, criado_em, tags, origem_lead, temperatura, data_nascimento, orcamentos(count)", { count: "exact" })
        .eq("agencia_id", agenciaId!)
        .order(ordenacao.campo, { ascending: ordenacao.direcao === "asc" });

      if (search.trim()) query = query.or(`nome.ilike.%${search}%,email.ilike.%${search}%`);
      if (origemFilter)  query = query.eq("origem_lead", origemFilter);
      if (tempFilter)    query = query.eq("temperatura", tempFilter);
      if (tagsFilter.length > 0) query = query.overlaps("tags", tagsFilter);

      query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      const { data, error, count } = await query;
      if (error) throw error;
      return { rows: data, count: count ?? 0 };
    },
  });

  const totalPages = Math.ceil((data?.count ?? 0) / PAGE_SIZE);

  // ── create ───────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    const parsed = clienteSchema.safeParse({ nome, email, telefone, cpf });
    if (!parsed.success) {
      toast({ title: parsed.error.errors[0]?.message || "Dados inválidos", variant: "destructive" });
      return;
    }
    const cpfLimpo = cpf.replace(/\D/g, "");
    if (cpfLimpo && !validarCPF(cpfLimpo)) {
      toast({ title: "CPF inválido — verifique os dígitos", variant: "destructive" });
      return;
    }
    if (!agenciaId) { toast({ title: "Erro ao identificar agência", variant: "destructive" }); return; }

    setSaving(true);
    try {
      const { error } = await supabase.from("clientes").insert({
        agencia_id: agenciaId,
        nome:       parsed.data.nome,
        email:      parsed.data.email || null,
        telefone:   telefone.replace(/\D/g, "") || null,
        cpf:        cpfLimpo || null,
        origem_lead: origemLead || null,
        temperatura,
        tags:        newTags.length > 0 ? newTags : null,
      } as any);
      if (error) {
        toast({ title: formatError("CLI001"), variant: "destructive" });
      } else {
        toast({ title: "Cliente criado com sucesso!" });
        queryClient.invalidateQueries({ queryKey: ["clientes"] });
        setOpen(false);
        setNome(""); setEmail(""); setTelefone(""); setCpf("");
        setOrigemLead(""); setTemperatura("frio"); setNewTags([]);
      }
    } catch {
      toast({ title: "Erro inesperado ao criar cliente", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-2xl font-bold">Clientes</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="default"><Plus className="h-4 w-4 mr-2" /> Novo Cliente</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>Novo Cliente</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2"><Label>Nome</Label><Input placeholder="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" placeholder="email@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Telefone</Label><Input placeholder="(00) 00000-0000" value={telefone} onChange={(e) => setTelefone(maskTelefone(e.target.value))} /></div>
                <div className="space-y-2"><Label>CPF / CNPJ</Label><Input placeholder="000.000.000-00" value={cpf} onChange={(e) => setCpf(maskCPFouCNPJ(e.target.value))} /></div>
              </div>
              <div className="space-y-2">
                <Label>Origem do lead</Label>
                <Select value={origemLead} onValueChange={setOrigemLead}>
                  <SelectTrigger><SelectValue placeholder="Selecione a origem..." /></SelectTrigger>
                  <SelectContent>
                    {ORIGENS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Temperatura do lead</Label>
                <TemperaturaControl value={temperatura} onChange={setTemperatura} />
              </div>
              <div className="space-y-2">
                <Label>Tags</Label>
                <ClienteTagsInput tags={newTags} onChange={setNewTags} />
              </div>
              <Button variant="default" className="w-full" onClick={handleCreate} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {saving ? "Salvando..." : "Salvar Cliente"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="space-y-3 pb-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email..."
              className="pl-9"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          {/* Advanced filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Origem do lead */}
            <Select
              value={origemFilter || "todos"}
              onValueChange={(v) => setFilter("origem", v === "todos" ? null : v)}
            >
              <SelectTrigger className="h-8 w-auto min-w-[148px] text-xs">
                <SelectValue placeholder="Origem do lead" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as origens</SelectItem>
                {ORIGENS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Temperatura */}
            <div className="flex items-center gap-1">
              {TEMP_OPTIONS.map((opt) => {
                const active = tempFilter === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFilter("temp", active ? null : opt.value)}
                    className={`h-8 px-3 rounded-xl text-xs font-medium transition-all border ${
                      active
                        ? "bg-primary/10 text-primary border-primary/30"
                        : "bg-transparent text-muted-foreground border-border hover:border-primary/30 hover:text-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Tags multiselect */}
            <div className="flex flex-wrap gap-1">
              {SUGESTOES_TAGS.map((tag) => {
                const active = tagsFilter.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTagFilter(tag)}
                    className={`h-7 px-2.5 rounded-full text-[11px] font-medium transition-all border ${
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-transparent text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>

            {/* Clear filters */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="h-7 px-2.5 flex items-center gap-1 rounded-full text-[11px] font-medium text-muted-foreground hover:text-destructive border border-dashed border-muted-foreground/40 hover:border-destructive/40 transition-colors ml-auto"
              >
                <X className="h-3 w-3" /> Limpar filtros
              </button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : isMobile ? (
            <div className="space-y-3">
              {data?.rows?.map((c: any) => (
                <Link key={c.id} to={`/clientes/${c.id}`} className="block">
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{c.nome}</p>
                        <AnivIcon dateStr={c.data_nascimento} />
                        <TemperaturaBadge temperatura={c.temperatura} />
                      </div>
                      {c.tags && c.tags.length > 0 && <ClienteTagBadges tags={c.tags} />}
                      {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{c.telefone || "-"}</span>
                        <span>{(c.orcamentos as any)?.[0]?.count ?? 0} orçamentos</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
              {data?.rows?.length === 0 && (
                <EmptyState
                  icon={<Users className="h-9 w-9" />}
                  title="Nenhum cliente encontrado"
                  description={hasActiveFilters ? "Tente ajustar os filtros aplicados" : "Adicione seus clientes para começar a criar orçamentos personalizados"}
                  actionLabel={hasActiveFilters ? "Limpar filtros" : "Adicionar primeiro cliente"}
                  onAction={hasActiveFilters ? clearFilters : () => setOpen(true)}
                />
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHead label="Nome" field="nome" currentField={ordenacao.campo} currentDirection={ordenacao.direcao} defaultField="criado_em" onSort={handleSort} />
                    <SortableTableHead label="Temp." field="temperatura" currentField={ordenacao.campo} currentDirection={ordenacao.direcao} defaultField="criado_em" onSort={handleSort} />
                    <TableHead>Tags</TableHead>
                    <SortableTableHead label="Email" field="email" currentField={ordenacao.campo} currentDirection={ordenacao.direcao} defaultField="criado_em" onSort={handleSort} />
                    <SortableTableHead label="Telefone" field="telefone" currentField={ordenacao.campo} currentDirection={ordenacao.direcao} defaultField="criado_em" onSort={handleSort} />
                    <TableHead>Orçamentos</TableHead>
                    <SortableTableHead label="Cadastro" field="criado_em" currentField={ordenacao.campo} currentDirection={ordenacao.direcao} defaultField="criado_em" onSort={handleSort} />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.rows?.map((c: any) => (
                    <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Link to={`/clientes/${c.id}`} className="font-medium hover:text-primary">{c.nome}</Link>
                          <AnivIcon dateStr={c.data_nascimento} />
                        </div>
                      </TableCell>
                      <TableCell><TemperaturaBadge temperatura={c.temperatura} /></TableCell>
                      <TableCell><ClienteTagBadges tags={c.tags || []} /></TableCell>
                      <TableCell>{c.email || "-"}</TableCell>
                      <TableCell>{c.telefone || "-"}</TableCell>
                      <TableCell className="font-semibold">{(c.orcamentos as any)?.[0]?.count ?? 0}</TableCell>
                      <TableCell className="text-muted-foreground">{c.criado_em ? formatarApenasDatabrasilia(c.criado_em) : "-"}</TableCell>
                    </TableRow>
                  ))}
                  {data?.rows?.length === 0 && (
                    <TableRow><TableCell colSpan={7}>
                      <EmptyState
                        icon={<Users className="h-9 w-9" />}
                        title="Nenhum cliente encontrado"
                        description={hasActiveFilters ? "Tente ajustar os filtros aplicados" : "Adicione seus clientes para começar a criar orçamentos personalizados"}
                        actionLabel={hasActiveFilters ? "Limpar filtros" : "Adicionar primeiro cliente"}
                        onAction={hasActiveFilters ? clearFilters : () => setOpen(true)}
                      />
                    </TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Exibindo {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, data?.count ?? 0)} de {data?.count ?? 0} clientes
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page === 0} onClick={() => goToPage(page - 1)}><ChevronLeft className="h-4 w-4 mr-1" />Anterior</Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => goToPage(page + 1)}>Próximo<ChevronRight className="h-4 w-4 ml-1" /></Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
