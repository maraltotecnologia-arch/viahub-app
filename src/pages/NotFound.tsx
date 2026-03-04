import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 relative"
      style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E3A8A 50%, #2563EB 100%)" }}
    >
      {/* Logo */}
      <div className="absolute top-6 left-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Via<span className="font-extrabold">Hub</span>
        </h1>
      </div>

      {/* 404 */}
      <h1
        className="text-[120px] md:text-[160px] font-extrabold leading-none bg-clip-text text-transparent select-none"
        style={{ backgroundImage: "linear-gradient(135deg, #2563EB, #06B6D4)" }}
      >
        404
      </h1>

      <h2 className="text-white text-2xl font-semibold mt-4 text-center">
        Página não encontrada
      </h2>
      <p className="text-white/70 text-base mt-2 text-center max-w-md">
        A página que você está procurando não existe ou foi movida.
      </p>

      <Button
        onClick={() => navigate(user ? "/dashboard" : "/login", { replace: true })}
        className="mt-8 h-12 px-8 rounded-xl font-semibold text-[15px] text-white shadow-[0_4px_16px_rgba(37,99,235,0.3)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.4)] hover:-translate-y-0.5 transition-all duration-200"
        style={{ background: "linear-gradient(135deg, #2563EB, #06B6D4)" }}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Voltar ao início
      </Button>
    </div>
  );
}
