import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      navigate("/dashboard");
      setLoading(false);
    }, 800);
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
            <p className="text-muted-foreground text-sm mt-2">O ecossistema da sua agência</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
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
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" variant="gradient" className="w-full" size="lg" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
            <div className="text-center">
              <a href="#" className="text-sm text-primary hover:underline">
                Esqueci minha senha
              </a>
            </div>
          </form>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-6">
          powered by <span className="font-semibold">Maralto</span>
        </p>
      </div>
    </div>
  );
}
