import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, EyeOff, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { validarTelefone, validarCNPJ } from "@/lib/validators";

const planos = [
  { value: "starter_a", label: "Starter — R$397/mês" },
  { value: "starter_b", label: "Starter + Comissão — R$197/mês + 1,5%" },
  { value: "pro_a", label: "Pro — R$697/mês" },
  { value: "pro_b", label: "Pro + Comissão — R$297/mês + 1,2%" },
  { value: "white_label", label: "Elite — R$1.997/mês" },
];

const benefits = [
  "Orçamentos profissionais em minutos",
  "Pipeline de vendas integrado",
  "Relatórios financeiros em tempo real",
  "Gestão completa de clientes",
  "14 dias grátis, sem cartão de crédito",
];

const maskTelefone = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 10)
    return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
};

const maskCNPJ = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 14);
  return d
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
};

type FieldErrors = Record<string, string>;

export default function Cadastro() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [nomeAgencia, setNomeAgencia] = useState("");
  const [nomeAdmin, setNomeAdmin] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [plano, setPlano] = useState("");
  const [aceiteTermos, setAceiteTermos] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    document.title = "Criar conta — ViaHub";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute("content", "Crie sua conta no ViaHub e comece a gerenciar sua agência de viagens de forma profissional");
    }
  }, []);

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
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  const validate = (): boolean => {
    const e: FieldErrors = {};
    if (!nomeAgencia.trim()) e.nomeAgencia = "Nome da agência é obrigatório";
    if (!nomeAdmin.trim()) e.nomeAdmin = "Seu nome é obrigatório";
    if (!email.trim()) e.email = "Email é obrigatório";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Email inválido";
    if (!senha) e.senha = "Senha é obrigatória";
    else if (senha.length < 8) e.senha = "Mínimo 8 caracteres";
    if (!confirmarSenha) e.confirmarSenha = "Confirme a senha";
    else if (senha !== confirmarSenha) e.confirmarSenha = "Senhas não conferem";
    if (!telefone.trim()) e.telefone = "Telefone é obrigatório";
    else if (!validarTelefone(telefone)) e.telefone = "Telefone inválido";
    if (cnpj.trim() && !validarCNPJ(cnpj)) e.cnpj = "CNPJ inválido";
    if (!plano) e.plano = "Selecione um plano";
    if (!aceiteTermos) e.aceite = "Você precisa aceitar os termos";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      const res = await supabase.functions.invoke("signup-agencia", {
        body: {
          email: email.trim(),
          password: senha,
          nome_agencia: nomeAgencia.trim(),
          nome_admin: nomeAdmin.trim(),
          telefone: telefone.trim(),
          cnpj: cnpj.trim() || null,
          plano,
        },
      });

      if (res.error || res.data?.error) {
        const msg = res.data?.error || res.error?.message || "Erro ao criar conta";
        toast({ title: "Erro", description: msg, variant: "destructive" });
        setLoading(false);
        return;
      }

      setSucesso(true);
      setLoading(false);
    } catch {
      toast({ title: "Erro", description: "Erro inesperado. Tente novamente.", variant: "destructive" });
      setLoading(false);
    }
  };

  const FieldError = ({ field }: { field: string }) =>
    errors[field] ? <p className="text-sm text-destructive mt-1">{errors[field]}</p> : null;

  if (sucesso) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E3A8A 50%, #2563EB 100%)" }}>
        <div className="bg-white rounded-3xl p-10 max-w-md w-full text-center shadow-[0_20px_60px_rgba(0,0,0,0.15)]">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-[#0F172A] mb-2">Conta criada!</h2>
          <p className="text-[#64748B] text-sm mb-6">
            Verifique seu email para confirmar o cadastro. Após a confirmação, você poderá fazer login.
          </p>
          <Link to="/login">
            <Button
              className="w-full h-12 rounded-xl font-semibold text-[15px] text-white"
              style={{ background: "linear-gradient(135deg, #2563EB, #06B6D4)" }}
            >
              Ir para o login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left column */}
      <div
        className="hidden md:flex md:w-[40%] relative overflow-hidden items-center justify-center"
        style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E3A8A 40%, #2563EB 70%, #06B6D4 100%)" }}
      >
        <div className="absolute -top-[100px] -right-[100px] w-[400px] h-[400px] rounded-full" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }} />
        <div className="absolute top-[30%] -left-[80px] w-[250px] h-[250px] rounded-full" style={{ background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.15)" }} />
        <div className="absolute -bottom-[40px] right-[20%] w-[180px] h-[180px] rounded-full" style={{ background: "rgba(255,255,255,0.04)" }} />

        <div className="relative z-10 max-w-md px-8">
          <h1 className="text-[32px] font-bold text-white tracking-tight">
            Via<span className="font-extrabold">Hub</span>
          </h1>
          <p className="text-white/70 text-base mt-2">O ecossistema da sua agência</p>
          <p className="text-white/40 text-xs mt-2">powered by <span className="font-semibold">Maralto</span></p>

          <div className="mt-10 space-y-4">
            {benefits.map((b) => (
              <div key={b} className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-[#06B6D4] shrink-0" />
                <span className="text-white text-sm">{b}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right column */}
      <div className="w-full md:w-[60%] flex items-center justify-center p-6 min-h-screen" style={{ background: "rgba(255,255,255,0.95)" }}>
        <div className="md:hidden fixed inset-0 -z-10" style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E3A8A 50%, #2563EB 100%)" }} />
        <div className="w-full max-w-lg md:bg-transparent md:shadow-none md:rounded-none md:p-0 bg-white/95 rounded-3xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.15)]">
          <div className="animate-fade-in">
            <div className="md:hidden text-center mb-6">
              <h1 className="text-3xl font-bold text-[#0F172A]">Via<span className="font-extrabold">Hub</span></h1>
            </div>

            <div className="mb-6">
              <h2 className="text-2xl font-bold text-[#0F172A]">Crie sua conta</h2>
              <p className="text-sm text-[#64748B] mt-1">Comece a gerenciar sua agência de viagens</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="nomeAgencia">Nome da Agência *</Label>
                <Input id="nomeAgencia" placeholder="Minha Agência de Viagens" value={nomeAgencia} onChange={(e) => setNomeAgencia(e.target.value)} />
                <FieldError field="nomeAgencia" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nomeAdmin">Seu Nome *</Label>
                <Input id="nomeAdmin" placeholder="João Silva" value={nomeAdmin} onChange={(e) => setNomeAdmin(e.target.value)} />
                <FieldError field="nomeAdmin" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                <FieldError field="email" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="senha">Senha *</Label>
                  <div className="relative">
                    <Input id="senha" type={showPassword ? "text" : "password"} placeholder="••••••••" value={senha} onChange={(e) => setSenha(e.target.value)} className="pr-10" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A] transition-colors">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <FieldError field="senha" />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmarSenha">Confirmar Senha *</Label>
                  <div className="relative">
                    <Input id="confirmarSenha" type={showConfirm ? "text" : "password"} placeholder="••••••••" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} className="pr-10" />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A] transition-colors">
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <FieldError field="confirmarSenha" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="telefone">Telefone *</Label>
                  <Input id="telefone" placeholder="(11) 99999-9999" value={telefone} onChange={(e) => setTelefone(maskTelefone(e.target.value))} />
                  <FieldError field="telefone" />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cnpj">CNPJ (opcional)</Label>
                  <Input id="cnpj" placeholder="00.000.000/0001-00" value={cnpj} onChange={(e) => setCnpj(maskCNPJ(e.target.value))} />
                  <FieldError field="cnpj" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="plano">Plano *</Label>
                <Select value={plano} onValueChange={setPlano}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione um plano" />
                  </SelectTrigger>
                  <SelectContent>
                    {planos.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError field="plano" />
              </div>

              <div className="flex items-start gap-2 pt-1">
                <Checkbox
                  id="aceite"
                  checked={aceiteTermos}
                  onCheckedChange={(v) => setAceiteTermos(v === true)}
                  className="mt-0.5"
                />
                <label htmlFor="aceite" className="text-sm text-[#64748B] leading-tight cursor-pointer">
                  Li e aceito os <a href="/termos" target="_blank" rel="noopener noreferrer" className="text-[#2563EB] hover:underline">Termos de Uso</a> e <a href="/privacidade" target="_blank" rel="noopener noreferrer" className="text-[#2563EB] hover:underline">Política de Privacidade</a>
                </label>
              </div>
              <FieldError field="aceite" />

              <Button
                type="submit"
                className="w-full h-12 rounded-xl font-semibold text-[15px] text-white shadow-[0_4px_16px_rgba(37,99,235,0.3)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.4)] hover:-translate-y-0.5 transition-all duration-200"
                style={{ background: "linear-gradient(135deg, #2563EB, #06B6D4)" }}
                disabled={loading}
              >
                {loading ? "Criando conta..." : "Criar minha conta"}
              </Button>
            </form>

            <p className="text-center text-sm text-[#64748B] mt-6">
              Já tem uma conta?{" "}
              <Link to="/login" className="text-[#2563EB] font-medium hover:underline">Fazer login</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
