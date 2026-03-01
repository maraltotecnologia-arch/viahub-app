import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export type CargoType = "superadmin" | "admin" | "agente" | "financeiro" | null;

const CARGO_LABELS: Record<string, string> = {
  superadmin: "Superadmin",
  admin: "Administrador",
  agente: "Agente",
  financeiro: "Financeiro",
};

export default function useUserRole() {
  const { user } = useAuth();
  const [cargo, setCargo] = useState<CargoType>(null);
  const [nome, setNome] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setCargo(null);
      setNome(null);
      setLoading(false);
      return;
    }
    supabase
      .from("usuarios")
      .select("cargo, nome")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setCargo((data?.cargo as CargoType) ?? null);
        setNome(data?.nome ?? null);
        setLoading(false);
      });
  }, [user]);

  const isSuperadmin = cargo === "superadmin";
  const isAdmin = cargo === "admin" || isSuperadmin;
  const isFinanceiro = cargo === "financeiro";
  const isAgente = cargo === "agente";

  const canAccessConfig = isAdmin;
  const canAccessRelatorios = isAdmin || isFinanceiro;
  const canAccessUsuarios = isAdmin;
  const canCreateOrcamentos = isAdmin || isAgente;
  const canManageClientes = isAdmin || isAgente;

  const cargoLabel = cargo ? CARGO_LABELS[cargo] || cargo : "";

  return {
    cargo,
    nome,
    loading,
    isSuperadmin,
    isAdmin,
    isFinanceiro,
    isAgente,
    cargoLabel,
    canAccessConfig,
    canAccessRelatorios,
    canAccessUsuarios,
    canCreateOrcamentos,
    canManageClientes,
  };
}
