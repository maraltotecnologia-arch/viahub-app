import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const steps = ["Confirme seus dados", "Markup Padrão", "Confirmação"];

const tiposServico = ["aereo", "hotel", "pacote", "seguro", "transfer"];
const tiposLabel: Record<string, string> = { aereo: "Aéreo", hotel: "Hotel", pacote: "Pacote", seguro: "Seguro", transfer: "Transfer" };

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const progress = ((step + 1) / steps.length) * 100;

  const [nomeFantasia, setNomeFantasia] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [cep, setCep] = useState("");
  const [markups, setMarkups] = useState(
    tiposServico.map((t) => ({ tipo: t, markup: 0, taxa: 0 }))
  );

  // Pre-fill from existing agency data
  useEffect(() => {
    if (!user?.id || dataLoaded) return;
    const loadData = async () => {
      const { data: userData } = await supabase
        .from("usuarios")
        .select("agencia_id")
        .eq("id", user.id)
        .maybeSingle();
      if (!userData?.agencia_id) return;

      const { data: agencia } = await supabase
        .from("agencias")
        .select("nome_fantasia, email, telefone, cnpj, cep")
        .eq("id", userData.agencia_id)
        .single();
      if (agencia) {
        if (agencia.nome_fantasia) setNomeFantasia(agencia.nome_fantasia);
        if (agencia.email) setEmail(agencia.email);
        if (agencia.telefone) setTelefone(agencia.telefone);
        if (agencia.cnpj) setCnpj(agencia.cnpj);
        if (agencia.cep) setCep(agencia.cep);
      }
      setDataLoaded(true);
    };
    loadData();
  }, [user?.id, dataLoaded]);

  const updateMarkup = (tipo: string, field: "markup" | "taxa", value: number) => {
    setMarkups(markups.map((m) => (m.tipo === tipo ? { ...m, [field]: value } : m)));
  };

  const handleNext = async () => {
    if (step === 0) {
      if (!nomeFantasia.trim()) {
        toast({ title: "Preencha o nome fantasia", variant: "destructive" });
        return;
      }
      setLoading(true);

      const { data: sessionData } = await supabase.auth.getUser();
      const userId = sessionData?.user?.id;
      if (!userId) {
        toast({ title: "Usuário não autenticado", variant: "destructive" });
        setLoading(false);
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from("usuarios")
        .select("agencia_id")
        .eq("id", userId)
        .maybeSingle();

      if (userError || !userData?.agencia_id) {
        toast({ title: "Erro ao salvar dados. Tente novamente.", variant: "destructive" });
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from("agencias")
        .update({
          nome_fantasia: nomeFantasia,
          email,
          telefone,
          cnpj: cnpj || null,
          cep: cep || null,
        })
        .eq("id", userData.agencia_id);
      setLoading(false);
      if (error) { toast({ title: "Erro ao salvar dados. Tente novamente.", description: error.message, variant: "destructive" }); return; }
      setStep(1);
    } else if (step === 1) {
      if (!user?.id) return;
      setLoading(true);

      const { data: userData, error: userError } = await supabase
        .from("usuarios")
        .select("agencia_id")
        .eq("id", user.id)
        .maybeSingle();

      if (userError || !userData?.agencia_id) {
        toast({ title: "Erro ao salvar markup", variant: "destructive" });
        setLoading(false);
        return;
      }

      const rows = markups.map((m) => ({
        agencia_id: userData.agencia_id,
        tipo_servico: m.tipo,
        markup_percentual: m.markup,
        taxa_fixa: m.taxa,
      }));
      const { error } = await supabase.from("configuracoes_markup").insert(rows);
      setLoading(false);
      if (error) { toast({ title: "Erro ao salvar markup", description: error.message, variant: "destructive" }); return; }
      setStep(2);
    }
  };

  const handleFinish = async () => {
    if (!user?.id) return;
    setLoading(true);

    const { data: userData, error: userError } = await supabase
      .from("usuarios")
      .select("agencia_id")
      .eq("id", user.id)
      .maybeSingle();

    if (userError || !userData?.agencia_id) {
      toast({ title: "Erro ao finalizar", variant: "destructive" });
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from("agencias")
      .update({ onboarding_completo: true })
      .eq("id", userData.agencia_id);
    if (error) { toast({ title: "Erro ao finalizar", description: error.message, variant: "destructive" }); setLoading(false); return; }
    setLoading(false);
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-2xl animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold">
            <span className="gradient-text">Via</span>
            <span className="text-foreground">Hub</span>
          </h1>
          <p className="text-muted-foreground mt-2">Configure sua agência em poucos passos</p>
        </div>

        <div className="mb-6">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            {steps.map((s, i) => (
              <span key={i} className={i <= step ? "text-primary font-medium" : ""}>{s}</span>
            ))}
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Card>
          <CardHeader><CardTitle>{steps[step]}</CardTitle></CardHeader>
          <CardContent>
            {step === 0 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground mb-2">
                  Confirme os dados da sua agência. Os campos já vêm preenchidos com as informações do cadastro.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Nome Fantasia</Label>
                    <Input placeholder="Minha Agência de Viagens" value={nomeFantasia} onChange={(e) => setNomeFantasia(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>CNPJ</Label>
                    <Input placeholder="00.000.000/0000-00" value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>CEP</Label>
                    <Input placeholder="00000-000" value={cep} onChange={(e) => setCep(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" placeholder="contato@minhaagencia.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input placeholder="(00) 0000-0000" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                {markups.map((m) => (
                  <div key={m.tipo} className="grid grid-cols-3 gap-3 items-end">
                    <div className="space-y-1">
                      <Label className="text-xs">{tiposLabel[m.tipo]}</Label>
                      <Input disabled className="font-medium bg-muted" value={tiposLabel[m.tipo]} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Markup %</Label>
                      <Input type="number" placeholder="10" value={m.markup || ""} onChange={(e) => updateMarkup(m.tipo, "markup", Number(e.target.value))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Taxa Fixa (R$)</Label>
                      <Input type="number" placeholder="0" value={m.taxa || ""} onChange={(e) => updateMarkup(m.tipo, "taxa", Number(e.target.value))} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {step === 2 && (
              <div className="text-center py-8 space-y-4">
                <CheckCircle2 className="h-16 w-16 text-success mx-auto" />
                <h3 className="text-xl font-bold">Tudo pronto!</h3>
                <p className="text-muted-foreground">Sua agência está configurada. Clique em "Acessar Sistema" para começar.</p>
              </div>
            )}

            <div className="flex justify-between mt-6">
              {step > 0 && <Button variant="outline" onClick={() => setStep(step - 1)}>Voltar</Button>}
              <div className="ml-auto">
                {step < 2 ? (
                  <Button variant="gradient" onClick={handleNext} disabled={loading}>
                    {loading ? "Salvando..." : "Próximo"}
                  </Button>
                ) : (
                  <Button variant="gradient" onClick={handleFinish} disabled={loading}>
                    {loading ? "Finalizando..." : "Acessar Sistema"}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">powered by <span className="font-semibold">Maralto</span></p>
      </div>
    </div>
  );
}
