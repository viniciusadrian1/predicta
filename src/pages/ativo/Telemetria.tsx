// Ativo — Telemetria ───────────────────────────────────────────────────────────
import { useState, useMemo } from "react";
import { Download, RefreshCw } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { C } from "@/lib/theme";
import { IBtn, TT_ } from "@/components/ui-shared";
import { useStore } from "@/store/useStore";
import { windowSamples, toChartData, stats, type Win } from "@/lib/telemetry";
import { downloadCSV } from "@/lib/csv";
import { fmtDateTime } from "@/lib/format";
import type { TagKey } from "@/lib/types";
import { TraceableValue } from "@/components/gov";
import { useAtivo } from "../AtivoDetail";

const WINDOWS: Win[] = ["1h", "6h", "24h", "7d", "30d"];

export default function AtivoTelemetria() {
  const { asset, twin } = useAtivo();
  const dictionary = useStore((s) => s.dictionary);
  const [range, setRange] = useState<Win>("24h");

  const samples = useMemo(() => windowSamples(twin?.history ?? [], range), [twin?.history, range]);
  const chart = useMemo(() => toChartData(samples), [samples]);

  const critOf = (key: TagKey) => asset.limites?.[key]?.critico ?? dictionary.find((t) => t.key === key)?.limiteCritico ?? 0;
  const charts: { k: TagKey; l: string; c: string; lim: number }[] = [
    { k: "temp",     l: "Temperatura (°C)",    c: "#FBBF24", lim: critOf("temp") },
    { k: "vib",      l: "Vibração RMS (mm/s)",  c: C.steel,   lim: critOf("vib") },
    { k: "corrente", l: "Corrente (A)",         c: C.green,   lim: critOf("corrente") },
  ];

  const exportCSV = () =>
    downloadCSV(`telemetria-${asset.id}-${range}`, samples.map((s) => ({
      DataHora: fmtDateTime(s.t),
      "Temp(C)": s.temp, "Vib(mm/s)": s.vib, "Press(bar)": s.press,
      "Corrente(A)": s.corrente, RPM: s.rpm, "Oleo(%)": s.oleo,
    })));

  if (!twin) return <div className="text-[12px] p-6" style={{ color:C.slate }}>Ativo offline — sem telemetria.</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {WINDOWS.map(r=>(
          <button key={r} onClick={()=>setRange(r)} className="px-3 py-1.5 text-xs rounded-md transition-all"
            style={range===r?{background:`${C.cobalt}22`,border:`1px solid ${C.cobalt}44`,color:C.steel}:{border:`1px solid ${C.border}`,color:C.slate}}>
            {r}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <IBtn icon={Download} label="CSV" onClick={exportCSV} />
          <IBtn icon={RefreshCw} />
        </div>
      </div>
      {charts.map(ch=>{
        const s = stats(samples, ch.k);
        return (
          <div key={ch.k} className="rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] font-semibold" style={{ color:C.text }}>{ch.l}</span>
              <div className="flex items-center gap-4 text-[10px] font-mono" style={{ color:C.slate }}>
                <span>Mín: <span style={{ color:C.textSub }}>{s.min.toFixed(1)}</span></span>
                <span>Máx: <span style={{ color:C.textSub }}>{s.max.toFixed(1)}</span></span>
                <span>Média: <span style={{ color:C.textSub }}><TraceableValue tagKey={ch.k}>{s.avg.toFixed(1)}</TraceableValue></span></span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={chart}>
                <defs><linearGradient id={`g${ch.k}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={ch.c} stopOpacity={.12}/><stop offset="95%" stopColor={ch.c} stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.steel} strokeOpacity={.04} />
                <XAxis dataKey="h" tick={{ fontSize:9, fill:C.slate, fontFamily:"JetBrains Mono" }} axisLine={false} tickLine={false} interval={Math.max(0, Math.floor(chart.length/8))} />
                <YAxis tick={{ fontSize:9, fill:C.slate, fontFamily:"JetBrains Mono" }} axisLine={false} tickLine={false} />
                <Tooltip content={<TT_ />} />
                {ch.lim > 0 && <ReferenceLine y={ch.lim} stroke={ch.c} strokeDasharray="4 4" strokeOpacity={.4} />}
                <Area type="monotone" dataKey={ch.k} name={ch.l} stroke={ch.c} fill={`url(#g${ch.k})`} strokeWidth={1.5} dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        );
      })}
    </div>
  );
}
