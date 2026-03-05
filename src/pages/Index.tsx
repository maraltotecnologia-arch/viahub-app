import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  FileText, LayoutList, Users, BarChart3, Sparkles, Bell,
  Menu, X, Check, ArrowRight, Quote
} from "lucide-react";

/* ─── helpers ─── */
const useInView = (threshold = 0.15) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
};

/* ─── data ─── */
const features = [
  { icon: FileText, title: "Orçamentos Profissionais", desc: "Markup automático, PDF em segundos e envio direto pelo WhatsApp." },
  { icon: LayoutList, title: "Pipeline de Vendas", desc: "Do rascunho ao pagamento, visualize cada etapa da sua venda." },
  { icon: Users, title: "CRM de Clientes", desc: "Tags, múltiplos contatos e histórico completo de cada cliente." },
  { icon: BarChart3, title: "Relatórios Financeiros", desc: "Faturamento real, taxa de conversão e performance da equipe." },
  { icon: Sparkles, title: "IA para Cotações", desc: "Em breve: descreva a viagem e receba um orçamento completo em segundos.", badge: "Em breve" },
  { icon: Bell, title: "Alertas e Follow-up", desc: "Nunca perca um prazo. Alertas automáticos no momento certo." },
];

const steps = [
  { n: "01", title: "Cadastre", desc: "Crie sua conta e configure markup e perfil da agência." },
  { n: "02", title: "Importe", desc: "Adicione sua base de clientes existente ou cadastre novos." },
  { n: "03", title: "Orçamente", desc: "Monte propostas com PDF automático e envie via WhatsApp." },
  { n: "04", title: "Feche", desc: "Acompanhe pelo pipeline e confirme pagamentos recebidos." },
];

const plans = [
  { name: "Starter", price: "R$397", per: "/mês", feats: ["Até 3 usuários", "Orçamentos ilimitados", "PDF + WhatsApp", "Relatórios básicos"] },
  { name: "Starter+", price: "R$197", per: "/mês + 1,5%", feats: ["Até 3 usuários", "Orçamentos ilimitados", "PDF + WhatsApp", "Relatórios básicos"] },
  { name: "Pro", price: "R$697", per: "/mês", popular: true, feats: ["Usuários ilimitados", "Pipeline Kanban", "Relatórios avançados", "Templates de orçamento", "Suporte prioritário"] },
  { name: "Pro+", price: "R$297", per: "/mês + 1,2%", feats: ["Usuários ilimitados", "Pipeline Kanban", "Relatórios avançados", "Templates de orçamento", "Suporte prioritário"] },
  { name: "White Label", price: "R$1.997", per: "/mês", feats: ["Marca própria", "Tudo do Pro", "Domínio personalizado", "Logo e cores customizadas", "Onboarding dedicado"] },
];

const testimonials = [
  { name: "Ana Costa", agency: "Viagens Costa", text: "O ViaHub transformou a forma como montamos orçamentos. O que levava 40 minutos agora leva 5." },
  { name: "Ricardo Mendes", agency: "RM Turismo", text: "O pipeline de vendas me deu uma visão clara de cada negociação. Minha taxa de conversão subiu 30%." },
  { name: "Juliana Ferreira", agency: "JF Travel", text: "Finalmente um sistema feito para agências de verdade. Os relatórios me ajudam a tomar decisões com confiança." },
];

const navLinks = [
  { href: "#funcionalidades", label: "Funcionalidades" },
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#planos", label: "Planos" },
  { href: "#contato", label: "Contato" },
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
  }, []);

  if (loading) return null;
  if (user) return null;

  return (
    <div className="viahub-landing">
      {/* Orbs */}
      <div className="lp-orb lp-orb--blue" />
      <div className="lp-orb lp-orb--cyan" />

      <Header menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      <Hero />
      <Features />
      <HowItWorks />
      <Plans />
      <Testimonials />
      <CTAFinal />
      <Footer />
    </div>
  );
}

/* ─── Header ─── */
function Header({ menuOpen, setMenuOpen }: { menuOpen: boolean; setMenuOpen: (v: boolean) => void }) {
  return (
    <header className="lp-header">
      <div className="lp-container lp-header__inner">
        <Link to="/" className="lp-logo">ViaHub</Link>
        <nav className="lp-nav">
          {navLinks.map(l => (
            <a key={l.href} href={l.href} className="lp-nav__link">{l.label}</a>
          ))}
        </nav>
        <div className="lp-header__actions">
          <Link to="/login" className="lp-btn lp-btn--ghost">Área do Cliente</Link>
          <Link to="/cadastro" className="lp-btn lp-btn--primary">Começar grátis</Link>
        </div>
        <button className="lp-hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {menuOpen && (
        <div className="lp-mobile-menu">
          {navLinks.map(l => (
            <a key={l.href} href={l.href} className="lp-mobile-menu__link" onClick={() => setMenuOpen(false)}>{l.label}</a>
          ))}
          <div className="lp-mobile-menu__actions">
            <Link to="/login" className="lp-btn lp-btn--ghost" style={{ width: "100%" }}>Área do Cliente</Link>
            <Link to="/cadastro" className="lp-btn lp-btn--primary" style={{ width: "100%" }}>Começar grátis</Link>
          </div>
        </div>
      )}
    </header>
  );
}

