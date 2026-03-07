import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: any;
  loading: boolean;
  refreshUser: () => Promise<void>;
  signOut: () => Promise<void>;
  statusPagamento: string | null;
  cargoUsuario: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusPagamento, setStatusPagamento] = useState<string | null>(null);
  const [cargoUsuario, setCargoUsuario] = useState<string | null>(null);

  const fetchAgencyStatus = async (userId: string) => {
    try {
      const { data: perfil, error: perfilError } = await supabase
        .from("usuarios")
        .select("agencia_id, cargo")
        .eq("id", userId)
        .maybeSingle();

      console.log("[AuthContext] perfil:", perfil, "error:", perfilError);

      if (!perfil) {
        setStatusPagamento(null);
        setCargoUsuario(null);
        return;
      }

      setCargoUsuario(perfil.cargo);

      if (perfil.cargo === "superadmin") {
        console.log("[AuthContext] superadmin detected, skipping status check");
        setStatusPagamento("ativo");
        return;
      }

      if (!perfil.agencia_id) {
        setStatusPagamento(null);
        return;
      }

      const { data: agencia, error: agenciaError } = await supabase
        .from("agencias")
        .select("status_pagamento")
        .eq("id", perfil.agencia_id)
        .single();

      console.log("[AuthContext] agencia status_pagamento:", agencia?.status_pagamento, "error:", agenciaError);
      setStatusPagamento(agencia?.status_pagamento ?? null);
    } catch (err) {
      console.error("[AuthContext] fetchAgencyStatus error:", err);
      setStatusPagamento(null);
      setCargoUsuario(null);
    }
  };

  const refreshUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const u = session?.user ?? null;
    setUser(u);
    if (u) await fetchAgencyStatus(u.id);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setStatusPagamento(null);
    setCargoUsuario(null);
    document.documentElement.setAttribute('data-theme', 'light');
  };

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        const u = session?.user ?? null;
        setUser(u);
        if (u) await fetchAgencyStatus(u.id);
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null;
      setUser(u);

      if (u) {
        await fetchAgencyStatus(u.id);
      } else {
        setStatusPagamento(null);
        setCargoUsuario(null);
      }

      if (_event === "SIGNED_IN" && session?.user) {
        const userId = session.user.id;
        const email = session.user.email;
        Promise.resolve(
          supabase
            .from("usuarios")
            .select("nome, cargo, agencia_id")
            .eq("id", userId)
            .maybeSingle()
        ).then(({ data: usuario }) => {
            if (usuario?.agencia_id) {
              supabase.functions.invoke("registrar-log-acesso", {
                body: {
                  usuario_id: userId,
                  agencia_id: usuario.agencia_id,
                  usuario_nome: usuario.nome || email,
                  cargo: usuario.cargo || "agente",
                },
              }).then(() => {});
            }
          })
          .catch(() => {});
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E3A8A 50%, #2563EB 100%)" }}>
      <h1 className="text-[32px] font-bold text-white tracking-tight mb-6">Via<span className="font-extrabold">Hub</span></h1>
      <div className="h-8 w-8 rounded-full border-[3px] border-white/20 border-t-[#06B6D4] animate-spin" />
      <p className="text-white/50 text-sm mt-4">Carregando...</p>
    </div>
  );

  return <AuthContext.Provider value={{ user, loading, refreshUser, signOut, statusPagamento, cargoUsuario }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
