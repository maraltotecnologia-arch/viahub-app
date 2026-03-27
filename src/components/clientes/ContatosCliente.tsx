import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Mail, Phone, MessageCircle, Loader2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { maskTelefone } from "@/lib/masks";
import { formatError } from "@/lib/errors";
import { useContatosCliente, type Contato, type ContatoFormData } from "@/hooks/useContatosCliente";

// ── helpers ────────────────────────────────────────────────────────────────
const isCelular  = (tel: string) => tel.replace(/\D/g, "").length === 11;
const fmtTel     = (tel: string) => maskTelefone(tel);
const waLink     = (tel: string) => `https://wa.me/55${tel.replace(/\D/g, "")}`;
const emailLink  = (e: string)   => `mailto:${e}`;
const telLink    = (t: string)   => `tel:+55${t.replace(/\D/g, "")}`;

const EMPTY_FORM: ContatoFormData = { nome: "", cargo: "", email: "", telefone: "", principal: false };

function formFromContato(c: Contato): ContatoFormData {
  return {
    nome:      c.nome,
    cargo:     c.cargo    || "",
    email:     c.email    || "",
    telefone:  c.telefone ? maskTelefone(c.telefone) : "",
    principal: c.principal,
  };
}

// ── component ──────────────────────────────────────────────────────────────
interface ContatosClienteProps {
  clienteId: string;
  agenciaId: string;
}

export default function ContatosCliente({ clienteId, agenciaId }: ContatosClienteProps) {
  const { contatos, isLoading, total, atLimit, MAX_CONTATOS, addContato, updateContato, deleteContato } =
    useContatosCliente(clienteId, agenciaId);

  // dialog state
  const [dialogOpen,  setDialogOpen]  = useState(false);
  const [editingId,   setEditingId]   = useState<string | null>(null);
  const [form,        setForm]        = useState<ContatoFormData>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Contato | null>(null);

  const isEditing = editingId !== null;

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, principal: total === 0 });
    setDialogOpen(true);
  };

  const openEdit = (c: Contato) => {
    setEditingId(c.id);
    setForm(formFromContato(c));
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
  };

  const setField = <K extends keyof ContatoFormData>(k: K, v: ContatoFormData[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // ── submit ──────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.nome.trim() || form.nome.trim().length < 2) {
      toast.error("Nome deve ter pelo menos 2 caracteres");
      return;
    }

    if (isEditing) {
      await updateContato.mutateAsync(
        { id: editingId!, form },
        {
          onSuccess: () => { toast.success("Contato atualizado"); closeDialog(); },
          onError:   () => toast.error(formatError("CTC002")),
        }
      );
    } else {
      if (atLimit) { toast.error(formatError("CTC004")); return; }
      await addContato.mutateAsync(form, {
        onSuccess: () => { toast.success("Contato adicionado"); closeDialog(); },
        onError:   () => toast.error(formatError("CTC001")),
      });
    }
  };

  // ── delete ──────────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteContato.mutateAsync(deleteTarget.id, {
      onSuccess: () => toast.success("Contato removido"),
      onError:   () => toast.error(formatError("CTC003")),
    });
    setDeleteTarget(null);
  };

  const isPending = addContato.isPending || updateContato.isPending;

  // ── render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground font-medium">
          {total}/{MAX_CONTATOS} contatos
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={openAdd}
          disabled={atLimit}
          title={atLimit ? formatError("CTC004") : undefined}
        >
          <Plus className="h-3 w-3 mr-1.5" /> Adicionar contato
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
        </div>
      ) : contatos.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <div className="h-10 w-10 rounded-full bg-surface-container flex items-center justify-center">
            <UserRound className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Nenhum contato cadastrado</p>
          <Button variant="ghost" size="sm" onClick={openAdd} className="text-xs">
            <Plus className="h-3 w-3 mr-1" /> Adicionar primeiro contato
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {contatos.map((c) => (
            <ContatoCard
              key={c.id}
              contato={c}
              onEdit={() => openEdit(c)}
              onDelete={() => setDeleteTarget(c)}
              canDelete={!(c.principal && contatos.length === 1)}
            />
          ))}
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) closeDialog(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar contato" : "Novo contato"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-2">
              <Label>Nome <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Nome completo"
                value={form.nome}
                onChange={(e) => setField("nome", e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Cargo <span className="text-muted-foreground text-xs">(opcional)</span></Label>
              <Input
                placeholder="Ex: cônjuge, assistente, sócio"
                value={form.cargo}
                onChange={(e) => setField("cargo", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  placeholder="(00) 00000-0000"
                  value={form.telefone}
                  onChange={(e) => setField("telefone", maskTelefone(e.target.value))}
                />
              </div>
            </div>

            {/* Principal toggle — always visible; auto-checked when first contact */}
            <div className="flex items-center justify-between rounded-xl bg-surface-container-high dark:bg-surface-container px-4 py-3">
              <div>
                <p className="text-sm font-medium">Contato principal</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {total === 0 && !isEditing
                    ? "Primeiro contato é definido como principal automaticamente"
                    : "Substitui o contato principal atual"}
                </p>
              </div>
              <Switch
                checked={form.principal}
                onCheckedChange={(v) => setField("principal", v)}
                disabled={total === 0 && !isEditing}
              />
            </div>

            <Button
              variant="default"
              className="w-full"
              onClick={handleSubmit}
              disabled={isPending || !form.nome.trim()}
            >
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isPending ? "Salvando..." : isEditing ? "Salvar alterações" : "Adicionar contato"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete AlertDialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover contato</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover{" "}
              <strong>{deleteTarget?.nome}</strong>? Esta ação não pode ser desfeita.
              {deleteTarget?.principal && (
                <span className="block mt-1 text-warning">
                  Este é o contato principal. Nenhum outro será promovido automaticamente.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
              disabled={deleteContato.isPending}
            >
              {deleteContato.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── ContatoCard ─────────────────────────────────────────────────────────────
interface ContatoCardProps {
  contato: Contato;
  onEdit: () => void;
  onDelete: () => void;
  canDelete: boolean;
}

function ContatoCard({ contato: c, onEdit, onDelete, canDelete }: ContatoCardProps) {
  return (
    <div className="group flex items-start gap-3 p-3 rounded-xl bg-surface-container-lowest dark:bg-surface-container-low border border-border/50 hover:border-border transition-colors">
      {/* Avatar */}
      <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-sm font-bold">
        {c.nome.slice(0, 2).toUpperCase()}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-sm ${c.principal ? "font-semibold text-foreground" : "font-medium text-on-surface"}`}>
            {c.nome}
          </span>
          {c.principal && (
            <Badge variant="success" className="text-[10px] px-1.5 py-0 h-4">Principal</Badge>
          )}
          {c.cargo && (
            <span className="text-xs text-muted-foreground">· {c.cargo}</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
          {c.email && (
            <a
              href={emailLink(c.email)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Mail className="h-3 w-3 shrink-0" />
              {c.email}
            </a>
          )}
          {c.telefone && (
            <div className="flex items-center gap-1">
              <a
                href={telLink(c.telefone)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Phone className="h-3 w-3 shrink-0" />
                {fmtTel(c.telefone)}
              </a>
              {isCelular(c.telefone) && (
                <a
                  href={waLink(c.telefone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#25D366] hover:opacity-80 transition-opacity"
                  title="Abrir no WhatsApp"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={onEdit}
          title="Editar contato"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        {canDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={onDelete}
            title="Remover contato"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
