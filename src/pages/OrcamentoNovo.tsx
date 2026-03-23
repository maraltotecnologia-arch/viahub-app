import { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Save, Send, ArrowLeft, FileText, X } from "lucide-react";
import { registrarHistorico } from "@/lib/historico-orcamento";
import { useToast } from "@/hooks/use-toast";
import useAgenciaId from "@/hooks/useAgenciaId";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ConfirmDialog from "@/components/ConfirmDialog";
import { validarValidade, validarData, todayStr, formatarDataSemTimezone } from "@/lib/date-utils";
import DatePickerInput from "@/components/ui/DatePickerInput";
import { getPlanoMultiplier } from "@/lib/plan-commission";
import { calcularLucroReal, getTaxaEmbutida, isMargemZero } from "@/lib/profit-utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { formatError } from "@/lib/errors";

interface Item {
  id: string;
  tipo: string;
  descricao: string;
  valor_custo: number;
  markup_percentual: number;
  taxa_fixa: number;
  quantidade: number;
  observacao?: string;
  partida_data?: string;
  partida_hora?: string;
  chegada_data?: string;
  chegada_hora?: string;
  checkin_data?: string;
  checkin_hora?: string;
  checkout_data?: string;
  checkout_hora?: string;
}

const tiposServico = ["Aéreo", "Hotel", "Pacote", "Passeio", "Seguro", "Transfer"];

