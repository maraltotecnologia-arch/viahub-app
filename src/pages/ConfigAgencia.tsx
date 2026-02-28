import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function ConfigAgencia() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nome_fantasia: "", cnpj: "", email: "", telefone: "" });

  const { data: agencia, isLoading } = useQuery({
    queryKey: ["agencia", user?.agencia_id],
    enabled: !!user?.agencia_id,
    queryFn: async () => {
      const { data, error } = await supabase.from("agencias").select("*").eq("id", user!.agencia_id!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: usuarios } = useQuery({
    queryKey: ["agencia-usuarios", user?.agencia_id],
    enabled: !!user?.agencia_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("usuarios")
        .select("id, nome, email, cargo, ativo")
        .eq("agencia_id", user!.agencia_id!);
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
    }
  }, [agencia]);

  const handleSave = async () => {
    if (!user?.agencia_id) return;
    setSaving(true);
    const { error } = await supabase.from("agencias").update({
      nome_fantasia: form.nome_fantasia,
      cnpj: form.cnpj || null,
      email: form.email || null,
      telefone: form.telefone || null,
    }).eq("id", user.agencia_id);
    if (error) { toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" }); } else {
      toast({ title: "Dados salvos com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["agencia"] });
      refreshUser();
    }
    setSaving(false);
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

      <Card>
        <CardHeader><CardTitle className="text-base">Dados da Agência</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Nome Fantasia</Label><Input value={form.nome_fantasia} onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })} /></div>
            <div className="space-y-2"><Label>CNPJ</Label><Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} /></div>
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
    </div>
  );
}
