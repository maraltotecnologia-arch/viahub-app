import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, EyeOff, Clock, ArrowLeft } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";

export default function Login() {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paymentPending, setPaymentPending] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.style.setProperty('--bg-primary', '#ffffff');
    return () => {
      const saved = localStorage.getItem('viahub-theme') || 'dark';
      document.documentElement.setAttribute('data-theme', saved);
      document.documentElement.style.removeProperty('--bg-primary');
    };
  }, []);

  useEffect(() => {
    if (user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setPaymentPending(false);
    setLoading(true);

    try {
      console.log("[Login] Tentando signInWithPassword para:", email);
      const { data: sessionData, error: authError } = await supabase.auth.signInWithPassword({ email, password });

      if (authError) {
        console.error("[Login] signInWithPassword FALHOU:", authError.message, "code:", (authError as any).code);

        if ((authError as any).code === "email_not_confirmed" || authError.message?.includes("Email not confirmed")) {
          setError("Seu email ainda não foi confirmado. Verifique sua caixa de entrada.");
        } else if (authError.message?.includes("Invalid login credentials")) {
          setError("Email ou senha incorretos.");
        } else {
          setError(`Erro ao fazer login: ${authError.message}`);
        }
        return;
      }

      const userId = sessionData?.user?.id;
      console.log("[Login] signInWithPassword OK. User ID:", userId);

      if (!userId) {
        setError("Erro inesperado: sessão sem usuário.");
        return;
      }

      // Fetch profile to get agencia_id and cargo
      const { data: perfil, error: perfilError } = await supabase
        .from("usuarios")
        .select("agencia_id, cargo")
        .eq("id", userId)
        .maybeSingle();

      console.log("[Login] Perfil:", perfil, "error:", perfilError);

      if (perfilError) {
        setError("Erro ao carregar dados do usuário.");
        await supabase.auth.signOut();
        return;
      }

      // Superadmin always passes
      if (perfil?.cargo === "superadmin") {
        console.log("[Login] Superadmin detectado, liberando acesso.");
        // navigate will happen via useEffect when AuthContext sets user
        return;
      }

      if (!perfil?.agencia_id) {
        setError("Usuário sem agência vinculada.");
        await supabase.auth.signOut();
        return;
      }

      // Fetch agency status
      const { data: agencia, error: agenciaError } = await supabase
        .from("agencias")
        .select("status_pagamento")
        .eq("id", perfil.agencia_id)
        .single();

      console.log("[Login] Status da agência:", agencia?.status_pagamento, "error:", agenciaError);

      if (agenciaError) {
        setError("Erro ao carregar dados da agência.");
        await supabase.auth.signOut();
        return;
      }

      // GATE: Block pending/blocked
      if (agencia?.status_pagamento === "pendente" || agencia?.status_pagamento === "bloqueado") {
        console.log("[Login] Pagamento pendente/bloqueado. Derrubando sessão.");
        await supabase.auth.signOut();
        setPaymentPending(true);
        return;
      }

      // Status is 'ativo' — navigate will happen via useEffect when AuthContext sets user
      console.log("[Login] Acesso liberado.");
    } catch (err) {
      console.error("[Login] Erro inesperado:", err);
      setError("Ocorreu um erro inesperado. Tente novamente.");
      await supabase.auth.signOut().catch(() => {});
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="animate-fade-in">
        {/* Mobile logo */}
        <div className="md:hidden text-center mb-6">
          <h1 className="text-3xl font-bold text-[#0F172A]">
            Via<span className="font-extrabold">Hub</span>
          </h1>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[#0F172A]">Bem-vindo de volta</h2>
          <p className="text-sm text-[#64748B] mt-1">Acesse sua conta ViaHub</p>
        </div>

        {/* Payment pending alert */}
        {paymentPending && (
          <div className="mb-6 space-y-4">
            <Alert className="border-amber-200 bg-amber-50">
              <Clock className="h-5 w-5 text-amber-600" />
              <AlertTitle className="text-amber-800 font-semibold">Pagamento em Processamento</AlertTitle>
              <AlertDescription className="text-amber-700 text-sm leading-relaxed mt-1">
                Seu cadastro via <strong>Boleto</strong> está em análise. O banco pode levar até{" "}
                <strong>3 dias úteis</strong> para compensar. Seu acesso será liberado automaticamente
                após a confirmação do pagamento.
              </AlertDescription>
            </Alert>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPaymentPending(false)}
              className="w-full h-12 rounded-xl text-sm font-medium text-[#64748B] border-[#E2E8F0] hover:bg-[#F8FAFC]"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Tentar novamente
            </Button>
            <p className="text-center text-xs text-[#94A3B8]">
              Precisa de ajuda?{" "}
              <a href="mailto:suporte@viahub.app" className="text-[#2563EB] hover:underline">
                suporte@viahub.app
              </a>
            </p>
          </div>
        )}

        {/* Login form — hidden when payment pending */}
        {!paymentPending && (
          <>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Senha</Label>
                  <Link to="/recuperar-senha" className="text-[13px] text-[#2563EB] hover:underline">Esqueceu sua senha?</Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                type="submit"
                className="w-full h-12 rounded-xl font-semibold text-[15px] text-white shadow-[0_4px_16px_rgba(37,99,235,0.3)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.4)] hover:-translate-y-0.5 transition-all duration-200"
                style={{ background: "linear-gradient(135deg, #2563EB, #06B6D4)" }}
                disabled={loading}
              >
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </form>

            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">ou</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <p className="text-center text-sm text-[#64748B]">
              Não tem uma conta?{" "}
              <Link to="/cadastro" className="text-[#2563EB] font-medium hover:underline">Criar conta grátis</Link>
            </p>

            <p className="text-center text-xs text-[#94A3B8] mt-4">
              ViaHub — Ecossistema para agências de viagem
            </p>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
