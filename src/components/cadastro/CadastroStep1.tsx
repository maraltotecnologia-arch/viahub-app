import { useState } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, CheckCircle } from "lucide-react";
import { validarTelefone, validarCNPJ } from "@/lib/validators";
import type { CadastroData } from "@/pages/Cadastro";

const maskTelefone = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10)
    return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
};

const maskCNPJ = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
};

const benefits = [
  "Orçamentos profissionais em minutos",
  "Pipeline de vendas integrado",
  "Relatórios financeiros em tempo real",
  "Gestão completa de clientes",
];

type Props = {
  data: CadastroData;
  updateData: (d: Partial<CadastroData>) => void;
  onNext: () => void;
};

type FieldErrors = Record<string, string>;

export default function CadastroStep1({ data, updateData, onNext }: Props) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const validate = (): boolean => {
    const e: FieldErrors = {};
    if (!data.nomeAgencia.trim()) e.nomeAgencia = "Nome da agência é obrigatório";
    if (!data.cnpj.trim()) e.cnpj = "CNPJ é obrigatório";
    else if (!validarCNPJ(data.cnpj)) e.cnpj = "CNPJ inválido";
    if (!data.nomeAdmin.trim()) e.nomeAdmin = "Seu nome é obrigatório";
    if (!data.email.trim()) e.email = "Email é obrigatório";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) e.email = "Email inválido";
    if (!data.telefone.trim()) e.telefone = "Telefone é obrigatório";
    else if (!validarTelefone(data.telefone)) e.telefone = "Telefone inválido";
    if (!data.senha) e.senha = "Senha é obrigatória";
    else if (data.senha.length < 8) e.senha = "Mínimo 8 caracteres";
    else if (!/\d/.test(data.senha)) e.senha = "Deve conter ao menos 1 número";
    if (!data.confirmarSenha) e.confirmarSenha = "Confirme a senha";
    else if (data.senha !== data.confirmarSenha) e.confirmarSenha = "Senhas não conferem";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (validate()) onNext();
  };

  const FieldError = ({ field }: { field: string }) =>
    errors[field] ? <p className="text-xs text-red-500 mt-0.5">{errors[field]}</p> : null;

  return (
    <div className="flex gap-6 h-full lg:h-[calc(100vh-5rem)]">
      {/* Left panel - desktop only */}
      <div
        className="hidden lg:flex lg:w-[32%] rounded-2xl p-6 flex-col justify-center relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E3A5F 40%, #2563EB 100%)" }}
      >
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }} />
        <div className="absolute bottom-10 -left-10 w-40 h-40 rounded-full" style={{ background: "rgba(6,182,212,0.08)" }} />
        <div className="relative z-10">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Via<span className="font-extrabold">Hub</span>
          </h1>
          <p className="text-white/60 text-xs mt-1">O ecossistema da sua agência</p>
          <h2 className="text-lg font-semibold text-white mt-6">Comece agora</h2>
          <div className="mt-4 space-y-2.5">
            {benefits.map((b) => (
              <div key={b} className="flex items-center gap-2">
                <CheckCircle className="h-3.5 w-3.5 text-[#06B6D4] shrink-0" />
                <span className="text-white/90 text-xs">{b}</span>
              </div>
            ))}
          </div>
          <p className="text-white/30 text-xs mt-6">powered by <span className="font-semibold">Maralto</span></p>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 bg-white rounded-2xl shadow-md p-5 sm:p-6 flex flex-col overflow-y-auto lg:overflow-hidden">
        {/* Mobile header */}
        <div className="lg:hidden text-center mb-3">
          <h1 className="text-xl font-bold text-[#0F172A]">Via<span className="font-extrabold">Hub</span></h1>
        </div>

        <div className="mb-2">
          <h2 className="text-lg font-bold text-[#0F172A]">Crie sua conta</h2>
          <p className="text-xs text-[#64748B]">
            O ViaHub é exclusivo para pessoas jurídicas (CNPJ ou MEI)
          </p>
        </div>

        <div className="space-y-2 flex-1">
          {/* Row 1: Nome fantasia */}
          <div>
            <Label htmlFor="nomeAgencia" className="text-xs">Nome da Agência *</Label>
            <Input id="nomeAgencia" placeholder="Minha Agência de Viagens" value={data.nomeAgencia} onChange={(e) => updateData({ nomeAgencia: e.target.value })} className="h-8 text-sm mt-0.5" />
            <FieldError field="nomeAgencia" />
          </div>

          {/* Row 2: CNPJ | Telefone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <Label htmlFor="cnpj" className="text-xs">CNPJ *</Label>
              <Input id="cnpj" placeholder="00.000.000/0001-00" value={data.cnpj} onChange={(e) => updateData({ cnpj: maskCNPJ(e.target.value) })} className="h-8 text-sm mt-0.5" />
              <FieldError field="cnpj" />
            </div>
            <div>
              <Label htmlFor="telefone" className="text-xs">Telefone *</Label>
              <Input id="telefone" placeholder="(11) 99999-9999" value={data.telefone} onChange={(e) => updateData({ telefone: maskTelefone(e.target.value) })} className="h-8 text-sm mt-0.5" />
              <FieldError field="telefone" />
            </div>
          </div>

          {/* Row 3: Nome responsável */}
          <div>
            <Label htmlFor="nomeAdmin" className="text-xs">Nome do Responsável *</Label>
            <Input id="nomeAdmin" placeholder="João Silva" value={data.nomeAdmin} onChange={(e) => updateData({ nomeAdmin: e.target.value })} className="h-8 text-sm mt-0.5" />
            <FieldError field="nomeAdmin" />
          </div>

          {/* Row 4: Email */}
          <div>
            <Label htmlFor="email" className="text-xs">Email *</Label>
            <Input id="email" type="email" placeholder="seu@email.com" value={data.email} onChange={(e) => updateData({ email: e.target.value })} className="h-8 text-sm mt-0.5" />
            <FieldError field="email" />
          </div>

          {/* Row 5: Senha | Confirmar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <Label htmlFor="senha" className="text-xs">Senha *</Label>
              <div className="relative mt-0.5">
                <Input id="senha" type={showPassword ? "text" : "password"} placeholder="••••••••" value={data.senha} onChange={(e) => updateData({ senha: e.target.value })} className="pr-9 h-8 text-sm" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A]">
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              <FieldError field="senha" />
            </div>
            <div>
              <Label htmlFor="confirmarSenha" className="text-xs">Confirmar Senha *</Label>
              <div className="relative mt-0.5">
                <Input id="confirmarSenha" type={showConfirm ? "text" : "password"} placeholder="••••••••" value={data.confirmarSenha} onChange={(e) => updateData({ confirmarSenha: e.target.value })} className="pr-9 h-8 text-sm" />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A]">
                  {showConfirm ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              <FieldError field="confirmarSenha" />
            </div>
          </div>

          <label className="text-[10px] text-[#64748B] leading-tight block">
            Ao continuar, você aceita os{" "}
            <a href="/termos" target="_blank" className="text-[#2563EB] hover:underline">Termos de Uso</a> e{" "}
            <a href="/privacidade" target="_blank" className="text-[#2563EB] hover:underline">Política de Privacidade</a>
          </label>

          <Button
            onClick={handleNext}
            className="w-full h-9 rounded-xl font-semibold text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
            style={{ background: "linear-gradient(135deg, #1E3A5F, #2563EB)" }}
          >
            Continuar →
          </Button>

          <p className="text-center text-xs text-[#64748B]">
            Já tem uma conta?{" "}
            <Link to="/login" className="text-[#2563EB] font-medium hover:underline">Fazer login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
