import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, ChevronLeft, ChevronRight, Users } from "lucide-react";
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
import { formatError } from "@/lib/errors";
import { maskTelefone, maskCPFouCNPJ } from "@/lib/masks";

const PAGE_SIZE = 20;

const TAG_FILTERS = ["Todos", "VIP", "Corporativo", "Recorrente", "Prospect", "Inativo"] as const;

export default function Clientes() {
  const agenciaId = useAgenciaId();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);
  const [ordenacao, setOrdenacao] = useState({ campo: "criado_em", direcao: "desc" as "asc" | "desc" });
  const [tagFilter, setTagFilter] = useState<string>("Todos");

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleSort = (campo: string, direcao: "asc" | "desc") => {
    setOrdenacao({ campo, direcao });
    setPage(0);
  };

  const { data, isLoading } = useQuery({
    queryKey: ["clientes", agenciaId, search, page, ordenacao.campo, ordenacao.direcao, tagFilter],
    enabled: !!agenciaId,
    queryFn: async () => {
      let query = supabase
        .from("clientes")
        .select("id, nome, email, telefone, criado_em, tags, orcamentos(count)", { count: "exact" })
        .eq("agencia_id", agenciaId!)
        .order(ordenacao.campo, { ascending: ordenacao.direcao === "asc" });

      if (search.trim()) {
        query = query.or(`nome.ilike.%${search}%,email.ilike.%${search}%`);
      }

      if (tagFilter !== "Todos") {
        query = query.contains("tags" as any, [tagFilter]);
      }

      query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      const { data, error, count } = await query;
      if (error) throw error;
      return { rows: data, count: count ?? 0 };
    },
  });

  const totalPages = Math.ceil((data?.count ?? 0) / PAGE_SIZE);

  const handleCreate = async () => {
    if (!nome.trim()) return;
    if (!agenciaId) {
      toast({ title: "Erro ao identificar agência", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("clientes")
      .insert({ agencia_id: agenciaId, nome, email: email || null, telefone: telefone.replace(/\D/g, "") || null, cpf: cpf.replace(/\D/g, "") || null });
    if (error) {
      toast({ title: formatError("CLI001"), variant: "destructive" });
    } else {
      toast({ title: "Cliente criado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      setOpen(false); setNome(""); setEmail(""); setTelefone(""); setCpf("");
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-2xl font-bold">Clientes</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="gradient"><Plus className="h-4 w-4 mr-2" /> Novo Cliente</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Cliente</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2"><Label>Nome</Label><Input placeholder="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" placeholder="email@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div className="space-y-2"><Label>Telefone</Label><Input placeholder="(00) 00000-0000" value={telefone} onChange={(e) => setTelefone(maskTelefone(e.target.value))} /></div>
              <div className="space-y-2"><Label>CPF / CNPJ</Label><Input placeholder="000.000.000-00" value={cpf} onChange={(e) => setCpf(maskCPFouCNPJ(e.target.value))} /></div>
              <Button variant="gradient" className="w-full" onClick={handleCreate} disabled={saving}>{saving ? "Salvando..." : "Salvar Cliente"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome ou email..." className="pl-9" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
          </div>
          {/* Tag filter */}
          <div className="flex flex-wrap gap-2">
            {TAG_FILTERS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => { setTagFilter(tag); setPage(0); }}
                className="px-3 py-1 rounded-full text-xs font-medium transition-all border"
                style={
                  tagFilter === tag
                    ? { backgroundColor: "#2563EB", color: "#FFFFFF", borderColor: "#2563EB" }
                    : { backgroundColor: "transparent", borderColor: "var(--border-input)", color: "var(--text-secondary)" }
                }
              >
                {tag}
              </button>
            ))}
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
                      <p className="font-medium text-sm">{c.nome}</p>
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
                  title="Nenhum cliente cadastrado"
                  description="Adicione seus clientes para começar a criar orçamentos personalizados"
                  actionLabel="Adicionar primeiro cliente"
                  onAction={() => setOpen(true)}
                />
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHead label="Nome" field="nome" currentField={ordenacao.campo} currentDirection={ordenacao.direcao} defaultField="criado_em" onSort={handleSort} />
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
                      <TableCell><Link to={`/clientes/${c.id}`} className="font-medium hover:text-primary">{c.nome}</Link></TableCell>
                      <TableCell><ClienteTagBadges tags={c.tags || []} /></TableCell>
                      <TableCell>{c.email || "-"}</TableCell>
                      <TableCell>{c.telefone || "-"}</TableCell>
                      <TableCell className="font-semibold">{(c.orcamentos as any)?.[0]?.count ?? 0}</TableCell>
                      <TableCell className="text-muted-foreground">{c.criado_em ? formatarApenasDatabrasilia(c.criado_em) : "-"}</TableCell>
                    </TableRow>
                  ))}
                  {data?.rows?.length === 0 && (
                    <TableRow><TableCell colSpan={6}>
                      <EmptyState
                        icon={<Users className="h-9 w-9" />}
                        title="Nenhum cliente cadastrado"
                        description="Adicione seus clientes para começar a criar orçamentos personalizados"
                        actionLabel="Adicionar primeiro cliente"
                        onAction={() => setOpen(true)}
                      />
                    </TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Exibindo {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, data?.count ?? 0)} de {data?.count ?? 0} clientes
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4 mr-1" />Anterior</Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>Próximo<ChevronRight className="h-4 w-4 ml-1" /></Button>
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
