import { useState, useEffect } from "react";
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
  const [markups, setMarkups] = useState<Record<string, string>>({ voo: "15", hotel: "12", passeio: "20", pacote: "18", transfer: "10", seguro: "8" });
  const [saving, setSaving] = useState(false);

  const { data: existingMarkups, isLoading } = useQuery({
    queryKey: ["ia-config-markup", agenciaId], enabled: !!agenciaId,
    queryFn: async () => { if (!agenciaId) return null; const { data } = await supabase.from("configuracoes_markup").select("*").eq("agencia_id", agenciaId).eq("ativo", true); return data; },
  });

  useEffect(() => {
    if (existingMarkups) {
      const newMarkups: Record<string, string> = { ...markups };
      existingMarkups.forEach((m: any) => { if (MARKUP_TIPOS.some(t => t.tipo === m.tipo_servico)) newMarkups[m.tipo_servico] = String(m.markup_percentual ?? 0); });
      setMarkups(newMarkups);
    }
  }, [existingMarkups]);

  const handleSave = async () => {
    if (!agenciaId) return; setSaving(true);
    try {
      for (const { tipo } of MARKUP_TIPOS) {
        const val = parseFloat(markups[tipo]) || 0;
        const existing = existingMarkups?.find((m: any) => m.tipo_servico === tipo);
        if (existing) { await supabase.from("configuracoes_markup").update({ markup_percentual: val }).eq("id", existing.id); }
        else { await supabase.from("configuracoes_markup").insert({ agencia_id: agenciaId, tipo_servico: tipo, markup_percentual: val, ativo: true }); }
      }
      queryClient.invalidateQueries({ queryKey: ["ia-config-markup", agenciaId] }); toast.success("Configurações salvas!");
    } catch { toast.error("Erro ao salvar configurações."); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4 animate-fade-in-up max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/8 text-primary">
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-3xl font-bold font-display tracking-tight text-on-surface">Inteligência Artificial</h2>
          <p className="text-sm text-on-surface-variant font-body">Configure o comportamento do assistente de cotação</p>
        </div>
      </div>

      {!hasAIAccess ? (
        <div className="bg-surface-container-lowest rounded-2xl shadow-ambient"><AIPaywall /></div>
      ) : (
        <>
          {/* Beta */}
          <div className="rounded-xl p-4 flex items-center gap-3 bg-primary/6 border border-primary/15">
            <Brain className="h-5 w-5 shrink-0 text-primary" />
            <p className="text-sm text-on-surface-variant font-body">
              <strong className="text-on-surface">Assistente IA</strong> está em fase Beta.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Behavior */}
            <div className="bg-surface-container-lowest rounded-2xl shadow-ambient overflow-hidden">
              <div className="px-6 py-5 border-b border-outline-variant/10">
                <h3 className="text-base font-semibold font-headline text-on-surface flex items-center gap-2"><Brain className="h-4 w-4 text-on-surface-variant" />Comportamento do Agente</h3>
                <p className="text-sm text-on-surface-variant font-body mt-0.5">Tom de comunicação da IA</p>
              </div>
              <div className="px-6 py-5">
                <Select value={comportamento} onValueChange={setComportamento}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="formal">Formal</SelectItem><SelectItem value="descontraido">Descontraído</SelectItem><SelectItem value="luxo">Focado em Luxo</SelectItem><SelectItem value="economia">Focado em Economia</SelectItem></SelectContent></Select>
              </div>
            </div>

            {/* WhatsApp bot */}
            <div className="bg-surface-container-lowest rounded-2xl shadow-ambient overflow-hidden">
              <div className="px-6 py-5 border-b border-outline-variant/10">
                <h3 className="text-base font-semibold font-headline text-on-surface flex items-center gap-2"><MessageCircle className="h-4 w-4 text-on-surface-variant" />Bot de WhatsApp Autônomo</h3>
                <p className="text-sm text-on-surface-variant font-body mt-0.5">Resposta automática via WhatsApp</p>
              </div>
              <div className="px-6 py-5">
                <div className="flex items-center justify-between rounded-xl bg-surface-container-low p-4">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium font-body text-on-surface">Ativar atendimento autônomo</Label>
                    <p className="text-xs text-on-surface-variant">{botWhatsapp ? "O bot está ativo." : "O bot está desativado."}</p>
                  </div>
                  <Switch checked={botWhatsapp} onCheckedChange={setBotWhatsapp} />
                </div>
              </div>
            </div>
          </div>

          {/* Markup */}
          <div className="bg-surface-container-lowest rounded-2xl shadow-ambient overflow-hidden">
            <div className="px-6 py-5 border-b border-outline-variant/10">
              <h3 className="text-base font-semibold font-headline text-on-surface">Margens de Lucro da IA (Markup)</h3>
              <p className="text-sm text-on-surface-variant font-body mt-0.5">A IA aplicará estas margens sobre o preço de custo.</p>
            </div>
            <div className="px-6 py-5">
              {isLoading ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-on-surface-variant" /></div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  {MARKUP_TIPOS.map(({ tipo, label, icon: Icon }) => (
                    <div key={tipo} className="rounded-xl bg-surface-container-low p-4 space-y-3 border border-outline-variant/10 hover:border-primary/20 transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/8 text-primary"><Icon className="h-4 w-4" /></div>
                        <Label className="text-xs font-semibold font-label text-on-surface-variant uppercase tracking-wide">{label}</Label>
                      </div>
                      <div className="flex items-center gap-1">
                        <Input type="number" min={0} max={100} value={markups[tipo]} onChange={(e) => setMarkups(prev => ({ ...prev, [tipo]: e.target.value }))} className="w-full" />
                        <span className="text-sm font-medium text-on-surface-variant shrink-0">%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

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
