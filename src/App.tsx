import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import useUserRole from "@/hooks/useUserRole";
import Login from "./pages/Login";
import VerificarEmail from "./pages/VerificarEmail";
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
import ConfigUsuarios from "./pages/ConfigUsuarios";
import ConfigTemplates from "./pages/ConfigTemplates";
import AdminAgencias from "./pages/admin/AdminAgencias";
import AdminAgenciaNova from "./pages/admin/AdminAgenciaNova";
import AdminAgenciaDetalhe from "./pages/admin/AdminAgenciaDetalhe";
import AdminNotificacoes from "./pages/admin/AdminNotificacoes";
import Metas from "./pages/Metas";
import ComissoesFinanceiro from "./pages/ComissoesFinanceiro";
import NotFound from "./pages/NotFound";
import OrcamentoPublico from "./pages/OrcamentoPublico";
import Index from "./pages/Index";
import Cadastro from "./pages/Cadastro";
import TermosDeUso from "./pages/TermosDeUso";
import PoliticaPrivacidade from "./pages/PoliticaPrivacidade";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user } = useAuth();

  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/verificar-email" element={<VerificarEmail />} />
        <Route path="/termos" element={<TermosDeUso />} />
        <Route path="/privacidade" element={<PoliticaPrivacidade />} />
        <Route path="/recuperar-senha" element={<RecuperarSenha />} />
        <Route path="/redefinir-senha" element={<RedefinirSenha />} />
        <Route path="/orcamento/:token" element={<OrcamentoPublico />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/redefinir-senha" element={<RedefinirSenha />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/orcamento/:token" element={<OrcamentoPublico />} />
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
