import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AuthLayout from "@/components/AuthLayout";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export default function VerificarEmail() {
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get("email") || "";
  const tipo = searchParams.get("tipo") || "email"; // "email" | "recuperacao" | "confirmacao_cadastro"

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(60);
  const [resendMessage, setResendMessage] = useState("");
  const navigate = useNavigate();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "light");
    document.documentElement.style.setProperty("--bg-primary", "#ffffff");
    return () => {
      const saved = localStorage.getItem("viahub-theme") || "dark";
      document.documentElement.setAttribute("data-theme", saved);
      document.documentElement.style.removeProperty("--bg-primary");
    };
  }, []);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    intervalRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [resendCooldown]);

  // Redirect if no email
  useEffect(() => {
    if (!emailParam) {
      navigate("/login", { replace: true });
    }
  }, [emailParam, navigate]);

  const handleVerify = async () => {
    if (code.length !== 6) return;
    setError("");
    setLoading(true);

    try {
      const { data, error: otpError } = await supabase.auth.verifyOtp({
        email: emailParam,
        token: code,
        type: "email",
      });

      if (otpError) {
        setError("Código inválido ou expirado. Solicite um novo código.");
        setLoading(false);
        return;
      }

      if (data.session) {
        if (tipo === "recuperacao") {
          navigate("/redefinir-senha", { replace: true });
        } else if (tipo === "confirmacao_cadastro") {
          // Mark email as confirmed
          await supabase
            .from("usuarios")
            .update({ email_confirmado: true } as any)
            .eq("email", emailParam);

          // Send welcome email
          try {
            await supabase.functions.invoke("enviar-email", {
              body: { tipo: "boas_vindas", email: emailParam },
            });
          } catch {
            // Non-blocking
          }

          // Check onboarding status
          const { data: usuario } = await supabase
            .from("usuarios")
            .select("agencia_id")
            .eq("email", emailParam)
            .single();

          if (usuario?.agencia_id) {
            const { data: agencia } = await supabase
              .from("agencias")
              .select("onboarding_completo")
              .eq("id", usuario.agencia_id)
              .single();

            if (agencia && !agencia.onboarding_completo) {
              navigate("/onboarding", { replace: true });
            } else {
              navigate("/dashboard", { replace: true });
            }
          } else {
            navigate("/dashboard", { replace: true });
          }
        } else {
          navigate("/dashboard", { replace: true });
        }
      }
    } catch {
      setError("Erro ao verificar código. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setResendMessage("");
    setError("");

    await supabase.auth.signInWithOtp({
      email: emailParam,
      options: { shouldCreateUser: false },
    });

    setResendMessage(`Novo código enviado para ${emailParam}`);
    setResendCooldown(60);
  };

  if (!emailParam) return null;

  const maskedEmail = emailParam.replace(
    /^(.{2})(.*)(@.*)$/,
    (_, a, b, c) => a + "•".repeat(Math.min(b.length, 5)) + c
  );

  return (
    <AuthLayout>
      <div className="animate-fade-in">
        <div className="md:hidden text-center mb-6">
          <h1 className="text-3xl font-bold text-[#0F172A]">
            Via<span className="font-extrabold">Hub</span>
          </h1>
        </div>

        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
            <Mail className="h-8 w-8 text-[#2563EB]" />
          </div>
        </div>

        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-[#0F172A]">Confirme seu email</h2>
          <p className="text-sm text-[#64748B] mt-2">
            Enviamos um código de 6 dígitos para{" "}
            <span className="font-medium text-[#0F172A]">{maskedEmail}</span>
          </p>
        </div>

        <div className="flex flex-col items-center space-y-6">
          <InputOTP
            maxLength={6}
            value={code}
            onChange={(value) => {
              setCode(value);
              setError("");
            }}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>

          {error && <p className="text-sm text-destructive text-center">{error}</p>}
          {resendMessage && (
            <p className="text-sm text-emerald-600 text-center">{resendMessage}</p>
          )}

          <Button
            onClick={handleVerify}
            className="w-full h-12 rounded-xl font-semibold text-[15px] text-white shadow-[0_4px_16px_rgba(37,99,235,0.3)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.4)] hover:-translate-y-0.5 transition-all duration-200"
            style={{ background: "linear-gradient(135deg, #2563EB, #06B6D4)" }}
            disabled={loading || code.length !== 6}
          >
            {loading ? "Verificando..." : "Confirmar"}
          </Button>

          <div className="text-center">
            {resendCooldown > 0 ? (
              <p className="text-sm text-[#94A3B8]">
                Reenviar em {resendCooldown}s
              </p>
            ) : (
              <button
                onClick={handleResend}
                className="text-sm text-[#2563EB] hover:underline font-medium"
              >
                Não recebi o código — Reenviar
              </button>
            )}
          </div>

          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm text-[#2563EB] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar ao início
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
