import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Sparkles, Brain, Percent, MessageCircle, Save } from "lucide-react";
import { toast } from "sonner";

export default function ConfigIA() {
  const [comportamento, setComportamento] = useState("formal");
  const [markupIA, setMarkupIA] = useState("15");
  const [botWhatsapp, setBotWhatsapp] = useState(false);

  const handleSave = () => {
    toast.success("Configurações de IA salvas com sucesso!");
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white shadow-lg">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Inteligência Artificial</h2>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Configure o comportamento do ViaHub AI Copilot</p>
        </div>
      </div>

      {/* Beta banner */}
      <div
        className="rounded-xl p-4 flex items-center gap-3 border"
        style={{
          background: "var(--accent-primary)",
          borderColor: "var(--accent-primary)",
          opacity: 0.12,
          position: "absolute",
          inset: 0,
          borderRadius: "inherit",
          pointerEvents: "none",
        }}
      />
      <div
        className="rounded-xl p-4 flex items-center gap-3 border border-[var(--accent-primary)]/20 relative overflow-hidden"
        style={{ background: "color-mix(in srgb, var(--accent-primary) 8%, var(--bg-card))" }}
      >
        <Brain className="h-5 w-5 shrink-0 text-[var(--accent-primary)]" />
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          <strong className="text-[var(--accent-primary)]">ViaHub AI</strong> está em fase Beta. As configurações abaixo prepararão o comportamento do copiloto quando a integração estiver ativa.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Agent behavior */}
        <Card className="border-[color:var(--border-color)] bg-[color:var(--bg-card)]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base" style={{ color: "var(--text-primary)" }}>
              <Brain className="h-4 w-4 text-[var(--accent-primary)]" />
              Comportamento do Agente
            </CardTitle>
            <CardDescription style={{ color: "var(--text-muted)" }}>
              Define o tom de comunicação que a IA usará ao gerar orçamentos e interagir com clientes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={comportamento} onValueChange={setComportamento}>
              <SelectTrigger className="border-[color:var(--border-input)] bg-[color:var(--bg-input)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="formal">🎩 Formal</SelectItem>
                <SelectItem value="descontraido">😊 Descontraído</SelectItem>
                <SelectItem value="luxo">💎 Focado em Luxo</SelectItem>
                <SelectItem value="economia">💰 Focado em Economia</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Auto markup */}
        <Card className="border-[color:var(--border-color)] bg-[color:var(--bg-card)]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base" style={{ color: "var(--text-primary)" }}>
              <Percent className="h-4 w-4 text-[var(--accent-primary)]" />
              Markup Automático da IA
            </CardTitle>
            <CardDescription style={{ color: "var(--text-muted)" }}>
              Percentual de lucro que a IA aplicará automaticamente sobre os preços de custo encontrados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={100}
                value={markupIA}
                onChange={(e) => setMarkupIA(e.target.value)}
                className="w-24 border-[color:var(--border-input)] bg-[color:var(--bg-input)]"
                style={{ color: "var(--text-primary)" }}
              />
              <span className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>%</span>
            </div>
          </CardContent>
        </Card>

        {/* WhatsApp bot */}
        <Card className="border-[color:var(--border-color)] bg-[color:var(--bg-card)] md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base" style={{ color: "var(--text-primary)" }}>
              <MessageCircle className="h-4 w-4 text-[var(--accent-primary)]" />
              Bot de WhatsApp Autônomo
            </CardTitle>
            <CardDescription style={{ color: "var(--text-muted)" }}>
              Quando ativado, a IA responderá automaticamente às mensagens recebidas via WhatsApp, gerando cotações e respondendo perguntas dos clientes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-lg border border-[color:var(--border-color)] p-4 bg-[color:var(--bg-primary)]">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  Ativar atendimento autônomo
                </Label>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {botWhatsapp ? "O bot está ativo e responderá mensagens automaticamente." : "O bot está desativado. As mensagens não serão respondidas."}
                </p>
              </div>
              <Switch checked={botWhatsapp} onCheckedChange={setBotWhatsapp} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button variant="gradient" className="gap-2" onClick={handleSave}>
          <Save className="h-4 w-4" />
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}
