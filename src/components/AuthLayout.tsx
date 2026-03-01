import { ReactNode } from "react";
import { CheckCircle } from "lucide-react";

const benefits = [
  "Orçamentos profissionais em minutos",
  "Pipeline de vendas integrado",
  "Relatórios financeiros em tempo real",
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left column — hidden on mobile */}
      <div className="hidden md:flex md:w-[60%] relative overflow-hidden items-center justify-center"
        style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E3A8A 40%, #2563EB 70%, #06B6D4 100%)" }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-[100px] -right-[100px] w-[400px] h-[400px] rounded-full"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }} />
        <div className="absolute top-[30%] -left-[80px] w-[250px] h-[250px] rounded-full"
          style={{ background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.15)" }} />
        <div className="absolute -bottom-[40px] right-[20%] w-[180px] h-[180px] rounded-full"
          style={{ background: "rgba(255,255,255,0.04)" }} />

        <div className="relative z-10 max-w-md px-8">
          <h1 className="text-[32px] font-bold text-white tracking-tight">
            Via<span className="font-extrabold">Hub</span>
          </h1>
          <p className="text-white/70 text-base mt-2">O ecossistema da sua agência</p>

          <div className="mt-10 space-y-4">
            {benefits.map((b) => (
              <div key={b} className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-[#06B6D4] shrink-0" />
                <span className="text-white text-sm">{b}</span>
              </div>
            ))}
          </div>

          <p className="absolute bottom-8 left-8 text-white/40 text-xs">powered by <span className="font-semibold">Maralto</span></p>
        </div>
      </div>

      {/* Right column */}
      <div className="w-full md:w-[40%] flex items-center justify-center p-6 min-h-screen"
        style={{ background: "rgba(255,255,255,0.95)" }}
      >
        {/* Mobile: gradient bg + floating card */}
        <div className="md:hidden fixed inset-0 -z-10"
          style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E3A8A 50%, #2563EB 100%)" }} />
        <div className="w-full max-w-md md:bg-transparent md:shadow-none md:rounded-none md:p-0
          bg-white/95 rounded-3xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.15)]">
          {children}
        </div>
      </div>
    </div>
  );
}
