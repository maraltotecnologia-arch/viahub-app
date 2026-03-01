import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Save, Send, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import useAgenciaId from "@/hooks/useAgenciaId";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ConfirmDialog from "@/components/ConfirmDialog";
import { validarValidade, validarData, todayStr, limitarAnoInput } from "@/lib/date-utils";

interface Item {
  id: string;
  tipo: string;
  descricao: string;
  valor_custo: number;
  markup_percentual: number;
  taxa_fixa: number;
  quantidade: number;
}

const tiposServico = ["Aéreo", "Hotel", "Pacote", "Passeio", "Seguro", "Transfer"];

// Map UI labels to DB keys
const tipoToDbKey: Record<string, string> = {
  "Aéreo": "aereo",
  "Hotel": "hotel",
  "Pacote": "pacote",
  "Passeio": "passeio",
  "Seguro": "seguro",
  "Transfer": "transfer",
};

function calcValorFinal(item: Item) {
  return (item.valor_custo * (1 + item.markup_percentual / 100) + item.taxa_fixa) * item.quantidade;
}

interface OrcamentoNovoProps {
  modo?: "criacao" | "edicao";
}

export default function OrcamentoNovo({ modo = "criacao" }: OrcamentoNovoProps) {
  const { id: orcamentoId } = useParams();
  const isEdicao = modo === "edicao" && !!orcamentoId;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const agenciaId = useAgenciaId();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Client search
  const [clienteSearch, setClienteSearch] = useState("");
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [clienteNome, setClienteNome] = useState("");
  const [clienteResults, setClienteResults] = useState<{ id: string; nome: string }[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [newNome, setNewNome] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newTelefone, setNewTelefone] = useState("");

  const [titulo, setTitulo] = useState("");
  const [validade, setValidade] = useState("");
  const [moeda, setMoeda] = useState("BRL");
  const [observacoes, setObservacoes] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("pix");
  const [acrescimoCartao, setAcrescimoCartao] = useState(3);
  const [showZeroConfirm, setShowZeroConfirm] = useState(false);
  const [pendingEnviar, setPendingEnviar] = useState(false);
  const [removeItemId, setRemoveItemId] = useState<string | null>(null);
  const [itens, setItens] = useState<Item[]>([
    { id: "1", tipo: "Aéreo", descricao: "", valor_custo: 0, markup_percentual: 0, taxa_fixa: 0, quantidade: 1 },
  ]);

  // Fetch markup configs
  const { data: markupConfigs } = useQuery({
    queryKey: ["markup-configs", agenciaId],
    enabled: !!agenciaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("configuracoes_markup")
        .select("*")
        .eq("agencia_id", agenciaId!);
      if (error) throw error;
      return data;
    },
  });

  const markupPorTipo = markupConfigs
    ? Object.fromEntries(markupConfigs.map((m) => [m.tipo_servico, m]))
    : {};

  // Load existing orcamento for edit mode
  const { data: existingOrc } = useQuery({
    queryKey: ["orcamento-edit", orcamentoId],
    enabled: isEdicao,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orcamentos")
        .select("*, clientes(id, nome)")
        .eq("id", orcamentoId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: existingItens } = useQuery({
    queryKey: ["orcamento-edit-itens", orcamentoId],
    enabled: isEdicao,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itens_orcamento")
        .select("*")
        .eq("orcamento_id", orcamentoId!);
      if (error) throw error;
      return data;
    },
  });

  // Populate form for edit mode
  useEffect(() => {
    if (isEdicao && existingOrc && existingItens && !initialized) {
      setTitulo(existingOrc.titulo || "");
      setValidade(existingOrc.validade || "");
      setMoeda(existingOrc.moeda || "BRL");
      setObservacoes(existingOrc.observacoes || "");
      setFormaPagamento(existingOrc.forma_pagamento || "pix");
      if ((existingOrc as any).clientes) {
        const c = (existingOrc as any).clientes;
        setClienteId(c.id);
        setClienteNome(c.nome);
        setClienteSearch(c.nome);
      }
      setItens(
        existingItens.map((i) => ({
          id: i.id,
          tipo: i.tipo,
          descricao: i.descricao || "",
          valor_custo: Number(i.valor_custo) || 0,
          markup_percentual: Number(i.markup_percentual) || 0,
          taxa_fixa: Number(i.taxa_fixa) || 0,
          quantidade: i.quantidade || 1,
        }))
      );
      setInitialized(true);
    }
  }, [isEdicao, existingOrc, existingItens, initialized]);

  // Apply default markup for initial item in create mode
  useEffect(() => {
    if (isEdicao || !markupConfigs || markupConfigs.length === 0 || initialized) return;
    const aeroConfig = markupConfigs.find((d) => d.tipo_servico === "aereo");
    if (aeroConfig) {
      setItens([{
        id: "1", tipo: "Aéreo", descricao: "",
        valor_custo: 0,
        markup_percentual: Number(aeroConfig.markup_percentual) || 0,
        taxa_fixa: Number(aeroConfig.taxa_fixa) || 0,
        quantidade: 1,
      }]);
    }
    setInitialized(true);
  }, [markupConfigs, isEdicao, initialized]);

  // Search clients
  useEffect(() => {
    if (clienteSearch.length < 2 || !agenciaId) { setClienteResults([]); return; }
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from("clientes")
        .select("id, nome")
        .eq("agencia_id", agenciaId)
        .ilike("nome", `%${clienteSearch}%`)
        .limit(5);
      setClienteResults(data || []);
      setShowResults(true);
    }, 300);
    return () => clearTimeout(timeout);
  }, [clienteSearch, agenciaId]);

  const selectCliente = (c: { id: string; nome: string }) => {
    setClienteId(c.id);
    setClienteNome(c.nome);
    setClienteSearch(c.nome);
    setShowResults(false);
  };

  const handleCreateCliente = async () => {
    if (!newNome.trim()) return;
    if (!agenciaId) {
      toast({ title: "Erro ao identificar agência", variant: "destructive" });
      return;
    }
    const { data, error } = await supabase
      .from("clientes")
      .insert({ agencia_id: agenciaId, nome: newNome, email: newEmail || null, telefone: newTelefone || null })
      .select("id, nome")
      .single();
    if (error) { toast({ title: "Erro ao criar cliente", description: error.message, variant: "destructive" }); return; }
    selectCliente(data);
    setShowNewClientModal(false);
    setNewNome(""); setNewEmail(""); setNewTelefone("");
    toast({ title: "Cliente criado!" });
  };

  const addItem = () => {
    const aeroConfig = markupPorTipo["aereo"];
    setItens([...itens, {
      id: Date.now().toString(),
      tipo: "Aéreo",
      descricao: "",
      valor_custo: 0,
      markup_percentual: aeroConfig ? Number(aeroConfig.markup_percentual) || 0 : 0,
      taxa_fixa: aeroConfig ? Number(aeroConfig.taxa_fixa) || 0 : 0,
      quantidade: 1,
    }]);
  };

  const confirmRemoveItem = () => {
    if (removeItemId && itens.length > 1) {
      setItens(itens.filter((i) => i.id !== removeItemId));
    }
    setRemoveItemId(null);
  };

  const updateItem = (id: string, field: keyof Item, value: string | number) => {
    setItens(itens.map((i) => {
      if (i.id !== id) return i;
      const updated = { ...i, [field]: value };
      // Auto-fill markup when tipo changes
      if (field === "tipo" && typeof value === "string") {
        const dbKey = tipoToDbKey[value];
        const config = dbKey ? markupPorTipo[dbKey] : null;
        if (config) {
          updated.markup_percentual = Number(config.markup_percentual) || 0;
          updated.taxa_fixa = Number(config.taxa_fixa) || 0;
        } else {
          updated.markup_percentual = 0;
          updated.taxa_fixa = 0;
        }
      }
      return updated;
    }));
  };

  const custoTotal = itens.reduce((sum, i) => sum + i.valor_custo * i.quantidade, 0);
  const valorFinalBase = itens.reduce((sum, i) => sum + calcValorFinal(i), 0);
  const acrescimo = formaPagamento === "credito" ? valorFinalBase * (acrescimoCartao / 100) : 0;
  const valorFinal = valorFinalBase + acrescimo;
  const lucro = valorFinal - custoTotal;
  const margem = custoTotal > 0 ? (lucro / custoTotal) * 100 : 0;

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const handleSave = async (enviar: boolean) => {
    if (!agenciaId) {
      toast({ title: "Erro ao identificar agência", variant: "destructive" });
      return;
    }

    // Validações
    if (!clienteId) {
      toast({ title: "Selecione um cliente para o orçamento", variant: "destructive" });
      return;
    }
    if (!validade) {
      toast({ title: "Defina a data de validade do orçamento", variant: "destructive" });
      return;
    }
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    if (new Date(validade + "T00:00:00") < hoje) {
      toast({ title: "A data de validade deve ser uma data futura", variant: "destructive" });
      return;
    }
    if (itens.length === 0) {
      toast({ title: "Adicione pelo menos um serviço ao orçamento", variant: "destructive" });
      return;
    }
    const itemIncompleto = itens.find((i) => !i.tipo || !i.descricao.trim());
    if (itemIncompleto) {
      toast({ title: "Preencha todos os campos dos itens do orçamento", variant: "destructive" });
      return;
    }
    if (valorFinal === 0 && !pendingEnviar) {
      setPendingEnviar(enviar);
      setShowZeroConfirm(true);
      return;
    }

    setLoading(true);
    setPendingEnviar(false);

    if (isEdicao) {
      // UPDATE existing orcamento
      const { error } = await supabase
        .from("orcamentos")
        .update({
          cliente_id: clienteId,
          titulo,
          status: enviar ? "enviado" : existingOrc?.status || "rascunho",
          valor_custo: custoTotal,
          valor_final: valorFinal,
          lucro_bruto: lucro,
          margem_percentual: Number(margem.toFixed(2)),
          moeda,
          validade: validade || null,
          observacoes,
          forma_pagamento: formaPagamento,
        })
        .eq("id", orcamentoId!);

      if (error) { toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" }); setLoading(false); return; }

      // Delete old items and insert new ones
      await supabase.from("itens_orcamento").delete().eq("orcamento_id", orcamentoId!);

      const itensRows = itens.map((i) => ({
        orcamento_id: orcamentoId!,
        tipo: i.tipo,
        descricao: i.descricao,
        valor_custo: i.valor_custo,
        markup_percentual: i.markup_percentual,
        taxa_fixa: i.taxa_fixa,
        valor_final: calcValorFinal(i),
        quantidade: i.quantidade,
      }));

      const { error: itensError } = await supabase.from("itens_orcamento").insert(itensRows);
      if (itensError) { toast({ title: "Erro ao salvar itens", description: itensError.message, variant: "destructive" }); setLoading(false); return; }

      queryClient.invalidateQueries({ queryKey: ["orcamentos"] });
      queryClient.invalidateQueries({ queryKey: ["orcamento", orcamentoId] });
      queryClient.invalidateQueries({ queryKey: ["orcamento-itens", orcamentoId] });
      toast({ title: "Orçamento atualizado!", description: `${titulo || "Orçamento"} - ${fmt(valorFinal)}` });
      setLoading(false);
      navigate(`/orcamentos/${orcamentoId}`);
    } else {
      // CREATE new orcamento
      const year = new Date().getFullYear();
      const { count } = await supabase
        .from("orcamentos")
        .select("id", { count: "exact", head: true })
        .eq("agencia_id", agenciaId!);
      const seq = String((count ?? 0) + 1).padStart(4, "0");
      const numero_orcamento = `ORC-${year}-${seq}`;

      const { data: orc, error } = await supabase
        .from("orcamentos")
        .insert({
          agencia_id: agenciaId,
          cliente_id: clienteId,
          usuario_id: user?.id,
          titulo,
          status: enviar ? "enviado" : "rascunho",
          valor_custo: custoTotal,
          valor_final: valorFinal,
          lucro_bruto: lucro,
          margem_percentual: Number(margem.toFixed(2)),
          moeda,
          validade: validade || null,
          observacoes,
          forma_pagamento: formaPagamento,
          numero_orcamento,
        })
        .select("id")
        .single();

      if (error) { toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" }); setLoading(false); return; }

      const itensRows = itens.map((i) => ({
        orcamento_id: orc.id,
        tipo: i.tipo,
        descricao: i.descricao,
        valor_custo: i.valor_custo,
        markup_percentual: i.markup_percentual,
        taxa_fixa: i.taxa_fixa,
        valor_final: calcValorFinal(i),
        quantidade: i.quantidade,
      }));

      const { error: itensError } = await supabase.from("itens_orcamento").insert(itensRows);
      if (itensError) { toast({ title: "Erro ao salvar itens", description: itensError.message, variant: "destructive" }); setLoading(false); return; }

      queryClient.invalidateQueries({ queryKey: ["orcamentos"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast({ title: enviar ? "Orçamento enviado!" : "Rascunho salvo!", description: `${titulo || "Novo orçamento"} - ${fmt(valorFinal)}` });
      setLoading(false);
      navigate(`/orcamentos/${orc.id}`);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in">
      <div className="flex items-center gap-3">
        {isEdicao && (
          <Button variant="ghost" size="icon" onClick={() => navigate(`/orcamentos/${orcamentoId}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <h2 className="text-2xl font-bold">{isEdicao ? "Editar Orçamento" : "Novo Orçamento"}</h2>
      </div>

      {/* Cliente */}
      <Card>
        <CardHeader><CardTitle className="text-base">Cliente</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2 relative">
            <Label>Nome do cliente</Label>
            <Input
              placeholder="Buscar cliente por nome..."
              value={clienteSearch}
              onChange={(e) => { setClienteSearch(e.target.value); setClienteId(null); }}
              onFocus={() => clienteResults.length > 0 && setShowResults(true)}
            />
            {showResults && clienteResults.length > 0 && (
              <div className="absolute z-10 top-full left-0 right-0 bg-card border rounded-md shadow-lg mt-1">
                {clienteResults.map((c) => (
                  <button key={c.id} className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors" onClick={() => selectCliente(c)}>
                    {c.nome}
                  </button>
                ))}
              </div>
            )}
            {clienteId && <p className="text-xs text-success">✓ Cliente selecionado: {clienteNome}</p>}
            {!clienteId && (
              <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => setShowNewClientModal(true)}>
                + Criar novo cliente
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showNewClientModal} onOpenChange={setShowNewClientModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Cliente</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2"><Label>Nome</Label><Input value={newNome} onChange={(e) => setNewNome(e.target.value)} placeholder="Nome completo" /></div>
            <div className="space-y-2"><Label>Email</Label><Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} type="email" placeholder="email@exemplo.com" /></div>
            <div className="space-y-2"><Label>Telefone</Label><Input value={newTelefone} onChange={(e) => setNewTelefone(e.target.value)} placeholder="(00) 00000-0000" /></div>
            <Button variant="gradient" className="w-full" onClick={handleCreateCliente}>Salvar Cliente</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dados gerais */}
      <Card>
        <CardHeader><CardTitle className="text-base">Dados Gerais</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Título</Label><Input placeholder="Ex: Lua de mel - Maldivas" value={titulo} onChange={(e) => setTitulo(e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Validade</Label>
              <Input
                type="date"
                value={validade}
                min={todayStr()}
                max="2099-12-31"
                onChange={(e) => setValidade(e.target.value)}
                onKeyDown={limitarAnoInput}
                className={validade && !validarValidade(validade) ? "border-destructive" : ""}
              />
              {validade && !validarValidade(validade) && (
                <p className="text-xs text-destructive">
                  {!validarData(validade) ? "Data inválida" : "A validade deve ser uma data futura"}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Moeda</Label>
              <Select value={moeda} onValueChange={setMoeda}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRL">BRL - Real</SelectItem>
                  <SelectItem value="USD">USD - Dólar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 space-y-2"><Label>Observações</Label><Textarea placeholder="Observações do orçamento..." value={observacoes} onChange={(e) => setObservacoes(e.target.value)} /></div>
        </CardContent>
      </Card>

      {/* Itens */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Itens do Orçamento</CardTitle>
          <Button variant="outline" size="sm" onClick={addItem}><Plus className="h-4 w-4 mr-1" /> Adicionar Item</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {itens.map((item, idx) => (
            <div key={item.id} className="border rounded-lg p-4 space-y-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-muted-foreground">Item {idx + 1}</span>
                {itens.length > 1 && <Button variant="ghost" size="icon" onClick={() => setRemoveItemId(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Tipo</Label>
                  <Select value={item.tipo} onValueChange={(v) => updateItem(item.id, "tipo", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{tiposServico.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 md:col-span-2"><Label className="text-xs">Descrição</Label><Input placeholder="Descrição do serviço" value={item.descricao} onChange={(e) => updateItem(item.id, "descricao", e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="space-y-1"><Label className="text-xs">Custo (R$)</Label><Input type="number" min={0} value={item.valor_custo || ""} onChange={(e) => updateItem(item.id, "valor_custo", Number(e.target.value))} /></div>
                <div className="space-y-1"><Label className="text-xs">Markup %</Label><Input type="number" min={0} value={item.markup_percentual || ""} onChange={(e) => updateItem(item.id, "markup_percentual", Number(e.target.value))} /></div>
                <div className="space-y-1"><Label className="text-xs">Taxa Fixa (R$)</Label><Input type="number" min={0} value={item.taxa_fixa || ""} onChange={(e) => updateItem(item.id, "taxa_fixa", Number(e.target.value))} /></div>
                <div className="space-y-1"><Label className="text-xs">Qtd</Label><Input type="number" min={1} value={item.quantidade} onChange={(e) => updateItem(item.id, "quantidade", Number(e.target.value) || 1)} /></div>
                <div className="space-y-1"><Label className="text-xs">Valor Final</Label><div className="h-10 flex items-center px-3 rounded-md bg-muted text-sm font-semibold">{fmt(calcValorFinal(item))}</div></div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Pagamento */}
      <Card>
        <CardHeader><CardTitle className="text-base">Forma de Pagamento</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Forma</Label>
              <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="avista">À vista</SelectItem>
                  <SelectItem value="debito">Débito</SelectItem>
                  <SelectItem value="credito">Crédito</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formaPagamento === "credito" && (
              <div className="space-y-2"><Label>Acréscimo cartão (%)</Label><Input type="number" min={0} value={acrescimoCartao} onChange={(e) => setAcrescimoCartao(Number(e.target.value))} /></div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resumo */}
      <Card className="border-primary/30">
        <CardHeader><CardTitle className="text-base">Resumo Financeiro</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><p className="text-xs text-muted-foreground">Custo Total</p><p className="text-lg font-bold">{fmt(custoTotal)}</p></div>
            <div><p className="text-xs text-muted-foreground">Valor Final</p><p className="text-lg font-bold text-primary">{fmt(valorFinal)}</p></div>
            <div><p className="text-xs text-muted-foreground">Lucro Bruto</p><p className="text-lg font-bold text-success">{fmt(lucro)}</p></div>
            <div><p className="text-xs text-muted-foreground">Margem %</p><p className="text-lg font-bold">{margem.toFixed(1)}%</p></div>
          </div>
          {acrescimo > 0 && <p className="text-xs text-muted-foreground mt-3">Inclui acréscimo de cartão: {fmt(acrescimo)}</p>}
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex gap-3 justify-end pb-6">
        {isEdicao ? (
          <>
            <Button variant="outline" onClick={() => navigate(`/orcamentos/${orcamentoId}`)} disabled={loading}>Cancelar</Button>
            <Button variant="gradient" onClick={() => handleSave(false)} disabled={loading}><Save className="h-4 w-4 mr-2" /> {loading ? "Salvando..." : "Salvar Alterações"}</Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={() => handleSave(false)} disabled={loading}><Save className="h-4 w-4 mr-2" /> {loading ? "Salvando..." : "Salvar Rascunho"}</Button>
            <Button variant="gradient" onClick={() => handleSave(true)} disabled={loading}><Send className="h-4 w-4 mr-2" /> {loading ? "Salvando..." : "Salvar e Enviar"}</Button>
          </>
        )}
      </div>
      <ConfirmDialog
        open={showZeroConfirm}
        onOpenChange={setShowZeroConfirm}
        title="Valor zerado"
        description="O valor total do orçamento está zerado. Deseja salvar mesmo assim?"
        confirmLabel="Salvar"
        cancelLabel="Cancelar"
        variant="default"
        onConfirm={() => {
          setShowZeroConfirm(false);
          handleSave(pendingEnviar);
        }}
      />
      <ConfirmDialog
        open={!!removeItemId}
        onOpenChange={(open) => { if (!open) setRemoveItemId(null); }}
        title="Excluir item"
        description="Tem certeza que deseja excluir este item do orçamento? Esta ação não pode ser desfeita."
        onConfirm={confirmRemoveItem}
      />
    </div>
  );
}
