import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle, FileText, Download } from "lucide-react";
import type { PaymentResult } from "@/pages/Cadastro";
import AuthLayout from "@/components/AuthLayout";

type Props = {
  paymentResult: PaymentResult | null;
  email: string;
};

export default function CadastroStep3({ paymentResult, email }: Props) {
  const navigate = useNavigate();
  const isBoleto = paymentResult?.formaPagamento === "boleto";
  const displayEmail = paymentResult?.email || email;

  if (isBoleto) {
    return (
      <AuthLayout>
        <div className="animate-fade-in text-center py-6">
          <div className="w-16 h-16 rounded-full bg-primary/8 flex items-center justify-center mx-auto mb-5">
            <FileText className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold font-display tracking-tight text-on-surface mb-2">Boleto gerado!</h2>
          <p className="text-sm text-on-surface-variant font-body mb-6">
            Após a compensação (1-3 dias úteis), você receberá um email com o link de confirmação da sua conta em{" "}
            <span className="font-medium text-on-surface">{displayEmail}</span>.
          </p>

          {paymentResult?.boletoUrl && (
            <a href={paymentResult.boletoUrl} target="_blank" rel="noopener noreferrer">
              <Button className="w-full mb-3">
                <Download className="h-4 w-4 mr-2" />
                Baixar boleto novamente
              </Button>
            </a>
          )}

          <Button variant="outline" onClick={() => navigate("/login")} className="w-full">
            Ir para o login →
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="animate-fade-in text-center py-6">
        <div className="w-16 h-16 rounded-full bg-secondary-container/50 text-secondary flex items-center justify-center mx-auto mb-5">
          <CheckCircle className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold font-display tracking-tight text-on-surface mb-2">
          Cadastro realizado com sucesso! 🎉
        </h2>
        <p className="text-sm text-on-surface-variant font-body mb-8">
          Seu acesso está pronto. Clique abaixo para fazer seu primeiro login.
        </p>
        <Button onClick={() => navigate("/login")} className="w-full">
          Fazer login agora →
        </Button>
        <p className="text-center text-xs text-on-surface-variant/60 font-label mt-4">
          ViaHub — Ecossistema para agências de viagem
        </p>
      </div>
    </AuthLayout>
  );
}
