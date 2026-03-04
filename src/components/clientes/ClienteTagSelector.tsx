import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const TAGS_DISPONIVEIS = ["VIP", "Corporativo", "Eventual", "Recorrente", "Inativo", "Prospect"] as const;

interface ClienteTagSelectorProps {
  clienteId: string;
  tags: string[];
}

export default function ClienteTagSelector({ clienteId, tags }: ClienteTagSelectorProps) {
  const [currentTags, setCurrentTags] = useState<string[]>(tags);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const toggleTag = async (tag: string) => {
    const newTags = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag];

    setCurrentTags(newTags);
    setSaving(true);
    const { error } = await supabase
      .from("clientes")
      .update({ tags: newTags } as any)
      .eq("id", clienteId);

    if (error) {
      toast.error("Erro ao atualizar tags");
      setCurrentTags(currentTags);
    } else {
      toast.success("Tags atualizadas");
      queryClient.invalidateQueries({ queryKey: ["cliente", clienteId] });
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
    }
    setSaving(false);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {TAGS_DISPONIVEIS.map((tag) => {
        const active = currentTags.includes(tag);
        return (
          <button
            key={tag}
            type="button"
            disabled={saving}
            onClick={() => toggleTag(tag)}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-all border"
            style={
              active
                ? { backgroundColor: "#2563EB", color: "#FFFFFF", borderColor: "#2563EB" }
                : { backgroundColor: "transparent", borderColor: "#334155", color: "var(--text-secondary)" }
            }
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}
