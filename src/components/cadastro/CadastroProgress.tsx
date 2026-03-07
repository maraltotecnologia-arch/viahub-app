const steps = ["Dados", "Plano", "Confirmação"];

export default function CadastroProgress({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-0 max-w-md mx-auto">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                i <= currentStep
                  ? "bg-[#1E3A5F] text-white"
                  : "bg-[#E2E8F0] text-[#94A3B8]"
              }`}
            >
              {i + 1}
            </div>
            <span
              className={`text-xs mt-1 ${
                i <= currentStep ? "text-[#1E3A5F] font-medium" : "text-[#94A3B8]"
              }`}
            >
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`w-16 sm:w-24 h-0.5 mx-2 mb-5 transition-all ${
                i < currentStep ? "bg-[#1E3A5F]" : "bg-[#E2E8F0]"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
