import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import useAgenciaId from "@/hooks/useAgenciaId";
import ConfirmDialog from "@/components/ConfirmDialog";
import EmptyState from "@/components/EmptyState";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function ConfigTemplates() {
  const { toast } = useToast();
  const agenciaId = useAgenciaId();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState("");

  const { data: templates, isLoading } = useQuery({
    queryKey: ["templates", agenciaId],
    enabled: !!agenciaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("templates_orcamento")
        .select("*, itens_template(*)")
        .eq("agencia_id", agenciaId!)
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("templates_orcamento").delete().eq("id", deleteId);
    if (error) {
      toast({ title: "Erro ao excluir template", variant: "destructive" });
    } else {
      toast({ title: "Template excluído!" });
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    }
    setDeleteId(null);
  };

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-32 w-full" /></div>;

  return (
    <div className="space-y-6 max-w-3xl animate-fade-in">
      <h2 className="text-2xl font-bold">Templates de Orçamento</h2>

      {(!templates || templates.length === 0) ? (
        <EmptyState
          icon={<FileText className="h-9 w-9" />}
          title="Nenhum template salvo"
          description="Salve um orçamento como template para reutilizá-lo rapidamente"
        />
      ) : (
        <div className="space-y-3">
          {templates.map((t: any) => {
            const itens = t.itens_template || [];
            const expanded = expandedId === t.id;
            return (
              <Card key={t.id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-semibold">{t.nome}</p>
                      {t.descricao && <p className="text-xs text-muted-foreground">{t.descricao}</p>}
                      <p className="text-xs text-muted-foreground mt-1">
                        {itens.length} {itens.length === 1 ? "item" : "itens"} • Criado em {new Date(t.criado_em).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => setExpandedId(expanded ? null : t.id)}>
                        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => { setDeleteId(t.id); setDeleteName(t.nome); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  {expanded && itens.length > 0 && (
                    <div className="mt-4 border-t pt-3 space-y-2">
                      {itens.map((item: any) => (
                        <div key={item.id} className="flex justify-between text-sm py-1">
                          <div>
                            <span className="font-medium">{item.descricao || item.tipo}</span>
                            <span className="text-muted-foreground ml-2 text-xs">{item.tipo} • Qtd: {item.quantidade}</span>
                          </div>
                          <span className="font-semibold">{fmt(Number(item.valor_final) || 0)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title="Excluir template"
        description={`Tem certeza que deseja excluir o template "${deleteName}"? Esta ação não pode ser desfeita.`}
        onConfirm={handleDelete}
      />
    </div>
  );
}
