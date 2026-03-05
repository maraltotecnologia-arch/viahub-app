import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Users, Calendar, DollarSign, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import useUserRole from "@/hooks/useUserRole";
import ConfirmDialog from "@/components/ConfirmDialog";
import { validarCNPJ } from "@/lib/validators";
import { useTheme } from "@/contexts/ThemeContext";
import LogsAcessoAgencia from "@/components/admin/LogsAcessoAgencia";

const planoConfig: Record<string, { label: string; color: string }> = {
  starter_a: { label: "Starter", color: "bg-muted text-muted-foreground" },
  starter_b: { label: "Starter + Comissão", color: "bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300" },
  pro_a: { label: "Pro", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  pro_b: { label: "Pro + Comissão", color: "bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200" },
  agency_c: { label: "Elite", color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
};

const planos = [
  { value: "starter_a", label: "Starter" },
  { value: "starter_b", label: "Starter + Comissão" },
  { value: "pro_a", label: "Pro" },
  { value: "pro_b", label: "Pro + Comissão" },
  { value: "agency_c", label: "Elite" },
];

const planoPreco: Record<string, number> = {
  starter_a: 397,
  starter_b: 197,
  pro_a: 697,
  pro_b: 297,
  agency_c: 1997,
};

const planoComissao: Record<string, number> = {
  starter_a: 0,
  starter_b: 0.015,
  pro_a: 0,
  pro_b: 0.012,
  agency_c: 0,
};

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function AdminAgenciaDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isSuperadmin, loading: roleLoading } = useUserRole();
  const { isDark } = useTheme();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({});
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [cnpjError, setCnpjError] = useState("");

  const planoBadgeDarkStyle = (plano: string): React.CSSProperties => {
    const map: Record<string, React.CSSProperties> = {
      starter_a: { background: "rgba(100,116,139,0.25)", color: "#CBD5E1", border: "1px solid rgba(100,116,139,0.4)" },
      starter_b: { background: "rgba(14,165,233,0.25)", color: "#7DD3FC", border: "1px solid rgba(14,165,233,0.4)" },
      pro_a: { background: "rgba(37,99,235,0.25)", color: "#93C5FD", border: "1px solid rgba(37,99,235,0.4)" },
      pro_b: { background: "rgba(29,78,216,0.25)", color: "#BFDBFE", border: "1px solid rgba(29,78,216,0.4)" },
      agency_c: { background: "rgba(139,92,246,0.25)", color: "#C4B5FD", border: "1px solid rgba(139,92,246,0.4)" },
    };
    return map[plano] ?? map.starter_a;
  };

  useEffect(() => {
    if (!roleLoading && !isSuperadmin) {
      toast.error("Acesso não autorizado");
      navigate("/dashboard", { replace: true });
    }
  }, [roleLoading, isSuperadmin, navigate]);

  const { data: agencia, isLoading } = useQuery({
    queryKey: ["admin-agencia", id],
    enabled: !!id && isSuperadmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agencias")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (agencia) setForm(agencia);
  }, [agencia]);

  const { data: usuarios } = useQuery({
    queryKey: ["admin-agencia-usuarios", id],
    enabled: !!id && isSuperadmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("usuarios")
        .select("*")
        .eq("agencia_id", id!);
      if (error) throw error;
      return data;
    },
  });

  const { data: metrics } = useQuery({
    queryKey: ["admin-agencia-metrics", id],
    enabled: !!id && isSuperadmin,
    queryFn: async () => {
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59, 999);

      const { data: orcamentos } = await supabase
        .from("orcamentos")
        .select("id, valor_final, criado_em, atualizado_em, status, pago_em")
        .eq("agencia_id", id!);

      const { count: clienteCount } = await supabase
        .from("clientes")
        .select("id", { count: "exact", head: true })
        .eq("agencia_id", id!);

      const startISO = startOfMonth.toISOString();
      const totalOrcamentos = orcamentos?.length ?? 0;
      const orcamentosMes = orcamentos?.filter((o) => o.criado_em && o.criado_em >= startISO).length ?? 0;
      const valorMes = orcamentos
        ?.filter((o) => o.criado_em && o.criado_em >= startISO)
        .reduce((s, o) => s + (Number(o.valor_final) || 0), 0) ?? 0;

      const volumePagoMes = orcamentos
        ?.filter((o) => {
          if (o.status !== "pago") return false;
          const dataRef = o.pago_em || o.atualizado_em || o.criado_em;
          if (!dataRef) return false;
          const d = new Date(dataRef);
          return d >= startOfMonth && d <= endOfMonth;
        })
        .reduce((s, o) => s + (Number(o.valor_final) || 0), 0) ?? 0;

      return {
        totalOrcamentos,
        totalClientes: clienteCount ?? 0,
        orcamentosMes,
        valorMes,
        volumePagoMes,
      };
    },
  });

  const handleSave = async () => {
    const { error } = await supabase
      .from("agencias")
      .update({
        nome_fantasia: form.nome_fantasia,
        cnpj: form.cnpj,
        email: form.email,
        telefone: form.telefone,
        plano: form.plano,
      })
      .eq("id", id!);

    if (error) {
      toast.error("Erro ao salvar");
      return;
    }
    toast.success("Agência atualizada");
    setEditing(false);
    queryClient.invalidateQueries({ queryKey: ["admin-agencia", id] });
  };

  const toggleAtivo = async () => {
    const newVal = agencia?.ativo === false ? true : false;
    if (!newVal) {
      setShowDeactivateConfirm(true);
      return;
    }
    await doToggleAtivo();
  };

  const doToggleAtivo = async () => {
    const newVal = agencia?.ativo === false ? true : false;
    const { error } = await supabase.from("agencias").update({ ativo: newVal }).eq("id", id!);
    if (error) {
      toast.error("Erro ao alterar status");
      return;
    }
    toast.success(newVal ? "Agência ativada" : "Agência desativada");
    queryClient.invalidateQueries({ queryKey: ["admin-agencia", id] });
    setShowDeactivateConfirm(false);
  };

  if (roleLoading || isLoading) {
    return <div className="space-y-4 p-6">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>;
  }

  if (!agencia) {
    return <div className="p-6 text-muted-foreground">Agência não encontrada</div>;
  }

  const planoInfo = planoConfig[agencia.plano || "starter_a"] || planoConfig.starter_a;
  const tempoCliente = agencia.criado_em
    ? Math.floor((Date.now() - new Date(agencia.criado_em).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <Button variant="ghost" size="sm" onClick={() => navigate("/admin/agencias")}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
      </Button>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 mb-4 md:mb-0">
          <h2 className="text-2xl font-bold">{agencia.nome_fantasia}</h2>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${!isDark ? planoInfo.color : ""}`}
            style={isDark ? planoBadgeDarkStyle(agencia.plano || "starter_a") : undefined}
          >
            {planoInfo.label}
          </span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {editing ? (
            <>
              <Button onClick={handleSave}>Salvar</Button>
              <Button variant="outline" onClick={() => { setEditing(false); setForm(agencia); }}>Cancelar</Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setEditing(true)}>Editar</Button>
          )}
          <Button variant={agencia.ativo === false ? "default" : "destructive"} onClick={toggleAtivo}>
            {agencia.ativo === false ? "Ativar" : "Desativar"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Orçamentos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{metrics?.totalOrcamentos ?? 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{metrics?.totalClientes ?? 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Orçam. este mês</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{metrics?.orcamentosMes ?? 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Valor orçado (mês)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(metrics?.valorMes ?? 0)}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Dados Cadastrais</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome Fantasia</Label>
              <Input value={form.nome_fantasia || ""} disabled={!editing} onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>CNPJ</Label>
              <Input
                value={form.cnpj || ""}
                disabled={!editing}
                onChange={(e) => { setForm({ ...form, cnpj: e.target.value }); setCnpjError(""); }}
                onBlur={() => {
                  if (!editing) return;
                  const v = (form.cnpj || "").replace(/\D/g, "");
                  if (!v) { setCnpjError(""); return; }
                  if (!validarCNPJ(form.cnpj)) setCnpjError("CNPJ inválido");
                  else setCnpjError("");
                }}
                className={cnpjError ? "border-destructive" : ""}
              />
              {cnpjError && <p className="text-xs text-destructive">{cnpjError}</p>}
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={form.email || ""} disabled={!editing} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={form.telefone || ""} disabled={!editing} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Plano</Label>
              {editing ? (
                <Select value={form.plano || "starter_a"} onValueChange={(v) => setForm({ ...form, plano: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {planos.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={planoInfo.label} disabled />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Usuários da Agência</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios?.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.nome || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email || "—"}</TableCell>
                  <TableCell>{u.cargo || "agente"}</TableCell>
                  <TableCell>
                    <Badge variant={u.ativo !== false ? "success" : "destructive"}>
                      {u.ativo !== false ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {(!usuarios || usuarios.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                    Nenhum usuário vinculado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {(() => {
        const plano = agencia.plano || "starter_a";
        const mensalidade = planoPreco[plano] || 0;
        const taxa = planoComissao[plano] || 0;
        const volumePago = metrics?.volumePagoMes ?? 0;
        const comissao = volumePago * taxa;
        return (
          <Card>
            <CardHeader><CardTitle className="text-lg">Receita Estimada (mês atual)</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Mensalidade fixa</p>
                  <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(mensalidade)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Volume pago</p>
                  <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(volumePago)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Comissão ({taxa > 0 ? `${(taxa * 100).toFixed(1)}%` : "—"})</p>
                  <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(comissao)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total estimado</p>
                  <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(mensalidade + comissao)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      <Card>
        <CardHeader><CardTitle className="text-lg">Histórico</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Data de cadastro:</span>{" "}
            {agencia.criado_em ? new Date(agencia.criado_em).toLocaleDateString("pt-BR") : "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Tempo como cliente:</span>{" "}
            {tempoCliente} dias
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <LogsAcessoAgencia agenciaId={agencia.id} />
        </CardContent>
      </Card>
      <ConfirmDialog
        open={showDeactivateConfirm}
        onOpenChange={setShowDeactivateConfirm}
        title="Desativar agência"
        description={`Tem certeza que deseja desativar ${agencia.nome_fantasia}? Os usuários não poderão mais acessar o sistema.`}
        confirmLabel="Desativar"
        variant="destructive"
        onConfirm={doToggleAtivo}
      />
    </div>
  );
}
