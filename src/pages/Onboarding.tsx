import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2 } from "lucide-react";

const steps = ["Dados da Agência", "Markup Padrão", "Confirmação"];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const progress = ((step + 1) / steps.length) * 100;

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
          <CardHeader>
            <CardTitle>{steps[step]}</CardTitle>
          </CardHeader>
          <CardContent>
            {step === 0 && (
              <div className="space-y-4">
                <div className="space-y-2"><Label>Nome Fantasia</Label><Input placeholder="Minha Agência de Viagens" /></div>
                <div className="space-y-2"><Label>Email</Label><Input type="email" placeholder="contato@minhaagencia.com" /></div>
                <div className="space-y-2"><Label>Telefone</Label><Input placeholder="(00) 0000-0000" /></div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                {["Aéreo", "Hotel", "Pacote", "Seguro"].map((tipo) => (
                  <div key={tipo} className="grid grid-cols-3 gap-3 items-end">
                    <div className="space-y-1">
                      <Label className="text-xs">{tipo}</Label>
                      <Input placeholder="0" disabled className="font-medium bg-muted" value={tipo} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Markup %</Label>
                      <Input type="number" placeholder="10" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Taxa Fixa (R$)</Label>
                      <Input type="number" placeholder="0" />
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
              {step > 0 && (
                <Button variant="outline" onClick={() => setStep(step - 1)}>Voltar</Button>
              )}
              <div className="ml-auto">
                {step < 2 ? (
                  <Button variant="gradient" onClick={() => setStep(step + 1)}>Próximo</Button>
                ) : (
                  <Button variant="gradient" onClick={() => navigate("/dashboard")}>Acessar Sistema</Button>
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
