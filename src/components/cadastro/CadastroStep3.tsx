import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle, FileText } from "lucide-react";
import type { PaymentResult } from "@/pages/Cadastro";

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
      <div className="max-w-md mx-auto text-center bg-white rounded-2xl shadow-md p-8 mt-8">
        <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
          <FileText className="h-7 w-7 text-[#1E3A5F]" />
        </div>
        <h2 className="text-xl font-bold text-[#0F172A] mb-2">Boleto gerado!</h2>
        <p className="text-sm text-[#64748B] mb-5">
          Após a compensação (1-3 dias úteis), você receberá um email com o link de confirmação da sua conta em{" "}
          <span className="font-medium text-[#0F172A]">{displayEmail}</span>.
        </p>

        {paymentResult?.boletoUrl && (
          <a href={paymentResult.boletoUrl} target="_blank" rel="noopener noreferrer">
            <Button
              className="w-full h-9 rounded-xl font-semibold text-white mb-3 text-sm"
              style={{ background: "linear-gradient(135deg, #1E3A5F, #2563EB)" }}
            >
              Baixar boleto novamente
            </Button>
          </a>
        )}

        <Button
          variant="outline"
          onClick={() => navigate("/login")}
          className="w-full h-9 rounded-xl text-sm"
        >
          Ir para o login →
        </Button>
      </div>
    );
  }

  // Cartão / PIX — pagamento confirmado
  return (
    <div className="max-w-md mx-auto text-center bg-white rounded-2xl shadow-md p-8 mt-8">
      <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4 animate-bounce">
        <CheckCircle className="h-7 w-7 text-green-600" />
      </div>
      <h2 className="text-xl font-bold text-[#0F172A] mb-2">
        {paymentResult?.formaPagamento === "pix" ? "Pagamento confirmado! 🎉" : "Conta criada com sucesso! 🎉"}
      </h2>
      <p className="text-sm text-[#64748B] mb-5">
        Enviamos um link de confirmação para{" "}
        <span className="font-medium text-[#0F172A]">{displayEmail}</span>.
        Clique no link para ativar sua conta e fazer o primeiro login.
      </p>

      <Button
        onClick={() => navigate("/login")}
        className="w-full h-9 rounded-xl font-semibold text-white text-sm"
        style={{ background: "linear-gradient(135deg, #1E3A5F, #2563EB)" }}
      >
        Ir para o login →
      </Button>
    </div>
  );
}
