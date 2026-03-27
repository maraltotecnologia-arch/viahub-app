import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Contato {
  id: string;
  cliente_id: string;
  agencia_id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  cargo: string | null;
  principal: boolean;
  created_at: string;
}

export interface ContatoFormData {
  nome: string;
  cargo: string;
  email: string;
  telefone: string;
  principal: boolean;
}

const MAX_CONTATOS = 10;

export function useContatosCliente(clienteId: string, agenciaId: string) {
  const queryClient = useQueryClient();
  const qKey = ["contatos-cliente", clienteId] as const;

  const { data: contatos = [], isLoading } = useQuery({
    queryKey: qKey,
    enabled: !!clienteId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contatos_cliente" as any)
        .select("*")
        .eq("cliente_id", clienteId)
        .order("principal", { ascending: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as unknown as Contato[];
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: qKey });

  /** Sets all contacts of this client to principal=false */
  const clearPrincipal = async () => {
    await supabase
      .from("contatos_cliente" as any)
      .update({ principal: false } as any)
      .eq("cliente_id", clienteId);
  };

  const addContato = useMutation({
    mutationFn: async (form: ContatoFormData) => {
      const isFirst = contatos.length === 0;
      const willBePrincipal = isFirst || form.principal;
      if (willBePrincipal) await clearPrincipal();

      const { error } = await supabase.from("contatos_cliente" as any).insert({
        cliente_id: clienteId,
        agencia_id: agenciaId,
        nome:       form.nome.trim(),
        cargo:      form.cargo.trim() || null,
        email:      form.email.trim() || null,
        telefone:   form.telefone.replace(/\D/g, "") || null,
        principal:  willBePrincipal,
      } as any);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateContato = useMutation({
    mutationFn: async ({ id, form }: { id: string; form: ContatoFormData }) => {
      if (form.principal) await clearPrincipal();

      const { error } = await supabase
        .from("contatos_cliente" as any)
        .update({
          nome:      form.nome.trim(),
          cargo:     form.cargo.trim() || null,
          email:     form.email.trim() || null,
          telefone:  form.telefone.replace(/\D/g, "") || null,
          principal: form.principal,
        } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteContato = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contatos_cliente" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    contatos,
    isLoading,
    total: contatos.length,
    atLimit: contatos.length >= MAX_CONTATOS,
    MAX_CONTATOS,
    addContato,
    updateContato,
    deleteContato,
  };
}
