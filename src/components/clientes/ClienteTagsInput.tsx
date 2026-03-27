import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const MAX_TAG_LENGTH = 30;

export const SUGESTOES_TAGS = [
  "Família", "Casal", "Corporativo", "Aventura",
  "Idosos", "Pet", "Lua de mel",
  "VIP", "Recorrente", "Prospect", "Inativo",
];

interface ClienteTagsInputProps {
  tags: string[];
  onChange?: (tags: string[]) => void; // controlled mode (create dialog)
  clienteId?: string;                   // persistent mode (detail page)
}

export default function ClienteTagsInput({ tags, onChange, clienteId }: ClienteTagsInputProps) {
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [lengthError, setLengthError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (errorTimerRef.current) clearTimeout(errorTimerRef.current); };
  }, []);

  const showLengthError = () => {
    setLengthError(true);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => setLengthError(false), 3000);
  };

  const persist = async (newTags: string[]) => {
    if (!clienteId) return;
    setSaving(true);
    const { error } = await supabase
      .from("clientes")
      .update({ tags: newTags } as any)
      .eq("id", clienteId);
    if (error) {
      toast.error("Erro ao atualizar tags");
    } else {
      queryClient.invalidateQueries({ queryKey: ["cliente", clienteId] });
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
    }
    setSaving(false);
  };

  const addTag = async (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) { setInput(""); return; }
    if (trimmed.length > MAX_TAG_LENGTH) { showLengthError(); return; }
    const isDuplicate = tags.some((t) => t.toLowerCase() === trimmed.toLowerCase());
    if (isDuplicate) { setInput(""); return; }
    setLengthError(false);
    const newTags = [...tags, trimmed];
    onChange?.(newTags);
    await persist(newTags);
    setInput("");
  };

  const removeTag = async (tag: string) => {
    const newTags = tags.filter((t) => t !== tag);
    onChange?.(newTags);
    await persist(newTags);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
    } else if (e.key === "Backspace" && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  const suggestions = SUGESTOES_TAGS.filter(
    (s) => !tags.some((t) => t.toLowerCase() === s.toLowerCase())
  );

  return (
    <div className="space-y-2.5">
      <div
        className="min-h-[42px] flex flex-wrap gap-1.5 items-center px-3 py-2 rounded-xl bg-surface-container-high dark:bg-surface-container cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
          >
            {tag}
            <button
              type="button"
              disabled={saving}
              onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
              className="hover:text-destructive ml-0.5 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => {
            setLengthError(false);
            setInput(e.target.value.replace(",", ""));
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => { if (input.trim()) addTag(input); }}
          placeholder={tags.length === 0 ? "Digite e pressione Enter..." : ""}
          className="flex-1 min-w-[120px] bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
          disabled={saving}
        />
      </div>
      {lengthError && (
        <p className="text-xs text-destructive">Tag muito longa (máximo {MAX_TAG_LENGTH} caracteres)</p>
      )}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              disabled={saving}
              onClick={() => addTag(s)}
              className="px-2.5 py-0.5 rounded-full text-xs font-medium border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
