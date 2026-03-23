import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  FileText, BarChart3, Users, Sparkles, MessageCircle, TrendingUp,
  Menu, X, Check, ArrowRight, ChevronDown, Play, Star,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";

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
  { icon: BarChart3, title: "Pipeline de vendas visual", desc: "Visualize e gerencie todas as negociações em um Kanban intuitivo." },
  { icon: Users, title: "Gestão de consultores", desc: "Múltiplos consultores com permissões e relatórios individuais." },
  { icon: TrendingUp, title: "Relatórios e métricas", desc: "Acompanhe conversão, faturamento e desempenho em tempo real." },
];

const steps = [
  { n: 1, title: "Crie sua conta", desc: "Cadastre sua agência em 2 minutos e configure seu perfil." },
  { n: 2, title: "Configure e importe", desc: "Adicione clientes, configure markups e personalize templates." },
  { n: 3, title: "Comece a vender", desc: "Crie orçamentos, gerencie pipeline e feche mais vendas." },
];

const plansData = {
  monthly: [
    {
      name: "Starter", price: "R$ 397", popular: false,
      desc: "Ideal para agências iniciantes",
      feats: ["Até 3 usuários", "Orçamentos ilimitados", "PDF + WhatsApp", "CRM de clientes", "Relatórios básicos", "Suporte por email"],
    },
    {
      name: "Pro", price: "R$ 697", popular: true,
      desc: "Para agências em crescimento",
      feats: ["Até 10 usuários", "Tudo do Starter", "IA Copilot", "WhatsApp integrado", "Pipeline Kanban avançado", "Relatórios completos", "Suporte prioritário"],
    },
    {
      name: "Elite", price: "R$ 1.997", popular: false,
      desc: "Para agências que querem o máximo",
      feats: ["Usuários ilimitados", "Tudo do Pro", "Relatórios avançados", "Suporte prioritário", "Gestor de conta dedicado", "SLA garantido", "Onboarding exclusivo"],
    },
  ],
  annual: [
    {
      name: "Starter", price: "R$ 330", popular: false,
      desc: "Ideal para agências iniciantes",
      feats: ["Até 3 usuários", "Orçamentos ilimitados", "PDF + WhatsApp", "CRM de clientes", "Relatórios básicos", "Suporte por email"],
    },
    {
      name: "Pro", price: "R$ 580", popular: true,
      desc: "Para agências em crescimento",
      feats: ["Até 10 usuários", "Tudo do Starter", "IA Copilot", "WhatsApp integrado", "Pipeline Kanban avançado", "Relatórios completos", "Suporte prioritário"],
    },
    {
      name: "Elite", price: "R$ 1.664", popular: false,
      desc: "Para agências que querem o máximo",
      feats: ["Usuários ilimitados", "Tudo do Pro", "Relatórios avançados", "Suporte prioritário", "Gestor de conta dedicado", "SLA garantido", "Onboarding exclusivo"],
    },
  ],
};

const faqs = [
  { q: "Preciso instalar algum software?", a: "Não! O ViaHub é 100% online. Basta acessar pelo navegador em qualquer dispositivo — computador, tablet ou celular." },
  { q: "Posso testar antes de assinar?", a: "Sim! Oferecemos 14 dias grátis em qualquer plano, sem necessidade de cartão de crédito." },
  { q: "Meus dados estão seguros?", a: "Absolutamente. Utilizamos criptografia de ponta a ponta, servidores seguros e estamos em conformidade com a LGPD." },
  { q: "Posso cancelar a qualquer momento?", a: "Sim, sem multas ou taxas. Você pode cancelar sua assinatura a qualquer momento diretamente pelo sistema." },
  { q: "Vocês oferecem suporte em português?", a: "Sim! Todo o suporte é em português, com atendimento por email e chat. Planos Pro e Elite contam com suporte prioritário." },
  { q: "O ViaHub integra com WhatsApp?", a: "Sim! Conecte o WhatsApp da sua agência e envie orçamentos profissionais com um clique direto pelo sistema." },
];

