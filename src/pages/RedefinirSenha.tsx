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
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
      setChecking(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) { setReady(true); setChecking(false); }
      if (event === "SIGNED_IN" && session) { setReady(true); setChecking(false); }
    });

    const hash = window.location.hash;
    if (hash && hash.includes("access_token")) {
      setTimeout(() => setChecking(false), 4000);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("A senha deve ter no mínimo 6 caracteres."); return; }
    if (password !== confirm) { setError("As senhas não coincidem."); return; }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) { setError(updateError.message); setLoading(false); return; }
    toast({ title: "Senha alterada com sucesso!" });
    setLoading(false);
    await supabase.auth.signOut();
    setTimeout(() => navigate("/login", { replace: true }), 2000);
  };

  if (checking) {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="h-8 w-8 rounded-full border-[3px] border-outline-variant/30 border-t-primary animate-spin" />
          <p className="text-on-surface-variant text-sm mt-4 font-body">Verificando...</p>
        </div>
      </AuthLayout>
    );
  }

  if (!ready) {
    return (
      <AuthLayout>
        <div className="animate-fade-in text-center">
          <div className="mb-8">
            <h2 className="text-2xl font-bold font-display tracking-tight text-on-surface">Sessão expirada</h2>
            <p className="text-sm text-on-surface-variant font-body mt-3">
              Solicite uma nova redefinição de senha para continuar.
            </p>
          </div>
          <Link to="/recuperar-senha">
            <Button className="w-full">Solicitar nova redefinição</Button>
          </Link>
          <div className="mt-6 text-center">
            <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium">
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
        <div className="mb-8">
          <h2 className="text-2xl font-bold font-display tracking-tight text-on-surface">Redefinir Senha</h2>
          <p className="text-sm text-on-surface-variant font-body mt-1">Escolha uma nova senha para sua conta</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-medium font-label text-on-surface-variant uppercase tracking-wide">Nova Senha</Label>
            <div className="relative">
              <Input id="password" type={showPassword ? "text" : "password"} placeholder="Mínimo 6 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} required className="pr-10" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 hover:text-on-surface transition-colors">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm" className="text-xs font-medium font-label text-on-surface-variant uppercase tracking-wide">Confirmar Nova Senha</Label>
            <Input id="confirm" type="password" placeholder="Repita a nova senha" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </div>
          {error && <p className="text-xs text-error">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Salvando..." : "Salvar Nova Senha"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium">
            <ArrowLeft className="h-4 w-4" /> Voltar ao login
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
