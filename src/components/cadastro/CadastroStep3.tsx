import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, FileText, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type Props = {
  paymentResult: {
    invoiceUrl?: string;
    boletoUrl?: string;
    formaPagamento: string;
    email: string;
  } | null;
  email: string;
};

export default function CadastroStep3({ paymentResult, email }: Props) {
  const navigate = useNavigate();
  const isBoleto = paymentResult?.formaPagamento === "boleto";
  const displayEmail = paymentResult?.email || email;

  const [otpCode, setOtpCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(60);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const resendOtp = useCallback(async () => {
    if (cooldown > 0) return;
    try {
      await supabase.auth.signInWithOtp({ email: displayEmail, options: { shouldCreateUser: false } });
      setCooldown(60);
      toast({ title: "Código reenviado" });
    } catch {
      toast({ title: "Erro ao reenviar", variant: "destructive" });
    }
  }, [cooldown, displayEmail]);

  const verifyOtp = async () => {
    if (otpCode.length !== 6) return;
    setVerifying(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: displayEmail,
        token: otpCode,
        type: "email",
      });
      if (error) {
        toast({ title: "Código inválido", description: error.message, variant: "destructive" });
      } else {
        // Mark email as confirmed
        toast({ title: "Email confirmado!" });
        navigate("/dashboard");
      }
    } catch {
      toast({ title: "Erro ao verificar", variant: "destructive" });
    }
    setVerifying(false);
  };

  if (isBoleto) {
    return (
      <div className="max-w-md mx-auto text-center bg-white rounded-2xl shadow-md p-8">
        <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
          <FileText className="h-8 w-8 text-[#1E3A5F]" />
        </div>
        <h2 className="text-2xl font-bold text-[#0F172A] mb-2">Boleto gerado com sucesso!</h2>
        <p className="text-[#64748B] text-sm mb-6">
          Após a compensação do boleto (1-3 dias úteis), você receberá um email com os dados de acesso.
        </p>

        {paymentResult?.boletoUrl && (
          <a href={paymentResult.boletoUrl} target="_blank" rel="noopener noreferrer">
            <Button
              className="w-full h-10 rounded-xl font-semibold text-white mb-3"
              style={{ background: "linear-gradient(135deg, #1E3A5F, #2563EB)" }}
            >
              Baixar boleto
            </Button>
          </a>
        )}
        {paymentResult?.invoiceUrl && (
          <a href={paymentResult.invoiceUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="w-full h-10 rounded-xl mb-4">
              Ver fatura completa
            </Button>
          </a>
        )}

        <p className="text-xs text-[#94A3B8]">
          Guarde o email cadastrado: <span className="font-medium text-[#0F172A]">{displayEmail}</span>
        </p>
      </div>
    );
  }

  // Cartão / PIX flow — OTP verification
  return (
    <div className="max-w-md mx-auto text-center bg-white rounded-2xl shadow-md p-8">
      {paymentResult?.invoiceUrl && (
        <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-200">
          <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-green-800">Pagamento processado!</p>
          <a href={paymentResult.invoiceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[#2563EB] hover:underline">
            Ver comprovante
          </a>
        </div>
      )}

      <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
        <Mail className="h-8 w-8 text-[#1E3A5F]" />
      </div>
      <h2 className="text-2xl font-bold text-[#0F172A] mb-2">Quase lá! Confirme seu email</h2>
      <p className="text-[#64748B] text-sm mb-6">
        Enviamos um código de confirmação para <span className="font-medium text-[#0F172A]">{displayEmail}</span>. Digite o código abaixo para ativar sua conta.
      </p>

      <Input
        value={otpCode}
        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        placeholder="000000"
        className="text-center text-2xl tracking-[0.5em] font-mono h-14 mb-4"
        maxLength={6}
      />

      <Button
        onClick={verifyOtp}
        disabled={otpCode.length !== 6 || verifying}
        className="w-full h-10 rounded-xl font-semibold text-white mb-3"
        style={{ background: "linear-gradient(135deg, #1E3A5F, #2563EB)" }}
      >
        {verifying ? "Verificando..." : "Confirmar email"}
      </Button>

      <button
        onClick={resendOtp}
        disabled={cooldown > 0}
        className="text-sm text-[#2563EB] hover:underline disabled:text-[#94A3B8] disabled:no-underline"
      >
        {cooldown > 0 ? `Reenviar código em ${cooldown}s` : "Reenviar código"}
      </button>
    </div>
  );
}
