import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Save, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import useAgenciaId from "@/hooks/useAgenciaId";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface Item {
  id: string;
  tipo: string;
  descricao: string;
  valor_custo: number;
  markup_percentual: number;
  taxa_fixa: number;
  quantidade: number;
}

const tiposServico = ["Aéreo", "Hotel", "Pacote", "Seguro", "Transfer", "Outros"];

function calcValorFinal(item: Item) {
  return (item.valor_custo * (1 + item.markup_percentual / 100) + item.taxa_fixa) * item.quantidade;
}

export default function OrcamentoNovo() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const agenciaId = useAgenciaId();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

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
  const [itens, setItens] = useState<Item[]>([
    { id: "1", tipo: "Aéreo", descricao: "", valor_custo: 0, markup_percentual: 0, taxa_fixa: 0, quantidade: 1 },
  ]);

  // Load default markups
  useEffect(() => {
    if (!agenciaId) return;
    supabase
      .from("configuracoes_markup")
      .select("tipo_servico, markup_percentual, taxa_fixa")
      .eq("agencia_id", agenciaId)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const aeroConfig = data.find((d) => d.tipo_servico === "aereo");
          if (aeroConfig) {
            setItens([{
              id: "1", tipo: "Aéreo", descricao: "",
              valor_custo: 0,
              markup_percentual: Number(aeroConfig.markup_percentual) || 0,
              taxa_fixa: Number(aeroConfig.taxa_fixa) || 0,
              quantidade: 1,
            }]);
          }
        }
      });
  }, [agenciaId]);

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
    setItens([...itens, { id: Date.now().toString(), tipo: "Aéreo", descricao: "", valor_custo: 0, markup_percentual: 0, taxa_fixa: 0, quantidade: 1 }]);
  };

  const removeItem = (id: string) => { if (itens.length > 1) setItens(itens.filter((i) => i.id !== id)); };

  const updateItem = (id: string, field: keyof Item, value: string | number) => {
    setItens(itens.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
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
    if (enviar && itens.every((i) => i.valor_custo === 0)) {
      toast({ title: "Adicione pelo menos 1 item com valor", variant: "destructive" });
      return;
    }

    setLoading(true);

    // Generate numero_orcamento
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
  };

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in">
      <h2 className="text-2xl font-bold">Novo Orçamento</h2>

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
            <div className="space-y-2"><Label>Validade</Label><Input type="date" value={validade} onChange={(e) => setValidade(e.target.value)} /></div>
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
                {itens.length > 1 && <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
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
        <Button variant="outline" onClick={() => handleSave(false)} disabled={loading}><Save className="h-4 w-4 mr-2" /> {loading ? "Salvando..." : "Salvar Rascunho"}</Button>
        <Button variant="gradient" onClick={() => handleSave(true)} disabled={loading}><Send className="h-4 w-4 mr-2" /> {loading ? "Salvando..." : "Salvar e Enviar"}</Button>
      </div>
    </div>
  );
}
