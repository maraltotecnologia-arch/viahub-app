import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import useUserRole from "@/hooks/useUserRole";
import { useEffect } from "react";
import { toast } from "sonner";

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { isAdmin, loading } = useUserRole();

  useEffect(() => {
    if (!loading && user && !isAdmin) {
      toast.error("Você não tem permissão para acessar esta página");
    }
  }, [loading, user, isAdmin]);

  if (!user) return <Navigate to="/login" replace />;
  if (loading) return null;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
