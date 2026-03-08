import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Plus, DollarSign, Activity } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import useUserRole from "@/hooks/useUserRole";
import { useTheme } from "@/contexts/ThemeContext";

const planoConfig: Record<string, { label: string; color: string }> = {
  starter: { label: "Starter", color: "bg-muted text-muted-foreground" },
  pro: { label: "Pro", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  elite: { label: "Elite", color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
};

const planoPreco: Record<string, number> = {
  starter: 397,
  pro: 697,
  elite: 1997,
};

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function getPeriodRange(period: string): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  let start: Date;
  switch (period) {
    case "mes_anterior": {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endPrev = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { start, end: endPrev };
    }
    case "ultimos_3":
      start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      return { start, end };
    case "ultimos_6":
      start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      return { start, end };
    case "este_ano":
      start = new Date(now.getFullYear(), 0, 1);
      return { start, end };
    default: // mes_atual
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start, end };
  }
}

export default function AdminAgencias() {
  const navigate = useNavigate();
  const { isSuperadmin, loading: roleLoading } = useUserRole();
  const queryClient = useQueryClient();
  const { isDark } = useTheme();
  

  const planoBadgeDarkStyle = (plano: string): React.CSSProperties => {
    const map: Record<string, React.CSSProperties> = {
      starter: { background: "rgba(100,116,139,0.25)", color: "#CBD5E1", border: "1px solid rgba(100,116,139,0.4)" },
      pro: { background: "rgba(37,99,235,0.25)", color: "#93C5FD", border: "1px solid rgba(37,99,235,0.4)" },
      elite: { background: "rgba(139,92,246,0.25)", color: "#C4B5FD", border: "1px solid rgba(139,92,246,0.4)" },
    };
    return map[plano] ?? map.starter;
  };

  useEffect(() => {
    if (!roleLoading && !isSuperadmin) {
      toast.error("Acesso não autorizado");
      navigate("/dashboard", { replace: true });
    }
  }, [roleLoading, isSuperadmin, navigate]);

  const { data: agencias, isLoading } = useQuery({
    queryKey: ["admin-agencias"],
    enabled: isSuperadmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agencias")
        .select("*")
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  

  const toggleMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from("agencias").update({ ativo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-agencias"] });
      toast.success("Status atualizado");
    },
  });

  if (roleLoading || (!isSuperadmin && !roleLoading)) {
    return <div className="p-6"><Skeleton className="h-8 w-48" /></div>;
  }

  const total = agencias?.length ?? 0;
  const ativas = agencias?.filter((a) => a.ativo !== false).length ?? 0;
  const mrr = agencias
    ?.filter((a) => a.ativo !== false)
    .reduce((s, a) => s + (planoPreco[a.plano || "starter"] || 0), 0) ?? 0;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Agências</h2>
        <Button onClick={() => navigate("/admin/agencias/nova")}>
          <Plus className="h-4 w-4 mr-2" /> Nova Agência
        </Button>
      </div>

      <Tabs defaultValue="agencias">
        <TabsList>
          <TabsTrigger value="agencias">Agências</TabsTrigger>
          <TabsTrigger value="mensalidades">Mensalidades</TabsTrigger>
        </TabsList>

        <TabsContent value="agencias">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Total de Agências</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{total}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Agências Ativas</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{ativas}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>MRR Estimado</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(mrr)}</div></CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="pt-6">
                {isLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome Fantasia</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Plano</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Cadastro</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {agencias?.map((a) => {
                        const plano = planoConfig[a.plano || "starter"] || planoConfig.starter;
                        return (
                          <TableRow key={a.id}>
                            <TableCell className="font-medium">{a.nome_fantasia}</TableCell>
                            <TableCell className="text-muted-foreground">{a.email || "—"}</TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${!isDark ? plano.color : ""}`}
                                style={isDark ? planoBadgeDarkStyle(a.plano || "starter") : undefined}
                              >
                                {plano.label}
                              </span>
                            </TableCell>
                            <TableCell>
                              <button
                                className="flex items-center gap-2"
                                onClick={() => toggleMutation.mutate({ id: a.id, ativo: a.ativo === false })}
                              >
                                {a.ativo !== false ? (
                                  <>
                                    <div className="w-10 h-6 bg-green-500 rounded-full relative">
                                      <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1" />
                                    </div>
                                    <span className="text-green-600 dark:text-green-400 text-sm font-medium">Ativo</span>
                                  </>
                                ) : (
                                  <>
                                    <div className="w-10 h-6 bg-red-500 rounded-full relative">
                                      <div className="w-4 h-4 bg-white rounded-full absolute left-1 top-1" />
                                    </div>
                                    <span className="text-red-600 dark:text-red-400 text-sm font-medium">Inativo</span>
                                  </>
                                )}
                              </button>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {a.criado_em ? new Date(a.criado_em).toLocaleDateString("pt-BR") : "—"}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button variant="ghost" size="sm" asChild>
                                  <Link to={`/admin/agencias/${a.id}`}>Ver detalhes</Link>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {agencias?.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6}>
                            <EmptyState
                              icon={<Building2 className="h-9 w-9" />}
                              title="Nenhuma agência cadastrada"
                              description="Cadastre a primeira agência cliente da plataforma"
                              actionLabel="Cadastrar agência"
                              onAction={() => navigate("/admin/agencias/nova")}
                            />
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="mensalidades">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>MRR Mensalidades</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(mrr)}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Agências Ativas</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{ativas}</div></CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agência</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead className="text-right">Mensalidade</TableHead>
                      <TableHead>Status Pgto</TableHead>
                      <TableHead>Próx. Vencimento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agencias?.filter((a) => a.ativo !== false).map((a) => {
                      const plano = a.plano || "starter";
                      const planoInfo = planoConfig[plano] || planoConfig.starter;
                      const mensalidade = planoPreco[plano] || 0;
                      const statusPgto = (a as any).status_pagamento || "ativo";
                      const proxVenc = (a as any).data_proximo_vencimento;
                      const statusColor: Record<string, string> = {
                        ativo: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400",
                        pendente: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400",
                        inadimplente: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400",
                        bloqueado: "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400",
                        cancelado: "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400",
                      };
                      return (
                        <TableRow key={a.id}>
                          <TableCell className="font-medium">{a.nome_fantasia}</TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${!isDark ? planoInfo.color : ""}`}
                              style={isDark ? planoBadgeDarkStyle(plano) : undefined}
                            >
                              {planoInfo.label}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">{fmt(mensalidade)}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[statusPgto] || statusColor.ativo}`}>
                              {statusPgto.charAt(0).toUpperCase() + statusPgto.slice(1)}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {proxVenc ? new Date(proxVenc).toLocaleDateString("pt-BR") : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {(!agencias || agencias.filter((a) => a.ativo !== false).length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Nenhuma agência ativa
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
