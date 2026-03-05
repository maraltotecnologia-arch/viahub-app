import { useEffect } from "react";
import { Link } from "react-router-dom";

const sections = [
  { id: "aceitacao", title: "1. Aceitação dos Termos" },
  { id: "descricao", title: "2. Descrição do Serviço" },
  { id: "cadastro", title: "3. Cadastro e Elegibilidade" },
  { id: "pagamento", title: "4. Planos e Pagamento" },
  { id: "integracoes", title: "5. Integrações e APIs de Terceiros" },
  { id: "ia", title: "6. Inteligência Artificial" },
  { id: "propriedade", title: "7. Propriedade Intelectual" },
  { id: "limitacao", title: "8. Limitação de Responsabilidade" },
  { id: "rescisao", title: "9. Rescisão" },
  { id: "legislacao", title: "10. Legislação Aplicável" },
  { id: "contato", title: "11. Contato" },
];

export default function TermosDeUso() {
  useEffect(() => {
    document.title = "Termos de Uso — ViaHub";
    document.documentElement.setAttribute("data-theme", "light");
    document.documentElement.style.setProperty("--bg-primary", "#ffffff");
    return () => {
      const saved = localStorage.getItem("viahub-theme") || "dark";
      document.documentElement.setAttribute("data-theme", saved);
      document.documentElement.style.removeProperty("--bg-primary");
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      {/* Header */}
      <header className="border-b border-[#E2E8F0] bg-white sticky top-0 z-10">
        <div className="max-w-[800px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-[#0F172A]">
            Via<span className="font-extrabold">Hub</span>
          </Link>
          <Link
            to="/login"
            className="text-sm font-medium text-[#2563EB] hover:underline"
          >
            Área do Cliente
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-[800px] w-full mx-auto px-6 py-10">
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-[#E2E8F0] p-8 sm:p-12">
          <h1 className="text-3xl font-bold text-[#0F172A] mb-1">Termos de Uso</h1>
          <p className="text-sm text-[#64748B] mb-8">Última atualização: março de 2026</p>

          <div className="mb-8 p-4 rounded-xl bg-[#F1F5F9] border border-[#E2E8F0]">
            <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">Índice</p>
            <nav className="space-y-1">
              {sections.map((s) => (
                <a key={s.id} href={`#${s.id}`} className="block text-sm text-[#2563EB] hover:underline">
                  {s.title}
                </a>
              ))}
            </nav>
          </div>

          <div className="mb-8 p-4 rounded-xl bg-[#F1F5F9] border border-[#E2E8F0] text-sm text-[#334155] space-y-1">
            <p className="font-semibold">Responsável:</p>
            <p>Maralto Tecnologia da Informação e Serviços Digitais LTDA</p>
            <p>CNPJ: 48.586.964/0001-90</p>
            <p>Site: maraltotecnologia.com.br</p>
            <p>E-mail: suporte@viahub.app</p>
          </div>

          <div className="prose prose-sm max-w-none text-[#334155] space-y-8">
            <section id="aceitacao">
              <h2 className="text-lg font-bold text-[#0F172A]">1. Aceitação dos Termos</h2>
              <p>Ao acessar ou usar o ViaHub, o usuário pessoa jurídica ("Contratante") concorda integralmente com estes Termos. Caso não concorde, deve cessar o uso imediatamente. O uso continuado após alterações nos Termos implica aceitação das mudanças.</p>
            </section>

            <section id="descricao">
              <h2 className="text-lg font-bold text-[#0F172A]">2. Descrição do Serviço</h2>
              <p>O ViaHub é uma plataforma SaaS (Software as a Service) de gestão para agências de viagem, oferecendo: criação e gestão de orçamentos, pipeline de vendas, CRM de clientes, relatórios financeiros, geração de PDF, integração com WhatsApp, e futuramente recursos de Inteligência Artificial para cotação automática e integração com consolidadoras e APIs de fornecedores (aéreos, hotéis, pacotes, seguros e transfers).</p>
            </section>

            <section id="cadastro">
              <h2 className="text-lg font-bold text-[#0F172A]">3. Cadastro e Elegibilidade</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Uso permitido apenas para pessoas jurídicas legalmente constituídas no Brasil</li>
                <li>O Contratante é responsável pela veracidade dos dados cadastrados</li>
                <li>É proibido compartilhar credenciais de acesso</li>
                <li>O cadastro de menores de 18 anos como usuários não é permitido</li>
                <li>A Maralto pode suspender contas em caso de uso indevido, fraude ou violação destes Termos</li>
              </ul>
            </section>

            <section id="pagamento">
              <h2 className="text-lg font-bold text-[#0F172A]">4. Planos e Pagamento</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Cobrança mensal antecipada conforme plano escolhido no momento do cadastro</li>
                <li>Planos com encargos operacionais: taxa calculada automaticamente e embutida nos valores dos orçamentos gerados, conforme o plano contratado</li>
                <li>O Contratante é responsável pela correta marcação dos orçamentos pagos</li>
                <li>Não há reembolso após 7 dias corridos do início do uso</li>
                <li>A Maralto reserva o direito de reajustar os preços com aviso prévio de 30 dias</li>
                <li>Inadimplência superior a 15 dias pode resultar em suspensão do acesso</li>
              </ul>
            </section>

            <section id="integracoes">
              <h2 className="text-lg font-bold text-[#0F172A]">5. Integrações e APIs de Terceiros</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>O ViaHub poderá integrar-se a APIs de consolidadoras de viagens (como Ligaí, BeFly, RexturAdvance, TBO.com e outras), provedores de IA (como Dify.ai e outros), serviços de automação (como n8n), provedores de email (como Resend), WhatsApp Business API (como Evolution API), gateways de pagamento (como Asaas) e outros serviços de terceiros</li>
                <li>O uso dessas integrações está sujeito aos termos e políticas de cada provedor</li>
                <li>A Maralto não se responsabiliza por indisponibilidades, alterações de preço ou descontinuação de serviços de terceiros</li>
                <li>Preços retornados por APIs de consolidadoras são estimativas e podem variar — o Contratante é responsável pela confirmação final junto aos fornecedores antes de emitir um bilhete ou voucher</li>
              </ul>
            </section>

            <section id="ia">
              <h2 className="text-lg font-bold text-[#0F172A]">6. Inteligência Artificial</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Recursos de IA do ViaHub são ferramentas de apoio à decisão, não substituindo o julgamento profissional do agente de viagens</li>
                <li>Orçamentos gerados por IA são identificados com a marcação "Gerado por IA" e devem ser revisados antes do envio ao cliente</li>
                <li>A Maralto não garante precisão absoluta dos resultados gerados por IA</li>
                <li>O Contratante é responsável pelo conteúdo dos orçamentos enviados aos seus clientes, independentemente da origem (manual ou IA)</li>
                <li>Dados inseridos em campos de IA podem ser processados por provedores externos de LLM — informações sensíveis não devem ser inseridas nesses campos</li>
              </ul>
            </section>

            <section id="propriedade">
              <h2 className="text-lg font-bold text-[#0F172A]">7. Propriedade Intelectual</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>O código-fonte, design, marca ViaHub, logotipos e toda a propriedade intelectual da plataforma pertencem à Maralto Tecnologia da Informação e Serviços Digitais LTDA</li>
                <li>Os dados inseridos pelo Contratante (clientes, orçamentos, configurações) pertencem ao Contratante</li>
                <li>É vedada a engenharia reversa, cópia, redistribuição ou uso comercial da plataforma sem autorização expressa</li>
              </ul>
            </section>

            <section id="limitacao">
              <h2 className="text-lg font-bold text-[#0F172A]">8. Limitação de Responsabilidade</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>A Maralto não se responsabiliza por perdas financeiras decorrentes de uso indevido da plataforma</li>
                <li>A Maralto não se responsabiliza por erros em preços retornados por APIs de terceiros</li>
                <li>A Maralto não se responsabiliza por decisões tomadas com base em sugestões da IA</li>
                <li>O SLA (nível de serviço) é de 99% de disponibilidade mensal — períodos de manutenção programada serão comunicados com antecedência mínima de 24 horas</li>
                <li>Em caso de falhas técnicas, a responsabilidade da Maralto limita-se ao valor mensalmente pago pelo Contratante</li>
              </ul>
            </section>

            <section id="rescisao">
              <h2 className="text-lg font-bold text-[#0F172A]">9. Rescisão</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>O Contratante pode cancelar a qualquer momento pelo sistema ou via suporte@viahub.app</li>
                <li>Após o cancelamento, os dados ficam disponíveis para exportação por 30 dias</li>
                <li>Após 30 dias, os dados são excluídos permanentemente</li>
                <li>A Maralto pode rescindir o contrato imediatamente em caso de violação destes Termos</li>
              </ul>
            </section>

            <section id="legislacao">
              <h2 className="text-lg font-bold text-[#0F172A]">10. Legislação Aplicável</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Estes Termos são regidos pelas leis brasileiras</li>
                <li>Fica eleito o foro da comarca de Curitiba/PR para resolução de conflitos</li>
                <li>Para questões de proteção de dados, aplica-se a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)</li>
              </ul>
            </section>

            <section id="contato">
              <h2 className="text-lg font-bold text-[#0F172A]">11. Contato</h2>
              <div className="space-y-1">
                <p>ViaHub — suporte@viahub.app</p>
                <p>Maralto Tecnologia da Informação e Serviços Digitais LTDA</p>
                <p>CNPJ: 48.586.964/0001-90</p>
                <p>maraltotecnologia.com.br</p>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E2E8F0] bg-white mt-auto">
        <div className="max-w-[800px] mx-auto px-6 py-6 text-center">
          <p className="text-xs text-[#94A3B8]">© 2026 ViaHub · Maralto Tecnologia da Informação e Serviços Digitais LTDA</p>
        </div>
      </footer>
    </div>
  );
}
