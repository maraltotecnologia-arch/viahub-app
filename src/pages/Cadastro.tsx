import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import CadastroStep1 from "@/components/cadastro/CadastroStep1";
import CadastroStep2 from "@/components/cadastro/CadastroStep2";
import CadastroStep3 from "@/components/cadastro/CadastroStep3";
import CadastroProgress from "@/components/cadastro/CadastroProgress";

export type CadastroData = {
  nomeAgencia: string;
  cnpj: string;
  nomeAdmin: string;
  email: string;
  telefone: string;
  senha: string;
  confirmarSenha: string;
  plano: string;
  formaPagamento: string;
};

export default function Cadastro() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<CadastroData>({
    nomeAgencia: "",
    cnpj: "",
    nomeAdmin: "",
    email: "",
    telefone: "",
    senha: "",
    confirmarSenha: "",
    plano: "",
    formaPagamento: "",
  });
  const [paymentResult, setPaymentResult] = useState<{
    invoiceUrl?: string;
    boletoUrl?: string;
    formaPagamento: string;
    email: string;
  } | null>(null);

  useEffect(() => {
    document.title = "Criar conta — ViaHub";
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "light");
    document.documentElement.style.setProperty("--bg-primary", "#ffffff");
    return () => {
      const saved = localStorage.getItem("viahub-theme") || "dark";
      document.documentElement.setAttribute("data-theme", saved);
      document.documentElement.style.removeProperty("--bg-primary");
    };
  }, []);

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  const updateData = (partial: Partial<CadastroData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F8FAFC" }}>
      {/* Progress indicator */}
      <div className="w-full py-6 px-4">
        <CadastroProgress currentStep={step} />
      </div>

      <div className="flex-1 flex items-start justify-center px-4 pb-8">
        <div className="w-full max-w-5xl animate-fade-in">
          {step === 0 && (
            <CadastroStep1
              data={data}
              updateData={updateData}
              onNext={() => setStep(1)}
            />
          )}
          {step === 1 && (
            <CadastroStep2
              data={data}
              updateData={updateData}
              onBack={() => setStep(0)}
              onComplete={(result) => {
                setPaymentResult(result);
                setStep(2);
              }}
            />
          )}
          {step === 2 && (
            <CadastroStep3
              paymentResult={paymentResult}
              email={data.email}
            />
          )}
        </div>
      </div>

      <p className="text-center text-xs text-[#94A3B8] py-4">
        powered by <span className="font-semibold">Maralto</span>
      </p>
    </div>
  );
}
