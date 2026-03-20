import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import useUserRole from "@/hooks/useUserRole";
import { useEffect } from "react";
import { toast } from "sonner";

export default function SuperadminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { isSuperadmin, loading } = useUserRole();

  useEffect(() => {
    if (!loading && user && !isSuperadmin) {
      toast.error("Você não tem permissão para acessar esta página");
    }
  }, [loading, user, isSuperadmin]);

  if (!user) return <Navigate to="/login" replace />;
  if (loading) return null;
  if (!isSuperadmin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
