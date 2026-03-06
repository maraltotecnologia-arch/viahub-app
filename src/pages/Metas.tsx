import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import useAgenciaId from "@/hooks/useAgenciaId";
import useUserRole from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function getProgressColor(pct: number) {
  if (pct >= 100) return "#16A34A";
  if (pct >= 80) return "#2563EB";
  if (pct >= 50) return "#F59E0B";
  return "#EF4444";
}

function getStatusBadge(pct: number) {
  if (pct >= 100) return <Badge variant="success">Meta atingida 🎯</Badge>;
  if (pct > 0) return <Badge variant="info">Em andamento</Badge>;
  return <Badge variant="secondary">Sem progresso</Badge>;
}

export default function Metas() {
  const { user } = useAuth();
  const agenciaId = useAgenciaId();
  const { isAdmin, isAgente, isFinanceiro } = useUserRole();
  const queryClient = useQueryClient();

  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [showModal, setShowModal] = useState(false);
  const [modalUsuarioId, setModalUsuarioId] = useState("");
  const [modalMetaValor, setModalMetaValor] = useState("");
  const [modalMetaOrc, setModalMetaOrc] = useState("");
  const [saving, setSaving] = useState(false);

  // Fetch active users of the agency
  const { data: usuarios, isLoading: loadingUsuarios } = useQuery({
    queryKey: ["metas-usuarios", agenciaId],
    enabled: !!agenciaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("usuarios")
        .select("id, nome, cargo, ativo")
        .eq("agencia_id", agenciaId!)
        .eq("ativo", true);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch metas for the selected month/year
  const { data: metas, isLoading: loadingMetas } = useQuery({
    queryKey: ["metas-agentes", agenciaId, mes, ano],
    enabled: !!agenciaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("metas_agentes")
        .select("*")
        .eq("agencia_id", agenciaId!)
        .eq("mes", mes)
        .eq("ano", ano);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch orcamentos for the period to calculate "realizado"
  const { data: orcamentos } = useQuery({
    queryKey: ["metas-orcamentos", agenciaId, mes, ano],
    enabled: !!agenciaId,
    queryFn: async () => {
      const startDate = new Date(ano, mes - 1, 1).toISOString();
      const endDate = new Date(ano, mes, 0, 23, 59, 59, 999).toISOString();
      const { data, error } = await supabase
        .from("orcamentos")
        .select("usuario_id, valor_final, status")
        .eq("agencia_id", agenciaId!)
        .gte("criado_em", startDate)
        .lte("criado_em", endDate)
        .in("status", ["aprovado", "emitido", "pago"]);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Build realized data per user
  const realizadoByUser = useMemo(() => {
    const map: Record<string, { valor: number; count: number }> = {};
    orcamentos?.forEach((o) => {
      if (!o.usuario_id) return;
      if (!map[o.usuario_id]) map[o.usuario_id] = { valor: 0, count: 0 };
      map[o.usuario_id].valor += Number(o.valor_final) || 0;
      map[o.usuario_id].count += 1;
    });
    return map;
  }, [orcamentos]);

  // Filter users based on role
  const visibleUsers = useMemo(() => {
    if (!usuarios) return [];
    if (isAdmin) return usuarios;
    // Agente/Financeiro: only see themselves
    return usuarios.filter((u) => u.id === user?.id);
  }, [usuarios, isAdmin, isFinanceiro, isAgente, user]);

  const handleSave = async () => {
    if (!modalUsuarioId || !agenciaId) return;
    setSaving(true);
    const { error } = await supabase
      .from("metas_agentes")
      .upsert(
        {
          agencia_id: agenciaId,
          usuario_id: modalUsuarioId,
          mes,
          ano,
          meta_valor: Number(modalMetaValor) || 0,
          meta_orcamentos: Number(modalMetaOrc) || 0,
          atualizado_em: new Date().toISOString(),
        },
        { onConflict: "agencia_id,usuario_id,mes,ano" }
      );
    if (error) {
      toast.error("Erro ao salvar meta");
      console.error(error);
    } else {
      toast.success("Meta salva com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["metas-agentes"] });
      setShowModal(false);
    }
    setSaving(false);
  };

  const openModalForUser = (usuarioId?: string) => {
    const uid = usuarioId || "";
    setModalUsuarioId(uid);
    const existing = metas?.find((m) => m.usuario_id === uid);
    setModalMetaValor(existing ? String(existing.meta_valor || 0) : "");
    setModalMetaOrc(existing ? String(existing.meta_orcamentos || 0) : "");
    setShowModal(true);
  };

  const isLoading = loadingUsuarios || loadingMetas;

  const anos = Array.from({ length: 3 }, (_, i) => now.getFullYear() - 1 + i);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Metas da Equipe</h2>
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MESES.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
            <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {anos.map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          {isAdmin && (
            <Button onClick={() => openModalForUser()}>
              <Target className="h-4 w-4 mr-2" /> Definir Metas
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : visibleUsers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum agente encontrado
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleUsers.map((u) => {
            const meta = metas?.find((m) => m.usuario_id === u.id);
            const realizado = realizadoByUser[u.id] || { valor: 0, count: 0 };
            const metaValor = Number(meta?.meta_valor) || 0;
            const metaOrc = Number(meta?.meta_orcamentos) || 0;
            const pctValor = metaValor > 0 ? Math.round((realizado.valor / metaValor) * 100) : 0;
            const pctOrc = metaOrc > 0 ? Math.round((realizado.count / metaOrc) * 100) : 0;
            const mainPct = metaValor > 0 ? pctValor : pctOrc;
            const initials = (u.nome || "??").slice(0, 2).toUpperCase();
            const progressColor = getProgressColor(mainPct);

            return (
              <Card key={u.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                      style={{ background: "linear-gradient(135deg, #2563EB, #7C3AED)" }}
                    >
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{u.nome || "Sem nome"}</CardTitle>
                      <Badge variant="secondary" className="text-xs mt-0.5">
                        {u.cargo === "admin" ? "Administrador" : u.cargo === "financeiro" ? "Financeiro" : "Agente"}
                      </Badge>
                    </div>
                    {getStatusBadge(mainPct)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Meta</p>
                      <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
                        {metaValor > 0 ? fmt(metaValor) : "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {metaOrc > 0 ? `${metaOrc} orçam.` : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Realizado</p>
                      <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
                        {fmt(realizado.valor)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {realizado.count} orçam.
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Progresso</p>
                      <p className="text-lg font-bold" style={{ color: progressColor }}>
                        {metaValor > 0 || metaOrc > 0 ? `${mainPct}%` : "—"}
                      </p>
                    </div>
                  </div>

                  {(metaValor > 0 || metaOrc > 0) && (
                    <div className="space-y-1">
                      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(mainPct, 100)}%`,
                            backgroundColor: progressColor,
                          }}
                        />
                      </div>
                      {mainPct >= 100 && (
                        <div className="flex items-center gap-1 text-xs font-medium" style={{ color: "#16A34A" }}>
                          <Trophy className="h-3 w-3" /> Meta superada!
                        </div>
                      )}
                    </div>
                  )}

                  {isAdmin && (
                    <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => openModalForUser(u.id)}>
                      Editar meta
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Definir Meta */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Definir Meta — {MESES[mes - 1]} {ano}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Agente</Label>
              <Select value={modalUsuarioId} onValueChange={setModalUsuarioId}>
                <SelectTrigger><SelectValue placeholder="Selecionar agente" /></SelectTrigger>
                <SelectContent>
                  {usuarios?.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.nome || u.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Meta de Valor (R$)</Label>
              <Input
                type="number"
                placeholder="Ex: 50000"
                value={modalMetaValor}
                onChange={(e) => setModalMetaValor(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Meta de Orçamentos</Label>
              <Input
                type="number"
                placeholder="Ex: 20"
                value={modalMetaOrc}
                onChange={(e) => setModalMetaOrc(e.target.value)}
              />
            </div>
            <Button onClick={handleSave} disabled={!modalUsuarioId || saving} className="w-full">
              {saving ? "Salvando..." : "Salvar Meta"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
