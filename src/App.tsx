import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Login from "./pages/Login";

import Onboarding from "./pages/Onboarding";
import RecuperarSenha from "./pages/RecuperarSenha";
import RedefinirSenha from "./pages/RedefinirSenha";
import AppLayout from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Orcamentos from "./pages/Orcamentos";
import OrcamentoNovo from "./pages/OrcamentoNovo";
import OrcamentoDetalhe from "./pages/OrcamentoDetalhe";
import Pipeline from "./pages/Pipeline";
import Relatorios from "./pages/Relatorios";
import Clientes from "./pages/Clientes";
import ClienteDetalhe from "./pages/ClienteDetalhe";
import ConfigMarkup from "./pages/ConfigMarkup";
import ConfigAgencia from "./pages/ConfigAgencia";
import ConfigAssinatura from "./pages/ConfigAssinatura";
import ConfigUsuarios from "./pages/ConfigUsuarios";
import ConfigTemplates from "./pages/ConfigTemplates";
import AdminAgencias from "./pages/admin/AdminAgencias";
import AdminAgenciaNova from "./pages/admin/AdminAgenciaNova";
import AdminAgenciaDetalhe from "./pages/admin/AdminAgenciaDetalhe";
import AdminNotificacoes from "./pages/admin/AdminNotificacoes";
import Metas from "./pages/Metas";
import ComissoesFinanceiro from "./pages/ComissoesFinanceiro";
import PagamentoPendente from "./pages/PagamentoPendente";
import NotFound from "./pages/NotFound";
import OrcamentoPublico from "./pages/OrcamentoPublico";
import Index from "./pages/Index";
import Cadastro from "./pages/Cadastro";
import TermosDeUso from "./pages/TermosDeUso";
import PoliticaPrivacidade from "./pages/PoliticaPrivacidade";

const queryClient = new QueryClient();

const LoadingScreen = () => (
  <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E3A8A 50%, #2563EB 100%)" }}>
    <h1 className="text-[32px] font-bold text-white tracking-tight mb-6">Via<span className="font-extrabold">Hub</span></h1>
    <div className="h-8 w-8 rounded-full border-[3px] border-white/20 border-t-[#06B6D4] animate-spin" />
  </div>
);

function AppRoutes() {
  const { user, loading } = useAuth() as any;

  return (
    <Routes>
      {/* === Public routes — always eager rendered === */}
      <Route path="/" element={user && !loading ? <Navigate to="/dashboard" replace /> : <Index />} />
      <Route path="/login" element={user && !loading ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/cadastro" element={<Cadastro />} />
      <Route path="/termos" element={<TermosDeUso />} />
      <Route path="/privacidade" element={<PoliticaPrivacidade />} />
      <Route path="/recuperar-senha" element={<RecuperarSenha />} />
      <Route path="/redefinir-senha" element={<RedefinirSenha />} />
      <Route path="/orcamento/:token" element={<OrcamentoPublico />} />

      {/* === Protected routes — session-only gate === */}
      <Route path="/*" element={<ProtectedRoutes loading={loading} user={user} />} />
    </Routes>
  );
}

function ProtectedRoutes({ loading, user }: { loading: boolean; user: any }) {
  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Routes>
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/pagamento-pendente" element={<PagamentoPendente />} />
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/orcamentos" element={<Orcamentos />} />
        <Route path="/orcamentos/novo" element={<OrcamentoNovo />} />
        <Route path="/orcamentos/:id" element={<OrcamentoDetalhe />} />
        <Route path="/orcamentos/:id/editar" element={<OrcamentoNovo modo="edicao" />} />
        <Route path="/pipeline" element={<Pipeline />} />
        <Route path="/metas" element={<Metas />} />
        <Route path="/relatorios" element={<Relatorios />} />
        <Route path="/financeiro/comissoes" element={<ComissoesFinanceiro />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/clientes/:id" element={<ClienteDetalhe />} />
        <Route path="/configuracoes/markup" element={<ConfigMarkup />} />
        <Route path="/configuracoes/agencia" element={<ConfigAgencia />} />
        <Route path="/configuracoes/assinatura" element={<ConfigAssinatura />} />
        <Route path="/configuracoes/usuarios" element={<ConfigUsuarios />} />
        <Route path="/configuracoes/templates" element={<ConfigTemplates />} />
        <Route path="/admin/agencias" element={<AdminAgencias />} />
        <Route path="/admin/agencias/nova" element={<AdminAgenciaNova />} />
        <Route path="/admin/agencias/:id" element={<AdminAgenciaDetalhe />} />
        <Route path="/admin/notificacoes" element={<AdminNotificacoes />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
