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
        {/* Mobile logo */}
        <div className="md:hidden text-center mb-6">
          <div className="inline-flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-sm font-bold text-white">VH</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">ViaHub</h1>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900">Bem-vindo de volta</h2>
          <p className="text-sm text-gray-500 mt-1">Acesse sua conta ViaHub</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Email</Label>
                <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Senha</Label>
                  <Link to="/recuperar-senha" className="text-sm text-blue-600 font-medium hover:underline">Esqueceu sua senha?</Link>
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? "Entrando..." : "Entrar"}
              </Button>
        </form>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">ou</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <p className="text-center text-sm text-gray-500">
          Não tem uma conta?{" "}
          <Link to="/cadastro" className="text-blue-600 font-medium hover:underline">Criar conta grátis</Link>
        </p>

        <p className="text-center text-xs text-gray-400 mt-4">
          ViaHub — Ecossistema para agências de viagem
        </p>
      </div>
    </AuthLayout>
  );
}
