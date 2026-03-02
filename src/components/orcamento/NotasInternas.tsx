import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import useAgenciaId from "@/hooks/useAgenciaId";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { formatarDataHoraBrasilia } from "@/lib/date-utils";

interface Props {
  orcamentoId: string;
}

export default function NotasInternas({ orcamentoId }: Props) {
  const { user } = useAuth();
  const agenciaId = useAgenciaId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [texto, setTexto] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: comentarios, isLoading } = useQuery({
    queryKey: ["comentarios-orcamento", orcamentoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comentarios_orcamento" as any)
        .select("*, usuarios(nome)")
        .eq("orcamento_id", orcamentoId)
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const handleAdd = async () => {
    if (!texto.trim() || !user || !agenciaId) return;
    setSaving(true);
    const { error } = await supabase.from("comentarios_orcamento" as any).insert({
      orcamento_id: orcamentoId,
      usuario_id: user.id,
      agencia_id: agenciaId,
      texto: texto.trim(),
    });
    if (error) {
      toast({ title: "Erro ao salvar nota", variant: "destructive" });
    } else {
      toast({ title: "Nota adicionada" });
      setTexto("");
      queryClient.invalidateQueries({ queryKey: ["comentarios-orcamento", orcamentoId] });
    }
    setSaving(false);
  };

  const getInitials = (nome: string) => {
    return nome
      .split(" ")
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div className="space-y-4">
      {/* Add note */}
      <div className="flex gap-2">
        <Textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Adicionar nota interna... (não aparece no PDF ou para o cliente)"
          className="min-h-[60px] flex-1"
        />
        <Button onClick={handleAdd} disabled={saving || !texto.trim()} className="self-end shrink-0">
          {saving ? "..." : "Adicionar"}
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : comentarios && comentarios.length > 0 ? (
        <div className="space-y-3">
          {comentarios.map((c: any) => {
            const nome = c.usuarios?.nome || "Usuário";
            const data = c.criado_em ? formatarDataHoraBrasilia(c.criado_em) : "";
            return (
              <div key={c.id} className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
                  {getInitials(nome)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">
                    {nome} • {data}
                  </p>
                  <p className="text-sm mt-0.5">{c.texto}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-2">Nenhuma nota ainda</p>
      )}
    </div>
  );
}
