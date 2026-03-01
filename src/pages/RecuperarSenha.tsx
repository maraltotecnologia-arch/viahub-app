import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

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
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="w-full max-w-md animate-fade-in">
        <div className="bg-card rounded-2xl shadow-xl p-8 border">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-extrabold tracking-tight">
              <span className="gradient-text">Via</span>
              <span className="text-foreground">Hub</span>
            </h1>
            <p className="text-muted-foreground text-sm mt-2">Recuperar Senha</p>
          </div>

          {sent ? (
            <div className="rounded-lg bg-success/10 border border-success/30 p-4 text-center">
              <p className="text-sm text-success font-medium">
                Email enviado! Verifique sua caixa de entrada e clique no link para redefinir sua senha.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground text-center mb-6">
                Digite seu email e enviaremos um link para redefinir sua senha
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" variant="gradient" className="w-full" size="lg" disabled={loading}>
                  {loading ? "Enviando..." : "Enviar Link"}
                </Button>
              </form>
            </>
          )}

          <div className="text-center mt-4">
            <Link to="/login" className="text-sm text-primary hover:underline">
              Voltar ao login
            </Link>
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-6">
          powered by <span className="font-semibold">Maralto</span>
        </p>
      </div>
    </div>
  );
}
