import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import AppLayout from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Orcamentos from "./pages/Orcamentos";
import OrcamentoNovo from "./pages/OrcamentoNovo";
import OrcamentoDetalhe from "./pages/OrcamentoDetalhe";
import Pipeline from "./pages/Pipeline";
import Clientes from "./pages/Clientes";
import ClienteDetalhe from "./pages/ClienteDetalhe";
import ConfigMarkup from "./pages/ConfigMarkup";
import ConfigAgencia from "./pages/ConfigAgencia";
import AdminAgencias from "./pages/admin/AdminAgencias";
import AdminAgenciaNova from "./pages/admin/AdminAgenciaNova";
import AdminAgenciaDetalhe from "./pages/admin/AdminAgenciaDetalhe";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user } = useAuth();

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/orcamentos" element={<Orcamentos />} />
        <Route path="/orcamentos/novo" element={<OrcamentoNovo />} />
        <Route path="/orcamentos/:id" element={<OrcamentoDetalhe />} />
        <Route path="/orcamentos/:id/editar" element={<OrcamentoNovo modo="edicao" />} />
        <Route path="/pipeline" element={<Pipeline />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/clientes/:id" element={<ClienteDetalhe />} />
        <Route path="/configuracoes/markup" element={<ConfigMarkup />} />
        <Route path="/configuracoes/agencia" element={<ConfigAgencia />} />
        <Route path="/admin/agencias" element={<AdminAgencias />} />
        <Route path="/admin/agencias/nova" element={<AdminAgenciaNova />} />
        <Route path="/admin/agencias/:id" element={<AdminAgenciaDetalhe />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
