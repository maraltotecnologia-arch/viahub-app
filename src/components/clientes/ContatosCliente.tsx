import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Mail, Phone, User } from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ConfirmDialog";

interface ContatosClienteProps {
  clienteId: string;
  agenciaId: string;
}

export default function ContatosCliente({ clienteId, agenciaId }: ContatosClienteProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: "", cargo: "", email: "", telefone: "", principal: false });
  const [saving, setSaving] = useState(false);

  const { data: contatos, isLoading } = useQuery({
    queryKey: ["contatos-cliente", clienteId],
    enabled: !!clienteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contatos_cliente" as any)
        .select("*")
        .eq("cliente_id", clienteId)
        .order("principal", { ascending: false })
        .order("criado_em", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  const handleAdd = async () => {
    if (!form.nome.trim()) return;
    setSaving(true);
    const isFirst = !contatos || contatos.length === 0;
    const { error } = await supabase.from("contatos_cliente" as any).insert({
      cliente_id: clienteId,
      agencia_id: agenciaId,
      nome: form.nome,
      cargo: form.cargo || null,
      email: form.email || null,
      telefone: form.telefone || null,
      principal: isFirst ? true : form.principal,
    } as any);

    if (error) {
      toast.error("Erro ao adicionar contato");
    } else {
      // If marking as principal, unset others
      if (form.principal && !isFirst) {
        const others = contatos?.filter((c: any) => c.principal) || [];
        for (const c of others) {
          await supabase.from("contatos_cliente" as any).update({ principal: false } as any).eq("id", c.id);
        }
      }
      toast.success("Contato adicionado");
      queryClient.invalidateQueries({ queryKey: ["contatos-cliente", clienteId] });
      setOpen(false);
      setForm({ nome: "", cargo: "", email: "", telefone: "", principal: false });
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("contatos_cliente" as any).delete().eq("id", deleteId);
    if (error) {
      toast.error("Erro ao remover contato");
    } else {
      toast.success("Contato removido");
      queryClient.invalidateQueries({ queryKey: ["contatos-cliente", clienteId] });
    }
    setDeleteId(null);
  };

  const contatoToDelete = contatos?.find((c: any) => c.id === deleteId);
  const isPrincipalUnico = contatoToDelete?.principal && contatos?.length === 1;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Contatos</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm"><Plus className="h-3 w-3 mr-1" /> Adicionar Contato</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Contato</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2"><Label>Nome *</Label><Input placeholder="Nome do contato" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
              <div className="space-y-2"><Label>Cargo</Label><Input placeholder="Ex: Diretor, Assistente" value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" placeholder="email@exemplo.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="space-y-2"><Label>Telefone</Label><Input placeholder="(00) 00000-0000" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
              {contatos && contatos.length > 0 && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="principal"
                    checked={form.principal}
                    onCheckedChange={(v) => setForm({ ...form, principal: !!v })}
                  />
                  <Label htmlFor="principal" className="text-sm cursor-pointer">Contato principal</Label>
                </div>
              )}
              <Button variant="gradient" className="w-full" onClick={handleAdd} disabled={saving || !form.nome.trim()}>
                {saving ? "Salvando..." : "Salvar Contato"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : !contatos || contatos.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Nenhum contato cadastrado</p>
      ) : (
        <div className="space-y-2">
          {contatos.map((c: any) => (
            <div
              key={c.id}
              className="flex items-start justify-between p-3 rounded-lg border transition-colors"
              style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-secondary)" }}
            >
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>
                    {c.nome}
                  </span>
                  {c.principal && <Badge variant="success" className="text-[10px] px-1.5 py-0">Principal</Badge>}
                  {c.cargo && <span className="text-xs" style={{ color: "var(--text-muted)" }}>{c.cargo}</span>}
                </div>
                <div className="flex flex-wrap gap-3 text-xs" style={{ color: "var(--text-secondary)" }}>
                  {c.email && (
                    <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>
                  )}
                  {c.telefone && (
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.telefone}</span>
                  )}
                </div>
              </div>
              {!(c.principal && contatos.length === 1) && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => setDeleteId(c.id)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(v) => !v && setDeleteId(null)}
        title="Remover contato"
        description={`Tem certeza que deseja remover ${contatoToDelete?.nome ?? "este contato"}?`}
        confirmLabel="Remover"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
