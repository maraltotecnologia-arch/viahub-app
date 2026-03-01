import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import useAgenciaId from "@/hooks/useAgenciaId";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { validarCNPJ } from "@/lib/validators";
import { type HorarioFuncionamento, DEFAULT_HORARIO } from "@/lib/business-days";

export default function ConfigAgencia() {
  const { user, refreshUser } = useAuth();
  const agenciaId = useAgenciaId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nome_fantasia: "", cnpj: "", email: "", telefone: "" });
  const [uploading, setUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cnpjError, setCnpjError] = useState<string | null>(null);
  const [cnpjValid, setCnpjValid] = useState(false);

  const { data: agencia, isLoading } = useQuery({
    queryKey: ["agencia", agenciaId],
    enabled: !!agenciaId,
    queryFn: async () => {
      const { data, error } = await supabase.from("agencias").select("*").eq("id", agenciaId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: usuarios } = useQuery({
    queryKey: ["agencia-usuarios", agenciaId],
    enabled: !!agenciaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("usuarios")
        .select("id, nome, email, cargo, ativo")
        .eq("agencia_id", agenciaId!);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (agencia) {
      setForm({
        nome_fantasia: agencia.nome_fantasia || "",
        cnpj: agencia.cnpj || "",
        email: agencia.email || "",
        telefone: agencia.telefone || "",
      });
      if ((agencia as any).logo_url) {
        setLogoPreview((agencia as any).logo_url);
      }
    }
  }, [agencia]);

  const handleSave = async () => {
    if (!agenciaId) return;
    setSaving(true);
    const { error } = await supabase.from("agencias").update({
      nome_fantasia: form.nome_fantasia,
      cnpj: form.cnpj || null,
      email: form.email || null,
      telefone: form.telefone || null,
    }).eq("id", agenciaId);
    if (error) { toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" }); } else {
      toast({ title: "Dados salvos com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["agencia"] });
      refreshUser();
    }
    setSaving(false);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !agenciaId) return;

    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast({ title: "Formato inválido", description: "Aceitos: JPG, PNG, WEBP", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Tamanho máximo: 2MB", variant: "destructive" });
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${agenciaId}/logo.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("logos-agencias")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast({ title: "Erro no upload", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("logos-agencias")
      .getPublicUrl(path);

    const logoUrl = publicUrlData.publicUrl;

    const { error: updateError } = await supabase
      .from("agencias")
      .update({ logo_url: logoUrl } as any)
      .eq("id", agenciaId);

    if (updateError) {
      toast({ title: "Erro ao salvar URL", description: updateError.message, variant: "destructive" });
    } else {
      setLogoPreview(`${logoUrl}?t=${Date.now()}`);
      queryClient.invalidateQueries({ queryKey: ["agencia"] });
      toast({ title: "Logo atualizado com sucesso!" });
    }
    setUploading(false);
  };

  const toggleUsuario = async (userId: string, ativo: boolean) => {
    const { error } = await supabase.from("usuarios").update({ ativo: !ativo }).eq("id", userId);
    if (error) { toast({ title: "Erro ao atualizar", variant: "destructive" }); } else {
      queryClient.invalidateQueries({ queryKey: ["agencia-usuarios"] });
      toast({ title: ativo ? "Usuário desativado" : "Usuário ativado" });
    }
  };

  if (isLoading) return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="space-y-6 max-w-3xl animate-fade-in">
      <h2 className="text-2xl font-bold">Configurações da Agência</h2>

      {/* Logo */}
      <Card>
        <CardHeader><CardTitle className="text-base">Logo da Agência</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            {logoPreview ? (
              <div className="relative">
                <img src={logoPreview} alt="Logo da agência" className="max-w-[120px] max-h-[60px] object-contain rounded border" />
                <button
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5"
                  onClick={() => { setLogoPreview(null); }}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="w-[120px] h-[60px] border-2 border-dashed rounded flex items-center justify-center text-muted-foreground text-xs">
                Sem logo
              </div>
            )}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                className="hidden"
                onChange={handleLogoUpload}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="h-4 w-4 mr-1" />
                {uploading ? "Enviando..." : logoPreview ? "Trocar Logo" : "Enviar Logo"}
              </Button>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG ou WEBP. Máx 2MB.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Dados da Agência</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Nome Fantasia</Label><Input value={form.nome_fantasia} onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>CNPJ</Label>
              <Input
                value={form.cnpj}
                onChange={(e) => { setForm({ ...form, cnpj: e.target.value }); setCnpjError(null); setCnpjValid(false); }}
                onBlur={() => {
                  const v = form.cnpj.replace(/\D/g, "");
                  if (!v) { setCnpjError(null); setCnpjValid(false); return; }
                  if (validarCNPJ(form.cnpj)) { setCnpjError(null); setCnpjValid(true); }
                  else { setCnpjError("CNPJ inválido"); setCnpjValid(false); }
                }}
                className={cnpjError ? "border-destructive" : cnpjValid ? "border-green-500" : ""}
              />
              {cnpjError && <p className="text-xs text-destructive">{cnpjError}</p>}
            </div>
            <div className="space-y-2"><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-2"><Label>Telefone</Label><Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
          </div>
          <Button variant="gradient" className="mt-4" onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar Alterações"}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Usuários da Conta</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios?.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.nome || "-"}</TableCell>
                  <TableCell>{u.email || "-"}</TableCell>
                  <TableCell>{u.cargo || "-"}</TableCell>
                  <TableCell><Badge variant={u.ativo ? "success" : "muted"}>{u.ativo ? "Ativo" : "Inativo"}</Badge></TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => toggleUsuario(u.id, u.ativo ?? true)}>
                      {u.ativo ? "Desativar" : "Ativar"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <HorarioFuncionamentoSection agenciaId={agenciaId} horarioInicial={(agencia as any)?.horario_funcionamento} />
      <AlterarSenhaSection />
    </div>
  );
}

function AlterarSenhaSection() {
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const handleAlterar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (novaSenha.length < 6) {
      setError("A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }
    if (novaSenha !== confirmar) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password: novaSenha });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    toast({ title: "Senha alterada com sucesso!" });
    setSenhaAtual("");
    setNovaSenha("");
    setConfirmar("");
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Segurança — Alterar Senha</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleAlterar} className="space-y-4 max-w-sm">
          <div className="space-y-2">
            <Label>Senha Atual</Label>
            <Input type="password" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Nova Senha</Label>
            <Input type="password" placeholder="Mínimo 6 caracteres" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Confirmar Nova Senha</Label>
            <Input type="password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} required />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button variant="gradient" disabled={loading}>{loading ? "Salvando..." : "Alterar Senha"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}

const DIAS_LABELS: Record<string, string> = {
  segunda: "Segunda-feira",
  terca: "Terça-feira",
  quarta: "Quarta-feira",
  quinta: "Quinta-feira",
  sexta: "Sexta-feira",
  sabado: "Sábado",
  domingo: "Domingo",
};

const DIAS_ORDER = ["segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"];

function HorarioFuncionamentoSection({ agenciaId, horarioInicial }: { agenciaId: string | null; horarioInicial?: any }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [horario, setHorario] = useState<HorarioFuncionamento>(
    (horarioInicial as HorarioFuncionamento) || DEFAULT_HORARIO
  );

  useEffect(() => {
    if (horarioInicial) {
      setHorario(horarioInicial as HorarioFuncionamento);
    }
  }, [horarioInicial]);

  const updateDia = (dia: string, field: string, value: any) => {
    setHorario((prev) => ({
      ...prev,
      [dia]: { ...prev[dia], [field]: value },
    }));
  };

  const handleSave = async () => {
    if (!agenciaId) return;
    setSaving(true);
    const { error } = await supabase
      .from("agencias")
      .update({ horario_funcionamento: horario as any })
      .eq("id", agenciaId);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Horário salvo com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["agencia"] });
    }
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Horário de Funcionamento</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-3">
          {DIAS_ORDER.map((dia) => {
            const d = horario[dia];
            return (
              <div key={dia} className="flex items-center gap-4">
                <div className="flex items-center gap-2 w-40">
                  <Checkbox
                    checked={d.ativo}
                    onCheckedChange={(v) => updateDia(dia, "ativo", !!v)}
                  />
                  <span className={`text-sm ${d.ativo ? "font-medium" : "text-muted-foreground"}`}>
                    {DIAS_LABELS[dia]}
                  </span>
                </div>
                {d.ativo ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      className="w-28"
                      value={d.inicio}
                      onChange={(e) => updateDia(dia, "inicio", e.target.value)}
                    />
                    <span className="text-muted-foreground text-sm">–</span>
                    <Input
                      type="time"
                      className="w-28"
                      value={d.fim}
                      onChange={(e) => updateDia(dia, "fim", e.target.value)}
                    />
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Fechado</span>
                )}
              </div>
            );
          })}
        </div>
        <Button variant="gradient" className="mt-4" onClick={handleSave} disabled={saving}>
          {saving ? "Salvando..." : "Salvar Horário"}
        </Button>
      </CardContent>
    </Card>
  );
}
