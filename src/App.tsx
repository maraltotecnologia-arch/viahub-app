import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/orcamentos" element={<Orcamentos />} />
            <Route path="/orcamentos/novo" element={<OrcamentoNovo />} />
            <Route path="/orcamentos/:id" element={<OrcamentoDetalhe />} />
            <Route path="/pipeline" element={<Pipeline />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/clientes/:id" element={<ClienteDetalhe />} />
            <Route path="/configuracoes/markup" element={<ConfigMarkup />} />
            <Route path="/configuracoes/agencia" element={<ConfigAgencia />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
