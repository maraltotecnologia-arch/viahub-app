import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export default function useUserRole() {
  const { user } = useAuth();
  const [cargo, setCargo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setCargo(null);
      setLoading(false);
      return;
    }
    supabase
      .from("usuarios")
      .select("cargo")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setCargo(data?.cargo ?? null);
        setLoading(false);
      });
  }, [user]);

  return { cargo, isSuperadmin: cargo === "superadmin", loading };
}
