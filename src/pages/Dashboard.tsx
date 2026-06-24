// 2. Dashboard ─────────────────────────────────────────────────────────────────
import { useMemo } from "react";
import { useNavigate } from "react-router";
import { Cpu, AlertTriangle, TrendingUp, Wrench, Download, RefreshCw } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, PieChart, Pie, Cell,
} from "recharts";
import { C } from "@/lib/theme";
import { KPI, SH, TT_, SevBadge, Badge, Bar_, IBtn } from "@/components/ui-shared";
import { usePageChrome } from "@/components/layout/chrome";
import { useStore } from "@/store/useStore";
import { useAssetViews, alertsByDay, severityDistribution, fleetHealthTrend, fleetAvailability, statusCounts } from "@/store/derive";
import { recommendationsFor } from "@/lib/recommendations";
import { downloadCSV } from "@/lib/csv";
import { fmtTime } from "@/lib/format";
import { AIConfidence } from "@/components/gov";

export default function Dashboard() {
  const navigate = useNavigate();
  const views = useAssetViews();
  const alerts = useStore((s) => s.alerts);
  const twins = useStore((s) => s.twins);
  const assets = useStore((s) => s.assets);
  const dictionary = useStore((s) => s.dictionary);
  const simClock = useStore((s) => s.simClock);

  const counts = statusCounts(views);
  const open = useMemo(() => alerts.filter((a) => a.status !== "resolvido"), [alerts]);
  const criticos = open.filter((a) => a.severidade === "critico").length;
  const plantas = new Set(views.map((v) => v.asset.planta)).size;
  const avail = fleetAvailability(views);

  const pend = useMemo(() => {
    let total = 0, urgentes = 0;
    for (const a of assets) {
      const recs = twins[a.id] ? recommendationsFor(twins[a.id]!, 0.2) : [];
      total += recs.length;
      urgentes += recs.filter((r) => r.pri === "Alta").length;
    }
    return { total, urgentes };
  }, [assets, twins]);

  const barData = useMemo(() => alertsByDay(alerts, simClock), [alerts, simClock]);
  const dist = severityDistribution(alerts);
  const pieData = [
    { n: "Crítico", v: dist.critico, c: C.red },
    { n: "Alto", v: dist.alto, c: C.orange },
    { n: "Médio", v: dist.medio, c: C.yellow },
    { n: "Baixo", v: dist.baixo, c: C.slate },
  ];
  const trend = useMemo(() => fleetHealthTrend(assets, twins, dictionary, simClock), [assets, twins, dictionary, simClock]);
  const recent = useMemo(() => [...open].sort((a, b) => b.criadoEm - a.criadoEm).slice(0, 4), [open]);
  const attention = views.filter((v) => v.status !== "normal").slice(0, 4);

  const exportAlerts = () =>
    downloadCSV(`alertas-${Date.now()}`, alerts.map((a) => ({
      ID: a.id, Ativo: a.assetId, Titulo: a.titulo, Tipo: a.tipo,
      Severidade: a.severidade, Status: a.status, Origem: a.origem,
      Criado: new Date(a.criadoEm).toLocaleString("pt-BR"),
    })));

  usePageChrome(["Operação", "Dashboard"], <IBtn icon={RefreshCw} label="Atualizar" />);
  return (
    <>
      <div className="grid grid-cols-4 gap-3">
        <KPI label="Ativos Monitorados"   val={String(views.length)}   sub={`${plantas} plantas ativas`}          icon={Cpu}           color={C.steel}  />
        <KPI label="Alertas Críticos"     val={String(criticos)}       sub={`${open.length} abertos no total`}    icon={AlertTriangle} color={C.red}    />
        <KPI label="Disponibilidade Média"val={`${avail}%`}            sub="Meta: 98%"                            icon={TrendingUp}    color={C.green}  />
        <KPI label="Manutenções Pendentes"val={String(pend.total)}     sub={`${pend.urgentes} urgentes`}          icon={Wrench}        color={C.yellow} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Alert history */}
        <div className="col-span-2 rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
          <SH title="Histórico de Alertas — Últimos 7 Dias" right={<IBtn icon={Download} onClick={exportAlerts} />} />
          <ResponsiveContainer width="100%" height={155}>
            <BarChart data={barData} barGap={2} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke={C.steel} strokeOpacity={.05} />
              <XAxis dataKey="d" tick={{ fontSize:10, fill:C.slate, fontFamily:"JetBrains Mono" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:10, fill:C.slate, fontFamily:"JetBrains Mono" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<TT_ />} />
              <Bar dataKey="c" name="Crítico" fill={C.red}    stackId="a" />
              <Bar dataKey="a" name="Alto"    fill={C.orange} stackId="a" />
              <Bar dataKey="m" name="Médio"   fill={C.yellow} stackId="a" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* Pie */}
        <div className="rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
          <SH title="Distribuição" />
          <ResponsiveContainer width="100%" height={110}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={32} outerRadius={50} paddingAngle={2} dataKey="v">
                {pieData.map((e,i)=><Cell key={i} fill={e.c} />)}
              </Pie>
              <Tooltip content={<TT_ />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-1">
            {pieData.map(d=>(
              <div key={d.n} className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ background:d.c }} /><span style={{ color:C.slate }}>{d.n}</span></div>
                <span style={{ fontFamily:"'JetBrains Mono',monospace", color:C.text }}>{d.v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Health trend */}
        <div className="col-span-2 rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
          <SH title="Tendência de Saúde da Frota — 30 Dias" right={<AIConfidence compact confianca="media" simulado />} />
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.steel} strokeOpacity={.05} />
              <XAxis dataKey="d" tick={{ fontSize:9, fill:C.slate, fontFamily:"JetBrains Mono" }} axisLine={false} tickLine={false} interval={4} />
              <YAxis domain={[20,100]} tick={{ fontSize:9, fill:C.slate }} axisLine={false} tickLine={false} />
              <Tooltip content={<TT_ />} />
              <ReferenceLine y={60} stroke={C.red} strokeDasharray="4 4" strokeOpacity={.35} />
              <Line type="monotone" dataKey="r" name="Saúde Real"  stroke={C.steel}  strokeWidth={2}   dot={false} connectNulls />
              <Line type="monotone" dataKey="p" name="Projeção IA" stroke={C.slate}  strokeWidth={1.5} strokeDasharray="5 5" dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {/* Recent alerts */}
        <div className="rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
          <SH title="Alertas Recentes" right={<button onClick={()=>navigate("/alertas")} className="text-[11px] transition-colors hover:text-white" style={{ color:C.steel }}>Ver todos</button>} />
          <div className="space-y-2">
            {recent.length === 0 && <div className="text-[11px] py-6 text-center" style={{ color:C.slate }}>Nenhum alerta aberto</div>}
            {recent.map(a=>(
              <button key={a.id} onClick={()=>navigate(`/alertas/${a.id}`)}
                className="w-full text-left p-2.5 rounded-md transition-all hover:border-[rgba(130,200,229,0.2)]"
                style={{ background:C.bgDeep, border:`1px solid ${C.border}` }}>
                <div className="flex items-start justify-between gap-1.5 mb-1">
                  <span className="text-[11px] leading-snug font-medium" style={{ color:C.text }}>{a.titulo}</span>
                  <SevBadge s={a.severidade} />
                </div>
                <div className="flex items-center gap-2 text-[10px]" style={{ color:C.slate, fontFamily:"'JetBrains Mono',monospace" }}>
                  <span>{a.assetId}</span><span>·</span><span>{fmtTime(a.criadoEm)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Attention assets */}
      <div className="rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
        <SH title="Ativos que Requerem Atenção" right={<button onClick={()=>navigate("/ativos")} className="text-[11px]" style={{ color:C.steel }}>Ver todos →</button>} />
        <div className="grid grid-cols-4 gap-3">
          {attention.map(a=>(
            <button key={a.id} onClick={()=>navigate(`/ativos/${a.id}/overview`)}
              className={`text-left p-3 rounded-lg transition-all hover:border-[rgba(130,200,229,0.25)] ${
                a.status==="critico"?"border-red-500/20 bg-red-500/5":
                a.status==="offline"?"border-slate-500/20 bg-slate-500/5":
                "border-yellow-500/15 bg-yellow-500/5"
              }`}
              style={{ border:"1px solid" }}>
              <div className="flex items-center justify-between mb-2">
                <span style={{ fontFamily:"'JetBrains Mono',monospace", color:C.steel, fontSize:10 }}>{a.id}</span>
                <Badge s={a.status} />
              </div>
              <div className="text-[12px] font-semibold mb-2" style={{ color:C.text }}>{a.nome}</div>
              <div className="flex items-center gap-2">
                <Bar_ v={a.saude} />
                <span className="text-[11px] font-mono font-bold w-8 text-right" style={{ color:a.saude>=75?C.green:a.saude>=50?C.yellow:C.red }}>{a.saude}%</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
