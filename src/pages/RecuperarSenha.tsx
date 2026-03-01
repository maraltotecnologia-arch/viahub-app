import { useState } from "react";
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });

    if (resetError) {
      setError("Email não encontrado. Verifique e tente novamente.");
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  };

  return (
    <AuthLayout>
      <div className="animate-fade-in">
        <div className="md:hidden text-center mb-6">
          <h1 className="text-3xl font-bold text-[#0F172A]">Via<span className="font-extrabold">Hub</span></h1>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[#0F172A]">Recuperar Senha</h2>
          <p className="text-sm text-[#64748B] mt-1">Digite seu email para receber o link de recuperação</p>
        </div>

        {sent ? (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-5 text-center">
            <p className="text-sm text-emerald-700 font-medium">
              Email enviado! Verifique sua caixa de entrada e clique no link para redefinir sua senha.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              type="submit"
              className="w-full h-12 rounded-xl font-semibold text-[15px] text-white shadow-[0_4px_16px_rgba(37,99,235,0.3)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.4)] hover:-translate-y-0.5 transition-all duration-200"
              style={{ background: "linear-gradient(135deg, #2563EB, #06B6D4)" }}
              disabled={loading}
            >
              {loading ? "Enviando..." : "Enviar Link"}
            </Button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-[#2563EB] hover:underline">
            <ArrowLeft className="h-4 w-4" /> Voltar ao login
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