/* ─── Hero ─── */
function Hero() {
  return (
    <section className="lp-hero">
      <div className="lp-container lp-hero__inner">
        <div className="lp-hero__badge lp-stagger" style={{ animationDelay: "100ms" }}>
          <span>✦ Orçamento com IA em breve</span>
        </div>
        <h1 className="lp-hero__title lp-stagger" style={{ animationDelay: "200ms" }}>
          Sua agência de viagens<br />no <span className="lp-gradient-text">próximo nível</span>
        </h1>
        <p className="lp-hero__subtitle lp-stagger" style={{ animationDelay: "300ms" }}>
          Do orçamento ao fechamento, tudo em um só lugar.<br className="hidden md:inline" />
          Profissional, rápido e feito para agências de viagem.
        </p>
        <div className="lp-hero__ctas lp-stagger" style={{ animationDelay: "400ms" }}>
          <Link to="/cadastro" className="lp-btn lp-btn--primary lp-btn--lg">
            Criar conta grátis <ArrowRight size={16} />
          </Link>
          <a href="#planos" className="lp-btn lp-btn--ghost lp-btn--lg">Ver planos</a>
        </div>
        <p className="lp-hero__proof lp-stagger" style={{ animationDelay: "450ms" }}>
          <span>✓ 14 dias grátis</span> · <span>✓ Sem cartão</span> · <span>✓ Cancele quando quiser</span>
        </p>
        <div className="lp-hero__mockup lp-stagger" style={{ animationDelay: "500ms" }}>
          <DashboardMockup />
        </div>
      </div>
    </section>
  );
}

