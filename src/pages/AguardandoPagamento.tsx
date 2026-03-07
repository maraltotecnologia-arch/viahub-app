import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Clock, RefreshCw, LogOut, Mail } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import AuthLayout from "@/components/AuthLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export default function AguardandoPagamento() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    if (auth?.signOut) await auth.signOut();
    navigate("/login", { replace: true });
  };

  const verificarStatusPagamento = async () => {
    setIsLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) {
        handleLogout();
        return;
      }

      const { data: perfil } = await supabase
        .from("usuarios")
        .select("agencia_id")
        .eq("id", userId)
        .maybeSingle();

      if (!perfil?.agencia_id) {
        toast({ title: "Erro", description: "Não foi possível localizar sua agência.", variant: "destructive" });
        return;
      }

      const { data: agencia, error } = await supabase
        .from("agencias")
        .select("status_pagamento")
        .eq("id", perfil.agencia_id)
        .single();

      console.log("[AguardandoPagamento] status_pagamento:", agencia?.status_pagamento, "error:", error);

      if (error) {
        toast({ title: "Erro", description: "Não foi possível verificar o status do pagamento.", variant: "destructive" });
        return;
      }

      if (agencia?.status_pagamento === "ativo") {
        if (auth?.refreshUser) await auth.refreshUser();
        navigate("/dashboard", { replace: true });
      } else {
        toast({
          title: "Pagamento em Processamento",
          description: "O pagamento ainda está sendo processado. Tente novamente mais tarde.",
        });
      }
    } catch (err) {
      console.error("[AguardandoPagamento] erro:", err);
      toast({ title: "Erro Inesperado", description: "Ocorreu um erro ao verificar o status.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="animate-fade-in text-center">
        <div className="md:hidden text-center mb-6">
          <h1 className="text-3xl font-bold text-[#0F172A]">
            Via<span className="font-extrabold">Hub</span>
          </h1>
        </div>

        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center mx-auto mb-6 shadow-sm">
          <Clock className="h-8 w-8 text-amber-600" />
        </div>

        <h2 className="text-2xl font-bold text-[#0F172A] mb-2">
          Aguardando Pagamento
        </h2>

        <p className="text-sm text-[#64748B] leading-relaxed mb-8">
          Seu cadastro foi realizado com sucesso! Como você escolheu a opção de{" "}
          <strong className="text-[#0F172A]">Boleto</strong>, o banco pode levar até{" "}
          <strong className="text-[#0F172A]">3 dias úteis</strong> para confirmar o
          pagamento. Assim que for compensado, seu acesso será liberado
          automaticamente.
        </p>

        <div className="space-y-3">
          <Button
            onClick={verificarStatusPagamento}
            disabled={isLoading}
            className="w-full h-12 rounded-xl font-semibold text-[15px] text-white shadow-[0_4px_16px_rgba(37,99,235,0.3)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.4)] hover:-translate-y-0.5 transition-all duration-200"
            style={{ background: "linear-gradient(135deg, #2563EB, #06B6D4)" }}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            {isLoading ? "Verificando..." : "Verificar status do pagamento"}
          </Button>

          <Button
            variant="outline"
            onClick={handleLogout}
            className="w-full h-12 rounded-xl text-sm font-medium text-[#64748B] border-[#E2E8F0] hover:bg-[#F8FAFC]"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Voltar ao Login
          </Button>
        </div>

        <p className="text-xs text-[#94A3B8] mt-8">
          Precisa de ajuda?{" "}
          <a
            href="mailto:suporte@viahub.app"
            className="text-[#2563EB] hover:underline inline-flex items-center gap-1"
          >
            <Mail className="h-3 w-3" />
            suporte@viahub.app
          </a>
        </p>
      </div>
    </AuthLayout>
  );
}