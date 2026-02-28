import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Copy, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const statusVariant: Record<string, "muted" | "default" | "success" | "destructive" | "info"> = {
  rascunho: "muted", enviado: "default", aprovado: "success", perdido: "destructive", emitido: "info",
};

const allStatuses = ["rascunho", "enviado", "aprovado", "perdido", "emitido"];
const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function OrcamentoDetalhe() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [changingStatus, setChangingStatus] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  const { data: orc, isLoading } = useQuery({
    queryKey: ["orcamento", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orcamentos")
        .select("*, clientes(nome, email)")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: itens } = useQuery({
    queryKey: ["orcamento-itens", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itens_orcamento")
        .select("*")
        .eq("orcamento_id", id!);
      if (error) throw error;
      return data;
    },
  });

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;
    setChangingStatus(true);
    const { error } = await supabase.from("orcamentos").update({ status: newStatus }).eq("id", id);
    if (error) { toast({ title: "Erro ao atualizar status", variant: "destructive" }); } else {
      toast({ title: `Status alterado para ${newStatus}` });
      queryClient.invalidateQueries({ queryKey: ["orcamento", id] });
      queryClient.invalidateQueries({ queryKey: ["orcamentos"] });
    }
    setChangingStatus(false);
  };

  const handleDuplicate = async () => {
    if (!orc || !user?.agencia_id) return;
    setDuplicating(true);
    const { data: newOrc, error } = await supabase
      .from("orcamentos")
      .insert({
        agencia_id: user.agencia_id,
        cliente_id: orc.cliente_id,
        usuario_id: user.id,
        titulo: `${orc.titulo} (cópia)`,
        status: "rascunho",
        valor_custo: orc.valor_custo,
        valor_final: orc.valor_final,
        lucro_bruto: orc.lucro_bruto,
        margem_percentual: orc.margem_percentual,
        moeda: orc.moeda,
        validade: orc.validade,
        observacoes: orc.observacoes,
        forma_pagamento: orc.forma_pagamento,
      })
      .select("id")
      .single();

    if (error || !newOrc) { toast({ title: "Erro ao duplicar", variant: "destructive" }); setDuplicating(false); return; }

    if (itens && itens.length > 0) {
      const newItens = itens.map((i) => ({
        orcamento_id: newOrc.id,
        tipo: i.tipo,
        descricao: i.descricao,
        valor_custo: i.valor_custo,
        markup_percentual: i.markup_percentual,
        taxa_fixa: i.taxa_fixa,
        valor_final: i.valor_final,
        quantidade: i.quantidade,
        detalhes: i.detalhes,
      }));
      await supabase.from("itens_orcamento").insert(newItens);
    }

    queryClient.invalidateQueries({ queryKey: ["orcamentos"] });
    toast({ title: "Orçamento duplicado!" });
    setDuplicating(false);
    navigate(`/orcamentos/${newOrc.id}`);
  };

  if (isLoading) return (
    <div className="space-y-6"><Skeleton className="h-8 w-64" /><Skeleton className="h-64 w-full" /></div>
  );

  if (!orc) return (
    <div className="text-center py-12">
      <p className="text-muted-foreground">Orçamento não encontrado</p>
      <Button variant="link" asChild><Link to="/orcamentos">Voltar</Link></Button>
    </div>
  );

  const custoTotal = itens?.reduce((s, i) => s + (Number(i.valor_custo) || 0) * (i.quantidade || 1), 0) ?? 0;
  const valorFinal = itens?.reduce((s, i) => s + (Number(i.valor_final) || 0), 0) ?? 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild><Link to="/orcamentos"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <h2 className="text-2xl font-bold flex-1">{orc.titulo || "Sem título"}</h2>
        <Badge variant={statusVariant[orc.status || "rascunho"]} className="text-sm px-3 py-1">{orc.status}</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Informações Gerais</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Cliente:</span> <span className="font-medium ml-1">{(orc.clientes as any)?.nome || "Sem cliente"}</span></div>
                <div><span className="text-muted-foreground">Validade:</span> <span className="font-medium ml-1">{orc.validade ? new Date(orc.validade).toLocaleDateString("pt-BR") : "-"}</span></div>
                <div><span className="text-muted-foreground">Moeda:</span> <span className="font-medium ml-1">{orc.moeda}</span></div>
                <div><span className="text-muted-foreground">Pagamento:</span> <span className="font-medium ml-1">{orc.forma_pagamento}</span></div>
              </div>
              {orc.observacoes && <p className="text-sm text-muted-foreground mt-3 border-t pt-3">{orc.observacoes}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Itens</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {itens?.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div>
                      <p className="font-medium text-sm">{item.descricao || item.tipo}</p>
                      <p className="text-xs text-muted-foreground">{item.tipo} • Markup: {item.markup_percentual}% • Taxa: {fmt(Number(item.taxa_fixa) || 0)} • Qtd: {item.quantidade}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{fmt(Number(item.valor_final) || 0)}</p>
                      <p className="text-xs text-muted-foreground">Custo: {fmt(Number(item.valor_custo) || 0)}</p>
                    </div>
                  </div>
                ))}
                {(!itens || itens.length === 0) && <p className="text-sm text-muted-foreground text-center py-4">Nenhum item</p>}
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/30">
            <CardContent className="pt-6">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div><p className="text-xs text-muted-foreground">Custo Total</p><p className="text-lg font-bold">{fmt(custoTotal)}</p></div>
                <div><p className="text-xs text-muted-foreground">Valor Final</p><p className="text-lg font-bold text-primary">{fmt(Number(orc.valor_final) || 0)}</p></div>
                <div><p className="text-xs text-muted-foreground">Lucro</p><p className="text-lg font-bold text-success">{fmt(Number(orc.lucro_bruto) || 0)}</p></div>
                <div><p className="text-xs text-muted-foreground">Margem</p><p className="text-lg font-bold">{Number(orc.margem_percentual || 0).toFixed(1)}%</p></div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Ações</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Mudar Status</p>
                <Select value={orc.status || "rascunho"} onValueChange={handleStatusChange} disabled={changingStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {allStatuses.map((s) => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" className="w-full justify-start" onClick={handleDuplicate} disabled={duplicating}>
                <Copy className="h-4 w-4 mr-2" /> {duplicating ? "Duplicando..." : "Duplicar"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Histórico</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Criado em</span><span>{orc.criado_em ? new Date(orc.criado_em).toLocaleDateString("pt-BR") : "-"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Atualizado em</span><span>{orc.atualizado_em ? new Date(orc.atualizado_em).toLocaleDateString("pt-BR") : "-"}</span></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
