// ── Landing (marketing) ───────────────────────────────────────────────────────
// Public, scrollable marketing page for PREDICTA by Forzy. Self-contained: no
// AppShell, no store. Showcase numbers are fixed. Primary CTA → /login.
// Visual language mirrors src/pages/Login.tsx (SVG grid overlay, cobalt radial
// gradient, accent lines) and uses only colors from { C }.

import { useNavigate } from "react-router";
import {
  Target, Activity, Cpu, Gauge, Bell, MessageSquare, BookText, ScanLine, Map,
  ShieldCheck, GitBranch, TrendingUp, Wrench, Boxes, Eye, Brain, ClipboardList,
  Lock, CheckCircle2, ArrowRight, FlaskConical, FileSearch, Layers, Hexagon,
  Network, AlertTriangle, Quote,
} from "lucide-react";
import { C } from "@/lib/theme";
import { PredictaMark } from "@/components/brand/Logo";

const FONT_TITLE = "'Rajdhani',sans-serif";
const FONT_MONO = "'JetBrains Mono',monospace";
const FONT_BODY = "'Inter',sans-serif";

// Shared SVG grid + cobalt radial wash used on dark sections (matches Login).
function GridWash({ opacity = 0.04, ellipse = "30% 30%" }: { opacity?: number; ellipse?: string }) {
  const pid = `g-${ellipse.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <>
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity }} aria-hidden>
        <defs>
          <pattern id={pid} width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#82C8E5" strokeWidth=".6" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${pid})`} />
      </svg>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at ${ellipse}, ${C.cobalt}18 0%, transparent 60%)` }}
        aria-hidden
      />
    </>
  );
}

// Thin top accent line, like the Login left panel.
function AccentLine() {
  return (
    <div
      className="absolute top-0 left-0 right-0 h-px pointer-events-none"
      style={{ background: `linear-gradient(90deg,transparent,${C.cobalt}80,transparent)` }}
      aria-hidden
    />
  );
}

// Small uppercase mono eyebrow used above section titles.
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 mb-4">
      <span className="w-6 h-px" style={{ background: C.steel }} />
      <span className="text-[11px] tracking-[0.28em] uppercase" style={{ fontFamily: FONT_MONO, color: C.steel }}>
        {children}
      </span>
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const irLogin = () => navigate("/login");

  // ── showcase data ──────────────────────────────────────────────────────────
  const stats = [
    { v: "247", l: "ativos monitorados" },
    { v: "97.4%", l: "disponibilidade" },
    { v: "2.1 h", l: "MTTR médio" },
    { v: "−38%", l: "paradas não planejadas" },
  ];

  const pilares = [
    {
      i: Eye, cor: C.steel, t: "Ver",
      d: "Telemetria em tempo real e histórica — temperatura, vibração, pressão, corrente, rpm e óleo — com baseline e limites do dicionário.",
      tags: ["telemetria", "saúde", "baseline"],
    },
    {
      i: Brain, cor: C.cobalt, t: "Prever",
      d: "RUL (vida útil restante), probabilidade de falha por curva de Weibull, detecção de anomalia e curva de degradação por modo de falha.",
      tags: ["RUL", "Weibull", "anomalia"],
    },
    {
      i: ClipboardList, cor: C.green, t: "Decidir",
      d: "Recomendações acionáveis, simulação “E se…” com ΔRUL e abertura de ordens de serviço — direto do gêmeo digital.",
      tags: ["simulação", "OS", "ΔRUL"],
    },
  ];

  const recursos = [
    { i: Cpu, t: "Gêmeo digital de cada ativo", d: "Réplica viva física↔digital com RUL, probabilidade de falha e curva de degradação por modo de falha." },
    { i: FlaskConical, t: "Simulador “E se…”", d: "Testa cenários de carga, ambiente e manutenção sem tocar no ativo real — e mostra o ΔRUL de cada decisão." },
    { i: Activity, t: "Monitoramento em tempo real", d: "Sinais ao vivo e telemetria histórica com baseline e limites vindos do dicionário técnico." },
    { i: Bell, t: "Alertas inteligentes", d: "Por regra (limite do dicionário) e por modelo (IA do gêmeo), com deduplicação, auto-resolução, snooze e ciclo de vida." },
    { i: Brain, t: "Assistente de IA + Base técnica (RAG)", d: "Conversa com tool-use sobre o gêmeo e a frota (consulta estado, roda what-if, cria OS) e responde com base nos manuais do fabricante — citando documento e página, com confiança, e dizendo “não encontrei” quando não há fonte." },
    { i: ScanLine, t: "OCR da placa", d: "Cadastro de ativo lendo a plaqueta por foto, com visão de IA e confiança por campo." },
    { i: Map, t: "Mapa digital da planta", d: "Navegável, com status por ativo; um clique abre o ativo correspondente." },
    { i: Wrench, t: "Ordens de serviço", d: "Crie e acompanhe o status das intervenções de manutenção, integradas ao fluxo preditivo." },
    { i: ShieldCheck, t: "Governança embutida", d: "Rastreabilidade até o dicionário, hierarquia industrial, RBAC por perfil e trilha de auditoria — sem módulo à parte." },
  ];

  const beneficios = [
    "Menos paradas não planejadas com antecipação da falha",
    "Horizonte acionável: saiba quando e por quê intervir",
    "Decisão com confiança — o modelo mostra sua incerteza",
    "Rastreabilidade total: todo número volta ao dicionário",
    "Onboarding rápido de ativos por OCR da placa",
    "Governança nativa: hierarquia, RBAC e auditoria",
    "Simulação “E se…” antes de mexer no ativo real",
    "Implantação modular: comece parcial, evolua para completa",
  ];

  const governanca = [
    { i: GitBranch, t: "Hierarquia industrial", d: "Empresa → planta → área → sistema → ativo. Toda informação no seu lugar." },
    { i: Lock, t: "RBAC por perfil", d: "Cada papel vê e faz exatamente o que deve — controle de acesso granular." },
    { i: FileSearch, t: "Trilha de auditoria", d: "Quem fez o quê, quando e com base em quê. Histórico completo e consultável." },
    { i: Gauge, t: "Honestidade do modelo", d: "A confiança é sempre visível e a predição vem de um modelo plugável." },
  ];

  const personas = [
    { i: Wrench, t: "Técnico de manutenção", d: "Recebe o alerta certo, consulta o gêmeo e abre a OS sem ruído." },
    { i: TrendingUp, t: "Gestor industrial", d: "Vê disponibilidade, MTTR e risco da frota para priorizar com dados." },
    { i: Boxes, t: "Cliente da indústria", d: "Acompanha a saúde dos próprios ativos com transparência total." },
    { i: Target, t: "Admin Forzy", d: "Configura a plataforma, modelos e implantação modular por planta." },
    { i: ShieldCheck, t: "TI / Governança", d: "Gerencia acessos, auditoria e rastreabilidade de ponta a ponta." },
  ];

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden" style={{ background: C.bg, color: C.text, fontFamily: FONT_BODY }}>
      {/* ── Top nav ─────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 backdrop-blur-md"
        style={{ background: "rgba(7,16,30,0.72)", borderBottom: `1px solid ${C.border}` }}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg,${C.cobalt},${C.navy})` }}>
              <PredictaMark size={18} variant="white" />
            </div>
            <div className="leading-none">
              <div className="text-[17px] font-bold tracking-[0.12em]" style={{ fontFamily: FONT_TITLE }}>PREDICTA</div>
              <div className="text-[9px] tracking-[0.28em] mt-0.5" style={{ color: C.slate, fontFamily: FONT_MONO }}>BY FORZY</div>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-7 text-[13px]" style={{ color: C.textSub }}>
            <a href="#recursos" className="transition-colors hover:text-white">Recursos</a>
            <a href="#gemeo" className="transition-colors hover:text-white">Gêmeo Digital</a>
            <a href="#assistente" className="transition-colors hover:text-white">Assistente IA</a>
            <a href="#governanca" className="transition-colors hover:text-white">Governança</a>
          </nav>
          <button
            onClick={irLogin}
            className="px-4 py-2 rounded-md text-[13px] font-bold text-white transition-all hover:brightness-110"
            style={{ background: `linear-gradient(135deg,${C.cobalt},${C.navy})`, fontFamily: FONT_TITLE, letterSpacing: "0.06em" }}
          >
            Entrar
          </button>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ background: C.bgDeep }}>
        <AccentLine />
        <GridWash opacity={0.05} ellipse="20% 25%" />
        <div className="relative z-10 max-w-6xl mx-auto px-6 pt-20 pb-24 grid lg:grid-cols-2 gap-14 items-center">
          {/* Copy */}
          <div>
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-7"
              style={{ background: C.bgCard, border: `1px solid ${C.borderMd}` }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: C.green }} />
              <span className="text-[11px] tracking-[0.18em] uppercase" style={{ fontFamily: FONT_MONO, color: C.steel }}>
                Plataforma industrial IoT
              </span>
            </div>

            <h1 className="text-[40px] lg:text-[54px] font-bold leading-[1.05] mb-5" style={{ fontFamily: FONT_TITLE }}>
              Veja a falha <span style={{ color: C.steel }}>antes</span> que ela pare a sua planta.
            </h1>
            <p className="text-[15px] leading-relaxed max-w-lg mb-9" style={{ color: C.textSub }}>
              O Predicta tira sua operação da manutenção reativa e por calendário e leva à
              <span style={{ color: C.text }}> manutenção preditiva</span>: antecipe a falha com horizonte
              acionável, reduza paradas não planejadas e decida com confiança e rastreabilidade.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={irLogin}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-md text-[14px] font-bold text-white transition-all hover:brightness-110"
                style={{ background: `linear-gradient(135deg,${C.cobalt},${C.navy})`, fontFamily: FONT_TITLE, letterSpacing: "0.05em" }}
              >
                Acessar a plataforma <ArrowRight size={16} />
              </button>
              <a
                href="#recursos"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-md text-[14px] font-bold transition-all hover:bg-[#112035]"
                style={{ border: `1px solid ${C.borderMd}`, color: C.text, fontFamily: FONT_TITLE, letterSpacing: "0.05em" }}
              >
                Ver recursos
              </a>
            </div>
            <div className="flex items-center gap-2 mt-7 text-[12px]" style={{ color: C.slate }}>
              <CheckCircle2 size={13} style={{ color: C.green }} />
              Modular e seguro · implantação parcial ou completa
            </div>
          </div>

          {/* Visual — decorative live-KPI mock */}
          <div className="relative">
            <div
              className="rounded-2xl p-5 relative overflow-hidden"
              style={{ background: C.bgCard, border: `1px solid ${C.borderMd}`, boxShadow: "0 30px 60px -30px rgba(0,0,0,.7)" }}
            >
              {/* mock header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${C.cobalt}22` }}>
                    <Hexagon size={14} style={{ color: C.steel }} />
                  </div>
                  <div>
                    <div className="text-[12px] font-semibold" style={{ fontFamily: FONT_TITLE }}>Compressor C-204</div>
                    <div className="text-[9px]" style={{ fontFamily: FONT_MONO, color: C.slate }}>PLANTA SUL · ÁREA 3</div>
                  </div>
                </div>
                <span
                  className="text-[9px] px-2 py-1 rounded-full uppercase tracking-wider"
                  style={{ background: `${C.green}18`, color: C.green, fontFamily: FONT_MONO }}
                >
                  ● ao vivo
                </span>
              </div>

              {/* KPI grid */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="rounded-xl p-3" style={{ background: C.bgDeep, border: `1px solid ${C.border}` }}>
                  <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: C.slate, fontFamily: FONT_MONO }}>Saúde</div>
                  <div className="text-[26px] font-bold leading-none" style={{ fontFamily: FONT_TITLE, color: C.green }}>82</div>
                  <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: "#0a1424" }}>
                    <div className="h-full rounded-full" style={{ width: "82%", background: C.green }} />
                  </div>
                </div>
                <div className="rounded-xl p-3" style={{ background: C.bgDeep, border: `1px solid ${C.border}` }}>
                  <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: C.slate, fontFamily: FONT_MONO }}>RUL estimado</div>
                  <div className="text-[26px] font-bold leading-none" style={{ fontFamily: FONT_TITLE, color: C.steel }}>
                    412<span className="text-[12px] ml-1" style={{ color: C.slate }}>h</span>
                  </div>
                  <div className="text-[9px] mt-2" style={{ fontFamily: FONT_MONO, color: C.slate }}>conf. 0.91 · Weibull</div>
                </div>
              </div>

              {/* vibration sparkline (static decorative) */}
              <div className="rounded-xl p-3" style={{ background: C.bgDeep, border: `1px solid ${C.border}` }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[9px] uppercase tracking-wider" style={{ color: C.slate, fontFamily: FONT_MONO }}>Vibração (mm/s)</div>
                  <div className="text-[10px]" style={{ fontFamily: FONT_MONO, color: C.yellow }}>4.8 · atenção</div>
                </div>
                <svg viewBox="0 0 280 56" className="w-full h-12" preserveAspectRatio="none" aria-hidden>
                  <defs>
                    <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.steel} stopOpacity="0.35" />
                      <stop offset="100%" stopColor={C.steel} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <polyline
                    points="0,40 24,36 48,38 72,30 96,33 120,24 144,28 168,20 192,26 216,16 240,22 280,12"
                    fill="none" stroke={C.steel} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
                  />
                  <polygon
                    points="0,40 24,36 48,38 72,30 96,33 120,24 144,28 168,20 192,26 216,16 240,22 280,12 280,56 0,56"
                    fill="url(#spark)"
                  />
                </svg>
              </div>

              {/* alert chip */}
              <div
                className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{ background: `${C.yellow}10`, border: `1px solid ${C.yellow}33` }}
              >
                <AlertTriangle size={13} style={{ color: C.yellow }} />
                <span className="text-[11px]" style={{ color: C.text }}>
                  Anomalia de vibração detectada pelo modelo — abrir OS preventiva?
                </span>
              </div>
            </div>

            {/* floating ΔRUL chip */}
            <div
              className="hidden sm:flex absolute -bottom-5 -left-5 items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: C.bgCard, border: `1px solid ${C.borderMd}`, boxShadow: "0 20px 40px -20px rgba(0,0,0,.8)" }}
            >
              <FlaskConical size={14} style={{ color: C.cobalt }} />
              <div className="leading-none">
                <div className="text-[9px] uppercase tracking-wider" style={{ color: C.slate, fontFamily: FONT_MONO }}>Simulação “E se…”</div>
                <div className="text-[13px] font-bold" style={{ fontFamily: FONT_TITLE, color: C.green }}>ΔRUL +96 h</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats band ──────────────────────────────────────────────────────── */}
      <section className="relative" style={{ borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, background: C.bg }}>
        <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((s) => (
            <div key={s.l} className="text-center lg:text-left">
              <div className="text-[34px] lg:text-[40px] font-bold leading-none" style={{ fontFamily: FONT_TITLE, color: C.steel }}>{s.v}</div>
              <div className="text-[12px] mt-2 uppercase tracking-wider" style={{ color: C.slate, fontFamily: FONT_MONO }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pilares: Ver · Prever · Decidir ─────────────────────────────────── */}
      <section className="relative max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <div className="flex justify-center"><Eyebrow>O método Predicta</Eyebrow></div>
          <h2 className="text-[30px] lg:text-[38px] font-bold" style={{ fontFamily: FONT_TITLE }}>
            Ver · Prever · Decidir
          </h2>
          <p className="text-[14px] mt-3 max-w-xl mx-auto" style={{ color: C.textSub }}>
            Três pilares que transformam sinal bruto em decisão de manutenção confiável.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {pilares.map((p) => (
            <div
              key={p.t}
              className="rounded-2xl p-6 transition-all hover:-translate-y-1"
              style={{ background: C.bgCard, border: `1px solid ${C.border}` }}
            >
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: `${p.cor}1a`, border: `1px solid ${p.cor}33` }}>
                <p.i size={20} style={{ color: p.cor }} />
              </div>
              <h3 className="text-[20px] font-bold mb-2" style={{ fontFamily: FONT_TITLE }}>{p.t}</h3>
              <p className="text-[13px] leading-relaxed mb-4" style={{ color: C.textSub }}>{p.d}</p>
              <div className="flex flex-wrap gap-1.5">
                {p.tags.map((t) => (
                  <span key={t} className="text-[10px] px-2 py-0.5 rounded" style={{ background: C.bgDeep, color: C.steel, fontFamily: FONT_MONO, border: `1px solid ${C.border}` }}>{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Feature grid ────────────────────────────────────────────────────── */}
      <section id="recursos" className="relative" style={{ background: C.bgDeep, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <GridWash opacity={0.035} ellipse="80% 0%" />
        <div className="relative z-10 max-w-6xl mx-auto px-6 py-20">
          <div className="mb-12">
            <Eyebrow>Recursos</Eyebrow>
            <h2 className="text-[30px] lg:text-[38px] font-bold max-w-2xl" style={{ fontFamily: FONT_TITLE }}>
              Tudo que sua manutenção preditiva precisa, num lugar só
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recursos.map((r) => (
              <div
                key={r.t}
                className="rounded-xl p-5 transition-all hover:-translate-y-1"
                style={{ background: C.bgCard, border: `1px solid ${C.border}` }}
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: `${C.cobalt}1a`, border: `1px solid ${C.cobalt}33` }}>
                  <r.i size={18} style={{ color: C.steel }} />
                </div>
                <h3 className="text-[15px] font-semibold mb-1.5" style={{ fontFamily: FONT_TITLE, color: C.text }}>{r.t}</h3>
                <p className="text-[12.5px] leading-relaxed" style={{ color: C.textSub }}>{r.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Destaque 1: Gêmeo Digital + Simulador ───────────────────────────── */}
      <section id="gemeo" className="relative max-w-6xl mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <Eyebrow>Gêmeo digital</Eyebrow>
            <h2 className="text-[30px] lg:text-[38px] font-bold leading-tight mb-4" style={{ fontFamily: FONT_TITLE }}>
              Uma réplica viva de cada ativo — e um laboratório para o futuro dele
            </h2>
            <p className="text-[14px] leading-relaxed mb-6" style={{ color: C.textSub }}>
              O gêmeo digital espelha o ativo físico em tempo real e calcula a vida útil restante (RUL),
              a probabilidade de falha pela curva de Weibull e a curva de degradação por modo de falha.
              Com o simulador <span style={{ color: C.text }}>“E se…”</span> você testa cenários de carga,
              ambiente e manutenção sem encostar no equipamento real — e vê o ΔRUL de cada decisão.
            </p>
            <ul className="space-y-2.5">
              {[
                "RUL e probabilidade de falha por modo (Weibull)",
                "Curva de degradação acompanhada em tempo real",
                "Simulação “E se…” com ΔRUL acionável",
                "Confiança do modelo sempre visível",
              ].map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-[13.5px]" style={{ color: C.text }}>
                  <CheckCircle2 size={16} style={{ color: C.green }} className="mt-0.5 flex-shrink-0" /> {b}
                </li>
              ))}
            </ul>
          </div>

          {/* mock: degradation curve + scenarios */}
          <div className="rounded-2xl p-5" style={{ background: C.bgCard, border: `1px solid ${C.borderMd}` }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Network size={15} style={{ color: C.steel }} />
                <span className="text-[12px] font-semibold" style={{ fontFamily: FONT_TITLE }}>Curva de degradação</span>
              </div>
              <span className="text-[9px] px-2 py-1 rounded uppercase tracking-wider" style={{ fontFamily: FONT_MONO, background: C.bgDeep, color: C.slate, border: `1px solid ${C.border}` }}>modo: rolamento</span>
            </div>
            <div className="rounded-xl p-3 mb-3" style={{ background: C.bgDeep, border: `1px solid ${C.border}` }}>
              <svg viewBox="0 0 320 130" className="w-full" aria-hidden>
                {/* threshold line */}
                <line x1="0" y1="96" x2="320" y2="96" stroke={C.red} strokeOpacity="0.5" strokeWidth="1" strokeDasharray="4 4" />
                <text x="4" y="92" fontSize="8" fill={C.red} fontFamily="monospace">limite de falha</text>
                {/* baseline scenario */}
                <polyline points="0,18 60,26 120,40 180,58 240,82 320,112" fill="none" stroke={C.steel} strokeWidth="2" />
                {/* optimized scenario (E se) */}
                <polyline points="0,18 60,22 120,30 180,42 240,58 320,80" fill="none" stroke={C.green} strokeWidth="2" strokeDasharray="5 4" />
                <circle cx="240" cy="82" r="3" fill={C.steel} />
                <circle cx="240" cy="58" r="3" fill={C.green} />
              </svg>
              <div className="flex items-center gap-4 mt-1 text-[10px]" style={{ fontFamily: FONT_MONO }}>
                <span className="flex items-center gap-1.5" style={{ color: C.steel }}><span className="w-3 h-0.5 inline-block" style={{ background: C.steel }} /> atual</span>
                <span className="flex items-center gap-1.5" style={{ color: C.green }}><span className="w-3 h-0.5 inline-block" style={{ background: C.green }} /> cenário “E se…”</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { l: "Carga", v: "−15%" },
                { l: "Ambiente", v: "40°C" },
                { l: "ΔRUL", v: "+96 h", hi: true },
              ].map((s) => (
                <div key={s.l} className="rounded-lg p-2.5 text-center" style={{ background: C.bgDeep, border: `1px solid ${C.border}` }}>
                  <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: C.slate, fontFamily: FONT_MONO }}>{s.l}</div>
                  <div className="text-[16px] font-bold" style={{ fontFamily: FONT_TITLE, color: s.hi ? C.green : C.text }}>{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Destaque 2: Assistente IA + Base técnica (RAG) ──────────────────── */}
      <section id="assistente" className="relative" style={{ background: C.bgDeep, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <GridWash opacity={0.035} ellipse="15% 80%" />
        <div className="relative z-10 max-w-6xl mx-auto px-6 py-20">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            {/* mock chat */}
            <div className="order-2 lg:order-1 rounded-2xl p-5" style={{ background: C.bgCard, border: `1px solid ${C.borderMd}` }}>
              <div className="flex items-center gap-2 mb-4 pb-3" style={{ borderBottom: `1px solid ${C.border}` }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg,${C.cobalt},${C.navy})` }}>
                  <Brain size={14} className="text-white" />
                </div>
                <span className="text-[12px] font-semibold" style={{ fontFamily: FONT_TITLE }}>Assistente técnico Predicta</span>
              </div>

              {/* user msg */}
              <div className="flex justify-end mb-3">
                <div className="max-w-[78%] rounded-2xl rounded-br-sm px-3.5 py-2 text-[12.5px]" style={{ background: `${C.cobalt}26`, color: C.text }}>
                  Qual o torque de aperto dos parafusos do mancal do motor WEG W22?
                </div>
              </div>

              {/* assistant msg with citation */}
              <div className="flex justify-start mb-3">
                <div className="max-w-[88%] rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-[12.5px]" style={{ background: C.bgDeep, color: C.text, border: `1px solid ${C.border}` }}>
                  O torque recomendado é de <b>45 N·m</b> para os parafusos M10 do mancal dianteiro, aplicado em cruz.
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[10px] px-2 py-1 rounded" style={{ background: `${C.steel}14`, color: C.steel, fontFamily: FONT_MONO, border: `1px solid ${C.steel}30` }}>
                      <BookText size={11} /> Manual WEG W22 · p. 37
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[10px] px-2 py-1 rounded" style={{ background: `${C.green}14`, color: C.green, fontFamily: FONT_MONO }}>
                      confiança 0.93
                    </span>
                  </div>
                </div>
              </div>

              {/* tool-use chip */}
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 text-[10.5px] px-3 py-1.5 rounded-full" style={{ background: `${C.cobalt}14`, color: C.steel, fontFamily: FONT_MONO, border: `1px solid ${C.border}` }}>
                  <Wrench size={11} /> ação sugerida: criar ordem de serviço
                </div>
              </div>
            </div>

            {/* copy */}
            <div className="order-1 lg:order-2">
              <Eyebrow>Assistente de IA + Base técnica</Eyebrow>
              <h2 className="text-[30px] lg:text-[38px] font-bold leading-tight mb-4" style={{ fontFamily: FONT_TITLE }}>
                Pergunte em linguagem natural. Receba respostas com fonte e confiança.
              </h2>
              <p className="text-[14px] leading-relaxed mb-6" style={{ color: C.textSub }}>
                O assistente técnico conversa com tool-use sobre o gêmeo e a frota: consulta o estado de um ativo,
                roda um what-if e até cria a ordem de serviço. A base técnica (RAG) responde
                <span style={{ color: C.text }}> só com base nos manuais do fabricante</span>, sempre citando documento
                e página e sinalizando a confiança — e diz “não encontrei” quando não há fonte.
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { i: Layers, t: "Tool-use sobre o gêmeo", d: "Consulta estado, roda what-if e cria OS." },
                  { i: FileSearch, t: "RAG com citação", d: "Documento, página e confiança em cada resposta." },
                  { i: ShieldCheck, t: "Sem alucinação", d: "Responde só pelas fontes; admite quando não sabe." },
                  { i: MessageSquare, t: "Conversacional", d: "Linguagem natural para o técnico em campo." },
                ].map((f) => (
                  <div key={f.t} className="rounded-xl p-3.5" style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
                    <f.i size={16} style={{ color: C.steel }} className="mb-2" />
                    <div className="text-[13px] font-semibold mb-0.5" style={{ fontFamily: FONT_TITLE }}>{f.t}</div>
                    <div className="text-[11.5px] leading-snug" style={{ color: C.textSub }}>{f.d}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Benefícios ──────────────────────────────────────────────────────── */}
      <section className="relative max-w-6xl mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-12 items-start">
          <div>
            <Eyebrow>Por que Predicta</Eyebrow>
            <h2 className="text-[30px] lg:text-[38px] font-bold leading-tight mb-4" style={{ fontFamily: FONT_TITLE }}>
              Da manutenção reativa à decisão antecipada
            </h2>
            <p className="text-[14px] leading-relaxed" style={{ color: C.textSub }}>
              Cada recurso existe para um mesmo objetivo: menos surpresa no chão de fábrica e mais
              controle sobre o que vem pela frente.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {beneficios.map((b) => (
              <div key={b} className="flex items-start gap-2.5 rounded-xl px-4 py-3.5" style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
                <CheckCircle2 size={16} style={{ color: C.green }} className="mt-0.5 flex-shrink-0" />
                <span className="text-[13px] leading-snug" style={{ color: C.text }}>{b}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Governança & Segurança ──────────────────────────────────────────── */}
      <section id="governanca" className="relative" style={{ background: C.bgDeep, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <GridWash opacity={0.035} ellipse="50% 0%" />
        <div className="relative z-10 max-w-6xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <div className="flex justify-center"><Eyebrow>Governança & Segurança</Eyebrow></div>
            <h2 className="text-[30px] lg:text-[38px] font-bold max-w-2xl mx-auto" style={{ fontFamily: FONT_TITLE }}>
              Confiança não é recurso à parte — está embutida
            </h2>
            <p className="text-[14px] mt-3 max-w-xl mx-auto" style={{ color: C.textSub }}>
              Todo número volta ao dicionário. Toda ação fica registrada. Toda predição mostra sua incerteza.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {governanca.map((g) => (
              <div key={g.t} className="rounded-xl p-5" style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: `${C.steel}14`, border: `1px solid ${C.steel}30` }}>
                  <g.i size={18} style={{ color: C.steel }} />
                </div>
                <h3 className="text-[14px] font-semibold mb-1" style={{ fontFamily: FONT_TITLE }}>{g.t}</h3>
                <p className="text-[12px] leading-relaxed" style={{ color: C.textSub }}>{g.d}</p>
              </div>
            ))}
          </div>

          {/* honesty quote strip */}
          <div className="mt-8 rounded-2xl p-6 flex items-start gap-4" style={{ background: C.bgCard, border: `1px solid ${C.borderMd}` }}>
            <Quote size={22} style={{ color: C.cobalt }} className="flex-shrink-0 mt-1" />
            <p className="text-[15px] leading-relaxed" style={{ color: C.text, fontFamily: FONT_TITLE }}>
              A honestidade do modelo é um diferencial: a confiança é sempre visível e a predição vem de um
              <span style={{ color: C.steel }}> modelo plugável</span> — você decide com transparência, não com fé.
            </p>
          </div>
        </div>
      </section>

      {/* ── Personas ────────────────────────────────────────────────────────── */}
      <section className="relative max-w-6xl mx-auto px-6 py-20">
        <div className="mb-12">
          <Eyebrow>Quem usa</Eyebrow>
          <h2 className="text-[30px] lg:text-[38px] font-bold max-w-2xl" style={{ fontFamily: FONT_TITLE }}>
            Um perfil para cada papel na operação
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {personas.map((p) => (
            <div key={p.t} className="rounded-xl p-5 transition-all hover:-translate-y-1" style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: `${C.cobalt}1a`, border: `1px solid ${C.cobalt}33` }}>
                <p.i size={18} style={{ color: C.steel }} />
              </div>
              <h3 className="text-[13.5px] font-semibold mb-1.5 leading-tight" style={{ fontFamily: FONT_TITLE }}>{p.t}</h3>
              <p className="text-[11.5px] leading-relaxed" style={{ color: C.textSub }}>{p.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA final ───────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ background: C.bgDeep }}>
        <AccentLine />
        <GridWash opacity={0.06} ellipse="50% 50%" />
        <div className="relative z-10 max-w-3xl mx-auto px-6 py-24 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: `linear-gradient(135deg,${C.cobalt},${C.navy})`, boxShadow: `0 0 50px -8px ${C.cobalt}` }}>
            <PredictaMark size={26} variant="white" />
          </div>
          <h2 className="text-[34px] lg:text-[46px] font-bold leading-[1.08] mb-5" style={{ fontFamily: FONT_TITLE }}>
            Comece a prever falhas hoje
          </h2>
          <p className="text-[15px] mb-9 max-w-lg mx-auto" style={{ color: C.textSub }}>
            Antecipe a falha, reduza paradas não planejadas e decida com confiança e rastreabilidade.
            Implantação modular — comece pelo que importa primeiro.
          </p>
          <button
            onClick={irLogin}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-md text-[15px] font-bold text-white transition-all hover:brightness-110"
            style={{ background: `linear-gradient(135deg,${C.cobalt},${C.navy})`, fontFamily: FONT_TITLE, letterSpacing: "0.05em" }}
          >
            Acessar a plataforma <ArrowRight size={17} />
          </button>
          <div className="flex items-center justify-center gap-2 mt-6 text-[12px]" style={{ color: C.slate }}>
            <Lock size={12} /> Acesso protegido — SSO + MFA habilitado
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer style={{ background: C.bg, borderTop: `1px solid ${C.border}` }}>
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div className="max-w-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg,${C.cobalt},${C.navy})` }}>
                  <PredictaMark size={18} variant="white" />
                </div>
                <div className="leading-none">
                  <div className="text-[16px] font-bold tracking-[0.12em]" style={{ fontFamily: FONT_TITLE }}>PREDICTA</div>
                  <div className="text-[9px] tracking-[0.28em] mt-0.5" style={{ color: C.slate, fontFamily: FONT_MONO }}>BY FORZY</div>
                </div>
              </div>
              <p className="text-[12.5px] leading-relaxed" style={{ color: C.slate }}>
                Manutenção preditiva e monitoramento IoT de classe industrial. Ver · Prever · Decidir.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-10 text-[12.5px]">
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] mb-3" style={{ color: C.slate, fontFamily: FONT_MONO }}>Produto</div>
                <ul className="space-y-2" style={{ color: C.textSub }}>
                  <li><a href="#recursos" className="hover:text-white transition-colors">Recursos</a></li>
                  <li><a href="#gemeo" className="hover:text-white transition-colors">Gêmeo digital</a></li>
                  <li><a href="#assistente" className="hover:text-white transition-colors">Assistente IA</a></li>
                </ul>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] mb-3" style={{ color: C.slate, fontFamily: FONT_MONO }}>Empresa</div>
                <ul className="space-y-2" style={{ color: C.textSub }}>
                  <li><a href="#governanca" className="hover:text-white transition-colors">Governança</a></li>
                  <li><span className="cursor-default">Segurança</span></li>
                  <li><span className="cursor-default">Contato</span></li>
                </ul>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] mb-3" style={{ color: C.slate, fontFamily: FONT_MONO }}>Acesso</div>
                <ul className="space-y-2" style={{ color: C.textSub }}>
                  <li><button onClick={irLogin} className="hover:text-white transition-colors">Entrar</button></li>
                  <li><span className="cursor-default">Status</span></li>
                  <li><span className="cursor-default">Suporte</span></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]" style={{ borderTop: `1px solid ${C.border}`, color: C.slate }}>
            <span>© 2026 Predicta by Forzy. Todos os direitos reservados.</span>
            <span style={{ fontFamily: FONT_MONO }}>Predicta v2.4.1 · Industrial IoT Platform</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
