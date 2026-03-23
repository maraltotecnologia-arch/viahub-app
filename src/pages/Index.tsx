import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  FileText, BarChart3, Users, Sparkles, MessageCircle, TrendingUp,
  Menu, X, Check, ArrowRight, ChevronDown, Play, Shield,
} from "lucide-react";

/* ─── data ─── */
const navLinks = [
  { href: "#funcionalidades", label: "Funcionalidades" },
  { href: "#precos", label: "Preços" },
  { href: "#faq", label: "FAQ" },
];

const features = [
  { icon: FileText, title: "Orçamentos profissionais", desc: "Crie PDFs bonitos em minutos com itens, datas e markup automático." },
  { icon: Sparkles, title: "IA Copilot para cotações", desc: "Busque voos e hotéis com linguagem natural. A IA faz a cotação para você." },
  { icon: MessageCircle, title: "WhatsApp integrado", desc: "Envie orçamentos diretamente pelo WhatsApp da agência com um clique." },
  { icon: BarChart3, title: "Pipeline de vendas", desc: "Visualize e gerencie todas as negociações em um Kanban intuitivo." },
  { icon: Users, title: "Gestão de equipes", desc: "Múltiplos consultores com permissões e relatórios individuais." },
  { icon: TrendingUp, title: "Relatórios e métricas", desc: "Acompanhe conversão, faturamento e desempenho em tempo real." },
];

const steps = [
  { n: 1, title: "Cadastre sua agência", desc: "Crie sua conta em 2 minutos e configure seu perfil." },
  { n: 2, title: "Importe seus clientes", desc: "Adicione clientes ou importe uma lista existente facilmente." },
  { n: 3, title: "Comece a vender", desc: "Crie orçamentos, gerencie pipeline e feche mais vendas." },
];

const plans = [
  {
    name: "Starter", price: "R$ 397", popular: false,
    desc: "Ideal para agências iniciantes",
    feats: ["Até 3 usuários", "Orçamentos ilimitados", "PDF + WhatsApp", "CRM de clientes", "Relatórios básicos", "Suporte por email"],
    cta: "Começar grátis", ctaLink: "/cadastro",
  },
  {
    name: "Pro", price: "R$ 697", popular: true,
    desc: "Para agências em crescimento",
    feats: ["Até 10 usuários", "Tudo do Starter", "IA Copilot", "WhatsApp integrado", "Pipeline Kanban avançado", "Relatórios completos", "Suporte prioritário"],
    cta: "Começar grátis", ctaLink: "/cadastro",
  },
  {
    name: "Elite", price: "R$ 1.997", popular: false,
    desc: "Para agências que querem o máximo",
    feats: ["Usuários ilimitados", "Tudo do Pro", "Relatórios avançados", "Suporte prioritário", "Gestor de conta dedicado", "SLA garantido", "Onboarding exclusivo"],
    cta: "Falar com consultor", ctaLink: "mailto:suporte@viahub.app",
  },
];

const faqs = [
  { q: "Preciso instalar algum software?", a: "Não! O ViaHub é 100% online. Basta acessar pelo navegador em qualquer dispositivo — computador, tablet ou celular." },
  { q: "Posso testar antes de assinar?", a: "Sim! Oferecemos 14 dias grátis em qualquer plano, sem necessidade de cartão de crédito." },
  { q: "Como funciona o período de teste?", a: "Ao criar sua conta, você tem acesso completo a todas as funcionalidades do plano escolhido por 14 dias. Após esse período, você pode assinar ou sua conta será pausada." },
  { q: "Meus dados estão seguros?", a: "Absolutamente. Utilizamos criptografia de ponta a ponta, servidores seguros e estamos em conformidade com a LGPD." },
  { q: "Posso cancelar a qualquer momento?", a: "Sim, sem multas ou taxas. Você pode cancelar sua assinatura a qualquer momento diretamente pelo sistema." },
  { q: "Vocês oferecem suporte em português?", a: "Sim! Todo o suporte é em português, com atendimento por email e chat. Planos Pro e Elite contam com suporte prioritário." },
];

