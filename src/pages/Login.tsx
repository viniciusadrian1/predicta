// 1. Login ────────────────────────────────────────────────────────────────────
// Public route. Authenticates against seed users; demo profiles log in by role.
// Layout: três colunas → marca (esq) · formulário (centro) · perfis demo (dir).
import { useState } from "react";
import { useNavigate } from "react-router";
import { Cpu, Bell, TrendingUp, Wrench, Lock, AlertCircle, Mail, Eye, EyeOff, ArrowRight, ChevronRight } from "lucide-react";
import { C } from "@/lib/theme";
import { PredictaMark } from "@/components/brand/Logo";
import { login, initials } from "@/auth/useAuth";
import { useStore } from "@/store/useStore";

export default function Login() {
  const navigate = useNavigate();
  const users = useStore((s) => s.users);
  const [email, setEmail] = useState("r.teixeira@forzy.com.br");
  const [senha, setSenha] = useState("predicta");
  const [keep, setKeep] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const entrar = () => {
    const r = login(email, senha, keep);
    if (r.ok) navigate("/dashboard");
    else setError(r.error ?? "Falha no login.");
  };

  // Quick demo access: log in as any seed profile to explore its role (RBAC) live.
  const entrarComo = (em: string) => {
    setEmail(em); setSenha("predicta"); setError(null);
    const r = login(em, "predicta", keep);
    if (r.ok) navigate("/dashboard");
    else setError(r.error ?? "Falha no login.");
  };

  const fieldBorder = error ? "border-[rgba(248,113,113,0.45)]" : "border-[rgba(130,200,229,0.12)] focus-within:border-[#0047AB]";

  // ── Bloco 3 (perfis) — reaproveitado na coluna direita e no fallback mobile ──
  const profileList = (
    <div className="space-y-2">
      {users.map((u) => {
        const ativo = u.status === "ativo";
        return (
          <button key={u.id} onClick={() => entrarComo(u.email)} disabled={!ativo}
            title={ativo ? `Entrar como ${u.nome}` : "Usuário inativo"}
            className="group w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-all hover:border-[rgba(130,200,229,0.28)] hover:bg-[#0C1B2E] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            style={{ border: `1px solid ${C.border}`, background: C.bgCard }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ background: `linear-gradient(135deg,${C.cobalt},${C.navy})` }}>{initials(u.nome)}</div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-medium truncate" style={{ color: C.text }}>{u.nome}</div>
              <div className="text-[10.5px] truncate" style={{ color: C.steel }}>{u.papel}</div>
            </div>
            {ativo
              ? <ChevronRight size={15} className="flex-shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: C.slate }} />
              : <span className="text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: `${C.slate}20`, color: C.slate }}>inativo</span>}
          </button>
        );
      })}
    </div>
  );

  const ssoFooter = (
    <div className="mt-8 pt-6 flex items-center gap-2 text-[11.5px]" style={{ borderTop: `1px solid ${C.border}`, color: C.slate }}>
      <Lock size={11} className="flex-shrink-0" />
      <span>Acesso protegido — SSO + MFA habilitado · Predicta v2.4.1</span>
    </div>
  );

  return (
    <div className="flex h-full" style={{ background: C.bg }}>
      {/* ── Bloco 1 — Marca (esquerda) ──────────────────────────────────────── */}
      <div className="hidden xl:flex flex-1 min-w-[480px] flex-col relative overflow-hidden" style={{ background: C.bgDeep }}>
        <svg className="absolute inset-0 w-full h-full" style={{ opacity: .045 }}>
          <defs><pattern id="g" width="46" height="46" patternUnits="userSpaceOnUse"><path d="M 46 0 L 0 0 0 46" fill="none" stroke="#82C8E5" strokeWidth=".6" /></pattern></defs>
          <rect width="100%" height="100%" fill="url(#g)" />
        </svg>
        <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 50% 40%, ${C.cobalt}1F 0%, transparent 60%)` }} />
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg,transparent,${C.cobalt}80,transparent)` }} />

        <div className="relative z-10 flex flex-col justify-start px-12 pt-20 pb-16 h-full w-full max-w-[460px] mx-auto">
          <div className="flex items-center gap-3.5 mb-12">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center relative overflow-hidden" style={{ background: `linear-gradient(135deg,${C.cobalt},${C.navy})`, boxShadow: `0 8px 24px -8px ${C.cobalt}` }}>
              <span className="relative z-10"><PredictaMark size={23} variant="white" /></span>
            </div>
            <div className="leading-none">
              <div className="text-[22px] font-bold tracking-[0.1em]" style={{ fontFamily: "'Rajdhani',sans-serif", color: C.text }}>PREDICTA</div>
              <div className="text-[10px] tracking-[0.22em] mt-1.5" style={{ color: C.slate }}>by <span style={{ color: C.steel }}>Forzy</span> · industrial IoT</div>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 self-start text-[10px] uppercase tracking-[0.18em] px-3 py-1.5 rounded-full mb-6" style={{ background: `${C.steel}10`, border: `1px solid ${C.steel}28`, color: C.steel }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: C.green }} /> Plataforma de manutenção preditiva
          </div>

          <h1 className="text-[35px] font-bold leading-[1.08] mb-4" style={{ fontFamily: "'Rajdhani',sans-serif", color: C.text }}>
            Veja a falha chegando —<br /><span style={{ color: C.steel }}>e decida com tempo.</span>
          </h1>
          <p className="text-[14px] leading-relaxed mb-10" style={{ color: C.textSub }}>
            Monitoramento em tempo real, detecção de anomalias por IA e predição de falhas para os ativos críticos da sua planta.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {[
              { i: Cpu, v: "247", l: "Ativos monitorados", c: C.steel },
              { i: Bell, v: "5", l: "Alertas ativos", c: C.yellow },
              { i: TrendingUp, v: "97.4%", l: "Disponibilidade", c: C.green },
              { i: Wrench, v: "2.1 h", l: "MTTR médio", c: C.steel },
            ].map((s) => (
              <div key={s.l} className="rounded-xl p-4 transition-all hover:border-[rgba(130,200,229,0.22)]" style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ background: `${s.c}14`, border: `1px solid ${s.c}28` }}>
                  <s.i size={14} style={{ color: s.c }} />
                </div>
                <div className="text-[24px] font-bold leading-none" style={{ fontFamily: "'Rajdhani',sans-serif", color: C.text, fontVariantNumeric: "tabular-nums" }}>{s.v}</div>
                <div className="text-[11px] mt-1.5" style={{ color: C.slate }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bloco 2 — Formulário (centro) ───────────────────────────────────── */}
      <div className="w-full lg:w-[440px] flex-1 xl:flex-none flex flex-col overflow-y-auto" style={{ background: "#060E1A", borderLeft: `1px solid ${C.border}` }}>
        <div className="mt-[120px] mb-auto mx-auto w-full max-w-[380px] px-10 py-12">
          {/* mobile logo */}
          <div className="xl:hidden flex items-center gap-3 mb-10">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg,${C.cobalt},${C.navy})` }}>
              <PredictaMark size={18} variant="white" />
            </div>
            <div className="text-[16px] font-bold tracking-[0.1em]" style={{ fontFamily: "'Rajdhani',sans-serif", color: C.text }}>PREDICTA</div>
          </div>

          <div className="mb-8">
            <h2 className="text-[26px] font-bold mb-1.5" style={{ fontFamily: "'Rajdhani',sans-serif", color: C.text }}>Bem-vindo de volta</h2>
            <p className="text-[13.5px]" style={{ color: C.slate }}>Entre com suas credenciais corporativas.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10.5px] font-semibold uppercase tracking-[0.14em] mb-2" style={{ color: C.slate }}>E-mail corporativo</label>
              <div className={`flex items-center gap-2.5 rounded-lg px-3.5 border transition-colors ${fieldBorder}`} style={{ background: C.bgInput }}>
                <Mail size={15} style={{ color: C.slate }} className="flex-shrink-0" />
                <input value={email} onChange={(e) => { setEmail(e.target.value); setError(null); }} onKeyDown={(e) => e.key === "Enter" && entrar()}
                  autoComplete="username"
                  className="flex-1 min-w-0 bg-transparent py-2.5 text-sm focus:outline-none" style={{ color: C.text }} />
              </div>
            </div>

            <div>
              <label className="block text-[10.5px] font-semibold uppercase tracking-[0.14em] mb-2" style={{ color: C.slate }}>Senha</label>
              <div className={`flex items-center gap-2.5 rounded-lg px-3.5 border transition-colors ${fieldBorder}`} style={{ background: C.bgInput }}>
                <Lock size={15} style={{ color: C.slate }} className="flex-shrink-0" />
                <input type={showPw ? "text" : "password"} value={senha} onChange={(e) => { setSenha(e.target.value); setError(null); }} onKeyDown={(e) => e.key === "Enter" && entrar()}
                  autoComplete="current-password"
                  className="flex-1 min-w-0 bg-transparent py-2.5 text-sm focus:outline-none" style={{ color: C.text }} />
                <button type="button" onClick={() => setShowPw((v) => !v)} title={showPw ? "Ocultar senha" : "Mostrar senha"}
                  className="flex-shrink-0 transition-colors hover:brightness-125" style={{ color: C.slate }}>
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-[11.5px] px-3 py-2 rounded-lg" style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)", color: C.red }}>
                <AlertCircle size={13} className="flex-shrink-0" /> {error}
              </div>
            )}

            <div className="flex items-center justify-between text-[12.5px] pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none" style={{ color: C.textSub }}>
                <input type="checkbox" className="accent-[#0047AB] w-3.5 h-3.5" checked={keep} onChange={(e) => setKeep(e.target.checked)} /> Manter conectado
              </label>
              <button className="transition-colors hover:brightness-125" style={{ color: C.steel }}>Esqueci a senha</button>
            </div>

            <button onClick={entrar}
              className="group w-full flex items-center justify-center gap-2 py-3 rounded-lg text-[14px] font-bold tracking-wider text-white transition-all hover:brightness-110 mt-1"
              style={{ background: `linear-gradient(135deg,${C.cobalt},${C.navy})`, fontFamily: "'Rajdhani',sans-serif", letterSpacing: "0.08em", boxShadow: `0 10px 26px -10px ${C.cobalt}` }}>
              ENTRAR <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </button>

            <div className="text-[11px] text-center pt-1" style={{ color: C.slate }}>
              Demo: qualquer usuário ativo · senha <span className="font-mono" style={{ color: C.steel }}>predicta</span>
            </div>
          </div>

          {/* Perfis — fallback mobile (a coluna 3 fica oculta abaixo de lg) */}
          <div className="lg:hidden mt-7">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="flex-1 h-px" style={{ background: C.border }} />
              <span className="text-[9px] uppercase tracking-[0.2em]" style={{ color: C.slate }}>Perfis de demonstração</span>
              <div className="flex-1 h-px" style={{ background: C.border }} />
            </div>
            {profileList}
          </div>

          <div className="lg:hidden">{ssoFooter}</div>
        </div>
      </div>

      {/* ── Bloco 3 — Perfis de demonstração (direita) ──────────────────────── */}
      <div className="hidden lg:flex lg:w-[360px] flex-shrink-0 flex-col overflow-y-auto" style={{ background: "#060E1A", borderLeft: `1px solid ${C.border}` }}>
        <div className="mt-[130px] mb-auto mx-auto w-full max-w-[300px] px-9 py-12">
          <div className="mb-5">
            <div className="text-[9px] uppercase tracking-[0.2em] mb-2" style={{ color: C.slate }}>Perfis de demonstração</div>
            <p className="text-[12.5px] leading-relaxed" style={{ color: C.textSub }}>
              Entre como qualquer perfil para explorar o controle de acesso (RBAC) ao vivo.
            </p>
          </div>
          {profileList}
          {ssoFooter}
        </div>
      </div>
    </div>
  );
}