const testimonials = [
  { name: "Ana Carolina", role: "Diretora — Viagens & Sonhos", quote: "O ViaHub transformou nossa gestão. Reduziu em 70% o tempo gasto com orçamentos e trouxe controle total do pipeline." },
  { name: "Ricardo Mendes", role: "CEO — RM Turismo", quote: "O Copilot de IA é impressionante. Cotamos viagens complexas em minutos, coisa que antes levava horas." },
  { name: "Juliana Farias", role: "Gerente — JF Travel", quote: "A integração com WhatsApp e os relatórios detalhados nos deram visibilidade que nunca tivemos. Recomendo muito!" },
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
    <div className="min-h-screen bg-surface text-on-surface font-body overflow-x-hidden">
      <Navbar menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      <Hero />
      <LogosSection />
      <FeaturesSection />
      <HowItWorks />
      <PricingSection />
      <TestimonialsSection />
      <FAQSection />
      <CTAFinal />
      <Footer />
    </div>
  );
}

/* ─── Navbar ─── */
function Navbar({ menuOpen, setMenuOpen }: { menuOpen: boolean; setMenuOpen: (v: boolean) => void }) {
  return (
    <header className="sticky top-0 z-50 bg-surface-container-lowest/80 backdrop-blur-[12px] border-b border-outline-variant/15 h-16">
      <div className="max-w-7xl mx-auto h-full flex items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-container shadow-md shadow-primary/30 flex items-center justify-center">
            <span className="text-sm font-bold text-on-primary font-display">VH</span>
          </div>
          <span className="text-lg font-bold font-display tracking-tight text-on-surface">ViaHub</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-8">
          {navLinks.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium font-body text-on-surface-variant hover:text-on-surface transition-colors">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-2">
          <Link to="/login" className="text-sm font-medium text-primary hover:underline underline-offset-4 px-4 py-2 transition-colors">
            Entrar
          </Link>
          <Link to="/cadastro" className="bg-gradient-to-br from-primary to-primary-container text-on-primary text-sm font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-primary/20 hover:brightness-110 hover:shadow-xl hover:shadow-primary/30 transition-all">
            Começar grátis
          </Link>
        </div>

        <div className="flex lg:hidden items-center gap-2">
          <Link to="/cadastro" className="bg-gradient-to-br from-primary to-primary-container text-on-primary text-sm font-semibold px-4 py-2 rounded-xl shadow-lg shadow-primary/20 transition-all">
            Começar grátis
          </Link>
          <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 rounded-xl hover:bg-surface-container-high text-on-surface-variant" aria-label="Menu">
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="lg:hidden bg-surface-container-lowest border-t border-outline-variant/15 px-6 py-4 space-y-1">
          {navLinks.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)} className="block text-base font-medium font-body text-on-surface-variant py-2.5 border-b border-outline-variant/10">
              {l.label}
            </a>
          ))}
          <Link to="/login" onClick={() => setMenuOpen(false)} className="block text-base font-medium font-body text-primary py-2.5">
            Entrar
          </Link>
        </div>
      )}
    </header>
  );
}