/* ─── Dashboard Mockup ─── */
function DashboardMockup() {
  return (
    <div className="lp-mockup">
      <div className="lp-mockup__header">
        <span className="lp-mockup__logo">ViaHub</span>
        <div className="lp-mockup__dots">
          <span /><span /><span />
        </div>
      </div>
      <div className="lp-mockup__metrics">
        {[
          { label: "Faturamento", value: "R$ 47.200" },
          { label: "Orçamentos", value: "23" },
          { label: "Conversão", value: "89%" },
        ].map(m => (
          <div key={m.label} className="lp-mockup__metric">
            <span className="lp-mockup__metric-label">{m.label}</span>
            <span className="lp-mockup__metric-value">{m.value}</span>
          </div>
        ))}
      </div>
      <div className="lp-mockup__table">
        {[
          { client: "Jean Lucca", dest: "Cancún", val: "R$ 12.400", status: "Aprovado", color: "#22C55E" },
          { client: "Maria Silva", dest: "Paris", val: "R$ 18.900", status: "Enviado", color: "#2563EB" },
          { client: "Carlos Souza", dest: "Orlando", val: "R$ 8.750", status: "Rascunho", color: "#64748B" },
        ].map((r, i) => (
          <div key={i} className="lp-mockup__row">
            <span className="lp-mockup__row-client">{r.client}</span>
            <span className="lp-mockup__row-dest">{r.dest}</span>
            <span className="lp-mockup__row-val">{r.val}</span>
            <span className="lp-mockup__row-badge" style={{ background: `${r.color}22`, color: r.color }}>{r.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Features ─── */
function Features() {
  const { ref, visible } = useInView();
  return (
    <section id="funcionalidades" className="lp-section" ref={ref}>
      <div className="lp-container">
        <h2 className="lp-section__title">Tudo que sua agência <span className="lp-gradient-text">precisa</span></h2>
        <p className="lp-section__subtitle">Uma plataforma completa, do orçamento ao pagamento.</p>
        <div className="lp-features-grid">
          {features.map((f, i) => (
            <div
              key={f.title}
              className={`lp-feature-card ${visible ? "lp-animate-in" : "lp-pre-animate"}`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="lp-feature-card__icon">
                <f.icon size={20} />
              </div>
              <h3 className="lp-feature-card__title">
                {f.title}
                {f.badge && <span className="lp-badge-cyan">{f.badge}</span>}
              </h3>
              <p className="lp-feature-card__desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── How It Works ─── */
function HowItWorks() {
  const { ref, visible } = useInView();
  return (
    <section id="como-funciona" className="lp-section lp-section--alt" ref={ref}>
      <div className="lp-container">
        <h2 className="lp-section__title">Do cadastro ao <span className="lp-gradient-text">fechamento</span></h2>
        <div className="lp-steps">
          <div className="lp-steps__line" />
          {steps.map((s, i) => (
            <div
              key={s.n}
              className={`lp-step ${visible ? "lp-animate-in" : "lp-pre-animate"}`}
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <span className="lp-step__number">{s.n}</span>
              <div className="lp-step__dot" />
              <h3 className="lp-step__title">{s.title}</h3>
              <p className="lp-step__desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Plans ─── */
function Plans() {
  const { ref, visible } = useInView();
  return (
    <section id="planos" className="lp-section" ref={ref}>
      <div className="lp-container">
        <h2 className="lp-section__title">Planos para cada <span className="lp-gradient-text">momento</span></h2>
        <p className="lp-section__subtitle">14 dias grátis em qualquer plano. Sem cartão de crédito.</p>
        <div className="lp-plans-scroll">
          <div className="lp-plans-grid">
            {plans.map((p, i) => (
              <div
                key={p.name}
                className={`lp-plan-card ${p.popular ? "lp-plan-card--popular" : ""} ${visible ? "lp-animate-in" : "lp-pre-animate"}`}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                {p.popular && <span className="lp-plan-card__badge">Mais popular</span>}
                <h3 className="lp-plan-card__name">{p.name}</h3>
                <div className="lp-plan-card__price">
                  <span className="lp-plan-card__amount">{p.price}</span>
                  <span className="lp-plan-card__per">{p.per}</span>
                </div>
                <ul className="lp-plan-card__feats">
                  {p.feats.map(f => (
                    <li key={f}><Check size={14} className="lp-plan-card__check" /> {f}</li>
                  ))}
                </ul>
                <Link
                  to="/cadastro"
                  className={`lp-btn ${p.popular ? "lp-btn--primary" : "lp-btn--ghost"}`}
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  Começar grátis
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Testimonials ─── */
function Testimonials() {
  const { ref, visible } = useInView();
  return (
    <section className="lp-section lp-section--alt" ref={ref}>
      <div className="lp-container">
        <div className="lp-testimonials-grid">
          {testimonials.map((t, i) => (
            <div
              key={t.name}
              className={`lp-testimonial-card ${visible ? "lp-animate-in" : "lp-pre-animate"}`}
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <Quote size={32} className="lp-testimonial-card__quote" />
              <p className="lp-testimonial-card__text">"{t.text}"</p>
              <div className="lp-testimonial-card__author">
                <span className="lp-testimonial-card__name">{t.name}</span>
                <span className="lp-testimonial-card__agency">{t.agency}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── CTA Final ─── */
function CTAFinal() {
  const { ref, visible } = useInView();
  return (
    <section className="lp-section" ref={ref}>
      <div className="lp-container">
        <div className={`lp-cta-card ${visible ? "lp-animate-in" : "lp-pre-animate"}`}>
          <h2 className="lp-cta-card__title">Pronto para transformar sua agência?</h2>
          <p className="lp-cta-card__desc">Comece grátis em menos de 2 minutos. Sem cartão de crédito.</p>
          <Link to="/cadastro" className="lp-btn lp-btn--primary lp-btn--lg">
            Criar conta grátis <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─── Footer ─── */
function Footer() {
  return (
    <footer id="contato" className="lp-footer">
      <div className="lp-container lp-footer__inner">
        <div className="lp-footer__brand">
          <span className="lp-logo" style={{ fontSize: 20 }}>ViaHub</span>
          <p className="lp-footer__tagline">O ecossistema da sua agência de viagens</p>
          <p className="lp-footer__powered">powered by Maralto</p>
        </div>
        <div className="lp-footer__col">
          <h4 className="lp-footer__heading">Produto</h4>
          <a href="#funcionalidades" className="lp-footer__link">Funcionalidades</a>
          <a href="#planos" className="lp-footer__link">Planos</a>
          <Link to="/cadastro" className="lp-footer__link">Cadastro</Link>
          <Link to="/login" className="lp-footer__link">Área do Cliente</Link>
        </div>
        <div className="lp-footer__col">
          <h4 className="lp-footer__heading">Legal</h4>
          <Link to="/termos" className="lp-footer__link">Termos de Uso</Link>
          <Link to="/privacidade" className="lp-footer__link">Privacidade</Link>
          <a href="mailto:suporte@viahub.app" className="lp-footer__link">suporte@viahub.app</a>
        </div>
      </div>
      <div className="lp-footer__bottom">
        <p>© 2026 ViaHub · Maralto Tecnologia da Informação e Serviços Digitais LTDA · CNPJ 48.586.964/0001-90</p>
      </div>
    </footer>
  );
}
