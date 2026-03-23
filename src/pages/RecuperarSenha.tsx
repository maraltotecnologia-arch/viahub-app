import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AuthLayout from "@/components/AuthLayout";

export default function RecuperarSenha() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.style.setProperty('--bg-primary', '#ffffff');
    return () => {
      const saved = localStorage.getItem('viahub-theme') || 'dark';
      document.documentElement.setAttribute('data-theme', saved);
      document.documentElement.style.removeProperty('--bg-primary');
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const trimmedEmail = email.toLowerCase().trim();
    await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });

    setSent(true);
    setLoading(false);
  };

  return (
    <AuthLayout>
      <div className="animate-fade-in">
        <div className="mb-8">
          <h2 className="text-2xl font-bold font-display tracking-tight text-on-surface">Recuperar Senha</h2>
          <p className="text-sm text-on-surface-variant font-body mt-1">Digite seu email para receber o link de recuperação</p>
        </div>

        {sent ? (
          <div className="rounded-xl bg-secondary-container/50 p-5 text-center">
            <p className="text-sm text-secondary font-medium">
              Se este email estiver cadastrado, você receberá as instruções em breve. Verifique sua caixa de entrada.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium font-label text-on-surface-variant uppercase tracking-wide">Email</Label>
              <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            {error && <p className="text-xs text-error">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Enviando..." : "Enviar Link"}
            </Button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium">
            <ArrowLeft className="h-4 w-4" /> Voltar ao login
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
