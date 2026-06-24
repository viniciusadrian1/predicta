// Ativo — Visão Geral ──────────────────────────────────────────────────────────
import { useMemo } from "react";
import { useNavigate } from "react-router";
import { Thermometer, Radio, Gauge, Zap, AlertTriangle } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from "recharts";
import { C } from "@/lib/theme";
import { SH, SevBadge, TT_ } from "@/components/ui-shared";
import { useStore } from "@/store/useStore";
import { toChartData } from "@/lib/telemetry";
import { recommendationsFor } from "@/lib/recommendations";
import { FAILURE_MODES, FAILURE_MODE_LABEL, type TagKey } from "@/lib/types";
import { Wrench } from "lucide-react";
import { useAtivo } from "../AtivoDetail";

const REC_ICON = Wrench;

export default function AtivoOverview() {
  const { asset, twin } = useAtivo();
  const navigate = useNavigate();
  const alerts = useStore((s) => s.alerts);
  const dictionary = useStore((s) => s.dictionary);

  const limOf = (key: TagKey) => asset.limites?.[key]?.alerta ?? dictionary.find((t) => t.key === key)?.limiteAlerta ?? Infinity;

  const readings = twin ? [
    { l:"Temperatura", v:twin.state.temp.toFixed(1), u:"°C",   I:Thermometer, warn: twin.state.temp >= limOf("temp") },
    { l:"Vibração",    v:twin.state.vib.toFixed(2),  u:"mm/s", I:Radio,       warn: twin.state.vib >= limOf("vib") },
    { l:"Pressão",     v:twin.state.press.toFixed(2),u:"bar",  I:Gauge,       warn: twin.state.press <= (asset.limites?.press?.alerta ?? dictionary.find(t=>t.key==="press")?.limiteAlerta ?? 0) },
    { l:"Corrente",    v:twin.state.corrente.toFixed(1),u:"A", I:Zap,         warn: twin.state.corrente >= limOf("corrente") },
  ] : [];

  const chart = useMemo(() => toChartData(twin?.history.slice(-72) ?? []), [twin?.history]);
  const radar = twin ? FAILURE_MODES.map((m) => ({ e: FAILURE_MODE_LABEL[m].split(" ")[0], v: Math.round((1 - twin.damage[m]) * 100) })) : [];
  const assetAlert = alerts.find((a) => a.assetId === asset.id && a.status !== "resolvido");
  const recs = twin ? recommendationsFor(twin, 0.1).slice(0, 3) : [];

  if (!twin) return <div className="text-[12px] p-6" style={{ color:C.slate }}>Ativo offline — sem telemetria ao vivo.</div>;

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="col-span-2 space-y-4">
        {/* Live readings */}
        <div className="rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
          <SH title="Leituras em Tempo Real" />
          <div className="grid grid-cols-4 gap-3 mb-4">
            {readings.map(s=>(
              <div key={s.l} className="rounded-lg p-3" style={{ background:C.bgDeep, border:`1px solid ${s.warn?"rgba(251,191,36,0.25)":C.border}` }}>
                <div className="flex items-center justify-between mb-2">
                  <s.I size={12} style={{ color:C.slate }} />
                  <div className={`w-1.5 h-1.5 rounded-full ${s.warn?"bg-yellow-400 animate-pulse":"bg-emerald-400"}`} />
                </div>
                <div className="text-[22px] font-bold leading-none" style={{ fontFamily:"'Rajdhani',sans-serif", color:s.warn?C.yellow:C.text }}>{s.v}</div>
                <div className="text-[10px] mt-1" style={{ color:C.slate }}>{s.l} · {s.u}</div>
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={110}>
            <AreaChart data={chart}>
              <defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.steel} stopOpacity={.15}/><stop offset="95%" stopColor={C.steel} stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.steel} strokeOpacity={.04} />
              <XAxis dataKey="h" tick={{ fontSize:9, fill:C.slate, fontFamily:"JetBrains Mono" }} axisLine={false} tickLine={false} interval={11} />
              <YAxis tick={{ fontSize:9, fill:C.slate }} axisLine={false} tickLine={false} />
              <Tooltip content={<TT_ />} />
              <Area type="monotone" dataKey="temp" name="Temperatura" stroke={C.steel} fill="url(#ga)" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Alert of asset */}
        {assetAlert && (
          <div className="flex items-start gap-3 p-3 rounded-lg" style={{ background:"rgba(251,191,36,0.04)", border:"1px solid rgba(251,191,36,0.2)" }}>
            <AlertTriangle size={14} className="text-yellow-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[12px] font-semibold text-yellow-400">{assetAlert.titulo}</span>
                <SevBadge s={assetAlert.severidade} />
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color:C.textSub }}>{assetAlert.descricao}</p>
              <div className="flex items-center gap-2 mt-2 text-[10px] font-mono" style={{ color:C.slate }}>
                <span>{assetAlert.id}</span><span>·</span><span>{new Date(assetAlert.criadoEm).toLocaleString("pt-BR")}</span>
              </div>
            </div>
            <button onClick={()=>navigate(`/alertas/${assetAlert.id}`)} className="text-[11px] px-2.5 py-1 rounded transition-all hover:bg-[#112035]" style={{ border:`1px solid ${C.border}`, color:C.steel }}>Ver alerta</button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {/* Health score */}
        <div className="rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
          <SH title="Score de Saúde" />
          <div className="text-center mb-4">
            <div className="text-[52px] font-bold leading-none" style={{ fontFamily:"'Rajdhani',sans-serif", color: twin.health>=75?C.green:twin.health>=50?C.yellow:C.red }}>{twin.health}</div>
            <div className="text-[11px] mt-1" style={{ color:C.slate }}>{twin.health>=75?"Saudável":twin.health>=50?"Atenção — Degradação detectada":"Crítico — Intervenção urgente"}</div>
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <RadarChart data={radar}>
              <PolarGrid stroke={C.steel} strokeOpacity={.1} />
              <PolarAngleAxis dataKey="e" tick={{ fontSize:9, fill:C.slate }} />
              <Radar dataKey="v" stroke={C.steel} fill={C.cobalt} fillOpacity={.25} strokeWidth={1.5} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Next actions */}
        <div className="rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
          <SH title="Próximas Ações" />
          <div className="space-y-2">
            {recs.length === 0 && <div className="text-[11px]" style={{ color:C.slate }}>Sem ações pendentes.</div>}
            {recs.map(act=>(
              <div key={act.modo} className="flex items-center gap-2.5 p-2 rounded-md" style={{ background:C.bgDeep, border:`1px solid ${C.border}` }}>
                <REC_ICON size={11} style={{ color:C.steel }} />
                <div className="flex-1">
                  <div className="text-[11px] font-medium" style={{ color:C.text }}>{act.acao}</div>
                  <div className="text-[10px]" style={{ color:C.slate }}>Em {act.prazoDias} dias</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
