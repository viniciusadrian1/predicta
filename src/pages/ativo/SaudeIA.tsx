// Ativo — Saúde & IA ───────────────────────────────────────────────────────────
import { useMemo } from "react";
import { AlertTriangle, Info, Wrench } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { toast } from "sonner";
import { C } from "@/lib/theme";
import { SH, Bar_, TT_ } from "@/components/ui-shared";
import { useStore } from "@/store/useStore";
import { runScenario } from "@/engine/simulation";
import { predictionModel } from "@/engine/prediction";
import { recommendationsFor } from "@/lib/recommendations";
import { fmtDayMonth, fmtDate, fmtTimeSec } from "@/lib/format";
import { FAILURE_MODES, FAILURE_MODE_LABEL } from "@/lib/types";
import { AIConfidence, GatedButton } from "@/components/gov";
import { useAtivo } from "../AtivoDetail";

const DAY = 24 * 60 * 60 * 1000;

export default function AtivoSaudeIA() {
  const { asset, twin } = useAtivo();
  const dictionary = useStore((s) => s.dictionary);
  const ambient = useStore((s) => s.settings.ambienteDelta);
  const simClock = useStore((s) => s.simClock);
  const applyMaintenance = useStore((s) => s.applyMaintenance);

  const recs = twin ? recommendationsFor(twin, 0.1) : [];
  const prob21 = twin?.probFalha.find((p) => p.horizonteDias === 21)?.prob ?? 0;

  const trend = useMemo(() => {
    if (!twin) return [] as { d: string; r: number | null; p: number | null }[];
    const fwd = runScenario(asset, twin, dictionary, { cargaPct: twin.cargaPct, ambienteDelta: ambient, horizonteDias: 14 });
    const drop = fwd.curva.length > 1 ? Math.max(0, fwd.curva[0].health - fwd.curva[1].health) : 0;
    const out: { d: string; r: number | null; p: number | null }[] = [];
    for (let off = -16; off < 0; off++) out.push({ d: fmtDayMonth(simClock + off * DAY), r: +Math.min(100, twin.health + drop * -off).toFixed(1), p: null });
    fwd.curva.forEach((pt) => out.push({ d: fmtDayMonth(simClock + pt.dia * DAY), r: pt.dia === 0 ? twin.health : null, p: pt.health }));
    return out;
  }, [asset, twin, dictionary, ambient, simClock]);

  if (!twin) return <div className="text-[12px] p-6" style={{ color:C.slate }}>Ativo offline — sem predição ao vivo.</div>;

  const registrar = (modo: typeof recs[number]["modo"], acao: string) => {
    applyMaintenance(asset.id, modo);
    toast.success("Manutenção registrada", { description: `${acao} — dano reduzido, saúde e RUL recalculados.` });
  };

  const sevColor = prob21 > 0.8 ? C.red : prob21 > 0.5 ? C.yellow : C.green;

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="col-span-2 space-y-4">
        <div className="rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
          <SH title={`Predição de Falha — ${predictionModel.name}`} />
          <div className="flex items-center gap-3 p-3 rounded-lg mb-4" style={{ background:`${sevColor}0E`, border:`1px solid ${sevColor}38` }}>
            <AlertTriangle size={15} style={{ color:sevColor }} className="flex-shrink-0" />
            <div className="flex-1">
              <div className="text-[12px] font-semibold mb-0.5" style={{ color:sevColor }}>
                {twin.rulDias < 3650 ? `Falha prevista em ~${twin.rulDias} dias` : "Sem falha prevista no horizonte"}
              </div>
              <div className="text-[11px]" style={{ color:C.textSub }}>
                Modo dominante: {FAILURE_MODE_LABEL[twin.modoCritico]}. Probabilidade de falha: {Math.round(prob21 * 100)}% em 21 dias.
              </div>
            </div>
            <div className="text-center">
              <div className="text-[28px] font-bold" style={{ fontFamily:"'Rajdhani',sans-serif", color:sevColor }}>{Math.round(prob21 * 100)}%</div>
              <div className="text-[10px]" style={{ color:C.slate }}>Prob. Falha</div>
            </div>
          </div>
          <div className="mb-4">
            <AIConfidence
              confianca={twin.health >= 75 ? "alta" : twin.health >= 50 ? "media" : "baixa"}
              horizonte={`${twin.rulDias} dias`}
              explicacao={`Modo dominante: ${FAILURE_MODE_LABEL[twin.modoCritico]}.`}
              simulado={true}
            />
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.steel} strokeOpacity={.05} />
              <XAxis dataKey="d" tick={{ fontSize:9, fill:C.slate, fontFamily:"JetBrains Mono" }} axisLine={false} tickLine={false} interval={3} />
              <YAxis domain={[0,100]} tick={{ fontSize:9, fill:C.slate }} axisLine={false} tickLine={false} />
              <Tooltip content={<TT_ />} />
              <ReferenceLine y={50} stroke={C.red} strokeDasharray="4 4" strokeOpacity={.35} />
              <Line type="monotone" dataKey="r" name="Saúde Real"  stroke={C.steel}  strokeWidth={2}   dot={false} connectNulls />
              <Line type="monotone" dataKey="p" name="Projeção IA" stroke={C.yellow} strokeWidth={1.5} strokeDasharray="5 5" dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
          <SH title="Recomendações de Manutenção" />
          <div className="space-y-2">
            {recs.length === 0 && <div className="text-[11px]" style={{ color:C.slate }}>Sem recomendações — ativo saudável.</div>}
            {recs.map(r=>(
              <div key={r.modo} className="flex items-start gap-3 p-3 rounded-md" style={{ background:C.bgDeep, border:`1px solid ${C.border}` }}>
                <span className="text-[10px] font-bold font-mono px-1.5 py-1 rounded flex-shrink-0"
                  style={r.pri==="Alta"?{background:"rgba(251,146,60,0.15)",color:C.orange,border:"1px solid rgba(251,146,60,0.3)"}:r.pri==="Média"?{background:"rgba(251,191,36,0.12)",color:C.yellow,border:"1px solid rgba(251,191,36,0.3)"}:{background:"rgba(109,129,150,0.15)",color:C.slate,border:`1px solid ${C.border}`}}>
                  {r.pri}
                </span>
                <div className="flex-1">
                  <div className="text-[12px] font-medium mb-0.5" style={{ color:C.text }}>{r.acao}</div>
                  <div className="text-[11px]" style={{ color:C.slate }}>{r.motivo}</div>
                  <div className="text-[10px] font-mono mt-1.5" style={{ color:C.steel }}>Prazo sugerido: {r.prazoDias} dias</div>
                </div>
                <GatedButton modulo="Ativos" nivel="full" onClick={()=>registrar(r.modo, r.acao)} className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-md transition-all hover:brightness-110 self-center flex-shrink-0"
                  style={{ background:`${C.cobalt}22`, border:`1px solid ${C.cobalt}44`, color:C.steel }}>
                  <Wrench size={11}/> Registrar manutenção
                </GatedButton>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
          <SH title="Saúde por Modo de Falha" />
          {FAILURE_MODES.map(m=>{
            const health = Math.round((1 - twin.damage[m]) * 100);
            return (
              <div key={m} className="mb-3">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span style={{ color: m===twin.modoCritico?C.steel:C.slate }}>{FAILURE_MODE_LABEL[m]}</span>
                  <span className="font-mono font-bold" style={{ color:health>=75?C.green:health>=50?C.yellow:C.red }}>{health}%</span>
                </div>
                <Bar_ v={health} />
              </div>
            );
          })}
        </div>
        <div className="rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
          <SH title="Modelo de IA" />
          {[
            ["Modelo", predictionModel.name],
            ["Método", predictionModel.metodo],
            ["Inferência", fmtTimeSec(simClock)],
            ["Último sincronismo", fmtDate(twin.syncedAt)],
            ["Variáveis", "6 (temp, vib, press, corrente, rpm, óleo)"],
          ].map(([k,v])=>(
            <div key={k} className="flex justify-between py-1.5 text-[11px] gap-3" style={{ borderBottom:`1px solid ${C.border}40` }}>
              <span style={{ color:C.slate }}>{k}</span>
              <span className="font-mono text-right" style={{ color:C.textSub }}>{v}</span>
            </div>
          ))}
          <div className="flex items-start gap-2 mt-3 p-2.5 rounded-md" style={{ background:`${C.cobalt}0C`, border:`1px solid ${C.cobalt}28` }}>
            <Info size={12} style={{ color:C.steel }} className="flex-shrink-0 mt-0.5" />
            <p className="text-[10px] leading-relaxed" style={{ color:C.slate }}>
              Predição do <strong style={{ color:C.steel }}>gêmeo digital</strong> baseada em modelo de degradação <em>simulado</em> (físico-informado), não em um modelo treinado em falhas reais.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
