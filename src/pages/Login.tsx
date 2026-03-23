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
    return () => {
      const saved = localStorage.getItem('viahub-theme') || 'dark';
      document.documentElement.setAttribute('data-theme', saved);
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
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold font-display tracking-tight text-on-surface mb-1">Bem-vindo de volta</h2>
          <p className="text-sm text-on-surface-variant font-body">Acesse sua conta ViaHub</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="block text-xs font-medium font-label text-on-surface-variant uppercase tracking-wide">Email</Label>
            <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="block text-xs font-medium font-label text-on-surface-variant uppercase tracking-wide">Senha</Label>
              <Link to="/recuperar-senha" className="text-sm text-primary font-medium hover:underline">Esqueceu sua senha?</Link>
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 hover:text-on-surface transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {error && <p className="text-xs text-error font-medium">{error}</p>}
          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-outline-variant/20" />
          <span className="text-xs text-on-surface-variant/60 font-label">ou</span>
          <div className="flex-1 h-px bg-outline-variant/20" />
        </div>

        <p className="text-center text-sm text-on-surface-variant font-body">
          Não tem uma conta?{" "}
          <Link to="/cadastro" className="text-primary font-medium hover:underline">Criar conta grátis</Link>
        </p>

        <p className="text-center text-xs text-on-surface-variant/60 font-label mt-4">
          ViaHub — Ecossistema para agências de viagem
        </p>
      </div>
    </AuthLayout>
  );
}