const gerarToken = () =>
  Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

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
  const location = useLocation();
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
  const [clienteResults, setClienteResults] = useState<{ id: string; nome: string; tags?: string[] | null }[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [clienteTagFilter, setClienteTagFilter] = useState<string | null>(null);
  const TAGS_DISPONIVEIS = ["VIP", "Corporativo", "Eventual", "Recorrente", "Inativo", "Prospect"] as const;
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [newNome, setNewNome] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newTelefone, setNewTelefone] = useState("");

  const [titulo, setTitulo] = useState("");
  const [validade, setValidade] = useState("");
  const [moeda, setMoeda] = useState("BRL");
  const copilotData = (location.state as any)?.copilot;
  const [observacoes, setObservacoes] = useState(copilotData?.observacoes || (location.state as any)?.observacoesPrefill || "");
  const [formaPagamento, setFormaPagamento] = useState("pix");
  const [acrescimoCartao, setAcrescimoCartao] = useState(3);
  const [showZeroConfirm, setShowZeroConfirm] = useState(false);
  const [pendingEnviar, setPendingEnviar] = useState(false);
  const [removeItemId, setRemoveItemId] = useState<string | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [copilotBanner, setCopilotBanner] = useState(false);
  const itensSectionRef = useRef<HTMLDivElement>(null);
  const [itens, setItens] = useState<Item[]>([
    { id: "1", tipo: "Aéreo", descricao: "", valor_custo: 0, markup_percentual: 0, taxa_fixa: 0, quantidade: 1 },
  ]);

  // Fetch agency plan for silent commission
  const { data: agenciaData } = useQuery({
    queryKey: ["agencia-plano", agenciaId],
    enabled: !!agenciaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agencias")
        .select("plano")
        .eq("id", agenciaId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const planoMultiplier = getPlanoMultiplier(agenciaData?.plano);

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

  const { data: templates } = useQuery({
    queryKey: ["templates", agenciaId],
    enabled: !!agenciaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("templates_orcamento")
        .select("*, itens_template(*)")
        .eq("agencia_id", agenciaId!)
        .order("criado_em", { ascending: false });
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
      // Format date properly for input type="date"
      setValidade(existingOrc.validade ? formatarDataSemTimezone(existingOrc.validade) : "");
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
          observacao: (i as any).observacao || "",
          partida_data: (i as any).partida_data || "",
          partida_hora: (i as any).partida_hora || "",
          chegada_data: (i as any).chegada_data || "",
          chegada_hora: (i as any).chegada_hora || "",
          checkin_data: (i as any).checkin_data || "",
          checkin_hora: (i as any).checkin_hora || "",
          checkout_data: (i as any).checkout_data || "",
          checkout_hora: (i as any).checkout_hora || "",
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

  // Copilot data prefill
  useEffect(() => {
    if (!copilotData || isEdicao) return;
    if (copilotData.titulo) setTitulo(copilotData.titulo);
    if (copilotData.itens && copilotData.itens.length > 0) {
      const copilotItens: Item[] = copilotData.itens.map((item: any, idx: number) => {
        const isObservacao = item.tipo === "Observação" || item.tipo === "Observacao";
        return {
          id: `copilot-${Date.now()}-${idx}`,
          tipo: isObservacao ? "Observação" : (item.tipo || "Aéreo"),
          descricao: item.descricao || "",
          valor_custo: isObservacao ? 0 : (Number(item.custo) || 0),
          markup_percentual: isObservacao ? 0 : (Number(item.markup) || 0),
          taxa_fixa: isObservacao ? 0 : (Number(item.taxa_fixa) || 0),
          quantidade: isObservacao ? 1 : (Number(item.quantidade) || 1),
          observacao: item.observacao || "",
          partida_data: isObservacao ? "" : (item.partida_data || ""),
          partida_hora: isObservacao ? "" : (item.partida_hora || ""),
          chegada_data: isObservacao ? "" : (item.chegada_data || ""),
          chegada_hora: isObservacao ? "" : (item.chegada_hora || ""),
        };
      });
      setItens(copilotItens);
      setCopilotBanner(true);
      setInitialized(true);
      setTimeout(() => {
        itensSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 400);
    }
  }, []); // run once on mount

  // Search clients
  useEffect(() => {
    const needsSearch = clienteSearch.length >= 2 || clienteTagFilter;
    if (!needsSearch || !agenciaId) { setClienteResults([]); return; }
    const timeout = setTimeout(async () => {
      let query = supabase
        .from("clientes")
        .select("id, nome, tags")
        .eq("agencia_id", agenciaId);
      if (clienteSearch.length >= 2) {
        query = query.ilike("nome", `%${clienteSearch}%`);
      }
      if (clienteTagFilter) {
        query = query.contains("tags", [clienteTagFilter]);
      }
      const { data } = await query.limit(5);
      setClienteResults(data || []);
      setShowResults(true);
    }, 300);
    return () => clearTimeout(timeout);
  }, [clienteSearch, agenciaId, clienteTagFilter]);

  const selectCliente = (c: { id: string; nome: string }) => {
    setClienteId(c.id);
    setClienteNome(c.nome);
    setClienteSearch("");
    setClienteResults([]);
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
    if (error) { toast({ title: formatError("CLI001"), description: error.message, variant: "destructive" }); return; }
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

  const applyTemplate = (tpl: any) => {
    const tplItens = (tpl.itens_template || []).map((i: any) => ({
      id: Date.now().toString() + Math.random(),
      tipo: i.tipo,
      descricao: i.descricao || "",
      valor_custo: Number(i.valor_custo) || 0,
      markup_percentual: Number(i.markup_percentual) || 0,
      taxa_fixa: Number(i.taxa_fixa) || 0,
      quantidade: i.quantidade || 1,
    }));
    if (tplItens.length > 0) setItens(tplItens);
    if (tpl.forma_pagamento) setFormaPagamento(tpl.forma_pagamento);
    if (tpl.observacoes) setObservacoes(tpl.observacoes);
    setShowTemplateModal(false);
    toast({ title: "Template aplicado! Revise os valores antes de salvar." });
  };

  const custoTotal = itens.reduce((sum, i) => sum + i.valor_custo * i.quantidade, 0);
  const valorFinalBase = itens.reduce((sum, i) => sum + calcValorFinal(i), 0);
  const acrescimo = formaPagamento === "credito" ? valorFinalBase * (acrescimoCartao / 100) : 0;
  const valorFinal = valorFinalBase + acrescimo;
  const lucroReal = valorFinal - custoTotal;
  const margemReal = custoTotal > 0 ? (lucroReal / custoTotal) * 100 : 0;
  const todosMargemZero = isMargemZero(itens.map(i => ({ valor_custo: i.valor_custo, valor_final: calcValorFinal(i), markup_percentual: i.markup_percentual })));

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
          lucro_bruto: valorFinal - custoTotal,
          margem_percentual: Number(((custoTotal > 0 ? ((valorFinal - custoTotal) / custoTotal) * 100 : 0)).toFixed(2)),
          moeda,
          validade: validade || null,
          observacoes,
          forma_pagamento: formaPagamento,
        })
        .eq("id", orcamentoId!);

      if (error) { toast({ title: formatError("ORC002"), description: error.message, variant: "destructive" }); setLoading(false); return; }

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
        observacao: i.observacao || null,
        partida_data: i.partida_data || null,
        partida_hora: i.partida_hora || null,
        chegada_data: i.chegada_data || null,
        chegada_hora: i.chegada_hora || null,
        checkin_data: i.checkin_data || null,
        checkin_hora: i.checkin_hora || null,
        checkout_data: i.checkout_data || null,
        checkout_hora: i.checkout_hora || null,
      } as any));

      const { error: itensError } = await supabase.from("itens_orcamento").insert(itensRows);
      if (itensError) { toast({ title: "Erro ao salvar itens", description: itensError.message, variant: "destructive" }); setLoading(false); return; }

      queryClient.invalidateQueries({ queryKey: ["orcamentos"] });
      queryClient.invalidateQueries({ queryKey: ["orcamento", orcamentoId] });
      queryClient.invalidateQueries({ queryKey: ["orcamento-itens", orcamentoId] });

      // Register detailed item change history
      if (user && agenciaId && existingItens) {
        const fmtVal = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
        const oldMap = new Map(existingItens.map((i) => [i.id, i]));
        const newMap = new Map(itens.map((i) => [i.id, i]));

        // Removed items
        for (const old of existingItens) {
          if (!newMap.has(old.id)) {
            await registrarHistorico({
              orcamento_id: orcamentoId!,
              usuario_id: user.id,
              agencia_id: agenciaId,
              tipo: "edicao_valor",
              descricao: `Item '${old.descricao || old.tipo}' removido do orçamento`,
            });
          }
        }

        // Added or changed items
        for (const item of itens) {
          const old = oldMap.get(item.id);
          if (!old) {
            await registrarHistorico({
              orcamento_id: orcamentoId!,
              usuario_id: user.id,
              agencia_id: agenciaId,
              tipo: "edicao_valor",
              descricao: `Item '${item.descricao || item.tipo}' adicionado ao orçamento`,
            });
          } else {
            const oldVal = Number(old.valor_final) || 0;
            const newVal = calcValorFinal(item);
            if (Math.abs(oldVal - newVal) > 0.01) {
              await registrarHistorico({
                orcamento_id: orcamentoId!,
                usuario_id: user.id,
                agencia_id: agenciaId,
                tipo: "edicao_valor",
                descricao: `Valor do item '${item.descricao || item.tipo}' alterado de ${fmtVal(oldVal)} para ${fmtVal(newVal)}`,
              });
            }
          }
        }

        await registrarHistorico({
          orcamento_id: orcamentoId!,
          usuario_id: user.id,
          agencia_id: agenciaId,
          tipo: "editado",
          descricao: "Orçamento editado",
        });
      }

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
          lucro_bruto: valorFinal - custoTotal,
          margem_percentual: Number(((custoTotal > 0 ? ((valorFinal - custoTotal) / custoTotal) * 100 : 0)).toFixed(2)),
          moeda,
          validade: validade || null,
          observacoes,
          forma_pagamento: formaPagamento,
          numero_orcamento,
          token_publico: gerarToken(),
        })
        .select("id")
        .single();

      if (error) { toast({ title: formatError("ORC001"), variant: "destructive" }); setLoading(false); return; }

      const itensRows = itens.map((i) => ({
        orcamento_id: orc.id,
        tipo: i.tipo,
        descricao: i.descricao,
        valor_custo: i.valor_custo,
        markup_percentual: i.markup_percentual,
        taxa_fixa: i.taxa_fixa,
        valor_final: calcValorFinal(i),
        quantidade: i.quantidade,
        observacao: i.observacao || null,
        partida_data: i.partida_data || null,
        partida_hora: i.partida_hora || null,
        chegada_data: i.chegada_data || null,
        chegada_hora: i.chegada_hora || null,
        checkin_data: i.checkin_data || null,
        checkin_hora: i.checkin_hora || null,
        checkout_data: i.checkout_data || null,
        checkout_hora: i.checkout_hora || null,
      } as any));

      const { error: itensError } = await supabase.from("itens_orcamento").insert(itensRows);
      if (itensError) { toast({ title: "Erro ao salvar itens", description: itensError.message, variant: "destructive" }); setLoading(false); return; }

      queryClient.invalidateQueries({ queryKey: ["orcamentos"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });

      // Register history
      if (user && agenciaId) {
        await registrarHistorico({
          orcamento_id: orc.id,
          usuario_id: user.id,
          agencia_id: agenciaId,
          tipo: "criado",
          descricao: "Orçamento criado",
        });
        if (enviar) {
          await registrarHistorico({
            orcamento_id: orc.id,
            usuario_id: user.id,
            agencia_id: agenciaId,
            tipo: "status_alterado",
            status_anterior: "rascunho",
            status_novo: "enviado",
            descricao: "Status alterado de Rascunho para Enviado",
          });
        }
      }

      toast({ title: enviar ? "Orçamento enviado!" : "Rascunho salvo!", description: `${titulo || "Novo orçamento"} - ${fmt(valorFinal)}` });
      setLoading(false);
      navigate(`/orcamentos/${orc.id}`);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-8">
        {isEdicao && (
          <Button variant="ghost" size="icon" onClick={() => navigate(`/orcamentos/${orcamentoId}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <h2 className="text-3xl font-bold font-display tracking-tight text-on-surface">{isEdicao ? "Editar Orçamento" : "Novo Orçamento"}</h2>
      </div>

      {/* Cliente */}
      <Card>
        <CardHeader><CardTitle className="text-base">Cliente</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2 relative">
            <Label>Nome do cliente</Label>
            {clienteId ? (
              <div className="viahub-cliente-selecionado flex items-center gap-2 px-3 py-2 rounded-md border" style={{ background: "var(--bg-secondary)", borderColor: "var(--border-color)" }}>
                <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>✓ {clienteNome}</span>
                <button
                  type="button"
                  onClick={() => { setClienteId(null); setClienteNome(""); setClienteSearch(""); }}
                  className="ml-auto p-0.5 rounded hover:bg-muted transition-colors"
                  title="Remover cliente"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {TAGS_DISPONIVEIS.map((tag) => {
                    const isActive = clienteTagFilter === tag;
                    const tagColors: Record<string, { bg: string; text: string; border: string; activeBg: string }> = {
                      VIP: { bg: "rgba(245,158,11,0.08)", text: "#F59E0B", border: "rgba(245,158,11,0.25)", activeBg: "rgba(245,158,11,0.2)" },
                      Corporativo: { bg: "rgba(37,99,235,0.08)", text: "#60A5FA", border: "rgba(37,99,235,0.25)", activeBg: "rgba(37,99,235,0.2)" },
                      Eventual: { bg: "rgba(100,116,139,0.08)", text: "#94A3B8", border: "rgba(100,116,139,0.25)", activeBg: "rgba(100,116,139,0.2)" },
                      Recorrente: { bg: "rgba(34,197,94,0.08)", text: "#4ADE80", border: "rgba(34,197,94,0.25)", activeBg: "rgba(34,197,94,0.2)" },
                      Inativo: { bg: "rgba(239,68,68,0.08)", text: "#FCA5A5", border: "rgba(239,68,68,0.25)", activeBg: "rgba(239,68,68,0.2)" },
                      Prospect: { bg: "rgba(139,92,246,0.08)", text: "#C4B5FD", border: "rgba(139,92,246,0.25)", activeBg: "rgba(139,92,246,0.2)" },
                    };
                    const colors = tagColors[tag];
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setClienteTagFilter(isActive ? null : tag)}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all"
                        style={{
                          backgroundColor: isActive ? colors.activeBg : colors.bg,
                          color: colors.text,
                          borderColor: colors.border,
                          opacity: isActive ? 1 : 0.7,
                        }}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
                <Input
                  placeholder="Buscar cliente por nome..."
                  value={clienteSearch}
                  onChange={(e) => setClienteSearch(e.target.value)}
                  onFocus={() => clienteResults.length > 0 && setShowResults(true)}
                />
                {showResults && clienteResults.length > 0 && (
                  <div className="absolute z-10 top-full left-0 right-0 bg-card border rounded-md shadow-lg mt-1">
                    {clienteResults.map((c) => (
                      <button key={c.id} className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2" onClick={() => selectCliente(c)}>
                        <span>{c.nome}</span>
                        {c.tags && c.tags.length > 0 && (
                          <span className="flex gap-1 ml-auto">
                            {c.tags.map((t) => {
                              const tc: Record<string, { bg: string; text: string; border: string }> = {
                                VIP: { bg: "rgba(245,158,11,0.15)", text: "#F59E0B", border: "rgba(245,158,11,0.4)" },
                                Corporativo: { bg: "rgba(37,99,235,0.15)", text: "#60A5FA", border: "rgba(37,99,235,0.4)" },
                                Eventual: { bg: "rgba(100,116,139,0.15)", text: "#94A3B8", border: "rgba(100,116,139,0.4)" },
                                Recorrente: { bg: "rgba(34,197,94,0.15)", text: "#4ADE80", border: "rgba(34,197,94,0.4)" },
                                Inativo: { bg: "rgba(239,68,68,0.15)", text: "#FCA5A5", border: "rgba(239,68,68,0.4)" },
                                Prospect: { bg: "rgba(139,92,246,0.15)", text: "#C4B5FD", border: "rgba(139,92,246,0.4)" },
                              };
                              const colors = tc[t] || tc.Eventual;
                              return (
                                <span key={t} className="inline-flex items-center px-1.5 py-0 rounded-full text-[9px] font-semibold border" style={{ backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }}>
                                  {t}
                                </span>
                              );
                            })}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => setShowNewClientModal(true)}>
                  + Criar novo cliente
                </Button>
              </>
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
            <Button variant="default" className="w-full" onClick={handleCreateCliente}>Salvar Cliente</Button>
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
              <DatePickerInput
                value={validade}
                onChange={setValidade}
                placeholder="Selecione a validade"
                minDate={new Date()}
                maxDate={new Date(2099, 11, 31)}
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
      <div ref={itensSectionRef}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Itens do Orçamento</CardTitle>
          <div className="flex gap-2">
            {!isEdicao && templates && templates.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => setShowTemplateModal(true)}>
                <FileText className="h-4 w-4 mr-1" /> Usar Template
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={addItem}><Plus className="h-4 w-4 mr-1" /> Adicionar Item</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {copilotBanner && (
            <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-3">
              <div className="flex items-center gap-2 text-sm">
                <span>✨</span>
                <span className="font-medium text-foreground">Preenchido pelo Copilot IA</span>
                <span className="text-muted-foreground">— Revise os dados antes de salvar</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setCopilotBanner(false)}>OK</Button>
                <button onClick={() => setCopilotBanner(false)} className="p-0.5 rounded hover:bg-muted transition-colors">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>
          )}
          {itens.map((item, idx) => (
            <div key={item.id} className="rounded-xl p-5 space-y-3 relative bg-surface-container-low border border-outline-variant/10">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold font-headline text-on-surface-variant">Item {idx + 1}</span>
                {itens.length > 1 && <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-on-surface-variant/50 hover:text-error hover:bg-error-container/20" onClick={() => setRemoveItemId(item.id)}><Trash2 className="h-4 w-4" /></Button>}
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
                <div className="space-y-1"><Label className="text-xs">Valor Final</Label><div className="h-10 flex items-center px-3 rounded-md bg-muted text-sm font-semibold">{fmt(calcValorFinal(item) * planoMultiplier)}</div></div>
              </div>
              {/* Conditional date/time fields by service type */}
              {(item.tipo === "Aéreo" || item.tipo === "Transfer") && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Partida (data)</Label>
                    <DatePickerInput value={item.partida_data || ""} onChange={(v) => updateItem(item.id, "partida_data" as any, v)} placeholder="Data partida" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Partida (hora)</Label>
                    <Input type="time" value={item.partida_hora || ""} onChange={(e) => updateItem(item.id, "partida_hora" as any, e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Chegada (data)</Label>
                    <DatePickerInput value={item.chegada_data || ""} onChange={(v) => updateItem(item.id, "chegada_data" as any, v)} placeholder="Data chegada" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Chegada (hora)</Label>
                    <Input type="time" value={item.chegada_hora || ""} onChange={(e) => updateItem(item.id, "chegada_hora" as any, e.target.value)} />
                  </div>
                </div>
              )}
              {(item.tipo === "Hotel" || item.tipo === "Pacote") && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Check-in (data)</Label>
                    <DatePickerInput value={item.checkin_data || ""} onChange={(v) => updateItem(item.id, "checkin_data" as any, v)} placeholder="Data check-in" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Check-in (hora)</Label>
                    <Input type="time" value={item.checkin_hora || ""} onChange={(e) => updateItem(item.id, "checkin_hora" as any, e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Check-out (data)</Label>
                    <DatePickerInput value={item.checkout_data || ""} onChange={(v) => updateItem(item.id, "checkout_data" as any, v)} placeholder="Data check-out" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Check-out (hora)</Label>
                    <Input type="time" value={item.checkout_hora || ""} onChange={(e) => updateItem(item.id, "checkout_hora" as any, e.target.value)} />
                  </div>
                </div>
              )}
              <div className="space-y-1">
                <Label className="text-xs">Observação do item</Label>
                <Textarea
                  placeholder="Ex: voo direto, café da manhã incluso..."
                  value={item.observacao || ""}
                  onChange={(e) => updateItem(item.id, "observacao", e.target.value)}
                  className="min-h-[60px] text-sm resize-none"
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      </div>

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
            <div><p className="text-xs text-muted-foreground">Lucro</p><p className="text-lg font-bold text-success">{fmt(lucroReal)}</p></div>
            <div><p className="text-xs text-muted-foreground">Margem</p><p className="text-lg font-bold">{margemReal.toFixed(1)}%</p></div>
          </div>
          {acrescimo > 0 && <p className="text-xs text-muted-foreground mt-3">Inclui acréscimo de cartão: {fmt(acrescimo)}</p>}
          <p className="text-[11px] text-muted-foreground mt-3">
            Os valores apresentados já incluem todas as taxas de embarque, turismo e serviço aplicáveis.
          </p>
        </CardContent>
      </Card>

      {/* Zero-margin warning — internal only */}
      {todosMargemZero && itens.length > 0 && (
        <Alert variant="default" className="border-warning/50 bg-warning/10">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-sm text-warning">
            Este orçamento está com margem 0 de lucro. O valor será repassado integralmente ao fornecedor.
          </AlertDescription>
        </Alert>
      )}

      {/* Ações */}
      <div className="flex gap-3 justify-end pb-6">
        {isEdicao ? (
          <>
            <Button variant="outline" onClick={() => navigate(`/orcamentos/${orcamentoId}`)} disabled={loading}>Cancelar</Button>
            <Button variant="default" onClick={() => handleSave(false)} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={() => handleSave(false)} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {loading ? "Salvando..." : "Salvar Rascunho"}
            </Button>
            <Button variant="default" onClick={() => handleSave(true)} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              {loading ? "Salvando..." : "Salvar e Enviar"}
            </Button>
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

      {/* Template selection modal */}
      <Dialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Selecionar Template</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {templates?.map((tpl: any) => {
              const tplItens = tpl.itens_template || [];
              return (
                <div key={tpl.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">{tpl.nome}</p>
                      {tpl.descricao && <p className="text-xs text-muted-foreground">{tpl.descricao}</p>}
                      <p className="text-xs text-muted-foreground mt-1">{tplItens.length} {tplItens.length === 1 ? "item" : "itens"}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => applyTemplate(tpl)}>Usar</Button>
                  </div>
                </div>
              );
            })}
            {(!templates || templates.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum template disponível</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
