import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, EyeOff } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { formatError } from "@/lib/errors";

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
    document.documentElement.style.setProperty('--bg-primary', '#f7f9fb');
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
      const { data: checkData, error: checkError } = await supabase.functions.invoke("verificar-status-email", {
        body: { email: email.trim(), password },
      });

      if (checkError) {
        setError(formatError("SYS001"));
        return;
      }

      if (!checkData?.allowed) {
        if (checkData?.reason === "subscription_deleted") {
          const agId = checkData?.agencia_id;
          const encodedEmail = encodeURIComponent(email.trim().toLowerCase());
          navigate(`/reativar-plano?agencia_id=${agId}&email=${encodedEmail}`, { replace: true });
          return;
        }

        const msg = checkData?.code
          ? formatError(checkData.code)
          : checkData?.message || formatError("SYS001");
        setError(msg);
        return;
      }

      const { data: sessionData, error: authError } = await supabase.auth.signInWithPassword({ email, password });

      if (authError) {
        setError(formatError("SYS001"));
        return;
      }
    } catch (err) {
      setError(formatError("SYS001"));
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
          <div className="inline-flex items-center gap-2">
            <div className="rounded-xl bg-gradient-to-br from-[#0058be] to-[#2170e4] p-2 shadow-xl shadow-[rgba(0,88,190,0.2)]">
              <span className="text-base font-extrabold text-white">VH</span>
            </div>
            <h1 className="text-3xl font-extrabold text-[#191c1e]">
              ViaHub
            </h1>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[#191c1e]">Bem-vindo de volta</h2>
          <p className="text-sm text-[#727785] mt-1">Acesse sua conta ViaHub</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-bold text-[#424754] uppercase tracking-wide">Email</Label>
                <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-bold text-[#424754] uppercase tracking-wide">Senha</Label>
                  <Link to="/recuperar-senha" className="text-[13px] text-[#0058be] font-semibold hover:underline">Esqueceu sua senha?</Link>
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
              {error && <p className="text-sm text-destructive font-medium">{error}</p>}
              <Button
                type="submit"
                className="w-full h-12 text-[15px]"
                disabled={loading}
              >
                {loading ? "Entrando..." : "Entrar"}
              </Button>
        </form>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-border/30" />
          <span className="text-xs text-muted-foreground">ou</span>
          <div className="flex-1 h-px bg-border/30" />
        </div>

        <p className="text-center text-sm text-[#727785]">
          Não tem uma conta?{" "}
          <Link to="/cadastro" className="text-[#0058be] font-bold hover:underline">Criar conta grátis</Link>
        </p>

        <p className="text-center text-xs text-[#8c9099] mt-4">
          ViaHub — Ecossistema para agências de viagem
        </p>
      </div>
    </AuthLayout>
  );
}
