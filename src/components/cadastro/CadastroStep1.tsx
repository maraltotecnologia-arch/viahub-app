import { useState } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, CheckCircle } from "lucide-react";
import { validarTelefone, validarCNPJ, validarEmail, validarSenha } from "@/lib/validators";
import { maskTelefone, maskCNPJ, maskCEP } from "@/lib/masks";
import type { CadastroData } from "@/pages/Cadastro";
import AuthLayout from "@/components/AuthLayout";

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
  const [cepError, setCepError] = useState<string | null>(null);

  const handleCepBlur = async () => {
    const cepLimpo = data.cep.replace(/\D/g, "");
    if (cepLimpo.length !== 8) {
      setCepError("CEP deve ter 8 dígitos (PAG002)");
      return;
    }
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const json = await res.json();
      if (json.erro) {
        setCepError("CEP não encontrado (PAG002)");
      } else {
        setCepError(null);
      }
    } catch {
      setCepError("Não foi possível consultar o CEP. Verifique sua conexão. (SYS002)");
    }
  };

  const validate = (): boolean => {
    const e: FieldErrors = {};
    if (!data.nomeAgencia.trim()) e.nomeAgencia = "Nome da agência é obrigatório";
    if (!data.cnpj.trim()) e.cnpj = "CNPJ é obrigatório";
    else if (!validarCNPJ(data.cnpj)) e.cnpj = "CNPJ inválido";
    if (!data.cep.trim()) e.cep = "CEP é obrigatório";
    else if (data.cep.replace(/\D/g, "").length !== 8) e.cep = "CEP inválido";
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
    <AuthLayout>
      <div className="animate-fade-in">
        {/* Mobile logo */}
        <div className="md:hidden text-center mb-4">
          <h1 className="text-3xl font-bold text-[#0F172A]">
            Via<span className="font-extrabold">Hub</span>
          </h1>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-5">
          {["Dados", "Plano", "Confirmação"].map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                  i === 0 ? "bg-[#1E3A5F] text-white" : "bg-[#E2E8F0] text-[#94A3B8]"
                }`}>
                  {i + 1}
                </div>
                <span className={`text-xs ${i === 0 ? "text-[#1E3A5F] font-medium" : "text-[#94A3B8]"}`}>{label}</span>
              </div>
              {i < 2 && <div className={`w-8 h-px ${i < 0 ? "bg-[#1E3A5F]" : "bg-[#E2E8F0]"}`} />}
            </div>
          ))}
        </div>

        <div className="mb-4">
          <h2 className="text-2xl font-bold text-[#0F172A]">Crie sua conta</h2>
          <p className="text-sm text-[#64748B] mt-1">
            O ViaHub é exclusivo para pessoas jurídicas (CNPJ ou MEI)
          </p>
        </div>

        <div className="space-y-3">
          {/* Nome fantasia */}
          <div className="space-y-1">
            <Label htmlFor="nomeAgencia" className="text-xs font-medium text-[#64748B]">Nome da Agência *</Label>
            <Input id="nomeAgencia" placeholder="Minha Agência de Viagens" value={data.nomeAgencia} onChange={(e) => updateData({ nomeAgencia: e.target.value })} className="h-9 text-sm" />
            <FieldError field="nomeAgencia" />
          </div>

          {/* CNPJ | CEP */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="cnpj" className="text-xs font-medium text-[#64748B]">CNPJ *</Label>
              <Input id="cnpj" placeholder="00.000.000/0001-00" value={data.cnpj} onChange={(e) => updateData({ cnpj: maskCNPJ(e.target.value) })} className="h-9 text-sm" />
              <FieldError field="cnpj" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cep" className="text-xs font-medium text-[#64748B]">CEP *</Label>
              <Input id="cep" placeholder="00000-000" value={data.cep} onChange={(e) => { updateData({ cep: maskCEP(e.target.value) }); setCepError(null); }} onBlur={handleCepBlur} className="h-9 text-sm" maxLength={9} />
              <FieldError field="cep" />
              {cepError && <p className="text-xs text-red-500 mt-0.5">{cepError}</p>}
            </div>
          </div>

          {/* Telefone | Nome responsável */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="telefone" className="text-xs font-medium text-[#64748B]">Telefone *</Label>
              <Input id="telefone" placeholder="(11) 99999-9999" value={data.telefone} onChange={(e) => updateData({ telefone: maskTelefone(e.target.value) })} className="h-9 text-sm" />
              <FieldError field="telefone" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="nomeAdmin" className="text-xs font-medium text-[#64748B]">Nome do Responsável *</Label>
              <Input id="nomeAdmin" placeholder="João Silva" value={data.nomeAdmin} onChange={(e) => updateData({ nomeAdmin: e.target.value })} className="h-9 text-sm" />
              <FieldError field="nomeAdmin" />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1">
            <Label htmlFor="email" className="text-xs font-medium text-[#64748B]">Email *</Label>
            <Input id="email" type="email" placeholder="seu@email.com" value={data.email} onChange={(e) => updateData({ email: e.target.value })} className="h-9 text-sm" />
            <FieldError field="email" />
          </div>

          {/* Senha | Confirmar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="senha" className="text-xs font-medium text-[#64748B]">Senha *</Label>
              <div className="relative">
                <Input id="senha" type={showPassword ? "text" : "password"} placeholder="••••••••" value={data.senha} onChange={(e) => updateData({ senha: e.target.value })} className="pr-10 h-9 text-sm" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A] transition-colors">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <FieldError field="senha" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="confirmarSenha" className="text-xs font-medium text-[#64748B]">Confirmar Senha *</Label>
              <div className="relative">
                <Input id="confirmarSenha" type={showConfirm ? "text" : "password"} placeholder="••••••••" value={data.confirmarSenha} onChange={(e) => updateData({ confirmarSenha: e.target.value })} className="pr-10 h-9 text-sm" />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A] transition-colors">
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <FieldError field="confirmarSenha" />
            </div>
          </div>

          <p className="text-[11px] text-[#94A3B8] leading-tight">
            Ao continuar, você aceita os{" "}
            <a href="/termos" target="_blank" className="text-[#2563EB] hover:underline">Termos de Uso</a> e{" "}
            <a href="/privacidade" target="_blank" className="text-[#2563EB] hover:underline">Política de Privacidade</a>
          </p>

          <Button
            onClick={handleNext}
            className="w-full h-12 rounded-xl font-semibold text-[15px] text-white shadow-[0_4px_16px_rgba(37,99,235,0.3)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.4)] hover:-translate-y-0.5 transition-all duration-200"
            style={{ background: "linear-gradient(135deg, #2563EB, #06B6D4)" }}
          >
            Continuar →
          </Button>

          <p className="text-center text-sm text-[#64748B]">
            Já tem uma conta?{" "}
            <Link to="/login" className="text-[#2563EB] font-medium hover:underline">Fazer login</Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
