import { ReactNode } from "react";
import { CheckCircle } from "lucide-react";

const benefits = [
  "Orçamentos profissionais em minutos",
  "Pipeline de vendas integrado",
  "Relatórios financeiros em tempo real",
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left column — hidden on mobile */}
      <div
        className="hidden md:flex md:w-[55%] relative overflow-hidden items-center justify-center bg-gray-900"
      >
        <div className="relative z-10 max-w-md px-8">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-sm font-bold text-white">VH</span>
            </div>
            <h1 className="text-2xl font-bold text-white">ViaHub</h1>
          </div>
          <p className="text-gray-400 text-base mt-1">O ecossistema da sua agência</p>
          <p className="text-gray-600 text-xs mt-1">powered by <span className="font-semibold">Maralto</span></p>

          <div className="mt-10 space-y-4">
            {benefits.map((b) => (
              <div key={b} className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
                <span className="text-gray-300 text-sm">{b}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right column */}
      <div className="w-full md:w-[45%] flex items-center justify-center p-6 min-h-screen">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
