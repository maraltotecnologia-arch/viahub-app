import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Clock, Mail, ArrowLeft } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";

export default function AguardandoPagamento() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";

  return (
    <AuthLayout>
      <div className="animate-fade-in text-center">
        <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-5">
          <Clock className="h-8 w-8 text-amber-600" />
        </div>

        <h2 className="text-2xl font-bold text-[#0F172A] mb-2">
          Pagamento ainda não identificado
        </h2>

        <p className="text-sm text-[#64748B] mb-6">
          Seu boleto ainda não foi compensado. A compensação pode levar até{" "}
          <strong>3 dias úteis</strong> após o pagamento. Assim que identificarmos,
          você receberá um email e seu acesso será liberado automaticamente.
        </p>

        {email && (
          <div className="bg-muted/50 rounded-xl px-4 py-3 mb-6 text-sm text-muted-foreground">
            Email da conta: <span className="font-medium text-foreground">{email}</span>
          </div>
        )}

        <div className="space-y-3">
          <Button
            onClick={() => navigate("/login")}
            className="w-full h-12 rounded-xl font-semibold text-[15px] text-white shadow-[0_4px_16px_rgba(37,99,235,0.3)]"
            style={{ background: "linear-gradient(135deg, #2563EB, #06B6D4)" }}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>

          <a href="mailto:suporte@viahub.app">
            <Button variant="outline" className="w-full h-12 rounded-xl text-sm font-medium">
              <Mail className="h-4 w-4 mr-2" />
              Falar com suporte
            </Button>
          </a>
        </div>

        <p className="text-xs text-[#94A3B8] mt-6">
          Se já pagou há mais de 3 dias úteis, entre em contato com nosso suporte.
        </p>
      </div>
    </AuthLayout>
  );
}
