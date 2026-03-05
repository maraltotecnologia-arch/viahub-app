import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, BadgeCheck, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatarApenasDatabrasilia, formatarDataSemTimezone } from "@/lib/date-utils";
import DatePickerInput from "@/components/ui/DatePickerInput";
import ClienteTagSelector from "@/components/clientes/ClienteTagSelector";
import ContatosCliente from "@/components/clientes/ContatosCliente";

const statusVariant: Record<string, "muted" | "default" | "success" | "destructive" | "info"> = {
  rascunho: "muted", enviado: "default", aprovado: "success", perdido: "destructive", emitido: "info",
};

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function ClienteDetalhe() {
  const { id } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nome: "", email: "", telefone: "", cpf: "", passaporte: "", data_nascimento: "", observacoes: "" });
  const [obsTimer, setObsTimer] = useState<NodeJS.Timeout | null>(null);

  const { data: cliente, isLoading } = useQuery({
    queryKey: ["cliente", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("clientes").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: orcamentos } = useQuery({
    queryKey: ["cliente-orcamentos", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orcamentos")
        .select("id, titulo, valor_final, status, criado_em, pago_em")
        .eq("cliente_id", id!)
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const totalRecebido = orcamentos?.filter((o) => o.status === "pago").reduce((s, o) => s + (Number(o.valor_final) || 0), 0) ?? 0;

  useEffect(() => {
    if (cliente) {
      setForm({
        nome: cliente.nome || "",
        email: cliente.email || "",
        telefone: cliente.telefone || "",
        cpf: cliente.cpf || "",
        passaporte: cliente.passaporte || "",
        data_nascimento: cliente.data_nascimento ? formatarDataSemTimezone(cliente.data_nascimento) : "",
        observacoes: cliente.observacoes || "",
      });
    }
  }, [cliente]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    const { error } = await supabase.from("clientes").update({
      nome: form.nome,
      email: form.email || null,
      telefone: form.telefone || null,
      cpf: form.cpf || null,
      passaporte: form.passaporte || null,
      data_nascimento: form.data_nascimento || null,
      observacoes: form.observacoes || null,
    }).eq("id", id);
    if (error) { toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" }); } else {
      toast({ title: "Cliente atualizado!" });
      queryClient.invalidateQueries({ queryKey: ["cliente", id] });
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
    }
    setSaving(false);
  };

  const handleObsChange = (value: string) => {
    setForm({ ...form, observacoes: value });
    if (obsTimer) clearTimeout(obsTimer);
    const timer = setTimeout(async () => {
      if (!id) return;
      await supabase.from("clientes").update({ observacoes: value || null }).eq("id", id);
    }, 2000);
    setObsTimer(timer);
  };

  if (isLoading) return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;
  if (!cliente) return <div className="text-center py-12"><p className="text-muted-foreground">Cliente não encontrado</p><Button variant="link" asChild><Link to="/clientes">Voltar</Link></Button></div>;

  const clienteTags = (cliente as any).tags || [];

  return (
    <div className="space-y-6 max-w-3xl animate-fade-in-up">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild><Link to="/clientes"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <h2 className="text-2xl font-bold">{form.nome}</h2>
      </div>

      {/* Tags */}
      <Card>
        <CardHeader><CardTitle className="text-base">Tags</CardTitle></CardHeader>
        <CardContent>
          <ClienteTagSelector clienteId={cliente.id} tags={clienteTags} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Dados Pessoais</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
            <div className="space-y-2"><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-2"><Label>Telefone</Label><Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
            <div className="space-y-2"><Label>CPF</Label><Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} /></div>
            <div className="space-y-2"><Label>Passaporte</Label><Input value={form.passaporte} onChange={(e) => setForm({ ...form, passaporte: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>Data de Nascimento</Label>
              <DatePickerInput
                value={form.data_nascimento}
                onChange={(v) => setForm({ ...form, data_nascimento: v })}
                placeholder="Selecione a data"
                maxDate={new Date()}
                minDate={new Date(1900, 0, 1)}
              />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <Label>Observações <span className="text-xs text-muted-foreground">(salva automaticamente)</span></Label>
            <Textarea value={form.observacoes} onChange={(e) => handleObsChange(e.target.value)} />
          </div>
          <Button variant="gradient" className="mt-4" onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar Alterações"}</Button>
        </CardContent>
      </Card>

      {/* Contatos */}
      <Card>
        <CardHeader><CardTitle className="text-base">Contatos</CardTitle></CardHeader>
        <CardContent>
          <ContatosCliente clienteId={cliente.id} agenciaId={cliente.agencia_id} />
        </CardContent>
      </Card>

      {/* Total Recebido Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-green-100 text-green-600">
              <BadgeCheck className="h-[22px] w-[22px]" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Recebido</p>
              <p className="text-2xl font-bold">{fmt(totalRecebido)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Histórico de Orçamentos</CardTitle></CardHeader>
        <CardContent>
          <TooltipProvider>
            <div className="space-y-3">
              {orcamentos?.map((o) => (
                <Link key={o.id} to={`/orcamentos/${o.id}`} className="flex items-center justify-between py-3 border-b last:border-0 hover:bg-muted/50 -mx-2 px-2 rounded-md transition-colors">
                  <div>
                    <p className="font-medium text-sm">{o.titulo || "Sem título"}</p>
                    <p className="text-xs text-muted-foreground">{o.criado_em ? formatarApenasDatabrasilia(o.criado_em) : "-"}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-sm">{fmt(Number(o.valor_final) || 0)}</span>
                    {o.status === "pago" ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <Badge variant="success" className="flex items-center gap-1">
                              <CheckCheck className="h-3 w-3" /> Pago
                            </Badge>
                            {o.pago_em && (
                              <p className="text-[10px] text-muted-foreground mt-0.5 text-right">Pago em {formatarApenasDatabrasilia(o.pago_em)}</p>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          {o.pago_em ? `Pago em ${formatarApenasDatabrasilia(o.pago_em)}` : "Pago"}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Badge variant={statusVariant[o.status || "rascunho"]}>{o.status}</Badge>
                    )}
                  </div>
                </Link>
              ))}
              {(!orcamentos || orcamentos.length === 0) && <p className="text-sm text-muted-foreground text-center py-4">Nenhum orçamento</p>}
            </div>
          </TooltipProvider>
        </CardContent>
      </Card>
    </div>
  );
}
