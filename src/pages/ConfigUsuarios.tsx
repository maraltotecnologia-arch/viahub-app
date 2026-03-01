import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import useAgenciaId from "@/hooks/useAgenciaId";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ConfirmDialog from "@/components/ConfirmDialog";
import { validarTelefone } from "@/lib/validators";

const CARGO_LABELS: Record<string, string> = {
  admin: "Administrador",
  agente: "Agente",
  financeiro: "Financeiro",
  superadmin: "Superadmin",
};

const CARGO_CLASSES: Record<string, string> = {
  superadmin: "bg-purple-50 text-purple-700 border border-purple-200",
  admin: "bg-blue-50 text-blue-700 border border-blue-200",
  agente: "bg-green-50 text-green-700 border border-green-200",
  financeiro: "bg-amber-50 text-amber-700 border border-amber-200",
};

export default function ConfigUsuarios() {
  const { user } = useAuth();
  const agenciaId = useAgenciaId();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [addForm, setAddForm] = useState({ nome: "", email: "", cargo: "agente", senha: "", whatsapp: false, telefone: "" });
  const [editForm, setEditForm] = useState({ nome: "", cargo: "" });
  const [saving, setSaving] = useState(false);
  const [confirmUser, setConfirmUser] = useState<any>(null);

  const { data: usuarios, isLoading } = useQuery({
    queryKey: ["agencia-usuarios-config", agenciaId],
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

  const handleAdd = async () => {
    if (!agenciaId) return;
    if (addForm.senha.length < 6) {
      toast({ title: "A senha deve ter no mínimo 6 caracteres", variant: "destructive" });
      return;
    }
    setSaving(true);

    try {
      // Verificar se email já existe na tabela usuarios
      const { data: existente } = await supabase
        .from("usuarios")
        .select("id")
        .eq("email", addForm.email)
        .maybeSingle();

      if (existente) {
        toast({ title: "Este email já está cadastrado.", variant: "destructive" });
        setSaving(false);
        return;
      }

      // Criar usuário via edge function (email já confirmado)
      const { data: session } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ email: addForm.email, password: addForm.senha }),
      });

      const result = await res.json();
      if (!res.ok) {
        toast({ title: "Erro ao criar usuário", description: result.error, variant: "destructive" });
        setSaving(false);
        return;
      }

      const { error: insertError } = await supabase.from("usuarios").insert({
        id: result.user.id,
        agencia_id: agenciaId,
        nome: addForm.nome,
        email: addForm.email,
        cargo: addForm.cargo,
      });

      if (insertError) {
        toast({ title: "Erro ao registrar usuário", description: insertError.message, variant: "destructive" });
        setSaving(false);
        return;
      }

      if (addForm.whatsapp && addForm.telefone) {
        if (!validarTelefone(addForm.telefone)) {
          toast({ title: "Número de WhatsApp inválido. Digite DDD + número (ex: 54999999999)", variant: "destructive" });
        } else {
          const msg = `Olá ${addForm.nome}!\nVocê foi adicionado ao ViaHub.\nEmail: ${addForm.email}\nSenha: ${addForm.senha}\nAcesse: ${window.location.origin}`;
          window.open(`https://wa.me/55${addForm.telefone.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`, "_blank");
        }
      }

      toast({ title: "Usuário criado com sucesso!", description: "O acesso está ativo imediatamente. Envie as credenciais ao usuário." });
      queryClient.invalidateQueries({ queryKey: ["agencia-usuarios-config"] });
      setAddOpen(false);
      setAddForm({ nome: "", email: "", cargo: "agente", senha: "", whatsapp: false, telefone: "" });
    } catch (err: any) {
      toast({ title: "Erro inesperado", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleEdit = async () => {
    if (!editUser) return;
    setSaving(true);
    const { error } = await supabase.from("usuarios").update({ nome: editForm.nome, cargo: editForm.cargo }).eq("id", editUser.id);
    if (error) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Usuário atualizado!" });
      queryClient.invalidateQueries({ queryKey: ["agencia-usuarios-config"] });
      setEditOpen(false);
    }
    setSaving(false);
  };

  const handleToggleConfirm = async () => {
    if (!confirmUser) return;
    const { error } = await supabase.from("usuarios").update({ ativo: !confirmUser.ativo }).eq("id", confirmUser.id);
    if (error) {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["agencia-usuarios-config"] });
      toast({ title: confirmUser.ativo ? "Usuário desativado" : "Usuário ativado" });
    }
    setConfirmUser(null);
  };

  const toggleAtivo = (u: any) => {
    if (u.id === user?.id) {
      toast({ title: "Você não pode desativar sua própria conta.", variant: "destructive" });
      return;
    }
    setConfirmUser(u);
  };

  const openEdit = (u: any) => {
    setEditUser(u);
    setEditForm({ nome: u.nome || "", cargo: u.cargo || "agente" });
    setEditOpen(true);
  };

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Usuários da Agência</h2>
        <Button variant="gradient" onClick={() => setAddOpen(true)}>
          <UserPlus className="h-4 w-4 mr-1" /> Adicionar Usuário
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios?.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.nome || "-"}</TableCell>
                  <TableCell>{u.email || "-"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={CARGO_CLASSES[u.cargo || "agente"] || ""}>
                      {CARGO_LABELS[u.cargo || "agente"] || u.cargo}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.ativo ? "success" : "muted"}>
                      {u.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>Editar</Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className={u.ativo
                        ? "border-red-300 text-red-500 hover:bg-red-50"
                        : "border-emerald-300 text-emerald-600 hover:bg-emerald-50"
                      }
                      onClick={() => toggleAtivo(u)}
                    >
                      {u.ativo ? "Desativar" : "Ativar"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add User Modal */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar Usuário</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input value={addForm.nome} onChange={(e) => setAddForm({ ...addForm, nome: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} required />
              <p className="text-xs text-muted-foreground">O usuário poderá fazer login imediatamente com as credenciais criadas.</p>
            </div>
            <div className="space-y-2">
              <Label>Cargo</Label>
              <Select value={addForm.cargo} onValueChange={(v) => setAddForm({ ...addForm, cargo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="agente">Agente</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="financeiro">Financeiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Senha Temporária</Label>
              <Input type="password" placeholder="Mínimo 6 caracteres" value={addForm.senha} onChange={(e) => setAddForm({ ...addForm, senha: e.target.value })} required />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="whatsapp"
                checked={addForm.whatsapp}
                onCheckedChange={(v) => setAddForm({ ...addForm, whatsapp: !!v })}
              />
              <Label htmlFor="whatsapp" className="cursor-pointer">Enviar credenciais via WhatsApp</Label>
            </div>
            {addForm.whatsapp && (
              <div className="space-y-2">
                <Label>Telefone (WhatsApp)</Label>
                <Input placeholder="11999999999" value={addForm.telefone} onChange={(e) => setAddForm({ ...addForm, telefone: e.target.value })} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button variant="gradient" onClick={handleAdd} disabled={saving || !addForm.nome || !addForm.email || !addForm.senha}>
              {saving ? "Salvando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Usuário</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <p className="text-sm text-muted-foreground">{editUser?.email}</p>
            </div>
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={editForm.nome} onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Cargo</Label>
              <Select value={editForm.cargo} onValueChange={(v) => setEditForm({ ...editForm, cargo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="agente">Agente</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="financeiro">Financeiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button variant="gradient" onClick={handleEdit} disabled={saving}>
              {saving ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmUser}
        onOpenChange={(open) => { if (!open) setConfirmUser(null); }}
        title={confirmUser?.ativo ? "Desativar usuário" : "Ativar usuário"}
        description={confirmUser?.ativo
          ? `Tem certeza que deseja desativar ${confirmUser?.nome || "este usuário"}? Ele não poderá mais acessar o sistema.`
          : `Tem certeza que deseja reativar ${confirmUser?.nome || "este usuário"}?`
        }
        confirmLabel={confirmUser?.ativo ? "Desativar" : "Ativar"}
        variant={confirmUser?.ativo ? "destructive" : "default"}
        onConfirm={handleToggleConfirm}
      />
    </div>
  );
}
