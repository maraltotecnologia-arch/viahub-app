import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, ChevronDown, Loader2, Plane } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import ClienteTagsInput from "@/components/clientes/ClienteTagsInput";

// ── constants ──────────────────────────────────────────────────────────────
const CATEGORIAS_HOTEL = ["Econômico", "Standard", "Superior", "Luxo", "All-inclusive"] as const;
const CLASSES_VOOS     = ["Econômica", "Executiva", "Primeira Classe"] as const;
const CIAS_AEREAS      = ["LATAM", "Gol", "Azul", "TAM", "American Airlines", "Delta", "Copa Airlines", "Air France", "Emirates", "KLM"];

export interface Preferencias {
  destinos:       string[];
  categoria_hotel: string;
  cia_aerea:      string;
  classe:         string;
  observacoes:    string;
}

const EMPTY: Preferencias = {
  destinos: [], categoria_hotel: "", cia_aerea: "", classe: "", observacoes: "",
};

function parsePreferencias(raw: unknown): Preferencias {
  if (!raw || typeof raw !== "object") return EMPTY;
  const r = raw as Partial<Preferencias>;
  return {
    destinos:       Array.isArray(r.destinos) ? r.destinos : [],
    categoria_hotel: r.categoria_hotel || "",
    cia_aerea:      r.cia_aerea || "",
    classe:         r.classe || "",
    observacoes:    r.observacoes || "",
  };
}

function hasAnyPref(p: Preferencias): boolean {
  return (
    p.destinos.length > 0 || !!p.categoria_hotel ||
    !!p.cia_aerea || !!p.classe || !!p.observacoes
  );
}

// ── component ──────────────────────────────────────────────────────────────
interface PreferenciasViagemProps {
  clienteId: string;
  preferencias: unknown; // raw JSONB from DB
}

export default function PreferenciasViagem({ clienteId, preferencias }: PreferenciasViagemProps) {
  const queryClient = useQueryClient();
  const saved = parsePreferencias(preferencias);

  const [open,    setOpen]    = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [draft,   setDraft]   = useState<Preferencias>(saved);

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDraft(parsePreferencias(preferencias)); // always reset from latest saved
    setOpen(true);
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft(saved);
    setEditing(false);
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("clientes")
      .update({ preferencias: draft as any } as any)
      .eq("id", clienteId);

    if (error) {
      toast.error("Erro ao salvar preferências");
    } else {
      toast.success("Preferências salvas");
      queryClient.invalidateQueries({ queryKey: ["cliente", clienteId] });
      setEditing(false);
    }
    setSaving(false);
  };

  const set = <K extends keyof Preferencias>(k: K, v: Preferencias[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const toggleOpen = () => {
    if (editing) return; // don't collapse mid-edit
    setOpen((o) => !o);
  };

  // ── render ─────────────────────────────────────────────────────────────
  return (
    <Card>
      {/* Header — always visible, click to expand/collapse */}
      <CardHeader
        className="cursor-pointer select-none py-4"
        onClick={toggleOpen}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plane className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Preferências de Viagem</CardTitle>
            {!open && hasAnyPref(saved) && (
              <span className="text-xs text-muted-foreground font-normal ml-1">
                — {[
                  saved.destinos.length > 0 && `${saved.destinos.length} destino${saved.destinos.length !== 1 ? "s" : ""}`,
                  saved.categoria_hotel,
                  saved.classe,
                ].filter(Boolean).join(" · ")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {open && !editing && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={startEdit} title="Editar preferências">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            />
          </div>
        </div>
      </CardHeader>

      {/* Collapsible content */}
      {open && (
        <CardContent className="pt-0 space-y-5">
          {editing ? (
            /* ── Edit form ─────────────────────────────────── */
            <>
              <div className="space-y-2">
                <Label>Destinos favoritos</Label>
                <ClienteTagsInput
                  tags={draft.destinos}
                  onChange={(t) => set("destinos", t)}
                />
                <p className="text-xs text-muted-foreground">Digite um destino e pressione Enter</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Categoria de hotel</Label>
                  <Select
                    value={draft.categoria_hotel || "none"}
                    onValueChange={(v) => set("categoria_hotel", v === "none" ? "" : v)}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Não informado</SelectItem>
                      {CATEGORIAS_HOTEL.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Companhia aérea</Label>
                  <Input
                    list="cias-aereas-list"
                    placeholder="Ex: LATAM, Gol…"
                    value={draft.cia_aerea}
                    onChange={(e) => set("cia_aerea", e.target.value)}
                  />
                  <datalist id="cias-aereas-list">
                    {CIAS_AEREAS.map((c) => <option key={c} value={c} />)}
                  </datalist>
                </div>

                <div className="space-y-2">
                  <Label>Classe preferida</Label>
                  <Select
                    value={draft.classe || "none"}
                    onValueChange={(v) => set("classe", v === "none" ? "" : v)}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Não informado</SelectItem>
                      {CLASSES_VOOS.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  placeholder="Ex: prefere janela, alérgica a frutos do mar, necessita cadeira de rodas…"
                  value={draft.observacoes}
                  onChange={(e) => set("observacoes", e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Button onClick={save} disabled={saving} size="sm">
                  {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                  {saving ? "Salvando…" : "Confirmar"}
                </Button>
                <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={saving}>
                  Cancelar
                </Button>
              </div>
            </>
          ) : (
            /* ── View mode ─────────────────────────────────── */
            <>
              {!hasAnyPref(saved) ? (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <Plane className="h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Nenhuma preferência cadastrada ainda.</p>
                  <Button variant="ghost" size="sm" className="text-xs" onClick={startEdit}>
                    <Pencil className="h-3 w-3 mr-1" /> Adicionar preferências
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {saved.destinos.length > 0 && (
                    <PrefRow label="Destinos">
                      <div className="flex flex-wrap gap-1">
                        {saved.destinos.map((d) => (
                          <span key={d} className="px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary border border-primary/20 font-medium">
                            {d}
                          </span>
                        ))}
                      </div>
                    </PrefRow>
                  )}
                  {(saved.categoria_hotel || saved.cia_aerea || saved.classe) && (
                    <PrefRow label="Viagem">
                      <span className="text-sm text-foreground">
                        {[saved.categoria_hotel, saved.cia_aerea, saved.classe].filter(Boolean).join(" · ")}
                      </span>
                    </PrefRow>
                  )}
                  {saved.observacoes && (
                    <PrefRow label="Observações">
                      <span className="text-sm text-foreground whitespace-pre-wrap">{saved.observacoes}</span>
                    </PrefRow>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ── helper subcomponent ───────────────────────────────────────────────────
function PrefRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide w-24 shrink-0 pt-0.5">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}
