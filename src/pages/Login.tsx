import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, EyeOff } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";

export default function Login() {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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
    setLoading(true);

    try {
      // STEP 1: Validate credentials + check payment status (backend, no session created)
      console.log("[Login] Verificando credenciais e status de pagamento...");
      const { data: checkData, error: checkError } = await supabase.functions.invoke("verificar-status-email", {
        body: { email: email.trim(), password },
      });

      if (checkError) {
        console.error("[Login] Erro na verificação:", checkError);
        setError("Ocorreu um erro ao verificar suas credenciais. Tente novamente.");
        return;
      }

      if (!checkData?.allowed) {
        console.log("[Login] Acesso negado:", checkData?.reason, checkData?.message);

        // Handle subscription deleted — redirect admin to reactivar-plano
        if (checkData?.reason === "subscription_deleted") {
          const agId = checkData?.agencia_id;
          const encodedEmail = encodeURIComponent(email.trim().toLowerCase());
          navigate(`/reativar-plano?agencia_id=${agId}&email=${encodedEmail}`, { replace: true });
          return;
        }

        setError(checkData?.message || "Não foi possível fazer login.");
        return;
      }

      // STEP 2: All checks passed — now create the session on the client
      console.log("[Login] Verificação OK. Criando sessão...");
      const { data: sessionData, error: authError } = await supabase.auth.signInWithPassword({ email, password });

      if (authError) {
        console.error("[Login] signInWithPassword FALHOU:", authError.message);
        setError("Erro inesperado ao criar sessão. Tente novamente.");
        return;
      }

      console.log("[Login] Sessão criada. User ID:", sessionData?.user?.id);
      // Navigate will happen via useEffect when AuthContext sets user
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
      </div>
    </AuthLayout>
  );
}
