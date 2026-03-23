import { useState } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Check } from "lucide-react";
import { validarTelefone, validarCNPJ, validarEmail, validarSenha } from "@/lib/validators";
import { maskTelefone, maskCNPJ, maskCEP } from "@/lib/masks";
import type { CadastroData } from "@/pages/Cadastro";

type Props = {
  data: CadastroData;
  updateData: (d: Partial<CadastroData>) => void;
  onNext: () => void;
};

type FieldErrors = Record<string, string>;

const STEPS = ["Dados", "Plano", "Confirmação"];

function Stepper({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2 mb-10 lg:mb-6 max-w-md mx-auto">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center gap-2 flex-1">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              i < current
                ? "bg-secondary text-white"
                : i === current
                ? "bg-primary text-white ring-4 ring-primary/15"
                : "bg-surface-container-high text-on-surface-variant"
            }`}>
              {i < current ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <span className={`text-xs font-medium font-label ${
              i <= current ? "text-on-surface" : "text-on-surface-variant"
            }`}>{label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`flex-1 h-px ${i < current ? "bg-primary" : "bg-outline-variant/20"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function CadastroStep1({ data, updateData, onNext }: Props) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);

  const handleCepBlur = async () => {
    const cepLimpo = data.cep.replace(/\D/g, "");
    if (cepLimpo.length !== 8) { setCepError("CEP deve ter 8 dígitos (PAG002)"); return; }
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const json = await res.json();
      if (json.erro) { setCepError("CEP não encontrado (PAG002)"); } else { setCepError(null); }
    } catch { setCepError("Não foi possível consultar o CEP. Verifique sua conexão. (SYS002)"); }
  };

  const validate = (): boolean => {
    const e: FieldErrors = {};
    if (!data.nomeAgencia.trim()) e.nomeAgencia = "Nome da agência é obrigatório";
    else if (data.nomeAgencia.trim().length < 3) e.nomeAgencia = "Nome deve ter no mínimo 3 caracteres";
    if (!data.cnpj.trim()) e.cnpj = "CNPJ é obrigatório";
    else if (!validarCNPJ(data.cnpj)) e.cnpj = "CNPJ inválido";
    if (!data.cep.trim()) e.cep = "CEP é obrigatório";
    else if (data.cep.replace(/\D/g, "").length !== 8) e.cep = "CEP inválido";
    if (cepError) e.cep = cepError;
    if (!data.nomeAdmin.trim()) e.nomeAdmin = "Seu nome é obrigatório";
    else if (data.nomeAdmin.trim().length < 3) e.nomeAdmin = "Nome deve ter no mínimo 3 caracteres";
    if (!data.email.trim()) e.email = "Email é obrigatório";
    else if (!validarEmail(data.email)) e.email = "Email inválido";
    if (!data.telefone.trim()) e.telefone = "Telefone é obrigatório";
    else if (!validarTelefone(data.telefone)) e.telefone = "Telefone inválido (DDD + número)";
    if (!data.senha) e.senha = "Senha é obrigatória";
    else { const senhaResult = validarSenha(data.senha); if (!senhaResult.valida) e.senha = senhaResult.erros[0]; }
    if (!data.confirmarSenha) e.confirmarSenha = "Confirme a senha";
    else if (data.senha !== data.confirmarSenha) e.confirmarSenha = "Senhas não conferem";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => { if (validate()) onNext(); };

  const FieldError = ({ field }: { field: string }) =>
    errors[field] ? <p className="text-xs text-error mt-0.5">{errors[field]}</p> : null;

  return (
    <div className="min-h-screen bg-surface grid lg:grid-cols-[420px_1fr]">
      {/* Left branding column */}
      <div className="hidden lg:flex flex-col bg-gradient-to-b from-[#0037b0] to-[#0a0e2e] p-12 text-white sticky top-0 h-screen justify-between">
        <div>
          <div className="flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
              <span className="text-sm font-bold text-white">VH</span>
            </div>
            <span className="text-xl font-bold font-display tracking-tight">ViaHub</span>
          </div>
          <h2 className="text-4xl font-extrabold font-display leading-tight mb-4">
            Sua agência no próximo nível.
          </h2>
          <p className="text-primary-fixed-dim/80 text-lg font-body max-w-xs">
            Orçamentos, pipeline, financeiro e IA em um só lugar.
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
          <p className="text-sm font-semibold text-white mb-1">✈️ Copiloto com IA</p>
          <p className="text-xs text-white/60 font-body">
            Gere cotações em segundos com inteligência artificial integrada ao seu fluxo de trabalho.
          </p>
        </div>

        <p className="text-white/30 text-xs font-label">© {new Date().getFullYear()} ViaHub · powered by Maralto</p>
      </div>

      {/* Right form column */}
      <div className="overflow-y-auto flex items-start justify-center px-6 py-12 lg:py-6">
        <div className="max-w-xl w-full mx-auto">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-container shadow-md shadow-primary/30 flex items-center justify-center">
              <span className="text-sm font-bold text-white">VH</span>
            </div>
            <span className="text-xl font-bold font-display tracking-tight text-on-surface">ViaHub</span>
          </div>

          <Stepper current={0} />

          <div className="bg-surface-container-lowest rounded-2xl p-7 lg:p-6 shadow-[0_8px_24px_0_rgba(13,28,45,0.08)] border border-outline-variant/15">
            <h2 className="text-2xl font-bold font-display tracking-tight text-on-surface mb-1">Crie sua conta</h2>
            <p className="text-sm text-on-surface-variant font-body mb-7 lg:mb-4">
              O ViaHub é exclusivo para pessoas jurídicas (CNPJ ou MEI)
            </p>

            <div className="space-y-4 lg:space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="nomeAgencia" className="text-xs font-medium font-label text-on-surface-variant uppercase tracking-wide">Nome da Agência *</Label>
                <Input id="nomeAgencia" placeholder="Minha Agência de Viagens" value={data.nomeAgencia} onChange={(e) => updateData({ nomeAgencia: e.target.value })} />
                <FieldError field="nomeAgencia" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cnpj" className="text-xs font-medium font-label text-on-surface-variant uppercase tracking-wide">CNPJ *</Label>
                  <Input id="cnpj" placeholder="00.000.000/0001-00" value={data.cnpj} onChange={(e) => updateData({ cnpj: maskCNPJ(e.target.value) })} />
                  <FieldError field="cnpj" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cep" className="text-xs font-medium font-label text-on-surface-variant uppercase tracking-wide">CEP *</Label>
                  <Input id="cep" placeholder="00000-000" value={data.cep} onChange={(e) => { updateData({ cep: maskCEP(e.target.value) }); setCepError(null); }} onBlur={handleCepBlur} maxLength={9} />
                  <FieldError field="cep" />
                  {cepError && <p className="text-xs text-error mt-0.5">{cepError}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="telefone" className="text-xs font-medium font-label text-on-surface-variant uppercase tracking-wide">Telefone *</Label>
                  <Input id="telefone" placeholder="(11) 99999-9999" value={data.telefone} onChange={(e) => updateData({ telefone: maskTelefone(e.target.value) })} />
                  <FieldError field="telefone" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nomeAdmin" className="text-xs font-medium font-label text-on-surface-variant uppercase tracking-wide">Nome do Responsável *</Label>
                  <Input id="nomeAdmin" placeholder="João Silva" value={data.nomeAdmin} onChange={(e) => updateData({ nomeAdmin: e.target.value })} />
                  <FieldError field="nomeAdmin" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium font-label text-on-surface-variant uppercase tracking-wide">Email *</Label>
                <Input id="email" type="email" placeholder="seu@email.com" value={data.email} onChange={(e) => updateData({ email: e.target.value })} />
                <FieldError field="email" />
              </div>

              {/* Password section */}
              <div className="bg-surface-container-low rounded-xl p-5 lg:p-4 space-y-4 lg:space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="senha" className="text-xs font-medium font-label text-on-surface-variant uppercase tracking-wide">Senha *</Label>
                    <div className="relative">
                      <Input id="senha" type={showPassword ? "text" : "password"} placeholder="••••••••" value={data.senha} onChange={(e) => updateData({ senha: e.target.value })} className="pr-10" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 hover:text-on-surface transition-colors">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <FieldError field="senha" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirmarSenha" className="text-xs font-medium font-label text-on-surface-variant uppercase tracking-wide">Confirmar Senha *</Label>
                    <div className="relative">
                      <Input id="confirmarSenha" type={showConfirm ? "text" : "password"} placeholder="••••••••" value={data.confirmarSenha} onChange={(e) => updateData({ confirmarSenha: e.target.value })} className="pr-10" />
                      <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 hover:text-on-surface transition-colors">
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <FieldError field="confirmarSenha" />
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-on-surface-variant/60 font-label leading-tight">
                Ao continuar, você aceita os{" "}
                <a href="/termos" target="_blank" className="text-primary hover:underline">Termos de Uso</a> e{" "}
                <a href="/privacidade" target="_blank" className="text-primary hover:underline">Política de Privacidade</a>
              </p>

              <Button onClick={handleNext} className="w-full">
                Continuar →
              </Button>

              <p className="text-center text-sm text-on-surface-variant font-body">
                Já tem uma conta?{" "}
                <Link to="/login" className="text-primary font-medium hover:underline">Fazer login</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
