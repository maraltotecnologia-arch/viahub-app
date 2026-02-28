import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface AuthUser {
  id: string;
  email: string;
  nome: string | null;
  cargo: string | null;
  agencia_id: string | null;
  agencia_nome: string | null;
  onboarding_completo: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
  refreshUser: async () => {},
});

export const useAuth = () => useContext(AuthContext);

async function fetchUserProfile(userId: string): Promise<AuthUser | null> {
  const { data: usuario, error } = await supabase
    .from("usuarios")
    .select("id, nome, email, cargo, agencia_id")
    .eq("id", userId)
    .maybeSingle();

  if (error || !usuario) return null;

  let agencia_nome: string | null = null;
  let onboarding_completo = false;

  if (usuario.agencia_id) {
    const { data: agencia } = await supabase
      .from("agencias")
      .select("nome_fantasia, onboarding_completo")
      .eq("id", usuario.agencia_id)
      .maybeSingle();

    if (agencia) {
      agencia_nome = agencia.nome_fantasia;
      onboarding_completo = agencia.onboarding_completo ?? false;
    }
  }

  return {
    id: usuario.id,
    email: usuario.email ?? "",
    nome: usuario.nome,
    cargo: usuario.cargo,
    agencia_id: usuario.agencia_id,
    agencia_nome,
    onboarding_completo,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    const { data: { session: s } } = await supabase.auth.getSession();
    if (s?.user) {
      const profile = await fetchUserProfile(s.user.id);
      setUser(profile);
      setSession(s);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, s) => {
        setSession(s);
        if (s?.user) {
          const profile = await fetchUserProfile(s.user.id);
          setUser(profile);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) {
        const profile = await fetchUserProfile(s.user.id);
        setUser(profile);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
