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

      console.log("[Auth] Perfil carregado:", perfil, "error:", perfilError);

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

      console.log("[Auth] Status da agência:", agencia?.status_pagamento, "error:", agenciaError);
      setStatusPagamento(agencia?.status_pagamento ?? null);
    } catch (error) {
      console.error("[Auth] Erro detectado:", error);
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
    let isMounted = true;

    const checkSession = async () => {
      console.log("[Auth] Iniciando checagem de sessão...");
      setLoading(true);

      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) throw error;

        const u = session?.user ?? null;
        if (!isMounted) return;

        setUser(u);

        if (!u) {
          setStatusPagamento(null);
          setCargoUsuario(null);
          return;
        }

        console.log("[Auth] Usuário logado:", u.id);
        await fetchAgencyStatus(u.id);
      } catch (error) {
        if (!isMounted) return;
        console.error("[Auth] Erro detectado:", error);
        setUser(null);
        setStatusPagamento(null);
        setCargoUsuario(null);
      } finally {
        if (!isMounted) return;
        console.log("[Auth] Desligando tela de carregamento.");
        setLoading(false);
      }
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;

      const u = session?.user ?? null;
      setUser(u);

      if (u) {
        console.log("[Auth] Usuário logado:", u.id);
        void fetchAgencyStatus(u.id).catch((error) => {
          console.error("[Auth] Erro detectado:", error);
        });
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

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={{ user, loading, refreshUser, signOut, statusPagamento, cargoUsuario }}>{children}</AuthContext.Provider>;

  return <AuthContext.Provider value={{ user, loading, refreshUser, signOut, statusPagamento, cargoUsuario }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
