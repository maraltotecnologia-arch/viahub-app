import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import ConfirmDialog from "@/components/ConfirmDialog";
import { toast } from "sonner";
import { Bell, Send, Trash2, Loader2, Info, AlertTriangle, Wrench, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const TIPO_OPTIONS = [
  { value: "info", label: "ℹ️ Informação", icon: Info, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-700/40" },
  { value: "warning", label: "⚠️ Aviso", icon: AlertTriangle, color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700/40" },
  { value: "manutencao", label: "🔧 Manutenção", icon: Wrench, color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-700/40" },
  { value: "cobranca", label: "💰 Cobrança", icon: DollarSign, color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-700/40" },
];

const STATUS_ALVO_OPTIONS = [
  { value: "todas", label: "Todas as agências" },
  { value: "ativo", label: "Apenas agências ativas" },
  { value: "inadimplente", label: "Apenas inadimplentes" },
];

export default function AdminNotificacoes() {
  const queryClient = useQueryClient();
  const [titulo, setTitulo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [tipo, setTipo] = useState("info");
  const [destinatario, setDestinatario] = useState("todos");
  const [agenciaId, setAgenciaId] = useState<string | null>(null);
  const [statusAlvo, setStatusAlvo] = useState("todas");
  const [sending, setSending] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showClearAll, setShowClearAll] = useState(false);

  const handleClearAll = async () => {
    try {
      const { error } = await supabase
        .from("notificacoes_sistema")
        .delete()
        .not("id", "is", null);
      if (error) throw error;
      toast.success("Histórico de notificações limpo.");
      queryClient.invalidateQueries({ queryKey: ["admin-notificacoes"] });
      queryClient.invalidateQueries({ queryKey: ["notificacoes"] });
    } catch (err: any) {
      toast.error(err.message || "Erro ao limpar histórico.");
    } finally {
      setShowClearAll(false);
    }
  };

  const { data: agencias } = useQuery({
    queryKey: ["admin-agencias-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agencias")
        .select("id, nome_fantasia")
        .eq("ativo", true)
        .order("nome_fantasia");
      if (error) throw error;
      return data;
    },
  });

  const { data: notificacoes, isLoading } = useQuery({
    queryKey: ["admin-notificacoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notificacoes_sistema")
        .select("*")
        .order("criado_em", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const handleEnviar = async () => {
    if (!titulo.trim() || !mensagem.trim()) {
      toast.error("Preencha título e mensagem.");
      return;
    }
    if (destinatario === "agencia" && !agenciaId) {
      toast.error("Selecione uma agência.");
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.from("notificacoes_sistema").insert({
        titulo: titulo.trim(),
        mensagem: mensagem.trim(),
        tipo,
        destinatario,
        agencia_id: destinatario === "agencia" ? agenciaId : null,
        status_pagamento_alvo: destinatario === "todos" && statusAlvo !== "todas" ? statusAlvo : null,
        ativo: true,
      } as any);
      if (error) throw error;
      toast.success("Notificação enviada com sucesso!");
      setTitulo("");
      setMensagem("");
      setTipo("info");
      setDestinatario("todos");
      setAgenciaId(null);
      setStatusAlvo("todas");
      queryClient.invalidateQueries({ queryKey: ["admin-notificacoes"] });
      queryClient.invalidateQueries({ queryKey: ["notificacoes"] });
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar notificação.");
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase
        .from("notificacoes_sistema")
        .delete()
        .eq("id", deleteId);
      if (error) throw error;
      toast.success("Notificação excluída.");
      queryClient.invalidateQueries({ queryKey: ["admin-notificacoes"] });
      queryClient.invalidateQueries({ queryKey: ["notificacoes"] });
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir.");
    } finally {
      setDeleteId(null);
    }
  };

  const getTipoBadge = (t: string) => {
    const opt = TIPO_OPTIONS.find((o) => o.value === t);
    return opt ? (
      <Badge variant="outline" className={opt.color}>{opt.label}</Badge>
    ) : (
      <Badge variant="outline">{t}</Badge>
    );
  };

  const getDestinatarioLabel = (n: any) => {
    if (n.destinatario === "admins") return "Apenas admins";
    if (n.destinatario === "agencia" && n.agencia_id) {
      const ag = agencias?.find((a: any) => a.id === n.agencia_id);
      return ag ? ag.nome_fantasia : "Agência específica";
    }
    if (n.status_pagamento_alvo) {
      const alvo = STATUS_ALVO_OPTIONS.find((s) => s.value === n.status_pagamento_alvo);
      return alvo ? alvo.label : "Todos os usuários";
    }
    return "Todos os usuários";
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center gap-3">
        <Bell className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Notificações do Sistema</h1>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Nova Notificação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value.slice(0, 80))}
                placeholder="Título da notificação"
                maxLength={80}
              />
              <p className="text-xs text-muted-foreground">{titulo.length}/80</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPO_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Destinatários</Label>
                <Select value={destinatario} onValueChange={(v) => { setDestinatario(v); if (v !== "agencia") setAgenciaId(null); if (v !== "todos") setStatusAlvo("todas"); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os usuários</SelectItem>
                    <SelectItem value="admins">Apenas admins</SelectItem>
                    <SelectItem value="agencia">Agência específica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {destinatario === "todos" && (
            <div className="space-y-2">
              <Label>Filtrar por status de pagamento</Label>
              <Select value={statusAlvo} onValueChange={setStatusAlvo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_ALVO_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {destinatario === "agencia" && (
            <div className="space-y-2">
              <Label>Agência</Label>
              <Select value={agenciaId || ""} onValueChange={setAgenciaId}>
                <SelectTrigger><SelectValue placeholder="Selecione uma agência" /></SelectTrigger>
                <SelectContent>
                  {agencias?.map((a: any) => (
                    <SelectItem key={a.id} value={a.id}>{a.nome_fantasia}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Mensagem *</Label>
            <Textarea
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value.slice(0, 500))}
              placeholder="Mensagem da notificação..."
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">{mensagem.length}/500</p>
          </div>

          <Button
            onClick={handleEnviar}
            disabled={sending || !titulo.trim() || !mensagem.trim()}
            className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white"
          >
            {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Enviar Notificação
          </Button>
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Histórico de Notificações</CardTitle>
          {notificacoes && notificacoes.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setShowClearAll(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Limpar histórico
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !notificacoes?.length ? (
            <p className="flex items-center justify-center min-h-[300px] text-center text-muted-foreground">Nenhuma notificação enviada ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Destinatários</TableHead>
                  <TableHead className="w-20">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notificacoes.map((n: any) => (
                  <TableRow key={n.id}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {n.criado_em ? format(new Date(n.criado_em), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-"}
                    </TableCell>
                    <TableCell>{getTipoBadge(n.tipo || "info")}</TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">{n.titulo}</TableCell>
                    <TableCell className="text-sm">{getDestinatarioLabel(n)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(n.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Excluir notificação"
        description="Tem certeza que deseja excluir esta notificação? Ela será removida para todos os usuários."
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        open={showClearAll}
        onOpenChange={setShowClearAll}
        title="Limpar histórico"
        description="Tem certeza que deseja excluir TODAS as notificações? Esta ação não pode ser desfeita."
        confirmLabel="Limpar tudo"
        onConfirm={handleClearAll}
      />
    </div>
  );
}