/* ─── component ─── */
export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate("/dashboard", { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    document.title = "ViaHub — O ecossistema da sua agência de viagens";
    document.documentElement.setAttribute("data-theme", "light");
    return () => {
      const saved = localStorage.getItem("viahub-theme") || "dark";
      document.documentElement.setAttribute("data-theme", saved);
    };
  }, []);

  if (loading || user) return null;

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans overflow-x-hidden">
      <Navbar menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      <Hero />
      <LogosSection />
      <FeaturesSection />
      <HowItWorks />
      <PricingSection />
      <FAQSection />
      <CTAFinal />
      <Footer />
    </div>
  );
}

/* ─── Navbar ─── */
function Navbar({ menuOpen, setMenuOpen }: { menuOpen: boolean; setMenuOpen: (v: boolean) => void }) {
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto h-16 flex items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <span className="text-sm font-bold text-white">VH</span>
          </div>
          <span className="text-lg font-bold text-gray-900">ViaHub</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-8">
          {navLinks.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-2">
          <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg transition-colors">
            Fazer login
          </Link>
          <Link to="/cadastro" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            Começar grátis
          </Link>
        </div>

        <div className="flex lg:hidden items-center gap-2">
          <Link to="/cadastro" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors">
            Começar grátis
          </Link>
          <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 text-gray-500" aria-label="Menu">
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="lg:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-1">
          {navLinks.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)} className="block text-base font-medium text-gray-600 py-2.5 border-b border-gray-50">
              {l.label}
            </a>
          ))}
          <Link to="/login" onClick={() => setMenuOpen(false)} className="block text-base font-medium text-gray-600 py-2.5">
            Fazer login
          </Link>
        </div>
      )}
    </header>
  );
}

