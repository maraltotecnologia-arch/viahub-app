import { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div data-theme="light" className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-surface-container-lowest rounded-2xl p-8 shadow-[0_24px_60px_rgba(13,28,45,0.10)] border border-outline-variant/20">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-container shadow-md shadow-primary/30 flex items-center justify-center">
            <span className="text-sm font-bold text-white">VH</span>
          </div>
          <span className="text-xl font-bold font-display tracking-tight text-on-surface">ViaHub</span>
        </div>
        {children}
      </div>
    </div>
  );
}
