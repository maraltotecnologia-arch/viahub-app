import { useEffect } from "react";
import { Link } from "react-router-dom";

const sections = [
  { id: "dados-coletados", title: "1. Dados Coletados" },
  { id: "finalidade", title: "2. Finalidade do Tratamento" },
  { id: "compartilhamento", title: "3. Compartilhamento de Dados" },
  { id: "seguranca", title: "4. Segurança" },
  { id: "direitos", title: "5. Direitos do Titular (LGPD)" },
  { id: "retencao", title: "6. Retenção de Dados" },
  { id: "cookies", title: "7. Cookies e Armazenamento Local" },
  { id: "transferencia", title: "8. Transferência Internacional" },
  { id: "menores", title: "9. Menores de Idade" },
  { id: "alteracoes", title: "10. Alterações nesta Política" },
  { id: "contato-dpo", title: "11. Contato e DPO" },
];

export default function PoliticaPrivacidade() {
  useEffect(() => {
    document.title = "Política de Privacidade — ViaHub";
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
          <h1 className="text-3xl font-bold text-[#0F172A] mb-1">Política de Privacidade</h1>
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
            <p className="font-semibold">Controlador dos dados:</p>
            <p>Maralto Tecnologia da Informação e Serviços Digitais LTDA</p>
            <p>CNPJ: 48.586.964/0001-90</p>
            <p>E-mail DPO: suporte@viahub.app</p>
          </div>

          <div className="prose prose-sm max-w-none text-[#334155] space-y-8">
            <section id="dados-coletados">
              <h2 className="text-lg font-bold text-[#0F172A]">1. Dados Coletados</h2>

              <h3 className="text-base font-semibold text-[#0F172A] mt-4">1.1 Dados da Agência (Contratante)</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Razão social / nome fantasia</li>
                <li>CNPJ, endereço, telefone, email</li>
                <li>Logo da agência</li>
                <li>Plano contratado e histórico de uso</li>
              </ul>

              <h3 className="text-base font-semibold text-[#0F172A] mt-4">1.2 Dados de Usuários da Agência</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Nome completo, cargo, email, senha (armazenada com hash seguro)</li>
              </ul>

              <h3 className="text-base font-semibold text-[#0F172A] mt-4">1.3 Dados de Clientes da Agência</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Nome, email, telefone, CPF, número de passaporte, data de nascimento</li>
                <li>Esses dados pertencem ao Contratante e são tratados pela Maralto na qualidade de Operadora (LGPD art. 39)</li>
              </ul>

              <h3 className="text-base font-semibold text-[#0F172A] mt-4">1.4 Dados de Uso da Plataforma</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Orçamentos, itens, valores, histórico</li>
                <li>Relatórios e métricas de uso</li>
                <li>Logs de acesso e atividade</li>
              </ul>

              <h3 className="text-base font-semibold text-[#0F172A] mt-4">1.5 Dados Técnicos</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Endereço IP, navegador, sistema operacional (para segurança)</li>
                <li>Preferências de interface (ex: tema)</li>
              </ul>
            </section>

            <section id="finalidade">
              <h2 className="text-lg font-bold text-[#0F172A]">2. Finalidade do Tratamento</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Prestação dos serviços contratados</li>
                <li>Autenticação e segurança de acesso</li>
                <li>Cálculo de comissões variáveis</li>
                <li>Comunicações sobre o serviço (atualizações, manutenções, cobranças)</li>
                <li>Melhoria contínua da plataforma</li>
                <li>Cumprimento de obrigações legais</li>
                <li>A Maralto <strong>NÃO</strong> vende dados a terceiros</li>
                <li>A Maralto <strong>NÃO</strong> usa dados para fins publicitários</li>
              </ul>
            </section>

            <section id="compartilhamento">
              <h2 className="text-lg font-bold text-[#0F172A]">3. Compartilhamento de Dados</h2>
              <p>Os dados podem ser compartilhados com:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Supabase Inc.:</strong> infraestrutura de banco de dados e autenticação (servidores na região South America)</li>
                <li><strong>Resend:</strong> envio de emails transacionais</li>
                <li><strong>Asaas:</strong> processamento de pagamentos (dados financeiros da agência apenas)</li>
                <li><strong>Evolution API / WhatsApp Business:</strong> envio de mensagens autorizadas pelo usuário</li>
                <li><strong>APIs de consolidadoras (Ligaí, BeFly, RexturAdvance, TBO.com):</strong> dados de consulta de preços (sem dados pessoais de clientes finais)</li>
                <li><strong>Provedores de IA (Dify.ai e outros):</strong> apenas dados inseridos pelo usuário nos campos de IA, sem identificação de clientes finais</li>
                <li><strong>Autoridades públicas:</strong> quando exigido por lei ou ordem judicial</li>
              </ul>
            </section>

            <section id="seguranca">
              <h2 className="text-lg font-bold text-[#0F172A]">4. Segurança</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Comunicações protegidas por HTTPS/TLS</li>
                <li>Senhas armazenadas com hash (nunca em texto puro)</li>
                <li>Isolamento de dados por agência via Row Level Security (RLS) no banco</li>
                <li>Backups automáticos diários</li>
                <li>Acesso aos dados restrito a funcionários autorizados da Maralto</li>
                <li>Incidentes de segurança serão comunicados em até 72 horas conforme exigido pela LGPD</li>
              </ul>
            </section>

            <section id="direitos">
              <h2 className="text-lg font-bold text-[#0F172A]">5. Direitos do Titular (LGPD)</h2>
              <p>Conforme a Lei nº 13.709/2018, o titular dos dados tem direito a:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Confirmação da existência de tratamento</li>
                <li>Acesso aos dados</li>
                <li>Correção de dados incompletos ou desatualizados</li>
                <li>Anonimização, bloqueio ou eliminação</li>
                <li>Portabilidade dos dados</li>
                <li>Eliminação dos dados tratados com consentimento</li>
                <li>Informação sobre compartilhamento</li>
                <li>Revogação do consentimento</li>
              </ul>
              <p className="mt-2">Para exercer esses direitos: <strong>suporte@viahub.app</strong></p>
            </section>

            <section id="retencao">
              <h2 className="text-lg font-bold text-[#0F172A]">6. Retenção de Dados</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Dados ativos: mantidos durante toda a vigência do contrato</li>
                <li>Após cancelamento: disponíveis por 30 dias para exportação</li>
                <li>Após 30 dias: excluídos permanentemente</li>
                <li>Logs de segurança: mantidos por 6 meses</li>
                <li>Dados fiscais: mantidos por 5 anos conforme obrigação legal</li>
              </ul>
            </section>

            <section id="cookies">
              <h2 className="text-lg font-bold text-[#0F172A]">7. Cookies e Armazenamento Local</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Usamos apenas cookies e localStorage essenciais para autenticação e preferências de interface (ex: tema dark/light)</li>
                <li>Sem cookies de rastreamento, remarketing ou publicidade</li>
                <li>Sem integração com Google Analytics, Facebook Pixel ou similares</li>
              </ul>
            </section>

            <section id="transferencia">
              <h2 className="text-lg font-bold text-[#0F172A]">8. Transferência Internacional</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Supabase pode armazenar dados em servidores fora do Brasil</li>
                <li>Essas transferências seguem as salvaguardas previstas na LGPD (cláusulas contratuais padrão e certificações de adequação)</li>
              </ul>
            </section>

            <section id="menores">
              <h2 className="text-lg font-bold text-[#0F172A]">9. Menores de Idade</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>O ViaHub não é destinado a menores de 18 anos</li>
                <li>Não coletamos intencionalmente dados de menores</li>
              </ul>
            </section>

            <section id="alteracoes">
              <h2 className="text-lg font-bold text-[#0F172A]">10. Alterações nesta Política</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Alterações serão comunicadas por email e notificação no sistema com antecedência de 15 dias</li>
                <li>O uso continuado após as alterações implica aceitação</li>
              </ul>
            </section>

            <section id="contato-dpo">
              <h2 className="text-lg font-bold text-[#0F172A]">11. Contato e DPO</h2>
              <div className="space-y-1">
                <p>Encarregado de Proteção de Dados (DPO): <strong>suporte@viahub.app</strong></p>
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
