import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export default function useAgenciaId() {
  const { user } = useAuth();
  const [agenciaId, setAgenciaId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setAgenciaId(null);
      return;
    }
    supabase
      .from("usuarios")
      .select("agencia_id")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.agencia_id) setAgenciaId(data.agencia_id);
      });
  }, [user]);

  return agenciaId;
}
