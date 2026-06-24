// Ativo — Gêmeo Digital ────────────────────────────────────────────────────────
// The live digital replica of the asset: physical↔digital mirror, RUL + failure
// date, degradation curve with projection, and the "E se…" scenario simulator that
// runs the same degradation model headless on a clone (no side effects).
import { useState, useMemo } from "react";
import {
  Activity, Cpu, AlertTriangle, Wrench, Info, Play, Square, Gauge, Thermometer, ArrowRight,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
  PieChart, Pie, Cell,
} from "recharts";
import { toast } from "sonner";
import { C } from "@/lib/theme";
import { SH, TT_ } from "@/components/ui-shared";
import { useStore } from "@/store/useStore";
import { runScenario, type Scenario } from "@/engine/simulation";
import { readingFromState } from "@/engine/model";
import { failureProb, failureDate, predictionModel } from "@/engine/prediction";
import { recommendationsFor } from "@/lib/recommendations";
import { fmtDate, fmtAgo } from "@/lib/format";
import {
  FAILURE_MODES, FAILURE_MODE_LABEL, TAG_LABEL, TAG_UNIT, type FailureMode, type TagKey,
} from "@/lib/types";
import { useAtivo } from "../AtivoDetail";

const MODE_COLOR: Record<FailureMode, string> = {
  rolamento: "#F87171", desalinhamento: "#FB923C", lubrificacao: "#FBBF24", isolamento: "#82C8E5", cavitacao: "#A78BFA",
};
const GAUGE_HORIZONS = [7, 14, 21, 30, 60];

