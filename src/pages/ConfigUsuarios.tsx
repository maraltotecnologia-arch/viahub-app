import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { useTheme } from "@/contexts/ThemeContext";
import useAgenciaId from "@/hooks/useAgenciaId";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ConfirmDialog from "@/components/ConfirmDialog";
import { validarTelefone, validarEmail, validarSenha } from "@/lib/validators";
import { formatError } from "@/lib/errors";

const CARGO_LABELS: Record<string, string> = { admin: "Administrador", agente: "Agente", financeiro: "Financeiro", superadmin: "Superadmin" };

export default function ConfigUsuarios() {
  const { user } = useAuth();
  const { isDark } = useTheme();
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
    queryKey: ["agencia-usuarios-config", agenciaId], enabled: !!agenciaId,
    queryFn: async () => { const { data, error } = await supabase.from("usuarios").select("id, nome, email, cargo, ativo").eq("agencia_id", agenciaId!); if (error) throw error; return data; },
  });

  const handleAdd = async () => {
    if (!agenciaId) return;
    if (!addForm.nome.trim() || addForm.nome.trim().length < 3) { toast({ title: "Nome deve ter no mínimo 3 caracteres", variant: "destructive" }); return; }
    if (!validarEmail(addForm.email)) { toast({ title: "Email inválido", variant: "destructive" }); return; }
    const senhaResult = validarSenha(addForm.senha);
    if (!senhaResult.valida) { toast({ title: senhaResult.erros[0], variant: "destructive" }); return; }
    setSaving(true);
    try {
      const { data: existente } = await supabase.from("usuarios").select("id").eq("email", addForm.email).maybeSingle();
      if (existente) { toast({ title: formatError("USR005"), variant: "destructive" }); setSaving(false); return; }
      const { data: session } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.session?.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify({ email: addForm.email, password: addForm.senha, nome: addForm.nome, agencia_id: agenciaId }),
      });
      const result = await res.json();
      if (!res.ok) { toast({ title: formatError(result.code || "USR001"), variant: "destructive" }); setSaving(false); return; }
      const { error: insertError } = await supabase.from("usuarios").insert({ id: result.user.id, agencia_id: agenciaId, nome: addForm.nome, email: addForm.email, cargo: addForm.cargo });
      if (insertError) { toast({ title: formatError("USR001"), variant: "destructive" }); setSaving(false); return; }
      if (addForm.whatsapp && addForm.telefone) {
        if (!validarTelefone(addForm.telefone)) { toast({ title: "Número de WhatsApp inválido", variant: "destructive" }); }
        else { const msg = `Olá ${addForm.nome}!\nVocê foi adicionado ao ViaHub.\nEmail: ${addForm.email}\nSenha: ${addForm.senha}\nAcesse: ${window.location.origin}`; window.open(`https://wa.me/55${addForm.telefone.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`, "_blank"); }
      }
      toast({ title: "Usuário criado com sucesso!" }); queryClient.invalidateQueries({ queryKey: ["agencia-usuarios-config"] }); setAddOpen(false); setAddForm({ nome: "", email: "", cargo: "agente", senha: "", whatsapp: false, telefone: "" });
    } catch (err: any) { toast({ title: "Erro inesperado", variant: "destructive" }); }
    setSaving(false);
  };

  const handleEdit = async () => {
    if (!editUser) return;
    if (editUser.id === user?.id && editForm.cargo !== editUser.cargo) { toast({ title: "Você não pode alterar seu próprio cargo.", variant: "destructive" }); return; }
    if (!editForm.nome.trim() || editForm.nome.trim().length < 3) { toast({ title: "Nome deve ter no mínimo 3 caracteres", variant: "destructive" }); return; }
    if (editUser.cargo === "admin" && editForm.cargo !== "admin") { const adminCount = usuarios?.filter((u) => u.cargo === "admin" && u.ativo).length || 0; if (adminCount <= 1) { toast({ title: "A agência precisa de pelo menos 1 administrador ativo.", variant: "destructive" }); return; } }
    setSaving(true);
    const { error } = await supabase.from("usuarios").update({ nome: editForm.nome, cargo: editForm.cargo }).eq("id", editUser.id);
    if (error) { toast({ title: formatError("USR002"), variant: "destructive" }); } else { toast({ title: "Usuário atualizado!" }); queryClient.invalidateQueries({ queryKey: ["agencia-usuarios-config"] }); setEditOpen(false); }
    setSaving(false);
  };

  const handleToggleConfirm = async () => {
    if (!confirmUser) return;
    const { error } = await supabase.from("usuarios").update({ ativo: !confirmUser.ativo }).eq("id", confirmUser.id);
    if (error) { toast({ title: "Erro ao atualizar", variant: "destructive" }); } else { queryClient.invalidateQueries({ queryKey: ["agencia-usuarios-config"] }); toast({ title: confirmUser.ativo ? "Usuário desativado" : "Usuário ativado" }); }
    setConfirmUser(null);
  };

  const toggleAtivo = (u: any) => {
    if (u.id === user?.id) { toast({ title: "Você não pode desativar sua própria conta.", variant: "destructive" }); return; }
    if (u.cargo === "admin" && u.ativo) { const adminCount = usuarios?.filter((usr) => usr.cargo === "admin" && usr.ativo).length || 0; if (adminCount <= 1) { toast({ title: "A agência precisa de pelo menos 1 administrador ativo.", variant: "destructive" }); return; } }
    setConfirmUser(u);
  };

  const openEdit = (u: any) => { setEditUser(u); setEditForm({ nome: u.nome || "", cargo: u.cargo || "agente" }); setEditOpen(true); };

  if (isLoading) return <div className="space-y-4 max-w-3xl mx-auto"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full rounded-2xl" /></div>;

  const total = usuarios?.length || 0;

  return (
    <div className="space-y-4 max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold font-display tracking-tight text-on-surface">Usuários da Agência</h2>
          <p className="text-sm text-on-surface-variant font-body mt-1">{total} usuários cadastrados</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <UserPlus className="h-4 w-4 mr-1" /> Adicionar Usuário
        </Button>
      </div>

      <div className="bg-surface-container-lowest rounded-2xl shadow-ambient overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Email</TableHead><TableHead>Cargo</TableHead><TableHead>Status</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {usuarios?.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium text-on-surface">{u.nome || "-"}</TableCell>
                <TableCell className="text-on-surface-variant">{u.email || "-"}</TableCell>
                <TableCell>
                  <Badge variant={u.cargo === "admin" ? "default" : u.cargo === "superadmin" ? "default" : "muted"} className={
                    u.cargo === "superadmin" ? "bg-[#7c3aed]/10 text-[#7c3aed]" : u.cargo === "admin" ? "bg-primary/10 text-primary" : ""
                  }>
                    {CARGO_LABELS[u.cargo || "agente"] || u.cargo}
                  </Badge>
                </TableCell>
                <TableCell><Badge variant={u.ativo ? "success" : "muted"}>{u.ativo ? "Ativo" : "Inativo"}</Badge></TableCell>
                <TableCell className="space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>Editar</Button>
                  <Button variant="outline" size="sm" className={u.ativo ? "text-error border-error/20 hover:bg-error-container/20" : "text-secondary border-secondary/20 hover:bg-secondary-container/20"} onClick={() => toggleAtivo(u)}>
                    {u.ativo ? "Desativar" : "Ativar"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Add Modal */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-headline">Adicionar Usuário</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label className="text-xs font-medium font-label text-on-surface-variant uppercase tracking-wide">Nome Completo</Label><Input value={addForm.nome} onChange={(e) => setAddForm({ ...addForm, nome: e.target.value })} required /></div>
            <div className="space-y-1.5"><Label className="text-xs font-medium font-label text-on-surface-variant uppercase tracking-wide">Email</Label><Input type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} required /><p className="text-xs text-on-surface-variant font-body">O usuário poderá fazer login imediatamente.</p></div>
            <div className="space-y-1.5"><Label className="text-xs font-medium font-label text-on-surface-variant uppercase tracking-wide">Cargo</Label><Select value={addForm.cargo} onValueChange={(v) => setAddForm({ ...addForm, cargo: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="agente">Agente</SelectItem><SelectItem value="admin">Administrador</SelectItem><SelectItem value="financeiro">Financeiro</SelectItem></SelectContent></Select></div>
            <div className="space-y-1.5"><Label className="text-xs font-medium font-label text-on-surface-variant uppercase tracking-wide">Senha Temporária</Label><Input type="password" placeholder="Mínimo 6 caracteres" value={addForm.senha} onChange={(e) => setAddForm({ ...addForm, senha: e.target.value })} required /></div>
            <div className="flex items-center gap-2"><Checkbox id="whatsapp" checked={addForm.whatsapp} onCheckedChange={(v) => setAddForm({ ...addForm, whatsapp: !!v })} /><Label htmlFor="whatsapp" className="cursor-pointer text-sm font-body">Enviar credenciais via WhatsApp</Label></div>
            {addForm.whatsapp && <div className="space-y-1.5"><Label className="text-xs font-medium font-label text-on-surface-variant uppercase tracking-wide">Telefone</Label><Input placeholder="11999999999" value={addForm.telefone} onChange={(e) => setAddForm({ ...addForm, telefone: e.target.value })} /></div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button onClick={handleAdd} disabled={saving || !addForm.nome || !addForm.email || !addForm.senha}>{saving ? "Salvando..." : "Adicionar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-headline">Editar Usuário</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label className="text-xs font-medium font-label text-on-surface-variant uppercase tracking-wide">Email</Label><p className="text-sm text-on-surface-variant font-body">{editUser?.email}</p></div>
            <div className="space-y-1.5"><Label className="text-xs font-medium font-label text-on-surface-variant uppercase tracking-wide">Nome</Label><Input value={editForm.nome} onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs font-medium font-label text-on-surface-variant uppercase tracking-wide">Cargo</Label><Select value={editForm.cargo} onValueChange={(v) => setEditForm({ ...editForm, cargo: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="agente">Agente</SelectItem><SelectItem value="admin">Administrador</SelectItem><SelectItem value="financeiro">Financeiro</SelectItem></SelectContent></Select></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleEdit} disabled={saving}>{saving ? "Salvando..." : "Salvar Alterações"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!confirmUser} onOpenChange={(open) => { if (!open) setConfirmUser(null); }} title={confirmUser?.ativo ? "Desativar usuário" : "Ativar usuário"} description={confirmUser?.ativo ? `Tem certeza que deseja desativar ${confirmUser?.nome || "este usuário"}?` : `Tem certeza que deseja reativar ${confirmUser?.nome || "este usuário"}?`} confirmLabel={confirmUser?.ativo ? "Desativar" : "Ativar"} variant={confirmUser?.ativo ? "destructive" : "default"} onConfirm={handleToggleConfirm} />
    </div>
  );
}
