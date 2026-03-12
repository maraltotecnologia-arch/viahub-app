import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Bot, Brain, Plane, Hotel, Map, MessageCircle, Save, Briefcase, Car, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import useAgenciaPlano from "@/hooks/useAgenciaPlano";
import useAgenciaId from "@/hooks/useAgenciaId";
import AIPaywall from "@/components/ai/AIPaywall";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const MARKUP_TIPOS = [
  { tipo: "voo", label: "Voos", icon: Plane },
  { tipo: "hotel", label: "Hotéis", icon: Hotel },
  { tipo: "passeio", label: "Passeios", icon: Map },
  { tipo: "pacote", label: "Pacotes", icon: Briefcase },
  { tipo: "transfer", label: "Transfers", icon: Car },
  { tipo: "seguro", label: "Seguros", icon: ShieldCheck },
];

export default function ConfigIA() {
  const { hasAIAccess } = useAgenciaPlano();
  const agenciaId = useAgenciaId();
  const queryClient = useQueryClient();

  const [comportamento, setComportamento] = useState("formal");
  const [botWhatsapp, setBotWhatsapp] = useState(false);
  const [markups, setMarkups] = useState<Record<string, string>>({
    voo: "15", hotel: "12", passeio: "20", pacote: "18", transfer: "10", seguro: "8",
  });
  const [saving, setSaving] = useState(false);

  // Load existing markup configs
  const { data: existingMarkups, isLoading } = useQuery({
    queryKey: ["ia-config-markup", agenciaId],
    queryFn: async () => {
      if (!agenciaId) return null;
      const { data } = await supabase
        .from("configuracoes_markup")
        .select("*")
        .eq("agencia_id", agenciaId)
        .eq("ativo", true);
      return data;
    },
    enabled: !!agenciaId,
  });

  useEffect(() => {
    if (existingMarkups) {
      const newMarkups: Record<string, string> = { ...markups };
      existingMarkups.forEach((m: any) => {
        if (MARKUP_TIPOS.some(t => t.tipo === m.tipo_servico)) {
          newMarkups[m.tipo_servico] = String(m.markup_percentual ?? 0);
        }
      });
      setMarkups(newMarkups);
    }
  }, [existingMarkups]);

  const handleSave = async () => {
    if (!agenciaId) return;
    setSaving(true);

    try {
      // Upsert each markup type
      for (const { tipo } of MARKUP_TIPOS) {
        const val = parseFloat(markups[tipo]) || 0;
        const existing = existingMarkups?.find((m: any) => m.tipo_servico === tipo);

        if (existing) {
          await supabase
            .from("configuracoes_markup")
            .update({ markup_percentual: val })
            .eq("id", existing.id);
        } else {
          await supabase
            .from("configuracoes_markup")
            .insert({
              agencia_id: agenciaId,
              tipo_servico: tipo,
              markup_percentual: val,
              ativo: true,
            });
        }
      }

      queryClient.invalidateQueries({ queryKey: ["ia-config-markup", agenciaId] });
      toast.success("Configurações salvas!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar configurações.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up w-full">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-muted border border-border">
          <Bot className="h-5 w-5 text-foreground" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Inteligência Artificial</h2>
          <p className="text-sm text-muted-foreground">Configure o comportamento do assistente de cotação</p>
        </div>
      </div>

      {!hasAIAccess ? (
        <Card>
          <AIPaywall />
        </Card>
      ) : (
        <>
          {/* Beta banner */}
          <div className="rounded-xl p-4 flex items-center gap-3 border border-border bg-muted/50">
            <Brain className="h-5 w-5 shrink-0 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Assistente IA</strong> está em fase Beta. As configurações abaixo prepararão o comportamento do copiloto quando a integração estiver ativa.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Agent behavior */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Brain className="h-4 w-4 text-muted-foreground" />
                  Comportamento do Agente
                </CardTitle>
                <CardDescription>
                  Define o tom de comunicação que a IA usará ao gerar orçamentos e interagir com clientes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={comportamento} onValueChange={setComportamento}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="formal">Formal</SelectItem>
                    <SelectItem value="descontraido">Descontraído</SelectItem>
                    <SelectItem value="luxo">Focado em Luxo</SelectItem>
                    <SelectItem value="economia">Focado em Economia</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* WhatsApp bot */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageCircle className="h-4 w-4 text-muted-foreground" />
                  Bot de WhatsApp Autônomo
                </CardTitle>
                <CardDescription>
                  Quando ativado, a IA responderá automaticamente às mensagens recebidas via WhatsApp.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/30">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Ativar atendimento autônomo</Label>
                    <p className="text-xs text-muted-foreground">
                      {botWhatsapp ? "O bot está ativo e responderá mensagens automaticamente." : "O bot está desativado. As mensagens não serão respondidas."}
                    </p>
                  </div>
                  <Switch checked={botWhatsapp} onCheckedChange={setBotWhatsapp} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Granular Markup */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                Margens de Lucro da IA (Markup)
              </CardTitle>
              <CardDescription>
                A IA aplicará essas margens automaticamente sobre o preço de custo (net) encontrado nos fornecedores antes de gerar o orçamento.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                  {MARKUP_TIPOS.map(({ tipo, label, icon: Icon }) => (
                    <div key={tipo} className="rounded-lg border p-4 bg-muted/30 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted border border-border">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <Label className="text-sm font-medium">{label}</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={markups[tipo]}
                          onChange={(e) => setMarkups(prev => ({ ...prev, [tipo]: e.target.value }))}
                          className="w-full"
                        />
                        <span className="text-sm font-medium text-muted-foreground shrink-0">%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Dica: Deixe em branco para que a IA utilize a margem padrão definida no perfil da sua agência.
              </p>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button className="gap-2" onClick={handleSave} disabled={saving || !agenciaId}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar Configurações
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