/* ─── Hero ─── */
function Hero() {
  return (
    <section className="pt-28 pb-24 px-6 text-center">
      <div className="max-w-5xl mx-auto">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 mb-7 bg-primary/8 text-primary rounded-full px-4 py-1.5 text-xs font-semibold font-label border border-primary/15">
          ✨ O sistema feito para agências de turismo
        </div>

        {/* Title */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold font-display tracking-tight leading-[1.05] mb-6 text-on-surface">
          Gerencie sua agência{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
            com inteligência
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-xl text-on-surface-variant font-body max-w-2xl mx-auto mb-10 leading-relaxed">
          Orçamentos, clientes, pipeline e IA em um único sistema. Do rascunho à venda em minutos.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/cadastro"
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-br from-primary to-primary-container text-on-primary px-8 py-4 rounded-xl text-base font-semibold shadow-xl shadow-primary/25 hover:brightness-110 hover:shadow-2xl hover:shadow-primary/30 transition-all"
          >
            Começar 14 dias grátis <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="#funcionalidades"
            className="inline-flex items-center justify-center gap-2 bg-surface-container-lowest border border-outline-variant/30 text-on-surface px-8 py-4 rounded-xl text-base font-medium shadow-sm hover:bg-surface-container-low transition-all"
          >
            <Play className="w-4 h-4 text-primary" /> Ver demonstração
          </a>
        </div>

        {/* Social proof */}
        <div className="mt-10 flex items-center justify-center gap-3 text-sm text-on-surface-variant font-label">
          <div className="flex -space-x-2">
            {["AC", "RM", "JF", "LS"].map((initials, i) => (
              <div
                key={i}
                className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-container border-2 border-surface-container-lowest flex items-center justify-center text-on-primary text-[10px] font-bold font-display"
              >
                {initials}
              </div>
            ))}
          </div>
          <span>Mais de 500 agências confiam no ViaHub</span>
        </div>

        {/* Mockup */}
        <div className="mt-20 max-w-6xl mx-auto bg-surface-container-lowest rounded-2xl shadow-[0_40px_80px_rgba(13,28,45,0.14)] border border-outline-variant/20 p-3 sm:p-4 relative">
          {/* Chrome bar */}
          <div className="bg-surface-container-low rounded-xl flex items-center gap-2 px-4 py-2 mb-2">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-error/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-secondary/60" />
            </div>
            <div className="flex-1 bg-surface-container-high rounded-lg px-3 py-1 ml-2">
              <span className="text-[11px] text-on-surface-variant/50 font-label">app.viahub.app/dashboard</span>
            </div>
          </div>

          {/* Dashboard content */}
          <div className="rounded-xl overflow-hidden bg-surface-container-low">
            <div className="p-4 sm:p-6">
              {/* KPI row */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: "Faturamento", value: "R$ 47.200" },
                  { label: "Orçamentos", value: "23" },
                  { label: "Conversão", value: "89%" },
                ].map((m) => (
                  <div key={m.label} className="bg-surface-container-lowest rounded-xl p-3 sm:p-4 border border-outline-variant/10">
                    <p className="text-[10px] sm:text-xs text-on-surface-variant font-label uppercase tracking-wide mb-1">{m.label}</p>
                    <p className="text-lg sm:text-2xl font-extrabold font-display text-on-surface">{m.value}</p>
                  </div>
                ))}
              </div>
              {/* Table rows */}
              <div className="rounded-xl border border-outline-variant/10 overflow-hidden">
                {[
                  { client: "Rafael Andrade", dest: "Cancún", val: "R$ 12.400", status: "Aprovado", cls: "bg-secondary-container/50 text-secondary" },
                  { client: "Maria Silva", dest: "Paris", val: "R$ 18.900", status: "Enviado", cls: "bg-primary/10 text-primary" },
                  { client: "Carlos Souza", dest: "Orlando", val: "R$ 8.750", status: "Rascunho", cls: "bg-surface-container-highest text-on-surface-variant" },
                ].map((r, i) => (
                  <div key={i} className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[2fr_1fr_1fr_auto] gap-2 sm:gap-4 px-3 sm:px-4 py-3 border-b border-outline-variant/10 last:border-0 text-sm">
                    <span className="font-medium text-on-surface truncate">{r.client}</span>
                    <span className="hidden sm:block text-on-surface-variant">{r.dest}</span>
                    <span className="text-on-surface font-semibold">{r.val}</span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold font-label ${r.cls}`}>{r.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Gradient fade */}
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-surface-container-lowest to-transparent rounded-b-2xl" />
        </div>
      </div>
    </section>
  );
}

/* ─── Logos ─── */
function LogosSection() {
  return (
    <section className="py-16 bg-surface-container-low border-y border-outline-variant/10">
      <div className="max-w-5xl mx-auto px-6 text-center">
        <p className="text-xs font-semibold font-label text-on-surface-variant uppercase tracking-widest mb-8">
          Integrado com as ferramentas que você já usa
        </p>
        <div className="flex flex-wrap justify-center gap-10 sm:gap-14 items-center">
          {["Asaas", "Google Flights", "WhatsApp", "LATAM", "Azul", "GOL"].map((name) => (
            <span
              key={name}
              className="text-sm font-semibold font-label text-on-surface-variant/40 hover:text-on-surface-variant transition-all cursor-default select-none"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Features ─── */
function FeaturesSection() {
  return (
    <section id="funcionalidades" className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-20">
          <p className="text-xs font-bold font-label text-primary uppercase tracking-widest mb-4">FUNCIONALIDADES</p>
          <h2 className="text-4xl sm:text-5xl font-extrabold font-display tracking-tight text-on-surface mb-5">
            Tudo que sua agência precisa
          </h2>
          <p className="text-lg text-on-surface-variant font-body max-w-xl mx-auto">
            Uma plataforma completa, do orçamento ao pagamento.
          </p>
        </div>

        {/* Feature highlight */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 mb-24 items-center">
          <div>
            <span className="inline-flex items-center bg-primary/8 text-primary rounded-full px-3 py-1 text-xs font-semibold font-label mb-5">
              DESTAQUE
            </span>
            <h3 className="text-3xl font-bold font-display tracking-tight mb-4 text-on-surface">
              IA Copilot para cotações
            </h3>
            <p className="text-on-surface-variant font-body leading-relaxed mb-7 text-lg">
              Descreva a viagem em linguagem natural e receba um orçamento completo com preços reais. A inteligência artificial faz o trabalho pesado por você.
            </p>
            <ul className="space-y-3">
              {["Busca automática de voos e hotéis", "Markup inteligente aplicado", "PDF profissional gerado em segundos"].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-on-surface font-body">
                  <span className="w-5 h-5 rounded-full bg-secondary/15 text-secondary flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-surface-container-low rounded-2xl p-6 h-72 flex items-center justify-center border border-outline-variant/15">
            <div className="text-center">
              <Sparkles className="w-12 h-12 text-primary mx-auto mb-3" />
              <p className="text-sm text-on-surface-variant font-medium font-body">IA Copilot Preview</p>
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <div key={f.title} className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/10 hover:border-primary/20 hover:shadow-[0_8px_24px_rgba(13,28,45,0.07)] transition-all cursor-default">
              <div className="w-11 h-11 rounded-xl bg-primary/8 text-primary flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold font-headline mb-2 text-on-surface">{f.title}</h3>
              <p className="text-sm text-on-surface-variant font-body leading-relaxed">{f.desc}</p>
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
    <section className="py-24 px-6 bg-surface-container-low border-y border-outline-variant/10">
      <div className="max-w-4xl mx-auto text-center">
        <p className="text-xs font-bold font-label text-primary uppercase tracking-widest mb-4">COMO FUNCIONA</p>
        <h2 className="text-4xl sm:text-5xl font-extrabold font-display tracking-tight text-on-surface mb-5">
          Simples de começar
        </h2>
        <p className="text-lg text-on-surface-variant font-body max-w-xl mx-auto">
          Em 3 passos você já está vendendo mais.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-16 relative">
          {steps.map((s, i) => (
            <div key={s.n} className="relative text-center">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold font-display text-lg mx-auto mb-5 flex items-center justify-center shadow-md shadow-primary/20">
                {s.n}
              </div>
              <h3 className="text-lg font-semibold font-headline mb-2 text-on-surface">{s.title}</h3>
              <p className="text-sm text-on-surface-variant font-body">{s.desc}</p>
              {/* Arrow between steps (desktop) */}
              {i < steps.length - 1 && (
                <ArrowRight className="hidden sm:block absolute top-5 -right-6 w-5 h-5 text-outline-variant" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Pricing ─── */
function PricingSection() {
  const [annual, setAnnual] = useState(false);
  const plans = annual ? plansData.annual : plansData.monthly;

  return (
    <section id="precos" className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <p className="text-xs font-bold font-label text-primary uppercase tracking-widest mb-4">PREÇOS</p>
          <h2 className="text-4xl sm:text-5xl font-extrabold font-display tracking-tight text-on-surface mb-5">
            Planos para cada momento
          </h2>
          <p className="text-lg text-on-surface-variant font-body">
            14 dias grátis em qualquer plano. Sem cartão de crédito.
          </p>
        </div>

        {/* Toggle */}
        <div className="flex justify-center items-center gap-3 mb-12">
          <span className={`text-sm font-medium ${!annual ? "text-on-surface" : "text-on-surface-variant"}`}>Mensal</span>
          <Switch checked={annual} onCheckedChange={setAnnual} />
          <span className={`text-sm font-medium ${annual ? "text-on-surface" : "text-on-surface-variant"}`}>Anual</span>
          {annual && (
            <span className="bg-secondary-container/50 text-secondary rounded-full px-2.5 py-0.5 text-xs font-semibold font-label">
              2 meses grátis
            </span>
          )}
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`bg-surface-container-lowest rounded-2xl p-7 flex flex-col relative ${
                p.popular
                  ? "border border-primary/40 shadow-[0_16px_40px_rgba(0,55,176,0.12)]"
                  : "border border-outline-variant/15"
              }`}
            >
              {p.popular && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-primary-container text-on-primary rounded-full px-4 py-1 text-xs font-bold font-label shadow-sm whitespace-nowrap">
                  Mais popular
                </span>
              )}
              <h3 className="text-lg font-bold font-display mb-1 text-on-surface">{p.name}</h3>
              <div className="mb-1">
                <span className="text-5xl font-extrabold font-display text-on-surface tracking-tight">{p.price}</span>
                <span className="text-base text-on-surface-variant">/mês</span>
              </div>
              <p className="text-sm text-on-surface-variant font-body mb-6">{p.desc}</p>
              <ul className="space-y-3 flex-1">
                {p.feats.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm font-body text-on-surface">
                    <span className="w-4 h-4 rounded-full bg-secondary-container/60 text-secondary flex items-center justify-center flex-shrink-0">
                      <Check className="w-2.5 h-2.5" />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to={p.name === "Elite" ? "mailto:suporte@viahub.app" : "/cadastro"}
                className={`w-full mt-8 inline-flex items-center justify-center py-3.5 rounded-xl text-sm font-semibold transition-all ${
                  p.popular
                    ? "bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-lg shadow-primary/20 hover:brightness-110 hover:shadow-xl hover:shadow-primary/30"
                    : "bg-surface-container-highest text-primary hover:bg-surface-container-high"
                }`}
              >
                {p.name === "Elite" ? "Falar com consultor" : "Começar grátis"}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Testimonials ─── */
function TestimonialsSection() {
  return (
    <section className="py-20 px-6 bg-surface-container-low border-y border-outline-variant/10">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs font-bold font-label text-primary uppercase tracking-widest mb-4">DEPOIMENTOS</p>
          <h2 className="text-4xl sm:text-5xl font-extrabold font-display tracking-tight text-on-surface mb-5">
            O que nossos clientes dizem
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {testimonials.map((t) => (
            <div key={t.name} className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/10">
              {/* Stars */}
              <div className="flex gap-0.5 text-[#f59e0b] mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <p className="text-sm font-body text-on-surface leading-relaxed mb-5 italic">"{t.quote}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold font-display">
                  {t.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <p className="text-sm font-semibold font-headline text-on-surface">{t.name}</p>
                  <p className="text-xs text-on-surface-variant">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── FAQ ─── */
function FAQSection() {
  return (
    <section id="faq" className="py-20 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-xs font-bold font-label text-primary uppercase tracking-widest mb-4">FAQ</p>
          <h2 className="text-4xl sm:text-5xl font-extrabold font-display tracking-tight text-on-surface mb-5">
            Perguntas frequentes
          </h2>
        </div>

        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="border-b border-outline-variant/15 py-1">
              <AccordionTrigger className="text-base font-semibold font-headline text-on-surface hover:text-primary transition-colors hover:no-underline">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-on-surface-variant font-body leading-relaxed">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

/* ─── CTA Final ─── */
function CTAFinal() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-2xl mx-auto text-center bg-gradient-to-br from-primary to-[#0a0e2e] rounded-3xl p-14 sm:p-20 relative overflow-hidden">
        {/* Decorative */}
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-on-primary/5" />

        <h2 className="text-3xl sm:text-4xl font-extrabold font-display text-on-primary tracking-tight mb-4 relative z-10">
          Pronto para transformar sua agência?
        </h2>
        <p className="text-primary-fixed-dim/80 mb-10 font-body text-lg relative z-10">
          Comece agora e veja resultados em poucos dias.
        </p>

        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-6">
          <Link
            to="/cadastro"
            className="bg-on-primary text-primary font-bold font-display px-8 py-4 rounded-xl hover:bg-primary-fixed shadow-xl transition-all"
          >
            Começar agora grátis
          </Link>
          <a
            href="mailto:suporte@viahub.app"
            className="text-on-primary/60 hover:text-on-primary text-sm font-medium underline-offset-2 hover:underline transition-colors"
          >
            Falar com especialista
          </a>
        </div>
      </div>
    </section>
  );
}

/* ─── Footer ─── */
function Footer() {
  return (
    <footer className="bg-[#0a0e2e] text-on-primary/60">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-10">
          {/* Logo */}
          <div className="col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center">
                <span className="text-xs font-bold text-on-primary font-display">VH</span>
              </div>
              <span className="text-lg font-bold font-display text-on-primary">ViaHub</span>
            </div>
            <p className="text-on-primary/50 text-sm font-body mt-3">
              O ecossistema completo para agências de turismo.
            </p>
          </div>

          {/* Produto */}
          <div>
            <h4 className="text-xs font-bold font-label text-on-primary/30 uppercase tracking-wider mb-4">Produto</h4>
            <ul className="space-y-2.5">
              {["Funcionalidades", "Preços", "Integrações", "Roadmap"].map((l) => (
                <li key={l}><a href="#" className="text-sm text-on-primary/50 hover:text-on-primary transition-colors">{l}</a></li>
              ))}
            </ul>
          </div>

          {/* Empresa */}
          <div>
            <h4 className="text-xs font-bold font-label text-on-primary/30 uppercase tracking-wider mb-4">Empresa</h4>
            <ul className="space-y-2.5">
              {["Sobre", "Blog", "Carreiras", "Contato"].map((l) => (
                <li key={l}><a href="#" className="text-sm text-on-primary/50 hover:text-on-primary transition-colors">{l}</a></li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-xs font-bold font-label text-on-primary/30 uppercase tracking-wider mb-4">Legal</h4>
            <ul className="space-y-2.5">
              <li><Link to="/termos" className="text-sm text-on-primary/50 hover:text-on-primary transition-colors">Termos de Uso</Link></li>
              <li><Link to="/privacidade" className="text-sm text-on-primary/50 hover:text-on-primary transition-colors">Privacidade</Link></li>
              <li><a href="#" className="text-sm text-on-primary/50 hover:text-on-primary transition-colors">LGPD</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-on-primary/10 mt-12 pt-8 flex flex-col sm:flex-row justify-between gap-4 text-xs text-on-primary/30">
          <span>© 2026 ViaHub — Maralto Tecnologia</span>
          <span>CNPJ 48.586.964/0001-90</span>
        </div>
      </div>
    </footer>
  );
}
