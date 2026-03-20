import { ReactNode } from "react";
import { CheckCircle } from "lucide-react";

const benefits = [
  "Orçamentos profissionais em minutos",
  "Pipeline de vendas integrado",
  "Relatórios financeiros em tempo real",
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex relative" style={{ background: "#f7f9fb" }}>
      {/* Decorative blobs */}
      <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[60%] rounded-full blur-[120px] pointer-events-none" style={{ background: "rgba(0,88,190,0.05)" }} />
      <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[60%] rounded-full blur-[120px] pointer-events-none" style={{ background: "rgba(33,112,228,0.08)" }} />

      {/* Left column — hidden on mobile */}
      <div className="hidden md:flex md:w-[55%] relative overflow-hidden items-center justify-center"
        style={{ background: "linear-gradient(135deg, #002d62 0%, #001a42 100%)" }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-[100px] -right-[100px] w-[400px] h-[400px] rounded-full"
          style={{ background: "rgba(173,198,255,0.04)", border: "1px solid rgba(173,198,255,0.08)" }} />
        <div className="absolute top-[30%] -left-[80px] w-[250px] h-[250px] rounded-full"
          style={{ background: "rgba(0,98,141,0.08)", border: "1px solid rgba(0,98,141,0.15)" }} />
        <div className="absolute -bottom-[40px] right-[20%] w-[180px] h-[180px] rounded-full"
          style={{ background: "rgba(255,255,255,0.03)" }} />

        <div className="relative z-10 max-w-md px-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-xl bg-gradient-to-br from-[#0058be] to-[#2170e4] p-2.5 shadow-xl shadow-[rgba(0,88,190,0.3)]">
              <span className="text-lg font-extrabold text-white">VH</span>
            </div>
            <h1 className="text-[32px] font-extrabold text-white tracking-tight">
              ViaHub
            </h1>
          </div>
          <p className="text-white/60 text-base mt-1">O ecossistema da sua agência</p>
          <p className="text-white/30 text-xs mt-1">powered by <span className="font-semibold">Maralto</span></p>

          <div className="mt-10 space-y-4">
            {benefits.map((b) => (
              <div key={b} className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-[#89ceff] shrink-0" />
                <span className="text-white/90 text-sm">{b}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right column */}
      <div className="w-full md:w-[45%] flex items-center justify-center p-6 min-h-screen relative z-10">
        {/* Mobile: gradient bg + floating card */}
        <div className="md:hidden fixed inset-0 -z-10"
          style={{ background: "linear-gradient(135deg, #002d62 0%, #001a42 100%)" }} />
        <div className="w-full max-w-[440px] md:bg-transparent md:shadow-none md:rounded-none md:p-0
          bg-card/80 backdrop-blur-xl rounded-2xl p-8 shadow-[0_20px_50px_-12px_rgba(0,88,190,0.08)] md:border-0 border border-white/40">
          {children}
        </div>
      </div>
    </div>
  );
}
