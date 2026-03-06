import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AuthLayout from "@/components/AuthLayout";

export default function RedefinirSenha() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

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
    // Check if user has an active session (set by OTP verification)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setReady(true);
      }
      setChecking(false);
    });

    // Also listen for PASSWORD_RECOVERY event (legacy link flow fallback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        setReady(true);
        setChecking(false);
      }
      if (event === "SIGNED_IN" && session) {
        setReady(true);
        setChecking(false);
      }
    });

    // Handle legacy hash tokens
    const hash = window.location.hash;
    if (hash && hash.includes("access_token")) {
      // Supabase will auto-process — wait for onAuthStateChange
      setTimeout(() => setChecking(false), 4000);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    toast({ title: "Senha alterada com sucesso!" });
    setLoading(false);
    await supabase.auth.signOut();
    setTimeout(() => navigate("/login", { replace: true }), 2000);
  };

  if (checking) {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="h-8 w-8 rounded-full border-[3px] border-gray-200 border-t-[#2563EB] animate-spin" />
          <p className="text-[#64748B] text-sm mt-4">Verificando...</p>
        </div>
      </AuthLayout>
    );
  }

  if (!ready) {
    return (
      <AuthLayout>
        <div className="animate-fade-in text-center">
          <div className="md:hidden text-center mb-6">
            <h1 className="text-3xl font-bold text-[#0F172A]">Via<span className="font-extrabold">Hub</span></h1>
          </div>
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#0F172A]">Sessão expirada</h2>
            <p className="text-sm text-[#64748B] mt-3">
              Solicite uma nova redefinição de senha para continuar.
            </p>
          </div>
          <Link to="/recuperar-senha">
            <Button
              className="w-full h-12 rounded-xl font-semibold text-[15px] text-white"
              style={{ background: "linear-gradient(135deg, #2563EB, #06B6D4)" }}
            >
              Solicitar nova redefinição
            </Button>
          </Link>
          <div className="mt-6 text-center">
            <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-[#2563EB] hover:underline">
              <ArrowLeft className="h-4 w-4" /> Voltar ao login
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="animate-fade-in">
        <div className="md:hidden text-center mb-6">
          <h1 className="text-3xl font-bold text-[#0F172A]">Via<span className="font-extrabold">Hub</span></h1>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[#0F172A]">Redefinir Senha</h2>
          <p className="text-sm text-[#64748B] mt-1">Escolha uma nova senha para sua conta</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Nova Senha</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Mínimo 6 caracteres"
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
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirmar Nova Senha</Label>
            <Input id="confirm" type="password" placeholder="Repita a nova senha" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            type="submit"
            className="w-full h-12 rounded-xl font-semibold text-[15px] text-white shadow-[0_4px_16px_rgba(37,99,235,0.3)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.4)] hover:-translate-y-0.5 transition-all duration-200"
            style={{ background: "linear-gradient(135deg, #2563EB, #06B6D4)" }}
            disabled={loading}
          >
            {loading ? "Salvando..." : "Salvar Nova Senha"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-[#2563EB] hover:underline">
            <ArrowLeft className="h-4 w-4" /> Voltar ao login
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
