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
        <div className="animate-fade-in text-center">
          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-5">
            <FileText className="h-8 w-8 text-[#1E3A5F]" />
          </div>
          <h2 className="text-2xl font-bold text-[#0F172A] mb-2">Boleto gerado!</h2>
          <p className="text-sm text-[#64748B] mb-6">
            Após a compensação (1-3 dias úteis), você receberá um email com o link de confirmação da sua conta em{" "}
            <span className="font-medium text-[#0F172A]">{displayEmail}</span>.
          </p>

          {paymentResult?.boletoUrl && (
            <a href={paymentResult.boletoUrl} target="_blank" rel="noopener noreferrer">
              <Button
                className="w-full h-12 rounded-xl font-semibold text-white mb-3 text-[15px] shadow-[0_4px_16px_rgba(37,99,235,0.3)]"
                style={{ background: "linear-gradient(135deg, #2563EB, #06B6D4)" }}
              >
                <Download className="h-4 w-4 mr-2" />
                Baixar boleto novamente
              </Button>
            </a>
          )}

          <Button
            variant="outline"
            onClick={() => navigate("/login")}
            className="w-full h-12 rounded-xl text-sm font-medium"
          >
            Ir para o login →
          </Button>
        </div>
      </AuthLayout>
    );
  }

  // Cartão / PIX — pagamento confirmado
  return (
    <AuthLayout>
      <div className="animate-fade-in text-center">
        <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-5 animate-bounce">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-[#0F172A] mb-2">
          {paymentResult?.formaPagamento === "pix" ? "Pagamento confirmado! 🎉" : "Conta criada com sucesso! 🎉"}
        </h2>

        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-6">
          <p className="text-sm text-green-800">
            Enviamos um link de confirmação para{" "}
            <span className="font-medium">{displayEmail}</span>.
            Clique no link para ativar sua conta e fazer o primeiro login.
          </p>
        </div>

        <Button
          onClick={() => navigate("/login")}
          className="w-full h-12 rounded-xl font-semibold text-[15px] text-white shadow-[0_4px_16px_rgba(37,99,235,0.3)]"
          style={{ background: "linear-gradient(135deg, #2563EB, #06B6D4)" }}
        >
          Ir para o login →
        </Button>

        <p className="text-center text-xs text-[#94A3B8] mt-4">
          ViaHub — Ecossistema para agências de viagem
        </p>
      </div>
    </AuthLayout>
  );
}
