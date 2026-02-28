import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Save, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const [loading, setLoading] = useState(false);
  const [cliente, setCliente] = useState("");
  const [titulo, setTitulo] = useState("");
  const [validade, setValidade] = useState("");
  const [moeda, setMoeda] = useState("BRL");
  const [observacoes, setObservacoes] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("pix");
  const [acrescimoCartao, setAcrescimoCartao] = useState(3);
  const [itens, setItens] = useState<Item[]>([
    { id: "1", tipo: "Aéreo", descricao: "", valor_custo: 0, markup_percentual: 10, taxa_fixa: 0, quantidade: 1 },
  ]);

  const addItem = () => {
    setItens([...itens, {
      id: Date.now().toString(),
      tipo: "Aéreo",
      descricao: "",
      valor_custo: 0,
      markup_percentual: 10,
      taxa_fixa: 0,
      quantidade: 1,
    }]);
  };

  const removeItem = (id: string) => {
    if (itens.length > 1) setItens(itens.filter((i) => i.id !== id));
  };

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

  const handleSave = (enviar: boolean) => {
    setLoading(true);
    setTimeout(() => {
      toast({ title: enviar ? "Orçamento enviado!" : "Rascunho salvo!", description: `${titulo || "Novo orçamento"} - ${fmt(valorFinal)}` });
      setLoading(false);
      navigate("/orcamentos");
    }, 800);
  };

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in">
      <h2 className="text-2xl font-bold">Novo Orçamento</h2>

      {/* Cliente */}
      <Card>
        <CardHeader><CardTitle className="text-base">Cliente</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Nome do cliente</Label>
            <Input placeholder="Buscar ou digitar nome do cliente..." value={cliente} onChange={(e) => setCliente(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Dados gerais */}
      <Card>
        <CardHeader><CardTitle className="text-base">Dados Gerais</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input placeholder="Ex: Lua de mel - Maldivas" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Validade</Label>
              <Input type="date" value={validade} onChange={(e) => setValidade(e.target.value)} />
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
          <div className="mt-4 space-y-2">
            <Label>Observações</Label>
            <Textarea placeholder="Observações do orçamento..." value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Itens */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Itens do Orçamento</CardTitle>
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar Item
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {itens.map((item, idx) => (
            <div key={item.id} className="border rounded-lg p-4 space-y-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-muted-foreground">Item {idx + 1}</span>
                {itens.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Tipo</Label>
                  <Select value={item.tipo} onValueChange={(v) => updateItem(item.id, "tipo", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {tiposServico.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs">Descrição</Label>
                  <Input placeholder="Descrição do serviço" value={item.descricao} onChange={(e) => updateItem(item.id, "descricao", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Custo (R$)</Label>
                  <Input type="number" min={0} value={item.valor_custo || ""} onChange={(e) => updateItem(item.id, "valor_custo", Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Markup %</Label>
                  <Input type="number" min={0} value={item.markup_percentual || ""} onChange={(e) => updateItem(item.id, "markup_percentual", Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Taxa Fixa (R$)</Label>
                  <Input type="number" min={0} value={item.taxa_fixa || ""} onChange={(e) => updateItem(item.id, "taxa_fixa", Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Qtd</Label>
                  <Input type="number" min={1} value={item.quantidade} onChange={(e) => updateItem(item.id, "quantidade", Number(e.target.value) || 1)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Valor Final</Label>
                  <div className="h-10 flex items-center px-3 rounded-md bg-muted text-sm font-semibold">
                    {fmt(calcValorFinal(item))}
                  </div>
                </div>
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
              <div className="space-y-2">
                <Label>Acréscimo cartão (%)</Label>
                <Input type="number" min={0} value={acrescimoCartao} onChange={(e) => setAcrescimoCartao(Number(e.target.value))} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resumo */}
      <Card className="border-primary/30">
        <CardHeader><CardTitle className="text-base">Resumo Financeiro</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Custo Total</p>
              <p className="text-lg font-bold">{fmt(custoTotal)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Valor Final</p>
              <p className="text-lg font-bold text-primary">{fmt(valorFinal)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Lucro Bruto</p>
              <p className="text-lg font-bold text-success">{fmt(lucro)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Margem %</p>
              <p className="text-lg font-bold">{margem.toFixed(1)}%</p>
            </div>
          </div>
          {acrescimo > 0 && (
            <p className="text-xs text-muted-foreground mt-3">Inclui acréscimo de cartão: {fmt(acrescimo)}</p>
          )}
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex gap-3 justify-end pb-6">
        <Button variant="outline" onClick={() => handleSave(false)} disabled={loading}>
          <Save className="h-4 w-4 mr-2" /> Salvar Rascunho
        </Button>
        <Button variant="gradient" onClick={() => handleSave(true)} disabled={loading}>
          <Send className="h-4 w-4 mr-2" /> Salvar e Enviar
        </Button>
      </div>
    </div>
  );
}
