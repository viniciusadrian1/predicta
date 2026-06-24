// 3. Painel Operacional ────────────────────────────────────────────────────────
import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { Layers, List, RefreshCw, Search, Thermometer, Radio, Gauge, Wifi, WifiOff } from "lucide-react";
import { C } from "@/lib/theme";
import { IBtn, Bar_ } from "@/components/ui-shared";
import { usePageChrome } from "@/components/layout/chrome";
import { useAssetViews, statusCounts } from "@/store/derive";
import { useStore } from "@/store/useStore";
import { fmtDate, fmtTimeSec } from "@/lib/format";
import { TraceableValue } from "@/components/gov";

const TYPE_FILTERS = ["Todos", "Bombas", "Motores", "Compressores", "Turbinas"];
const TYPE_MATCH: Record<string, (tipo: string) => boolean> = {
  Todos: () => true,
  Bombas: (t) => t === "Bomba",
  Motores: (t) => t === "Motor",
  Compressores: (t) => t === "Compressor",
  Turbinas: (t) => t === "Turbina",
};

export default function Painel() {
  const navigate = useNavigate();
  const views = useAssetViews();
  const simClock = useStore((s) => s.simClock);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [q, setQ] = useState("");
  const [typeF, setTypeF] = useState("Todos");
  const statusColor: Record<string, string> = { normal: C.green, atencao: C.yellow, critico: C.red, offline: C.slate };

  const counts = statusCounts(views);
  const filtered = useMemo(() => views.filter((a) =>
    (a.nome.toLowerCase().includes(q.toLowerCase()) || a.id.toLowerCase().includes(q.toLowerCase())) &&
    TYPE_MATCH[typeF](a.asset.tipo),
  ), [views, q, typeF]);

  usePageChrome(["Operação", "Painel Operacional"],
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5 rounded p-0.5" style={{ background:C.bgInput, border:`1px solid ${C.border}` }}>
        {(["grid","list"] as const).map(v=>(
          <button key={v} onClick={()=>setView(v)} className="p-1.5 rounded transition-all text-xs"
            style={view===v?{background:`${C.cobalt}40`,color:C.steel}:{color:C.slate}}>
            {v==="grid"?<Layers size={12}/>:<List size={12}/>}
          </button>
        ))}
      </div>
      <IBtn icon={RefreshCw} label="Ao vivo" />
    </div>
  );

  return (
    <>
      {/* Live status bar */}
      <div className="flex items-center gap-5 px-4 py-2.5 rounded-lg" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/><span className="text-[11px]" style={{ color:C.textSub }}>Transmissão ao vivo</span></div>
        <div style={{ color:C.border }}>|</div>
        {[{l:"Normais",v:counts.normal,c:C.green},{l:"Atenção",v:counts.atencao,c:C.yellow},{l:"Críticos",v:counts.critico,c:C.red},{l:"Offline",v:counts.offline,c:C.slate}].map(s=>(
          <div key={s.l} className="flex items-center gap-1.5">
            <span className="text-[18px] font-bold" style={{ fontFamily:"'Rajdhani',sans-serif", color:s.c }}>{s.v}</span>
            <span className="text-[11px]" style={{ color:C.slate }}>{s.l}</span>
          </div>
        ))}
        <div className="ml-auto text-[10px] font-mono" style={{ color:C.slate }}>{fmtDate(simClock)} — {fmtTimeSec(simClock)}</div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color:C.slate }} />
          <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Filtrar ativos..." className="pl-8 pr-3 py-1.5 text-xs rounded-md focus:outline-none w-52" style={{ background:C.bgInput, border:`1px solid ${C.border}`, color:C.text }} />
        </div>
        {TYPE_FILTERS.map(f=>(
          <button key={f} onClick={()=>setTypeF(f)} className="px-3 py-1.5 text-xs rounded-md transition-all"
            style={f===typeF
              ? { background:`${C.cobalt}22`, border:`1px solid ${C.cobalt}44`, color:C.steel }
              : { border:`1px solid ${C.border}`, color:C.slate }}>
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-lg p-10 text-center text-[12px]" style={{ background:C.bgCard, border:`1px solid ${C.border}`, color:C.slate }}>
          Nenhum ativo corresponde ao filtro.
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-5 gap-3">
        {filtered.map(a=>(
          <button key={a.id} onClick={()=>navigate(`/ativos/${a.id}/overview`)}
            className={`text-left p-3.5 rounded-lg transition-all`}
            style={{
              background: a.status==="critico"?"rgba(248,113,113,0.04)":a.status==="offline"?"rgba(109,129,150,0.05)":a.status==="atencao"?"rgba(251,191,36,0.04)":C.bgCard,
              border:`1px solid ${a.status==="critico"?"rgba(248,113,113,0.25)":a.status==="offline"?"rgba(109,129,150,0.2)":a.status==="atencao"?"rgba(251,191,36,0.2)":C.border}`,
            }}>
            <div className="flex items-center justify-between mb-2.5">
              <span style={{ fontFamily:"'JetBrains Mono',monospace", color:C.steel, fontSize:10 }}>{a.id}</span>
              <div className="w-2 h-2 rounded-full" style={{ background:statusColor[a.status], boxShadow:`0 0 6px ${statusColor[a.status]}` }} />
            </div>
            <div className="text-[11px] font-semibold mb-0.5 leading-snug" style={{ color:C.text }}>{a.nome}</div>
            <div className="text-[10px] mb-3" style={{ color:C.slate }}>{a.area}</div>
            <div className="flex items-center justify-between text-[10px] mb-1.5">
              <span style={{ color:C.slate }}>Saúde</span>
              <span className="font-mono font-bold" style={{ color:a.saude>=75?C.green:a.saude>=50?C.yellow:C.red }}>{a.saude}%</span>
            </div>
            <Bar_ v={a.saude} />
            {a.status!=="offline"&&a.twin&&(
              <div className="grid grid-cols-3 gap-1 mt-3">
                {[
                  {I:Thermometer,tag:"temp" as const, v:`${a.twin.state.temp.toFixed(0)}°`},
                  {I:Radio,      tag:"vib" as const,  v:`${a.twin.state.vib.toFixed(1)}`},
                  {I:Gauge,      tag:"press" as const,v:`${a.twin.state.press.toFixed(1)}`},
                ].map((s,i)=>(
                  <div key={i} className="rounded p-1 text-center" style={{ background:C.bgDeep }}>
                    <s.I size={9} className="mx-auto mb-0.5" style={{ color:C.slate }} />
                    <div style={{ fontFamily:"'JetBrains Mono',monospace", color:C.textSub, fontSize:9 }}>
                      <TraceableValue tagKey={s.tag}>{s.v}</TraceableValue>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-1 mt-2.5 text-[9px]" style={{ color:C.slate }}>
              {a.status==="offline"?<><WifiOff size={9}/><span>Offline</span></>:<><Wifi size={9} style={{ color:C.green }}/><span>ao vivo</span></>}
            </div>
          </button>
        ))}
      </div>
    </>
  );
}