/* ─── Hero ─── */
function Hero() {
  return (
    <section className="pt-16 sm:pt-24 pb-16 sm:pb-20 px-4 sm:px-6 text-center">
      <div className="max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-3 py-1 text-xs font-semibold mb-6">
          ✨ O sistema feito para agências de turismo
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-[1.1] tracking-tight mb-5">
          Gerencie sua agência de turismo com inteligência
        </h1>

        <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto mb-8 leading-relaxed">
          Orçamentos, clientes, pipeline e IA em um único sistema. Do rascunho à venda em minutos.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/cadastro" className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-base font-semibold shadow-sm transition-colors">
            Começar 14 dias grátis <ArrowRight className="w-4 h-4" />
          </Link>
          <a href="#funcionalidades" className="inline-flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 px-6 py-3 rounded-xl text-base font-medium hover:bg-gray-50 transition-colors">
            <Play className="w-4 h-4" /> Ver demonstração
          </a>
        </div>

        <div className="mt-8 flex items-center justify-center gap-3 text-sm text-gray-400">
          <div className="flex -space-x-2">
            {["bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-purple-500"].map((bg, i) => (
              <div key={i} className={`w-8 h-8 rounded-full ${bg} border-2 border-white flex items-center justify-center text-white text-[10px] font-bold`}>
                {["AC", "RM", "JF", "LS"][i]}
              </div>
            ))}
          </div>
          <span>Mais de 500 agências já usam</span>
        </div>

        {/* Mockup */}
        <div className="mt-16 max-w-5xl mx-auto bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-400" />
              <span className="w-3 h-3 rounded-full bg-amber-400" />
              <span className="w-3 h-3 rounded-full bg-emerald-400" />
            </div>
            <span className="text-xs text-gray-400 ml-2">app.viahub.app</span>
          </div>
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: "Faturamento", value: "R$ 47.200" },
                { label: "Orçamentos", value: "23" },
                { label: "Conversão", value: "89%" },
              ].map((m) => (
                <div key={m.label} className="bg-gray-50 rounded-xl p-3 sm:p-4 border border-gray-100">
                  <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide mb-1">{m.label}</p>
                  <p className="text-lg sm:text-2xl font-bold text-gray-900">{m.value}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              {[
                { client: "Rafael Andrade", dest: "Cancún", val: "R$ 12.400", status: "Aprovado", cls: "bg-emerald-50 text-emerald-700" },
                { client: "Maria Silva", dest: "Paris", val: "R$ 18.900", status: "Enviado", cls: "bg-blue-50 text-blue-700" },
                { client: "Carlos Souza", dest: "Orlando", val: "R$ 8.750", status: "Rascunho", cls: "bg-gray-100 text-gray-600" },
              ].map((r, i) => (
                <div key={i} className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[2fr_1fr_1fr_auto] gap-2 sm:gap-4 px-3 sm:px-4 py-3 border-b border-gray-50 last:border-0 text-sm">
                  <span className="font-medium text-gray-900 truncate">{r.client}</span>
                  <span className="hidden sm:block text-gray-500">{r.dest}</span>
                  <span className="text-gray-700 font-medium">{r.val}</span>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${r.cls}`}>{r.status}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="h-12 bg-gradient-to-t from-white to-transparent -mt-12 relative z-10" />
        </div>
      </div>
    </section>
  );
}

/* ─── Logos / Social Proof ─── */
function LogosSection() {
  return (
    <section className="py-16 px-4 sm:px-6 bg-gray-50 border-y border-gray-100">
      <p className="text-sm text-gray-400 text-center mb-8">
        Integrado com as principais ferramentas do mercado de turismo
      </p>
      <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
        {["Asaas", "WhatsApp Business", "Google", "LATAM", "Azul", "GOL"].map((name) => (
          <span key={name} className="text-sm font-semibold text-gray-300 hover:text-gray-500 transition-colors cursor-default select-none">
            {name}
          </span>
        ))}
      </div>
    </section>
  );
}

/* ─── Features ─── */
function FeaturesSection() {
  return (
    <section id="funcionalidades" className="py-20 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">FUNCIONALIDADES</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Tudo que sua agência precisa</h2>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">Uma plataforma completa, do orçamento ao pagamento.</p>
        </div>

        {/* Feature highlight */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20 items-center">
          <div>
            <span className="inline-flex items-center bg-blue-50 text-blue-700 rounded-full px-2.5 py-0.5 text-xs font-bold mb-4">NOVO</span>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">IA Copilot para cotações</h3>
            <p className="text-gray-500 leading-relaxed mb-6">
              Descreva a viagem em linguagem natural e receba um orçamento completo com preços reais. A inteligência artificial faz o trabalho pesado por você.
            </p>
            <ul className="space-y-2">
              {["Busca automática de voos e hotéis", "Markup inteligente aplicado", "PDF profissional gerado em segundos"].map((item) => (
                <li key={item} className="flex gap-2 text-sm text-gray-600">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-gray-100 rounded-2xl h-64 sm:h-80 flex items-center justify-center">
            <div className="text-center">
              <Sparkles className="w-12 h-12 text-blue-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 font-medium">IA Copilot Preview</p>
            </div>
          </div>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="bg-white rounded-xl border border-gray-100 p-6 hover:border-blue-200 hover:shadow-sm transition-all cursor-default">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── How It Works ─── */
function HowItWorks() {
  return (
    <section className="py-20 px-4 sm:px-6 bg-gray-50">
      <div className="max-w-4xl mx-auto text-center">
        <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">COMO FUNCIONA</p>
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Simples de começar</h2>
        <p className="text-lg text-gray-500 max-w-xl mx-auto mb-12">Em 3 passos você já está vendendo mais.</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {steps.map((s) => (
            <div key={s.n} className="text-center">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-lg mx-auto mb-4 flex items-center justify-center">
                {s.n}
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">{s.title}</h3>
              <p className="text-sm text-gray-500">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Pricing ─── */
function PricingSection() {
  return (
    <section id="precos" className="py-20 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">PREÇOS</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Planos para cada momento</h2>
          <p className="text-lg text-gray-500">14 dias grátis em qualquer plano. Sem cartão de crédito.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {plans.map((p) => {
            const isExternal = p.ctaLink.startsWith("mailto:");
            return (
              <div
                key={p.name}
                className={`bg-white rounded-2xl p-6 relative ${
                  p.popular
                    ? "border-2 border-blue-500 shadow-lg"
                    : "border border-gray-100"
                }`}
              >
                {p.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white rounded-full px-3 py-0.5 text-xs font-bold whitespace-nowrap">
                    Mais popular
                  </span>
                )}
                <h3 className="text-lg font-bold text-gray-900 mb-1">{p.name}</h3>
                <div className="mb-1">
                  <span className="text-4xl font-bold text-gray-900">{p.price}</span>
                  <span className="text-base text-gray-500">/mês</span>
                </div>
                <p className="text-sm text-gray-500 mb-6">{p.desc}</p>
                <ul className="space-y-2.5 mb-6">
                  {p.feats.map((f) => (
                    <li key={f} className="flex gap-2 text-sm text-gray-600">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>
                {isExternal ? (
                  <a
                    href={p.ctaLink}
                    className="block w-full text-center bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
                  >
                    {p.cta}
                  </a>
                ) : (
                  <Link
                    to={p.ctaLink}
                    className={`block w-full text-center text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors ${
                      p.popular
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {p.cta}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─── FAQ ─── */
function FAQSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <section id="faq" className="py-20 px-4 sm:px-6 bg-gray-50">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">FAQ</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Perguntas frequentes</h2>
        </div>

        <div className="space-y-0">
          {faqs.map((faq, i) => (
            <div key={i} className="border-b border-gray-100 py-5">
              <button
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                className="w-full flex items-center justify-between text-left"
              >
                <span className="text-base font-semibold text-gray-900 pr-4">{faq.q}</span>
                <ChevronDown className={`w-5 h-5 text-gray-400 shrink-0 transition-transform duration-200 ${openIdx === i ? "rotate-180" : ""}`} />
              </button>
              {openIdx === i && (
                <p className="text-sm text-gray-500 leading-relaxed pt-3 pb-1">{faq.a}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── CTA Final ─── */
function CTAFinal() {
  return (
    <section className="py-20 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto text-center bg-blue-600 rounded-3xl p-12 sm:p-16">
        <h2 className="text-3xl font-bold text-white mb-4">Pronto para transformar sua agência?</h2>
        <p className="text-blue-100 mb-8">
          14 dias grátis, sem cartão de crédito. Configure em menos de 5 minutos.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/cadastro" className="inline-flex items-center gap-2 bg-white text-blue-600 font-semibold px-8 py-3 rounded-xl hover:bg-blue-50 transition-colors">
            Começar agora <ArrowRight className="w-4 h-4" />
          </Link>
          <a href="mailto:suporte@viahub.app" className="text-white/80 hover:text-white text-sm underline-offset-2 hover:underline transition-colors">
            Falar com vendas
          </a>
        </div>
        <p className="text-blue-200 text-xs mt-6 flex items-center justify-center gap-1">
          <Shield className="w-3.5 h-3.5" /> Dados protegidos pela LGPD
        </p>
      </div>
    </section>
  );
}

/* ─── Footer ─── */
function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
                <span className="text-xs font-bold text-white">VH</span>
              </div>
              <span className="text-base font-bold text-white">ViaHub</span>
            </div>
            <p className="text-sm leading-relaxed">O ecossistema completo para agências de turismo brasileiras.</p>
          </div>

          {/* Produto */}
          <div>
            <h4 className="text-sm font-semibold text-gray-200 mb-3">Produto</h4>
            <div className="space-y-2">
              <a href="#funcionalidades" className="block text-sm hover:text-gray-200 transition-colors">Funcionalidades</a>
              <a href="#precos" className="block text-sm hover:text-gray-200 transition-colors">Preços</a>
              <Link to="/cadastro" className="block text-sm hover:text-gray-200 transition-colors">Cadastro</Link>
              <Link to="/login" className="block text-sm hover:text-gray-200 transition-colors">Área do Cliente</Link>
            </div>
          </div>

          {/* Suporte */}
          <div>
            <h4 className="text-sm font-semibold text-gray-200 mb-3">Suporte</h4>
            <div className="space-y-2">
              <a href="mailto:suporte@viahub.app" className="block text-sm hover:text-gray-200 transition-colors">Contato</a>
              <Link to="/termos" className="block text-sm hover:text-gray-200 transition-colors">Termos de uso</Link>
              <Link to="/privacidade" className="block text-sm hover:text-gray-200 transition-colors">Privacidade</Link>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-600">
          <p>© 2025 ViaHub. Todos os direitos reservados.</p>
          <p>CNPJ: 48.586.964/0001-90 — Maralto Tecnologia</p>
        </div>
      </div>
    </footer>
  );
}