export default function GemeoDigital() {
  const { asset, twin } = useAtivo();
  const dictionary = useStore((s) => s.dictionary);
  const ambienteBase = useStore((s) => s.settings.ambienteDelta);
  const simClock = useStore((s) => s.simClock);
  const applyMaintenance = useStore((s) => s.applyMaintenance);

  const [gaugeH, setGaugeH] = useState(21);
  const [carga, setCarga] = useState(Math.round((twin?.cargaPct ?? 0.7) * 100));
  const [ambiente, setAmbiente] = useState(0);
  const [maint, setMaint] = useState<FailureMode | "none">("none");
  const [horizon, setHorizon] = useState(30);

  const baseScenario = useMemo(() => twin && runScenario(asset, twin, dictionary, {
    cargaPct: twin.cargaPct, ambienteDelta: ambienteBase, horizonteDias: horizon,
  }), [asset, twin, dictionary, ambienteBase, horizon]);

  const userScenario = useMemo(() => twin && runScenario(asset, twin, dictionary, {
    cargaPct: carga / 100, ambienteDelta: ambienteBase + ambiente, horizonteDias: horizon,
    manutencaoModo: maint === "none" ? null : maint,
  }), [asset, twin, dictionary, ambienteBase, carga, ambiente, maint, horizon]);

  if (!twin || !baseScenario || !userScenario) {
    return <div className="text-[12px] p-6" style={{ color:C.slate }}>Ativo offline — gêmeo digital sem sincronismo ao vivo.</div>;
  }

  const expected = readingFromState(asset, twin.damage, twin.cargaPct, ambienteBase, 0);
  // A grandeza é realmente medida neste ativo? (sensores reais; undefined = todas)
  const medido = (k: TagKey) => !asset.sensores || asset.sensores.includes(k);
  const calibrado = !!asset.sensores;   // ativo com suíte de sensores real (ex.: W22 IO-Link)
  const probGauge = failureProb(twin.rulDias, gaugeH);
  const gaugeColor = probGauge > 0.66 ? C.red : probGauge > 0.33 ? C.yellow : C.green;
  const gaugeData = [{ v: probGauge }, { v: 1 - probGauge }];

  const modeRank = [...FAILURE_MODES].sort((a, b) => twin.damage[b] - twin.damage[a]);
  const totalDamage = FAILURE_MODES.reduce((s, m) => s + twin.damage[m], 0) || 1;

  // Degradation curve: per-mode damage projection (base scenario), failure line at 100.
  const degCurve = baseScenario.curva;
  const failDateMs = baseScenario.dataFalhaMs;

  // Simulator overlay: base vs scenario health over the horizon.
  const overlay = baseScenario.curva.map((p, i) => ({ dia: p.dia, base: p.health, cenario: userScenario.curva[i]?.health ?? null }));
  const deltaRul = userScenario.rulDias - baseScenario.rulDias;

  const readingRows: { l: string; k: TagKey }[] = [
    { l: "Temperatura", k: "temp" }, { l: "Vibração", k: "vib" }, { l: "Pressão", k: "press" },
    { l: "Corrente", k: "corrente" }, { l: "Rotação", k: "rpm" }, { l: "Óleo", k: "oleo" },
  ];

  const recs = recommendationsFor(twin, 0.1);
  const recEffect = (modo: FailureMode) => {
    const sc = runScenario(asset, twin, dictionary, { cargaPct: twin.cargaPct, ambienteDelta: ambienteBase, horizonteDias: horizon, manutencaoModo: modo });
    return sc.rulDias - baseScenario.rulDias;
  };

  const quick = (s: Partial<{ carga: number; ambiente: number; maint: FailureMode | "none" }>) => {
    if (s.carga !== undefined) setCarga(s.carga);
    if (s.ambiente !== undefined) setAmbiente(s.ambiente);
    if (s.maint !== undefined) setMaint(s.maint);
  };

  const registrar = (modo: FailureMode, acao: string) => {
    applyMaintenance(asset.id, modo);
    toast.success("Manutenção registrada no gêmeo", { description: `${acao} — saúde e RUL recalculados ao vivo.` });
  };

  const summary = (() => {
    const parts: string[] = [];
    if (maint !== "none") parts.push(`executar manutenção de ${FAILURE_MODE_LABEL[maint].toLowerCase()} agora estende a RUL em ~${deltaRul >= 0 ? "+" : ""}${deltaRul} dias`);
    if (carga !== Math.round(twin.cargaPct * 100)) parts.push(`operar a ${carga}% de carga ${deltaRul < 0 ? "antecipa" : "adia"} a falha em ~${Math.abs(deltaRul)} dias`);
    if (ambiente !== 0) parts.push(`${ambiente > 0 ? "+" : ""}${ambiente} °C de ambiente`);
    if (!parts.length) return "Ajuste os controles para projetar um cenário e comparar com a base.";
    return parts.join("; ") + ".";
  })();

  return (
    <div className="space-y-4">
      {/* 1. Digital thread / sync header */}
      <div className="rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.cobalt}35` }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity size={14} style={{ color:C.green }} className="animate-pulse" />
            <span className="text-[12px] font-bold" style={{ fontFamily:"'Rajdhani',sans-serif", color:C.text, letterSpacing:"0.04em" }}>DIGITAL THREAD — Físico ↔ Digital</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ background:`${C.green}15`, color:C.green }}>sincronizado há {fmtAgo(twin.syncedAt, simClock)}</span>
            {calibrado && <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded" style={{ background:`${C.steel}18`, color:C.steel, border:`1px solid ${C.steel}40` }} title={`Linha de base calibrada com dados reais dos sensores (${asset.sensores!.map((k)=>TAG_LABEL[k]).join(" + ")}).`}>● Dados reais</span>}
          </div>
          <div className="flex items-center gap-2 text-[10px]" style={{ color:C.slate }}>
            <span>Desvio do modelo (residual):</span>
            <span className="font-mono font-bold" style={{ color: twin.residual > 60 ? C.red : twin.residual > 30 ? C.yellow : C.green }}>{twin.residual.toFixed(1)}%</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[{ t:"Motor Real (medido)", icon:Cpu, get:(k:TagKey)=>twin.state[k], accent:C.steel },
            { t:"Gêmeo Digital (esperado)", icon:Activity, get:(k:TagKey)=>expected[k], accent:C.cobalt }].map((panel)=>(
            <div key={panel.t} className="rounded-md p-3" style={{ background:C.bgDeep, border:`1px solid ${C.border}` }}>
              <div className="flex items-center gap-2 mb-2.5">
                <panel.icon size={12} style={{ color:panel.accent }} />
                <span className="text-[11px] font-semibold" style={{ color:C.text }}>{panel.t}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {readingRows.map((r)=>(
                  <div key={r.k}>
                    <div className="text-[9px]" style={{ color:C.slate }}>{r.l}</div>
                    <div className="text-[13px] font-bold" style={{ fontFamily:"'Rajdhani',sans-serif", color:C.text }}>
                      {medido(r.k) ? (
                        <>
                          {r.k==="rpm"?Math.round(panel.get(r.k) as number):(panel.get(r.k) as number).toFixed(1)}
                          <span className="text-[9px] font-normal ml-0.5" style={{ color:C.slate }}>{TAG_UNIT[r.k]}</span>
                        </>
                      ) : (
                        <span title="Sensor não instalado neste ativo" style={{ color:C.slate, fontWeight:400 }}>—</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2 & 3. Life + prediction, degradation curve */}
      <div className="grid grid-cols-3 gap-4">
        {/* RUL + gauge */}
        <div className="rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
          <SH title="Vida Útil & Predição" />
          <div className="text-center mb-3">
            <div className="text-[44px] font-bold leading-none" style={{ fontFamily:"'Rajdhani',sans-serif", color: twin.rulDias<14?C.red:twin.rulDias<30?C.yellow:C.green }}>
              {twin.rulDias < 3650 ? twin.rulDias : "∞"}
            </div>
            <div className="text-[10px] mt-1" style={{ color:C.slate }}>dias de RUL · falha estimada {twin.rulDias < 3650 ? fmtDate(failureDate(simClock, twin.rulDias)) : "—"}</div>
          </div>
          <div className="relative" style={{ height:120 }}>
            <ResponsiveContainer width="100%" height={120}>
              <PieChart>
                <Pie data={gaugeData} dataKey="v" startAngle={90} endAngle={-270} innerRadius={42} outerRadius={56} stroke="none">
                  <Cell fill={gaugeColor} /><Cell fill="rgba(130,200,229,0.08)" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="text-[24px] font-bold leading-none" style={{ fontFamily:"'Rajdhani',sans-serif", color:gaugeColor }}>{Math.round(probGauge*100)}%</div>
              <div className="text-[9px]" style={{ color:C.slate }}>prob. {gaugeH}d</div>
            </div>
          </div>
          <div className="flex items-center justify-center gap-1 mt-2">
            {GAUGE_HORIZONS.map((h)=>(
              <button key={h} onClick={()=>setGaugeH(h)} className="px-1.5 py-0.5 text-[10px] rounded font-mono transition-all"
                style={gaugeH===h?{background:`${C.cobalt}30`,color:C.steel}:{color:C.slate}}>{h}d</button>
            ))}
          </div>
        </div>

        {/* Dominant modes */}
        <div className="rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
          <SH title="Modos de Falha" />
          <div className="space-y-2.5">
            {modeRank.slice(0, 5).map((m, i)=>{
              const contrib = Math.round((twin.damage[m] / totalDamage) * 100);
              return (
                <div key={m}>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span style={{ color: i===0?C.text:C.slate, fontWeight:i===0?600:400 }}>
                      {i===0 && "▸ "}{FAILURE_MODE_LABEL[m]}
                    </span>
                    <span className="font-mono font-bold" style={{ color:MODE_COLOR[m] }}>{Math.round(twin.damage[m]*100)}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background:"rgba(130,200,229,0.08)" }}>
                    <div className="h-full rounded-full" style={{ width:`${twin.damage[m]*100}%`, background:MODE_COLOR[m] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Degradation curve */}
        <div className="rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
          <SH title="Curva de Degradação — Projeção" />
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={degCurve}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.steel} strokeOpacity={.05} />
              <XAxis dataKey="dia" tick={{ fontSize:9, fill:C.slate, fontFamily:"JetBrains Mono" }} axisLine={false} tickLine={false} interval={Math.max(0,Math.floor(degCurve.length/6))} tickFormatter={(d)=>`+${d}d`} />
              <YAxis domain={[0,100]} tick={{ fontSize:9, fill:C.slate }} axisLine={false} tickLine={false} />
              <Tooltip content={<TT_ />} />
              <ReferenceLine y={100} stroke={C.red} strokeDasharray="4 4" strokeOpacity={.5} label={{ value:"Falha", fill:C.red, fontSize:9, position:"insideTopRight" }} />
              {FAILURE_MODES.map((m)=>(
                <Line key={m} type="monotone" dataKey={m} name={FAILURE_MODE_LABEL[m]} stroke={MODE_COLOR[m]} strokeWidth={twin.modoCritico===m?2:1} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
          <div className="text-[10px] mt-1" style={{ color:C.slate }}>
            {failDateMs ? `Cruza a linha de falha em ${fmtDate(failDateMs)}.` : "Sem cruzamento da linha de falha no horizonte."}
          </div>
        </div>
      </div>

      {/* 4. Scenario simulator */}
      <div className="rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.cobalt}35` }}>
        <SH title="Simulador de Cenários — “E se…”" right={<span className="text-[10px]" style={{ color:C.slate }}>roda o modelo num clone, sem afetar o gêmeo real</span>} />
        <div className="grid grid-cols-3 gap-4">
          {/* controls */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-[11px] mb-1"><span className="flex items-center gap-1" style={{ color:C.slate }}><Gauge size={11}/> Fator de carga</span><span className="font-mono" style={{ color:C.steel }}>{carga}%</span></div>
              <input type="range" min={50} max={120} step={5} value={carga} onChange={(e)=>setCarga(Number(e.target.value))} className="w-full accent-[#0047AB]" />
            </div>
            <div>
              <div className="flex items-center justify-between text-[11px] mb-1"><span className="flex items-center gap-1" style={{ color:C.slate }}><Thermometer size={11}/> Temp. ambiente Δ</span><span className="font-mono" style={{ color:C.steel }}>{ambiente>=0?"+":""}{ambiente} °C</span></div>
              <input type="range" min={-10} max={20} step={1} value={ambiente} onChange={(e)=>setAmbiente(Number(e.target.value))} className="w-full accent-[#0047AB]" />
            </div>
            <div>
              <div className="text-[11px] mb-1" style={{ color:C.slate }}>Executar manutenção agora</div>
              <select value={maint} onChange={(e)=>setMaint(e.target.value as FailureMode|"none")} className="w-full px-3 py-2 text-xs rounded-md focus:outline-none" style={{ background:C.bgDeep, border:`1px solid ${C.border}`, color:C.text }}>
                <option value="none">Nenhuma</option>
                {FAILURE_MODES.map((m)=><option key={m} value={m}>{FAILURE_MODE_LABEL[m]}</option>)}
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between text-[11px] mb-1"><span style={{ color:C.slate }}>Horizonte</span><span className="font-mono" style={{ color:C.steel }}>{horizon} dias</span></div>
              <input type="range" min={7} max={90} step={1} value={horizon} onChange={(e)=>setHorizon(Number(e.target.value))} className="w-full accent-[#0047AB]" />
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                { l:"Parar agora", on:()=>quick({ carga:50, maint:"none" }) },
                { l:"Operar até falha", on:()=>quick({ carga:Math.round(twin.cargaPct*100), maint:"none" }) },
                { l:"Manut. preventiva", on:()=>quick({ maint:twin.modoCritico }) },
                { l:"Pico de produção", on:()=>quick({ carga:120 }) },
              ].map((b)=>(
                <button key={b.l} onClick={b.on} className="text-[10px] px-2 py-1 rounded-full transition-all" style={{ border:`1px solid ${C.border}`, color:C.slate }}>{b.l}</button>
              ))}
            </div>
          </div>

          {/* overlay chart */}
          <div className="col-span-2">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={overlay}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.steel} strokeOpacity={.05} />
                <XAxis dataKey="dia" tick={{ fontSize:9, fill:C.slate, fontFamily:"JetBrains Mono" }} axisLine={false} tickLine={false} interval={Math.max(0,Math.floor(overlay.length/8))} tickFormatter={(d)=>`+${d}d`} />
                <YAxis domain={[0,100]} tick={{ fontSize:9, fill:C.slate }} axisLine={false} tickLine={false} />
                <Tooltip content={<TT_ />} />
                <ReferenceLine y={50} stroke={C.red} strokeDasharray="4 4" strokeOpacity={.3} />
                <Line type="monotone" dataKey="base" name="Base (atual)" stroke={C.slate} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="cenario" name="Cenário" stroke={C.steel} strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {[
                { l:"RUL no cenário", v:`${userScenario.rulDias < 3650 ? userScenario.rulDias : "∞"} d`, c:C.steel },
                { l:"Δ RUL vs base", v:`${deltaRul>=0?"+":""}${deltaRul} d`, c: deltaRul>=0?C.green:C.red },
                { l:"Nova data de falha", v: userScenario.dataFalhaMs?fmtDate(userScenario.dataFalhaMs):"—", c:C.textSub },
              ].map((m)=>(
                <div key={m.l} className="rounded-md p-2 text-center" style={{ background:C.bgDeep, border:`1px solid ${C.border}` }}>
                  <div className="text-[15px] font-bold" style={{ fontFamily:"'Rajdhani',sans-serif", color:m.c }}>{m.v}</div>
                  <div className="text-[9px]" style={{ color:C.slate }}>{m.l}</div>
                </div>
              ))}
            </div>
            <p className="text-[11px] mt-2 leading-relaxed" style={{ color:C.textSub }}><strong style={{ color:C.steel }}>Resumo:</strong> {summary}</p>
          </div>
        </div>
      </div>

      {/* 5 & 6. Recommendations + model card */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
          <SH title="Recomendações Acionáveis — efeito pré-calculado" />
          <div className="space-y-2">
            {recs.length===0 && <div className="text-[11px]" style={{ color:C.slate }}>Sem recomendações — ativo saudável.</div>}
            {recs.map((r)=>{
              const eff = recEffect(r.modo);
              return (
                <div key={r.modo} className="flex items-center gap-3 p-3 rounded-md" style={{ background:C.bgDeep, border:`1px solid ${C.border}` }}>
                  <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ background:MODE_COLOR[r.modo] }} />
                  <div className="flex-1">
                    <div className="text-[12px] font-medium" style={{ color:C.text }}>{r.acao}</div>
                    <div className="text-[10px]" style={{ color:C.slate }}>Prioridade {r.pri} · dano {Math.round(r.damage*100)}%</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[13px] font-bold font-mono" style={{ color: eff>0?C.green:C.slate }}>{eff>=0?"+":""}{eff} d</div>
                    <div className="text-[9px]" style={{ color:C.slate }}>Δ RUL</div>
                  </div>
                  <button onClick={()=>registrar(r.modo, r.acao)} className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-md transition-all hover:brightness-110 flex-shrink-0"
                    style={{ background:`${C.cobalt}22`, border:`1px solid ${C.cobalt}44`, color:C.steel }}>
                    <Wrench size={11}/> Registrar <ArrowRight size={10}/>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
          <SH title="Ficha do Modelo" />
          {[
            ["Engine", predictionModel.name],
            ["Método", predictionModel.metodo],
            ["Variáveis", `${asset.sensores?.length ?? 6} sensores`],
            ...(calibrado ? [["Calibração", "Dados reais IO-Link"]] : []),
            ["Último sincronismo", fmtDate(twin.syncedAt)],
            ["Carga operacional", `${Math.round(twin.cargaPct*100)}%`],
          ].map(([k,v])=>(
            <div key={k} className="flex justify-between py-1.5 text-[11px] gap-2" style={{ borderBottom:`1px solid ${C.border}40` }}>
              <span style={{ color:C.slate }}>{k}</span><span className="font-mono text-right" style={{ color:C.textSub }}>{v}</span>
            </div>
          ))}
          <div className="flex items-start gap-2 mt-3 p-2.5 rounded-md" style={{ background:`${C.cobalt}0C`, border:`1px solid ${C.cobalt}28` }}>
            <Info size={12} style={{ color:C.steel }} className="flex-shrink-0 mt-0.5" />
            <p className="text-[10px] leading-relaxed" style={{ color:C.slate }}>
              Predição de um <strong style={{ color:C.steel }}>modelo de degradação simulado</strong> (físico-informado + Weibull), não treinado em falhas reais. A interface <code style={{ color:C.steel }}>PredictionModel</code> permite plugar um modelo treinado depois.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
