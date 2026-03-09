import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Bot, Brain, Plane, Hotel, Map, MessageCircle, Save, Briefcase, Car, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import useAgenciaPlano from "@/hooks/useAgenciaPlano";
import AIPaywall from "@/components/ai/AIPaywall";

export default function ConfigIA() {
  const { hasAIAccess } = useAgenciaPlano();
  const [comportamento, setComportamento] = useState("formal");
  const [markupVoos, setMarkupVoos] = useState("15");
  const [markupHoteis, setMarkupHoteis] = useState("12");
  const [markupPasseios, setMarkupPasseios] = useState("20");
  const [botWhatsapp, setBotWhatsapp] = useState(false);

  const handleSave = () => {
    toast.success("Configurações de IA salvas com sucesso!");
  };

  return (
    <div className="space-y-6 animate-fade-in-up max-w-4xl">
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
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-lg border p-4 bg-muted/30 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted border border-border">
                      <Plane className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <Label className="text-sm font-medium">Voos</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input type="number" min={0} max={100} value={markupVoos} onChange={(e) => setMarkupVoos(e.target.value)} className="w-full" />
                    <span className="text-sm font-medium text-muted-foreground shrink-0">%</span>
                  </div>
                </div>

                <div className="rounded-lg border p-4 bg-muted/30 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted border border-border">
                      <Hotel className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <Label className="text-sm font-medium">Hotéis</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input type="number" min={0} max={100} value={markupHoteis} onChange={(e) => setMarkupHoteis(e.target.value)} className="w-full" />
                    <span className="text-sm font-medium text-muted-foreground shrink-0">%</span>
                  </div>
                </div>

                <div className="rounded-lg border p-4 bg-muted/30 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted border border-border">
                      <Map className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <Label className="text-sm font-medium">Passeios / Pacotes</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input type="number" min={0} max={100} value={markupPasseios} onChange={(e) => setMarkupPasseios(e.target.value)} className="w-full" />
                    <span className="text-sm font-medium text-muted-foreground shrink-0">%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button className="gap-2" onClick={handleSave}>
              <Save className="h-4 w-4" />
              Salvar Configurações
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
