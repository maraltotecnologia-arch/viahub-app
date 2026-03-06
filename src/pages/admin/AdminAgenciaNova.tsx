import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import useUserRole from "@/hooks/useUserRole";
import { validarCNPJ, validarTelefone } from "@/lib/validators";

const planos = [
  { value: "starter", label: "Starter — R$397/mês" },
  { value: "pro", label: "Pro — R$697/mês" },
  { value: "elite", label: "Elite — R$1.997/mês" },
];

function gerarSenha() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export default function AdminAgenciaNova() {
  const navigate = useNavigate();
  const { isSuperadmin, loading: roleLoading } = useUserRole();
  const [saving, setSaving] = useState(false);

  const [nomeFantasia, setNomeFantasia] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [emailAgencia, setEmailAgencia] = useState("");
  const [telefone, setTelefone] = useState("");
  const [plano, setPlano] = useState("starter");
  const [emailAdmin, setEmailAdmin] = useState("");
  const [senha, setSenha] = useState(gerarSenha());
  const [enviarWhatsapp, setEnviarWhatsapp] = useState(false);
  const [cnpjError, setCnpjError] = useState("");

  useEffect(() => {
    if (!roleLoading && !isSuperadmin) {
      toast.error("Acesso não autorizado");
      navigate("/dashboard", { replace: true });
    }
  }, [roleLoading, isSuperadmin, navigate]);

  if (roleLoading) {
    return <div className="p-6"><Skeleton className="h-8 w-48" /></div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeFantasia || !emailAgencia || !emailAdmin || !senha) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    setSaving(true);

    try {
      // Verificar se email já existe
      const { data: existente } = await supabase
        .from("usuarios")
        .select("id")
        .eq("email", emailAdmin)
        .maybeSingle();

      if (existente) {
        throw new Error("Este email já está cadastrado");
      }

      // Etapa 1: Criar usuário via edge function (email já confirmado)
      const { data: session } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ email: emailAdmin, password: senha }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Erro ao criar usuário de acesso");
      }

      const novoUserId = result.user?.id;
      if (!novoUserId) throw new Error("Erro ao criar usuário de acesso");

      // Etapa 2: Criar agência usando o cliente do superadmin logado (RLS permite)
      const { data: agencia, error: agError } = await supabase
        .from("agencias")
        .insert({
          nome_fantasia: nomeFantasia,
          cnpj: cnpj || null,
          email: emailAgencia,
          telefone: telefone || null,
          plano: plano || "starter",
          onboarding_completo: false,
          ativo: true,
        })
        .select()
        .single();

      if (agError) {
        throw new Error("Erro ao cadastrar agência");
      }

      // Etapa 3: Criar registro de usuário vinculado à agência
      const { error: userError } = await supabase
        .from("usuarios")
        .insert({
          id: novoUserId,
          agencia_id: agencia.id,
          nome: nomeFantasia,
          email: emailAdmin,
          cargo: "admin",
        });

      if (userError) {
        // Rollback: remover agência criada
        await supabase.from("agencias").delete().eq("id", agencia.id);
        throw new Error("Erro ao vincular usuário à agência");
      }

      toast.success("Agência cadastrada com sucesso!");

      if (enviarWhatsapp && telefone) {
        if (!validarTelefone(telefone)) {
          toast.error("Número de WhatsApp inválido. Digite DDD + número (ex: 54999999999)");
        } else {
          const tel = telefone.replace(/\D/g, "");
          const telFormatado = tel.startsWith("55") ? tel : `55${tel}`;
          const msg = encodeURIComponent(
            `Olá! Seu acesso ao ViaHub foi criado.\nEmail: ${emailAdmin}\nSenha: ${senha}\nAcesse: ${window.location.origin}`
          );
          window.open(`https://wa.me/${telFormatado}?text=${msg}`, "_blank");
        }
      }

      navigate(`/admin/agencias/${agencia.id}`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar agência");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <h2 className="text-2xl font-bold">Nova Agência</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Dados da Agência</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nome Fantasia *</Label>
              <Input value={nomeFantasia} onChange={(e) => setNomeFantasia(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>CNPJ</Label>
              <Input
                value={cnpj}
                onChange={(e) => { setCnpj(e.target.value); setCnpjError(""); }}
                onBlur={() => {
                  const v = cnpj.replace(/\D/g, "");
                  if (!v) { setCnpjError(""); return; }
                  if (!validarCNPJ(cnpj)) setCnpjError("CNPJ inválido");
                  else setCnpjError("");
                }}
                className={cnpjError ? "border-destructive" : cnpj.replace(/\D/g, "").length === 14 && !cnpjError ? "border-green-500" : ""}
              />
              {cnpjError && <p className="text-xs text-destructive">{cnpjError}</p>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email da Agência *</Label>
                <Input type="email" value={emailAgencia} onChange={(e) => setEmailAgencia(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Plano Contratado</CardTitle></CardHeader>
          <CardContent>
            <Select value={plano} onValueChange={setPlano}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {planos.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Dados de Acesso</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Email do Administrador *</Label>
              <Input type="email" value={emailAdmin} onChange={(e) => setEmailAdmin(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Senha Temporária</Label>
              <div className="flex gap-2">
                <Input value={senha} onChange={(e) => setSenha(e.target.value)} required />
                <Button type="button" variant="outline" onClick={() => setSenha(gerarSenha())}>Gerar</Button>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="whatsapp"
                checked={enviarWhatsapp}
                onCheckedChange={(v) => setEnviarWhatsapp(v === true)}
              />
              <label htmlFor="whatsapp" className="text-sm cursor-pointer">
                Enviar credenciais via WhatsApp
              </label>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Criar Agência"}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate("/admin/agencias")}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
