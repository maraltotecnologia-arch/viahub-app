import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: any;
  loading: boolean;
  refreshUser: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user ?? null);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    document.documentElement.setAttribute('data-theme', 'light');
  };

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      console.log("[Auth] Iniciando checagem de sessão...");
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!isMounted) return;
        setUser(session?.user ?? null);
        console.log("[Auth] Sessão resolvida. User:", session?.user?.id ?? "nenhum");
      } catch (error) {
        if (!isMounted) return;
        console.error("[Auth] Erro ao checar sessão:", error);
        setUser(null);
      } finally {
        if (isMounted) {
          console.log("[Auth] Desligando tela de carregamento.");
          setLoading(false);
        }
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      const u = session?.user ?? null;
      setUser(u);
      console.log("[Auth] onAuthStateChange:", _event, "user:", u?.id ?? "nenhum");

      // Log access on sign in (fire and forget)
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
              }).then(() => {}).catch(() => {});
            }
          }).catch(() => {});
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
