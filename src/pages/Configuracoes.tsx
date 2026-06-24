// Configurações ───────────────────────────────────────────────────────────────
// Simulation controls (pause / speed / advance 7 days), ambient temperature, and
// "Resetar dados de demonstração" (reloads the seed). Role switcher added in Fase 7.
import { useNavigate } from "react-router";
import { Play, Pause, FastForward, RotateCcw, Activity, Thermometer, User, LogOut } from "lucide-react";
import { toast } from "sonner";
import { C } from "@/lib/theme";
import { SH } from "@/components/ui-shared";
import { usePageChrome } from "@/components/layout/chrome";
import { useStore } from "@/store/useStore";
import { advanceDays } from "@/engine/simulation";
import { fmtDateTime } from "@/lib/format";
import { useSession, switchRole, logout } from "@/auth/useAuth";

const SPEEDS = [1, 10, 60];

export default function Configuracoes() {
  const navigate = useNavigate();
  const settings = useStore((s) => s.settings);
  const simClock = useStore((s) => s.simClock);
  const setSimSpeed = useStore((s) => s.setSimSpeed);
  const togglePause = useStore((s) => s.togglePause);
  const setAmbiente = useStore((s) => s.setAmbiente);
  const resetDemo = useStore((s) => s.resetDemo);
  const roles = useStore((s) => s.roles);
  const session = useSession();

  usePageChrome(["Sistema", "Configurações"]);

  const avancar = () => { advanceDays(7); toast.success("Simulação avançada", { description: "+7 dias simulados aplicados aos gêmeos digitais." }); };
  const reset = () => { resetDemo(); toast.success("Demonstração restaurada", { description: "Ativos, alertas e gêmeos voltaram ao estado inicial." }); };

  return (
    <div className="grid grid-cols-2 gap-4 max-w-4xl">
      <div className="rounded-lg p-5" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
        <SH title="Motor de Simulação" />
        <div className="flex items-center gap-2 mb-4 text-[11px]" style={{ color:C.slate }}>
          <Activity size={13} style={{ color: settings.paused ? C.slate : C.green }} />
          <span>{settings.paused ? "Pausado" : "Em execução"} · relógio simulado: <span className="font-mono" style={{ color:C.textSub }}>{fmtDateTime(simClock)}</span></span>
        </div>

        <div className="space-y-4">
          <div>
            <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color:C.slate }}>Estado</div>
            <button onClick={togglePause} className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-all"
              style={{ background:`${C.cobalt}20`, border:`1px solid ${C.cobalt}40`, color:C.steel }}>
              {settings.paused ? <><Play size={13}/> Retomar</> : <><Pause size={13}/> Pausar</>}
            </button>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color:C.slate }}>Velocidade</div>
            <div className="flex items-center gap-2">
              {SPEEDS.map((sp)=>(
                <button key={sp} onClick={()=>setSimSpeed(sp)} className="px-4 py-2 text-xs font-bold rounded-md transition-all"
                  style={settings.simSpeed===sp?{background:`${C.cobalt}30`,border:`1px solid ${C.cobalt}55`,color:C.steel}:{border:`1px solid ${C.border}`,color:C.slate}}>
                  {sp}×
                </button>
              ))}
            </div>
            <div className="text-[10px] mt-1.5" style={{ color:C.slate }}>{settings.minutesPerTick * settings.simSpeed} min simulados por segundo real.</div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color:C.slate }}>Demonstração</div>
            <button onClick={avancar} className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-all"
              style={{ background:C.bgDeep, border:`1px solid ${C.border}`, color:C.text }}>
              <FastForward size={13} style={{ color:C.steel }}/> Avançar 7 dias
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg p-5" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
          <SH title="Ambiente" />
          <div className="flex items-center gap-2 mb-2 text-[11px]" style={{ color:C.slate }}>
            <Thermometer size={13} style={{ color:C.steel }}/>
            <span>Temperatura ambiente: <span className="font-mono" style={{ color:C.textSub }}>{settings.ambienteDelta >= 0 ? "+" : ""}{settings.ambienteDelta} °C</span></span>
          </div>
          <input type="range" min={-10} max={20} step={1} value={settings.ambienteDelta} onChange={(e)=>setAmbiente(Number(e.target.value))} className="w-full accent-[#0047AB]" />
          <div className="text-[10px] mt-1" style={{ color:C.slate }}>Afeta a temperatura dos ativos e a taxa de envelhecimento térmico.</div>
        </div>

        <div className="rounded-lg p-5" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
          <SH title="Dados" />
          <p className="text-[11px] leading-relaxed mb-3" style={{ color:C.slate }}>O estado é persistido localmente (localStorage). Restaurar recarrega os ativos, alertas e gêmeos digitais de demonstração.</p>
          <button onClick={reset} className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-all"
            style={{ background:"rgba(248,113,113,0.12)", border:"1px solid rgba(248,113,113,0.3)", color:C.red }}>
            <RotateCcw size={13}/> Resetar dados de demonstração
          </button>
        </div>
      </div>

      {/* Session & role */}
      <div className="col-span-2 rounded-lg p-5" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
        <SH title="Sessão & Papel" />
        <div className="flex items-center gap-2 mb-4 text-[11px]" style={{ color:C.slate }}>
          <User size={13} style={{ color:C.steel }}/>
          <span>Conectado como <span className="font-mono" style={{ color:C.textSub }}>{session.nome ?? "—"}</span> · papel atual: <span className="font-mono" style={{ color:C.steel }}>{session.papel ?? "—"}</span></span>
        </div>
        <div className="flex items-end gap-4 flex-wrap">
          <div>
            <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color:C.slate }}>Trocar papel (demonstração de RBAC)</div>
            <select value={session.papel ?? ""} onChange={(e)=>{ switchRole(e.target.value); toast.success("Papel alterado", { description: e.target.value }); }}
              className="px-3 py-2 text-xs rounded-md focus:outline-none" style={{ background:C.bgDeep, border:`1px solid ${C.border}`, color:C.text }}>
              {roles.map((r)=><option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <button onClick={()=>{ logout(); navigate("/login"); }} className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-all"
            style={{ background:"rgba(248,113,113,0.12)", border:"1px solid rgba(248,113,113,0.3)", color:C.red }}>
            <LogOut size={13}/> Sair
          </button>
        </div>
        <p className="text-[10px] mt-3" style={{ color:C.slate }}>Trocar o papel altera imediatamente os módulos visíveis na sidebar e as permissões — útil para demonstrar o RBAC.</p>
      </div>
    </div>
  );
}
