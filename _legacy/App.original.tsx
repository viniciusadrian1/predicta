import { useState } from "react";
import {
  LayoutDashboard, Activity, Cpu, Bell, MessageSquare,
  PlusCircle, ScanLine, Map, Shield, GitBranch, BookOpen,
  Users, ChevronRight, ChevronDown, Search, Download,
  Settings, LogOut, AlertTriangle, CheckCircle, XCircle,
  Clock, TrendingUp, TrendingDown, Thermometer, Gauge,
  Zap, Wrench, Eye, MoreHorizontal, ArrowUpRight,
  ArrowDownRight, RefreshCw, SlidersHorizontal, FileText,
  Camera, Layers, List, Lock, Key, Building2, Network,
  X, Send, Bot, User, Info, Database, Hash, MapPin,
  Package, Wifi, WifiOff, Target, AlertCircle, CheckCircle2,
  RotateCcw, Radio, Droplets, Filter, Power, ChevronUp,
} from "lucide-react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, PieChart, Pie, Cell,
} from "recharts";

// ── Types ─────────────────────────────────────────────────────────────────────
type Page =
  | "login" | "dashboard" | "operacional" | "ativos"
  | "ativo-overview" | "ativo-telemetria" | "ativo-saude" | "ativo-tecnico"
  | "cadastro-manual" | "cadastro-ocr" | "mapa-planta"
  | "alertas" | "alerta-detalhe" | "assistente" | "assistente-ativo"
  | "governanca" | "hierarquia" | "dici" | "dicionario" | "rbac";

type Nav = (p: Page) => void;

// ── Palette constants ─────────────────────────────────────────────────────────
const C = {
  bg:      "#07101E",
  bgCard:  "#0C1829",
  bgDeep:  "#050C16",
  bgHover: "#112035",
  bgInput: "#091422",
  navy:    "#000080",
  cobalt:  "#0047AB",
  steel:   "#82C8E5",
  slate:   "#6D8196",
  text:    "#DDE6F0",
  textSub: "#8FA8BC",
  border:  "rgba(130,200,229,0.1)",
  borderMd:"rgba(130,200,229,0.2)",
  green:   "#34D399",
  yellow:  "#FBBF24",
  red:     "#F87171",
  orange:  "#FB923C",
};

// ── Mock data ─────────────────────────────────────────────────────────────────
const ASSETS = [
  { id:"BCP-01", nome:"Bomba Centrífuga #1",  tipo:"Bomba",        area:"Bombeamento",  planta:"Planta Norte",    saude:78, status:"atencao", leitura:"2 min",    crit:"Alta",    fab:"KSB",       modelo:"Megablock 100-315",     serie:"KSB2024001", pot:"75 kW",  rpm:"1.450" },
  { id:"CA-03",  nome:"Compressor de Ar",      tipo:"Compressor",   area:"Utilidades",   planta:"Planta Norte",    saude:92, status:"normal",  leitura:"1 min",    crit:"Média",   fab:"Atlas Copco",modelo:"GA 55",                 serie:"AC20220045", pot:"55 kW",  rpm:"2.950" },
  { id:"ME-07",  nome:"Motor Elétrico #7",     tipo:"Motor",        area:"Produção A",   planta:"Planta Norte",    saude:41, status:"critico", leitura:"30 seg",   crit:"Alta",    fab:"WEG",       modelo:"W22 IE3 75cv",          serie:"WEG202300178",pot:"56 kW",  rpm:"1.800" },
  { id:"RV-12",  nome:"Redutor de Velocidade", tipo:"Transmissão",  area:"Linha 2",      planta:"Planta Sul",      saude:85, status:"normal",  leitura:"5 min",    crit:"Média",   fab:"SEW",       modelo:"FA67 DRE100",           serie:"SEW20190882", pot:"7.5 kW", rpm:"980"   },
  { id:"VT-05",  nome:"Ventilador Industrial", tipo:"Ventilador",   area:"HVAC",         planta:"Planta Norte",    saude:67, status:"atencao", leitura:"3 min",    crit:"Baixa",   fab:"Multivac",  modelo:"HV-250",                serie:"MV2021003",  pot:"18.5 kW",rpm:"1.450" },
  { id:"TG-01",  nome:"Turbina a Gás #1",      tipo:"Turbina",      area:"Geração",      planta:"Planta Geração",  saude:91, status:"normal",  leitura:"1 min",    crit:"Crítica", fab:"GE Power",  modelo:"LM2500",                serie:"GE2018004",  pot:"25 MW",  rpm:"3.600" },
  { id:"VC-08",  nome:"Válvula de Controle",   tipo:"Válvula",      area:"Processo",     planta:"Planta Sul",      saude:88, status:"normal",  leitura:"4 min",    crit:"Média",   fab:"Fisher",    modelo:"Fieldvue DVC6200",      serie:"FSH20230091",pot:"—",      rpm:"—"     },
  { id:"BCP-02", nome:"Bomba Centrífuga #2",   tipo:"Bomba",        area:"Bombeamento",  planta:"Planta Norte",    saude:28, status:"offline", leitura:"Offline",  crit:"Alta",    fab:"KSB",       modelo:"Etanorm 100-200",       serie:"KSB2023009", pot:"45 kW",  rpm:"1.450" },
  { id:"GR-04",  nome:"Guindaste Rolante",     tipo:"Içamento",     area:"Armazenagem",  planta:"Planta Norte",    saude:73, status:"atencao", leitura:"10 min",   crit:"Média",   fab:"Demag",     modelo:"KBK II",                serie:"DEM2020044", pot:"15 kW",  rpm:"—"     },
  { id:"TR-09",  nome:"Transformador #9",      tipo:"Elétrico",     area:"Subestação",   planta:"Planta Norte",    saude:96, status:"normal",  leitura:"1 min",    crit:"Crítica", fab:"ABB",       modelo:"Trafo 1000 kVA",        serie:"ABB20190012",pot:"1 MVA",  rpm:"—"     },
];

const ALERTS = [
  { id:"ALT-2025-0847", ativo:"ME-07", nAtivo:"Motor Elétrico #7",      titulo:"Vibração Crítica Detectada",        tipo:"Mecânico",       sev:"critico", data:"23/06/2025 14:32", status:"aberto",     desc:"Vibração de 8.2 mm/s no rolamento traseiro. Limite crítico: 7.1 mm/s. Parada imediata recomendada." },
  { id:"ALT-2025-0848", ativo:"BCP-02",nAtivo:"Bomba Centrífuga #2",     titulo:"Ativo Offline — Perda de Sinal",    tipo:"Conectividade",  sev:"critico", data:"23/06/2025 13:15", status:"aberto",     desc:"Gateway MQTT sem resposta há 47 min. Verificar alimentação do concentrador IoT #3." },
  { id:"ALT-2025-0845", ativo:"BCP-01",nAtivo:"Bomba Centrífuga #1",     titulo:"Temperatura Elevada no Mancal",     tipo:"Térmico",        sev:"alto",    data:"23/06/2025 11:48", status:"em_analise", desc:"Temperatura do mancal atingiu 82°C. Limite de alerta: 75°C. Verificar lubrificação." },
  { id:"ALT-2025-0844", ativo:"VT-05", nAtivo:"Ventilador Industrial",    titulo:"Variação de RPM Fora do Padrão",    tipo:"Mecânico",       sev:"medio",   data:"23/06/2025 09:20", status:"em_analise", desc:"RPM oscilando ±4.5%. Verificar inversor de frequência e correia de transmissão." },
  { id:"ALT-2025-0843", ativo:"GR-04", nAtivo:"Guindaste Rolante",        titulo:"Lubrificação Vencida — 12 dias",    tipo:"Manutenção",     sev:"medio",   data:"22/06/2025 16:05", status:"aberto",     desc:"Ciclo de lubrificação venceu em 11/06/2025. Planejar manutenção nas próximas 48h." },
  { id:"ALT-2025-0841", ativo:"CA-03", nAtivo:"Compressor de Ar",         titulo:"Pressão Abaixo do Setpoint",        tipo:"Processo",       sev:"baixo",   data:"22/06/2025 08:30", status:"resolvido",  desc:"Pressão 6.2 bar vs setpoint 7.0 bar. Resolvido: válvula de alívio reconfigurada." },
];

const TELEM = Array.from({ length: 24 }, (_, i) => ({
  h:  `${String(i).padStart(2,"0")}:00`,
  t:  +(64 + Math.sin(i * .5) * 6 + (i >= 19 ? 12 : 0) + Math.random() * 1.5).toFixed(1),
  v:  +(2.1 + Math.cos(i * .4) * .3 + (i >= 18 ? (i - 17) * 1.1 : 0) + Math.random() * .12).toFixed(2),
  p:  +(4.8 + Math.sin(i * .3) * .4 + Math.random() * .08).toFixed(2),
  c:  +(42 + Math.sin(i * .6) * 4 + (i >= 19 ? 6 : 0) + Math.random() * 1).toFixed(1),
}));

const HEALTH30 = Array.from({ length: 30 }, (_, i) => ({
  d: `${String(i+1).padStart(2,"0")}/06`,
  r: Math.max(30, Math.round(96 - i*1.9 - Math.random()*3)),
  p: Math.max(25, Math.round(96 - i*2.2 - 4)),
}));

const ALERTBAR = [
  { d:"17/06", c:1,a:2,m:3 }, { d:"18/06", c:0,a:1,m:4 },
  { d:"19/06", c:2,a:3,m:2 }, { d:"20/06", c:1,a:2,m:5 },
  { d:"21/06", c:3,a:4,m:3 }, { d:"22/06", c:2,a:3,m:4 },
  { d:"23/06", c:2,a:2,m:3 },
];

const RADAR = [
  { e:"Temperatura", v:72 }, { e:"Vibração", v:45 },
  { e:"Pressão",     v:88 }, { e:"Corrente", v:68 },
  { e:"RPM",         v:91 }, { e:"Óleo",     v:42 },
];

const PIE = [
  { n:"Crítico", v:2, c:C.red    },
  { n:"Alto",    v:3, c:C.orange },
  { n:"Médio",   v:5, c:C.yellow },
  { n:"Baixo",   v:4, c:C.slate  },
];

const USERS = [
  { id:1, nome:"Ricardo Teixeira",    email:"r.teixeira@forzy.com.br", papel:"Gerente Industrial",         status:"ativo",   acesso:"hoje, 14:32", mods:["Dashboard","Ativos","Alertas","Telemetria","Governança","RBAC"] },
  { id:2, nome:"Carlos H. Matos",     email:"c.matos@forzy.com.br",    papel:"Eng. de Confiabilidade",     status:"ativo",   acesso:"hoje, 14:28", mods:["Ativos","Alertas","Telemetria","Assistente","Cadastro"] },
  { id:3, nome:"Ana Paula Souza",     email:"a.souza@forzy.com.br",    papel:"Técnico de Manutenção",      status:"ativo",   acesso:"hoje, 11:05", mods:["Ativos","Alertas","Assistente"] },
  { id:4, nome:"Fernanda Lima",       email:"f.lima@forzy.com.br",     papel:"Analista de Dados",          status:"ativo",   acesso:"ontem, 17:20",mods:["Telemetria","Saúde IA","Governança"] },
  { id:5, nome:"João Victor Nunes",   email:"j.nunes@forzy.com.br",    papel:"Operador de Campo",          status:"inativo", acesso:"15/06/2025",  mods:["Ativos","Alertas"] },
];

const DICI = [
  { id:"BCP-01", nome:"Bomba Centrífuga #1",   D:"aprovado", I:"aprovado", C:"aprovado",  In:"em_revisao" },
  { id:"CA-03",  nome:"Compressor de Ar",       D:"aprovado", I:"aprovado", C:"aprovado",  In:"aprovado"   },
  { id:"ME-07",  nome:"Motor Elétrico #7",      D:"aprovado", I:"aprovado", C:"pendente",  In:"pendente"   },
  { id:"RV-12",  nome:"Redutor de Velocidade",  D:"aprovado", I:"aprovado", C:"aprovado",  In:"aprovado"   },
  { id:"VT-05",  nome:"Ventilador Industrial",  D:"em_revisao",I:"aprovado",C:"aprovado",  In:"pendente"   },
  { id:"TG-01",  nome:"Turbina a Gás #1",       D:"aprovado", I:"aprovado", C:"aprovado",  In:"aprovado"   },
];

const DICT = [
  { id:"TAG-001", campo:"Temperatura do Mancal",  tipo:"Float",   un:"°C",   faixa:"0–120",  crit:"> 80",         ativo:"Rotativos",           sensor:"PT100"               },
  { id:"TAG-002", campo:"Vibração RMS",            tipo:"Float",   un:"mm/s", faixa:"0–15",   crit:"> 7.1",        ativo:"Rotativos",           sensor:"Acelerômetro MEMS"   },
  { id:"TAG-003", campo:"Pressão de Saída",        tipo:"Float",   un:"bar",  faixa:"0–16",   crit:"< 3.5 / > 12", ativo:"Bombas / Compressores",sensor:"Transdutor 4-20mA"  },
  { id:"TAG-004", campo:"Corrente Elétrica",       tipo:"Float",   un:"A",    faixa:"0–100",  crit:"> FLA×1.15",   ativo:"Motores",             sensor:"TC Split-core"       },
  { id:"TAG-005", campo:"RPM",                     tipo:"Integer", un:"rpm",  faixa:"0–4000", crit:"Desvio > 5%",  ativo:"Rotativos",           sensor:"Encoder Hall"        },
  { id:"TAG-006", campo:"Nível de Óleo",           tipo:"Float",   un:"%",    faixa:"0–100",  crit:"< 20",         ativo:"Redutores / Turbinas",sensor:"Ultrassônico"        },
];

const ROLES = ["Gerente Industrial","Eng. Confiabilidade","Técnico Manutenção","Analista de Dados","Operador Campo"];
const MODS  = ["Dashboard","Ativos","Telemetria","Alertas","Assistente","Cadastro","OCR","Mapa","Governança","RBAC"];
const PERM: Record<string,Record<string,"full"|"read"|"none">> = {
  "Gerente Industrial":  { Dashboard:"full",Ativos:"full",Telemetria:"full",Alertas:"full",Assistente:"full",Cadastro:"full",OCR:"full",Mapa:"full",Governança:"full",RBAC:"full"  },
  "Eng. Confiabilidade": { Dashboard:"full",Ativos:"full",Telemetria:"full",Alertas:"full",Assistente:"full",Cadastro:"full",OCR:"full",Mapa:"full",Governança:"read",RBAC:"none" },
  "Técnico Manutenção":  { Dashboard:"read",Ativos:"read",Telemetria:"read",Alertas:"full",Assistente:"full",Cadastro:"none",OCR:"none",Mapa:"read",Governança:"none",RBAC:"none" },
  "Analista de Dados":   { Dashboard:"read",Ativos:"read",Telemetria:"full",Alertas:"read",Assistente:"read",Cadastro:"none",OCR:"none",Mapa:"none",Governança:"full",RBAC:"none" },
  "Operador Campo":      { Dashboard:"none",Ativos:"read",Telemetria:"none",Alertas:"read",Assistente:"none",Cadastro:"none",OCR:"none",Mapa:"read",Governança:"none",RBAC:"none" },
};

// ── Shared primitives ─────────────────────────────────────────────────────────
function Badge({ s }: { s: string }) {
  const m: Record<string,string> = {
    normal:     `bg-[${C.green}]/10 text-[${C.green}] border border-[${C.green}]/25`,
    atencao:    `bg-yellow-400/10 text-yellow-400 border border-yellow-400/25`,
    critico:    `bg-red-400/10 text-red-400 border border-red-400/25`,
    offline:    `bg-slate-500/15 text-slate-400 border border-slate-500/25`,
    aberto:     `bg-red-400/10 text-red-400 border border-red-400/25`,
    em_analise: `bg-yellow-400/10 text-yellow-400 border border-yellow-400/25`,
    resolvido:  `bg-emerald-400/10 text-emerald-400 border border-emerald-400/25`,
    ativo:      `bg-emerald-400/10 text-emerald-400 border border-emerald-400/25`,
    inativo:    `bg-slate-500/15 text-slate-400 border border-slate-500/25`,
    aprovado:   `bg-emerald-400/10 text-emerald-400 border border-emerald-400/25`,
    em_revisao: `bg-yellow-400/10 text-yellow-400 border border-yellow-400/25`,
    pendente:   `bg-slate-500/15 text-slate-400 border border-slate-500/25`,
  };
  const lbl: Record<string,string> = {
    normal:"Normal",atencao:"Atenção",critico:"Crítico",offline:"Offline",
    aberto:"Aberto",em_analise:"Em Análise",resolvido:"Resolvido",
    ativo:"Ativo",inativo:"Inativo",aprovado:"Aprovado",em_revisao:"Em Revisão",pendente:"Pendente",
  };
  return <span style={{ fontFamily:"'JetBrains Mono',monospace" }} className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-medium ${m[s] ?? "bg-sky-400/10 text-sky-400 border border-sky-400/25"}`}>{lbl[s] ?? s}</span>;
}

function SevBadge({ s }: { s: string }) {
  const m: Record<string,string> = {
    critico:"bg-red-400/10 text-red-400 border border-red-400/25",
    alto:"bg-orange-400/10 text-orange-400 border border-orange-400/25",
    medio:"bg-yellow-400/10 text-yellow-400 border border-yellow-400/25",
    baixo:"bg-slate-500/15 text-slate-400 border border-slate-500/25",
  };
  const lbl: Record<string,string> = { critico:"Crítico",alto:"Alto",medio:"Médio",baixo:"Baixo" };
  return <span style={{ fontFamily:"'JetBrains Mono',monospace" }} className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-medium ${m[s]}`}>{lbl[s]}</span>;
}

function Bar_({ v }: { v: number }) {
  const col = v >= 75 ? "#34D399" : v >= 50 ? "#FBBF24" : "#F87171";
  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background:"rgba(130,200,229,0.08)" }}>
      <div className="h-full rounded-full transition-all" style={{ width:`${v}%`, background:col }} />
    </div>
  );
}

function KPI({ label, val, sub, icon: I, color = C.steel }: { label:string;val:string;sub?:string;icon:any;color?:string }) {
  return (
    <div className="rounded-lg p-4 flex flex-col gap-3 transition-all hover:border-[rgba(130,200,229,0.25)] cursor-default"
      style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.15em] font-semibold" style={{ color:C.slate }}>{label}</span>
        <div className="w-8 h-8 rounded flex items-center justify-center" style={{ background:color+"1A" }}>
          <I size={14} style={{ color }} />
        </div>
      </div>
      <div className="text-[28px] font-bold leading-none" style={{ fontFamily:"'Rajdhani',sans-serif", color:C.text }}>{val}</div>
      {sub && <span className="text-xs" style={{ color:C.slate }}>{sub}</span>}
    </div>
  );
}

function SH({ title, right }: { title:string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ fontFamily:"'Rajdhani',sans-serif", color:C.slate }}>{title}</h3>
      {right}
    </div>
  );
}

function TT_({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg p-2.5 text-[11px] shadow-2xl" style={{ background:"#0F1E35", border:`1px solid ${C.borderMd}` }}>
      <p className="mb-1.5 font-semibold" style={{ fontFamily:"'JetBrains Mono',monospace", color:C.steel }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-mono" style={{ color:p.color }}>{p.name}: <span className="font-bold">{typeof p.value==="number"?p.value.toFixed(2):p.value}</span></p>
      ))}
    </div>
  );
}

function BC({ items }: { items: string[] }) {
  return (
    <div className="flex items-center gap-1.5" style={{ fontFamily:"'JetBrains Mono',monospace" }}>
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-1.5 text-[11px]">
          {i > 0 && <ChevronRight size={9} style={{ color:C.slate+"80" }} />}
          <span style={{ color: i===items.length-1 ? C.steel : C.slate }}>{it}</span>
        </span>
      ))}
    </div>
  );
}

function IBtn({ icon: I, label, onClick, variant="ghost" }: { icon:any;label?:string;onClick?:()=>void;variant?:"ghost"|"primary"|"danger" }) {
  const cls = variant==="primary"
    ? `bg-[${C.cobalt}] hover:bg-[#005FD6] text-white`
    : variant==="danger"
    ? "bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/25"
    : "hover:bg-[#112035] text-[#8FA8BC] hover:text-[#DDE6F0] border border-[rgba(130,200,229,0.1)] hover:border-[rgba(130,200,229,0.22)]";
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-all ${cls}`}>
      <I size={12} />
      {label && <span className="font-medium">{label}</span>}
    </button>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
const NAV = [
  { sec:"OPERAÇÃO",  items:[
    { l:"Dashboard",       i:LayoutDashboard, p:"dashboard"  as Page },
    { l:"Painel Operacional", i:Activity,     p:"operacional" as Page },
  ]},
  { sec:"ATIVOS", items:[
    { l:"Lista de Ativos", i:Cpu,             p:"ativos"      as Page },
    { l:"Mapa da Planta",  i:Map,             p:"mapa-planta" as Page },
  ]},
  { sec:"ALERTAS", items:[
    { l:"Alertas",         i:Bell,            p:"alertas"     as Page },
  ]},
  { sec:"ASSISTENTE", items:[
    { l:"Assistente IA",   i:MessageSquare,   p:"assistente"  as Page },
  ]},
  { sec:"CADASTRO", items:[
    { l:"Cadastro Manual", i:PlusCircle,      p:"cadastro-manual" as Page },
    { l:"Leitura OCR",     i:ScanLine,        p:"cadastro-ocr"    as Page },
  ]},
  { sec:"GOVERNANÇA", items:[
    { l:"Visão Geral",     i:Shield,          p:"governanca"  as Page },
    { l:"Hierarquia",      i:GitBranch,       p:"hierarquia"  as Page },
    { l:"Matriz D-I-C-I",  i:Layers,          p:"dici"        as Page },
    { l:"Dicionário",      i:BookOpen,        p:"dicionario"  as Page },
    { l:"Permissões RBAC", i:Key,             p:"rbac"        as Page },
  ]},
];

function Sidebar({ cur, nav }: { cur: Page; nav: Nav }) {
  const inAtivo = ["ativos","ativo-overview","ativo-telemetria","ativo-saude","ativo-tecnico"].includes(cur);
  return (
    <aside className="w-[220px] h-full flex flex-col flex-shrink-0" style={{ background:C.bgDeep, borderRight:`1px solid ${C.border}` }}>
      {/* Logo */}
      <div className="px-4 pt-5 pb-4" style={{ borderBottom:`1px solid ${C.border}` }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center relative overflow-hidden" style={{ background:`linear-gradient(135deg,${C.cobalt},${C.navy})` }}>
            <Target size={15} className="text-white relative z-10" />
            <div className="absolute inset-0 opacity-30" style={{ background:`repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(255,255,255,.1) 3px,rgba(255,255,255,.1) 4px)` }} />
          </div>
          <div>
            <div className="text-[15px] font-bold tracking-[0.1em]" style={{ fontFamily:"'Rajdhani',sans-serif", color:C.text }}>PREDICTA</div>
            <div className="text-[9px] tracking-[0.25em]" style={{ color:C.slate+"80" }}>BY FORZY</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV.map(g => (
          <div key={g.sec} className="mb-2">
            <div className="px-2 py-1 text-[9px] font-bold tracking-[0.2em] uppercase mb-0.5" style={{ color:C.slate+"60" }}>{g.sec}</div>
            {g.items.map(item => {
              const active = cur===item.p || (item.p==="ativos" && inAtivo);
              return (
                <button key={item.p} onClick={() => nav(item.p)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[12px] font-medium mb-0.5 transition-all text-left ${active ? "" : "hover:text-[#DDE6F0]"}`}
                  style={active
                    ? { background:`${C.cobalt}22`, border:`1px solid ${C.cobalt}44`, color:C.steel }
                    : { border:"1px solid transparent", color:C.slate }}
                >
                  <item.i size={13} />
                  <span className="flex-1">{item.l}</span>
                  {item.p==="alertas" && <span className="text-[9px] bg-red-500 text-white rounded-full px-1.5 py-[1px] font-bold font-mono">5</span>}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="p-3" style={{ borderTop:`1px solid ${C.border}` }}>
        <div className="flex items-center gap-2.5 p-2 rounded-md hover:bg-[#112035] transition-all cursor-pointer">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ background:`linear-gradient(135deg,${C.cobalt},${C.navy})` }}>RT</div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold truncate" style={{ color:C.text }}>Ricardo Teixeira</div>
            <div className="text-[10px] truncate" style={{ color:C.slate }}>Gerente Industrial</div>
          </div>
          <Settings size={11} style={{ color:C.slate }} />
        </div>
      </div>
    </aside>
  );
}

// ── Topbar ────────────────────────────────────────────────────────────────────
function Topbar({ bc, right }: { bc: string[]; right?: React.ReactNode }) {
  return (
    <header className="h-12 flex items-center px-5 gap-4 flex-shrink-0" style={{ background:"#060E1A", borderBottom:`1px solid ${C.border}` }}>
      <BC items={bc} />
      <div className="flex-1" />
      {right}
      <div className="flex items-center gap-1.5 ml-2">
        <button className="relative w-7 h-7 rounded flex items-center justify-center transition-all hover:bg-[#112035]" style={{ color:C.slate }}>
          <Bell size={14} />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full" />
        </button>
        <button className="w-7 h-7 rounded flex items-center justify-center transition-all hover:bg-[#112035]" style={{ color:C.slate }}>
          <Settings size={13} />
        </button>
        <div className="w-7 h-7 rounded-full ml-1 flex items-center justify-center text-[9px] font-bold text-white" style={{ background:`linear-gradient(135deg,${C.cobalt},${C.navy})` }}>RT</div>
      </div>
    </header>
  );
}

// ── Layout wrapper ────────────────────────────────────────────────────────────
function L({ cur, nav, bc, right, children }: { cur:Page;nav:Nav;bc:string[];right?:React.ReactNode;children:React.ReactNode }) {
  return (
    <div className="flex h-full overflow-hidden" style={{ background:C.bg }}>
      <Sidebar cur={cur} nav={nav} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar bc={bc} right={right} />
        <div className="flex-1 overflow-y-auto p-5 space-y-4">{children}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREENS
// ─────────────────────────────────────────────────────────────────────────────

// 1. Login ────────────────────────────────────────────────────────────────────
function LoginScreen({ nav }: { nav: Nav }) {
  return (
    <div className="flex h-full" style={{ background:C.bg }}>
      {/* Left panel */}
      <div className="hidden lg:flex flex-1 flex-col relative overflow-hidden" style={{ background:C.bgDeep }}>
        {/* Grid overlay */}
        <svg className="absolute inset-0 w-full h-full" style={{ opacity:.04 }}><defs><pattern id="g" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M 48 0 L 0 0 0 48" fill="none" stroke="#82C8E5" strokeWidth=".6"/></pattern></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>
        {/* Accent gradient */}
        <div className="absolute inset-0" style={{ background:`radial-gradient(ellipse at 30% 50%, ${C.cobalt}18 0%, transparent 60%)` }} />
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background:`linear-gradient(90deg,transparent,${C.cobalt}80,transparent)` }} />

        <div className="relative z-10 flex flex-col justify-center px-12 py-16 h-full">
          <div className="flex items-center gap-3 mb-14">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background:`linear-gradient(135deg,${C.cobalt},${C.navy})` }}>
              <Target size={20} className="text-white" />
            </div>
            <div>
              <div className="text-xl font-bold tracking-[0.12em]" style={{ fontFamily:"'Rajdhani',sans-serif", color:C.text }}>PREDICTA</div>
              <div className="text-[10px] tracking-[0.25em]" style={{ color:C.slate }}>INDUSTRIAL IIoT PLATFORM</div>
            </div>
          </div>

          <h1 className="text-[42px] font-bold leading-tight mb-4" style={{ fontFamily:"'Rajdhani',sans-serif", color:C.text }}>Manutenção Preditiva<br/>de Classe Industrial</h1>
          <p className="text-sm leading-relaxed mb-12 max-w-sm" style={{ color:C.textSub }}>Monitoramento em tempo real, detecção de anomalias por IA e predição de falhas para ativos críticos.</p>

          <div className="grid grid-cols-2 gap-3 max-w-sm">
            {[
              { i:Cpu,        v:"247",    l:"Ativos Monitorados" },
              { i:Bell,       v:"5",      l:"Alertas Ativos"     },
              { i:TrendingUp, v:"97.4%",  l:"Disponibilidade"    },
              { i:Wrench,     v:"2.1 h",  l:"MTTR Médio"         },
            ].map(s=>(
              <div key={s.l} className="rounded-lg p-3" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
                <s.i size={14} className="mb-2" style={{ color:C.steel }} />
                <div className="text-xl font-bold" style={{ fontFamily:"'Rajdhani',sans-serif", color:C.text }}>{s.v}</div>
                <div className="text-[10px] mt-0.5" style={{ color:C.slate }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div className="w-full lg:w-[400px] flex flex-col justify-center px-10 py-12 flex-shrink-0" style={{ background:"#060E1A", borderLeft:`1px solid ${C.border}` }}>
        <div className="lg:hidden flex items-center gap-3 mb-10">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background:`linear-gradient(135deg,${C.cobalt},${C.navy})` }}>
            <Target size={15} className="text-white" />
          </div>
          <div className="text-[15px] font-bold tracking-[0.1em]" style={{ fontFamily:"'Rajdhani',sans-serif", color:C.text }}>PREDICTA</div>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-1" style={{ fontFamily:"'Rajdhani',sans-serif", color:C.text }}>Bem-vindo de volta</h2>
          <p className="text-sm" style={{ color:C.slate }}>Entre com suas credenciais corporativas</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color:C.slate }}>E-mail corporativo</label>
            <input defaultValue="r.teixeira@forzy.com.br"
              className="w-full rounded-md px-3 py-2.5 text-sm focus:outline-none transition-all"
              style={{ background:C.bgInput, border:`1px solid ${C.border}`, color:C.text }}
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color:C.slate }}>Senha</label>
            <input type="password" defaultValue="••••••••"
              className="w-full rounded-md px-3 py-2.5 text-sm focus:outline-none transition-all"
              style={{ background:C.bgInput, border:`1px solid ${C.border}`, color:C.text }}
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 cursor-pointer" style={{ color:C.slate }}>
              <input type="checkbox" className="accent-blue-600" defaultChecked /> Manter conectado
            </label>
            <button className="transition-colors hover:text-white" style={{ color:C.steel }}>Esqueci a senha</button>
          </div>
          <button onClick={()=>nav("dashboard")}
            className="w-full py-2.5 rounded-md text-sm font-bold tracking-wider text-white transition-all hover:brightness-110 mt-1"
            style={{ background:`linear-gradient(135deg,${C.cobalt},${C.navy})`, fontFamily:"'Rajdhani',sans-serif", letterSpacing:"0.08em" }}
          >ENTRAR</button>
        </div>

        <div className="mt-8 pt-6 flex items-center gap-2 text-xs" style={{ borderTop:`1px solid ${C.border}`, color:C.slate }}>
          <Lock size={11} />
          <span>Acesso protegido — SSO + MFA habilitado · Predicta v2.4.1</span>
        </div>
      </div>
    </div>
  );
}

// 2. Dashboard ─────────────────────────────────────────────────────────────────
function DashboardScreen({ nav }: { nav: Nav }) {
  return (
    <L cur="dashboard" nav={nav} bc={["Operação","Dashboard"]} right={<IBtn icon={RefreshCw} label="Atualizar" />}>
      <div className="grid grid-cols-4 gap-3">
        <KPI label="Ativos Monitorados"   val="247"   sub="10 plantas ativas"   icon={Cpu}           color={C.steel}  />
        <KPI label="Alertas Críticos"     val="2"     sub="5 abertos no total"  icon={AlertTriangle} color={C.red}    />
        <KPI label="Disponibilidade Média"val="97.4%" sub="Meta: 98%"           icon={TrendingUp}    color={C.green}  />
        <KPI label="Manutenções Pendentes"val="8"     sub="3 urgentes"          icon={Wrench}        color={C.yellow} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Alert history */}
        <div className="col-span-2 rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
          <SH title="Histórico de Alertas — Últimos 7 Dias" right={<IBtn icon={Download} />} />
          <ResponsiveContainer width="100%" height={155}>
            <BarChart data={ALERTBAR} barGap={2} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke={C.steel} strokeOpacity={.05} />
              <XAxis dataKey="d" tick={{ fontSize:10, fill:C.slate, fontFamily:"JetBrains Mono" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:10, fill:C.slate, fontFamily:"JetBrains Mono" }} axisLine={false} tickLine={false} />
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
              <Pie data={PIE} cx="50%" cy="50%" innerRadius={32} outerRadius={50} paddingAngle={2} dataKey="v">
                {PIE.map((e,i)=><Cell key={i} fill={e.c} />)}
              </Pie>
              <Tooltip content={<TT_ />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-1">
            {PIE.map(d=>(
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
          <SH title="Tendência de Saúde da Frota — 30 Dias" />
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={HEALTH30}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.steel} strokeOpacity={.05} />
              <XAxis dataKey="d" tick={{ fontSize:9, fill:C.slate, fontFamily:"JetBrains Mono" }} axisLine={false} tickLine={false} interval={4} />
              <YAxis domain={[20,100]} tick={{ fontSize:9, fill:C.slate }} axisLine={false} tickLine={false} />
              <Tooltip content={<TT_ />} />
              <ReferenceLine y={60} stroke={C.red} strokeDasharray="4 4" strokeOpacity={.35} />
              <Line type="monotone" dataKey="r" name="Saúde Real"    stroke={C.steel}  strokeWidth={2}   dot={false} />
              <Line type="monotone" dataKey="p" name="Projeção IA"   stroke={C.slate}  strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {/* Recent alerts */}
        <div className="rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
          <SH title="Alertas Recentes" right={<button onClick={()=>nav("alertas")} className="text-[11px] transition-colors hover:text-white" style={{ color:C.steel }}>Ver todos</button>} />
          <div className="space-y-2">
            {ALERTS.slice(0,4).map(a=>(
              <button key={a.id} onClick={()=>nav("alerta-detalhe")}
                className="w-full text-left p-2.5 rounded-md transition-all hover:border-[rgba(130,200,229,0.2)]"
                style={{ background:C.bgDeep, border:`1px solid ${C.border}` }}>
                <div className="flex items-start justify-between gap-1.5 mb-1">
                  <span className="text-[11px] leading-snug font-medium" style={{ color:C.text }}>{a.titulo}</span>
                  <SevBadge s={a.sev} />
                </div>
                <div className="flex items-center gap-2 text-[10px]" style={{ color:C.slate, fontFamily:"'JetBrains Mono',monospace" }}>
                  <span>{a.ativo}</span><span>·</span><span>{a.data.split(" ")[1]}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Attention assets */}
      <div className="rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
        <SH title="Ativos que Requerem Atenção" right={<button onClick={()=>nav("ativos")} className="text-[11px]" style={{ color:C.steel }}>Ver todos →</button>} />
        <div className="grid grid-cols-4 gap-3">
          {ASSETS.filter(a=>a.status!=="normal").slice(0,4).map(a=>(
            <button key={a.id} onClick={()=>nav("ativo-overview")}
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
    </L>
  );
}

// 3. Painel Operacional ────────────────────────────────────────────────────────
function PainelScreen({ nav }: { nav: Nav }) {
  const [view, setView] = useState<"grid"|"list">("grid");
  const statusColor: Record<string,string> = { normal:C.green, atencao:C.yellow, critico:C.red, offline:C.slate };
  return (
    <L cur="operacional" nav={nav} bc={["Operação","Painel Operacional"]}
      right={
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
      }
    >
      {/* Live status bar */}
      <div className="flex items-center gap-5 px-4 py-2.5 rounded-lg" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/><span className="text-[11px]" style={{ color:C.textSub }}>Transmissão ao vivo</span></div>
        <div style={{ color:C.border }}>|</div>
        {[{l:"Normais",v:5,c:C.green},{l:"Atenção",v:3,c:C.yellow},{l:"Críticos",v:2,c:C.red},{l:"Offline",v:1,c:C.slate}].map(s=>(
          <div key={s.l} className="flex items-center gap-1.5">
            <span className="text-[18px] font-bold" style={{ fontFamily:"'Rajdhani',sans-serif", color:s.c }}>{s.v}</span>
            <span className="text-[11px]" style={{ color:C.slate }}>{s.l}</span>
          </div>
        ))}
        <div className="ml-auto text-[10px] font-mono" style={{ color:C.slate }}>23/06/2025 — 14:38:22</div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color:C.slate }} />
          <input placeholder="Filtrar ativos..." className="pl-8 pr-3 py-1.5 text-xs rounded-md focus:outline-none w-52" style={{ background:C.bgInput, border:`1px solid ${C.border}`, color:C.text }} />
        </div>
        {["Todos","Bombas","Motores","Compressores","Turbinas"].map(f=>(
          <button key={f} className="px-3 py-1.5 text-xs rounded-md transition-all"
            style={f==="Todos"
              ? { background:`${C.cobalt}22`, border:`1px solid ${C.cobalt}44`, color:C.steel }
              : { border:`1px solid ${C.border}`, color:C.slate }}>
            {f}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-5 gap-3">
        {ASSETS.map(a=>(
          <button key={a.id} onClick={()=>nav("ativo-overview")}
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
            {a.status!=="offline"&&(
              <div className="grid grid-cols-3 gap-1 mt-3">
                {[
                  {I:Thermometer,v:`${(62+Math.random()*18).toFixed(0)}°`},
                  {I:Radio,      v:`${(1.8+Math.random()*3).toFixed(1)}`},
                  {I:Gauge,      v:`${(4.2+Math.random()*2).toFixed(1)}`},
                ].map((s,i)=>(
                  <div key={i} className="rounded p-1 text-center" style={{ background:C.bgDeep }}>
                    <s.I size={9} className="mx-auto mb-0.5" style={{ color:C.slate }} />
                    <div style={{ fontFamily:"'JetBrains Mono',monospace", color:C.textSub, fontSize:9 }}>{s.v}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-1 mt-2.5 text-[9px]" style={{ color:C.slate }}>
              {a.status==="offline"?<><WifiOff size={9}/><span>Offline</span></>:<><Wifi size={9} style={{ color:C.green }}/><span>há {a.leitura}</span></>}
            </div>
          </button>
        ))}
      </div>
    </L>
  );
}

// 4. Lista de Ativos ───────────────────────────────────────────────────────────
function ListaAtivos({ nav }: { nav: Nav }) {
  const [q, setQ] = useState("");
  const data = ASSETS.filter(a=>a.nome.toLowerCase().includes(q.toLowerCase())||a.id.toLowerCase().includes(q.toLowerCase()));
  return (
    <L cur="ativos" nav={nav} bc={["Ativos","Lista de Ativos"]}
      right={
        <div className="flex items-center gap-2">
          <IBtn icon={Download} label="Exportar" />
          <button onClick={()=>nav("cadastro-manual")} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-md transition-all hover:brightness-110"
            style={{ background:C.cobalt }}><PlusCircle size={12}/> Novo Ativo</button>
        </div>
      }
    >
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:C.slate }} />
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar por tag, nome ou área..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg focus:outline-none"
            style={{ background:C.bgCard, border:`1px solid ${C.border}`, color:C.text }} />
        </div>
        {["Todos os Status","Normal","Atenção","Crítico","Offline"].map((o,i)=>(
          <select key={i} className="px-3 py-2 text-xs rounded-md focus:outline-none" style={{ background:C.bgCard, border:`1px solid ${C.border}`, color:C.text }}><option>{o}</option></select>
        )).slice(0,3)}
        <IBtn icon={SlidersHorizontal} label="Filtros" />
      </div>

      <div className="rounded-lg overflow-hidden" style={{ border:`1px solid ${C.border}` }}>
        <table className="w-full" style={{ background:C.bgCard }}>
          <thead style={{ borderBottom:`1px solid ${C.border}` }}>
            <tr>
              {["Tag","Nome / Tipo","Área / Planta","Status","Saúde","Criticidade","Última Leitura",""].map(h=>(
                <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color:C.slate }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((a,i)=>(
              <tr key={a.id} onClick={()=>nav("ativo-overview")} className="cursor-pointer transition-all hover:bg-[#112035]"
                style={{ borderBottom:`1px solid ${C.border}40`, background:i%2===1?"rgba(12,24,41,0.5)":undefined }}>
                <td className="px-4 py-3"><span style={{ fontFamily:"'JetBrains Mono',monospace", color:C.steel, fontSize:11 }}>{a.id}</span></td>
                <td className="px-4 py-3">
                  <div className="text-[12px] font-medium" style={{ color:C.text }}>{a.nome}</div>
                  <div className="text-[10px]" style={{ color:C.slate }}>{a.tipo}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-[11px]" style={{ color:C.textSub }}>{a.area}</div>
                  <div className="text-[10px]" style={{ color:C.slate }}>{a.planta}</div>
                </td>
                <td className="px-4 py-3"><Badge s={a.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 w-24">
                    <Bar_ v={a.saude} />
                    <span className="text-[11px] font-mono font-bold w-8" style={{ color:a.saude>=75?C.green:a.saude>=50?C.yellow:C.red }}>{a.saude}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-[11px] font-mono" style={{ color:a.crit==="Crítica"||a.crit==="Alta"?C.orange:a.crit==="Média"?C.yellow:C.slate }}>{a.crit}</td>
                <td className="px-4 py-3 text-[11px] font-mono" style={{ color:C.slate }}>
                  {a.leitura==="Offline"?<span className="flex items-center gap-1"><WifiOff size={10}/>Offline</span>:`há ${a.leitura}`}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button className="p-1 rounded transition-all hover:bg-[#0A1525]" style={{ color:C.slate }}><Eye size={12}/></button>
                    <button className="p-1 rounded transition-all hover:bg-[#0A1525]" style={{ color:C.slate }}><MoreHorizontal size={12}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderTop:`1px solid ${C.border}`, background:C.bgCard }}>
          <span className="text-[11px]" style={{ color:C.slate }}>Exibindo {data.length} de {ASSETS.length} ativos</span>
          <div className="flex items-center gap-1">
            {[1,2,3,"...",12].map((p,i)=>(
              <button key={i} className="w-7 h-7 text-[11px] rounded transition-all"
                style={p===1?{background:`${C.cobalt}30`,border:`1px solid ${C.cobalt}50`,color:C.steel}:{color:C.slate}}>{p}</button>
            ))}
          </div>
        </div>
      </div>
    </L>
  );
}

// 5–8. Detalhe do Ativo ────────────────────────────────────────────────────────
function AtivoDetail({ page, nav }: { page: Page; nav: Nav }) {
  const tabMap: Record<string,string> = { "ativo-overview":"ov","ativo-telemetria":"tel","ativo-saude":"sau","ativo-tecnico":"tec" };
  const [tab, setTab] = useState(tabMap[page]||"ov");
  const a = ASSETS[0];
  const TABS = [
    { id:"ov",  l:"Visão Geral",   p:"ativo-overview"    as Page },
    { id:"tel", l:"Telemetria",    p:"ativo-telemetria"  as Page },
    { id:"sau", l:"Saúde & IA",    p:"ativo-saude"       as Page },
    { id:"tec", l:"Dados Técnicos",p:"ativo-tecnico"     as Page },
  ];
  return (
    <L cur={page} nav={nav} bc={["Ativos","Lista de Ativos",a.id]}
      right={
        <div className="flex items-center gap-2">
          <IBtn icon={MessageSquare} label="Assistente" onClick={()=>nav("assistente-ativo")} />
          <IBtn icon={Bell} label="Alertas" />
          <IBtn icon={Wrench} label="Ordem de Serviço" />
        </div>
      }
    >
      {/* Asset header */}
      <div className="flex items-center gap-5 p-4 rounded-lg" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background:`${C.cobalt}20`, border:`1px solid ${C.cobalt}35` }}>
          <Cpu size={22} style={{ color:C.steel }} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-[18px] font-bold" style={{ fontFamily:"'Rajdhani',sans-serif", color:C.text }}>{a.nome}</h1>
            <Badge s={a.status} />
            <span className="text-[11px] px-2 py-0.5 rounded font-mono" style={{ background:C.bgDeep, border:`1px solid ${C.border}`, color:C.steel }}>{a.id}</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]" style={{ color:C.slate }}>
            <span className="flex items-center gap-1"><MapPin size={10}/>{a.area} — {a.planta}</span>
            <span className="flex items-center gap-1"><Package size={10}/>{a.tipo}</span>
            <span className="flex items-center gap-1"><Wifi size={10} style={{ color:C.green }}/>Ao vivo · há {a.leitura}</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          {[
            { v:`${a.saude}%`, l:"Saúde", c:a.saude>=75?C.green:a.saude>=50?C.yellow:C.red },
            { v:"14 d",        l:"Próx. Manut.", c:C.steel },
            { v:"97.1%",       l:"Disponib.", c:C.textSub },
          ].map(s=>(
            <div key={s.l} className="text-center">
              <div className="text-2xl font-bold" style={{ fontFamily:"'Rajdhani',sans-serif", color:s.c }}>{s.v}</div>
              <div className="text-[10px] mt-0.5" style={{ color:C.slate }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 pb-0" style={{ borderBottom:`1px solid ${C.border}` }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>{ setTab(t.id); nav(t.p); }}
            className="px-4 py-2.5 text-xs font-medium border-b-2 -mb-px transition-all"
            style={{ borderBottomColor:tab===t.id?C.steel:"transparent", color:tab===t.id?C.steel:C.slate }}>
            {t.l}
          </button>
        ))}
      </div>

      {tab==="ov"  && <AtivoOV  nav={nav} />}
      {tab==="tel" && <AtivoTel />}
      {tab==="sau" && <AtivoSau />}
      {tab==="tec" && <AtivoTec a={a} />}
    </L>
  );
}

function AtivoOV({ nav }: { nav: Nav }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="col-span-2 space-y-4">
        {/* Live readings */}
        <div className="rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
          <SH title="Leituras em Tempo Real" />
          <div className="grid grid-cols-4 gap-3 mb-4">
            {[
              { l:"Temperatura", v:"72.4", u:"°C",   I:Thermometer, warn:true  },
              { l:"Vibração",    v:"2.31", u:"mm/s",  I:Radio,       warn:false },
              { l:"Pressão",     v:"4.92", u:"bar",   I:Gauge,       warn:false },
              { l:"Corrente",    v:"44.8", u:"A",     I:Zap,         warn:false },
            ].map(s=>(
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
            <AreaChart data={TELEM.slice(12)}>
              <defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.steel} stopOpacity={.15}/><stop offset="95%" stopColor={C.steel} stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.steel} strokeOpacity={.04} />
              <XAxis dataKey="h" tick={{ fontSize:9, fill:C.slate, fontFamily:"JetBrains Mono" }} axisLine={false} tickLine={false} interval={2} />
              <YAxis tick={{ fontSize:9, fill:C.slate }} axisLine={false} tickLine={false} />
              <Tooltip content={<TT_ />} />
              <Area type="monotone" dataKey="t" name="Temperatura" stroke={C.steel} fill="url(#ga)" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Alert of asset */}
        {ALERTS.filter(a=>a.ativo==="BCP-01").map(a=>(
          <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg" style={{ background:"rgba(251,191,36,0.04)", border:"1px solid rgba(251,191,36,0.2)" }}>
            <AlertTriangle size={14} className="text-yellow-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[12px] font-semibold text-yellow-400">{a.titulo}</span>
                <SevBadge s={a.sev} />
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color:C.textSub }}>{a.desc}</p>
              <div className="flex items-center gap-2 mt-2 text-[10px] font-mono" style={{ color:C.slate }}>
                <span>{a.id}</span><span>·</span><span>{a.data}</span>
              </div>
            </div>
            <button onClick={()=>nav("alerta-detalhe")} className="text-[11px] px-2.5 py-1 rounded transition-all hover:bg-[#112035]" style={{ border:`1px solid ${C.border}`, color:C.steel }}>Ver alerta</button>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {/* Health score */}
        <div className="rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
          <SH title="Score de Saúde" />
          <div className="text-center mb-4">
            <div className="text-[52px] font-bold text-yellow-400 leading-none" style={{ fontFamily:"'Rajdhani',sans-serif" }}>78</div>
            <div className="text-[11px] mt-1" style={{ color:C.slate }}>Atenção — Degradação detectada</div>
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <RadarChart data={RADAR}>
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
            {[
              { l:"Inspeção de rolamentos",      p:"Em 3 dias",  I:Wrench   },
              { l:"Troca de vedação mecânica",   p:"Em 14 dias", I:Settings },
              { l:"Análise de óleo",             p:"Em 21 dias", I:Droplets },
            ].map(a=>(
              <div key={a.l} className="flex items-center gap-2.5 p-2 rounded-md" style={{ background:C.bgDeep, border:`1px solid ${C.border}` }}>
                <a.I size={11} style={{ color:C.steel }} />
                <div className="flex-1">
                  <div className="text-[11px] font-medium" style={{ color:C.text }}>{a.l}</div>
                  <div className="text-[10px]" style={{ color:C.slate }}>{a.p}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AtivoTel() {
  const [range, setRange] = useState("24h");
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {["1h","6h","24h","7d","30d"].map(r=>(
          <button key={r} onClick={()=>setRange(r)} className="px-3 py-1.5 text-xs rounded-md transition-all"
            style={range===r?{background:`${C.cobalt}22`,border:`1px solid ${C.cobalt}44`,color:C.steel}:{border:`1px solid ${C.border}`,color:C.slate}}>
            {r}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <IBtn icon={Download} label="CSV" />
          <IBtn icon={RefreshCw} />
        </div>
      </div>
      {[
        { k:"t", l:"Temperatura (°C)",   c:"#FBBF24", lim:80  },
        { k:"v", l:"Vibração RMS (mm/s)",c:C.steel,   lim:7.1 },
        { k:"c", l:"Corrente (A)",        c:C.green,   lim:52  },
      ].map(ch=>(
        <div key={ch.k} className="rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] font-semibold" style={{ color:C.text }}>{ch.l}</span>
            <div className="flex items-center gap-4 text-[10px] font-mono" style={{ color:C.slate }}>
              {["Mín","Máx","Média"].map((s,i)=>{
                const vals = TELEM.map(d=>d[ch.k as keyof typeof d] as number);
                const v = i===0?Math.min(...vals):i===1?Math.max(...vals):vals.reduce((a,b)=>a+b,0)/vals.length;
                return <span key={s}>{s}: <span style={{ color:C.textSub }}>{v.toFixed(1)}</span></span>;
              })}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={TELEM}>
              <defs><linearGradient id={`g${ch.k}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={ch.c} stopOpacity={.12}/><stop offset="95%" stopColor={ch.c} stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.steel} strokeOpacity={.04} />
              <XAxis dataKey="h" tick={{ fontSize:9, fill:C.slate, fontFamily:"JetBrains Mono" }} axisLine={false} tickLine={false} interval={3} />
              <YAxis tick={{ fontSize:9, fill:C.slate, fontFamily:"JetBrains Mono" }} axisLine={false} tickLine={false} />
              <Tooltip content={<TT_ />} />
              <ReferenceLine y={ch.lim} stroke={ch.c} strokeDasharray="4 4" strokeOpacity={.4} />
              <Area type="monotone" dataKey={ch.k} name={ch.l} stroke={ch.c} fill={`url(#g${ch.k})`} strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ))}
    </div>
  );
}

function AtivoSau() {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="col-span-2 space-y-4">
        <div className="rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
          <SH title="Predição de Falha — Modelo PredictaNet v3.2" />
          <div className="flex items-center gap-3 p-3 rounded-lg mb-4" style={{ background:"rgba(251,191,36,0.05)", border:"1px solid rgba(251,191,36,0.22)" }}>
            <AlertTriangle size={15} className="text-yellow-400 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-[12px] font-semibold text-yellow-400 mb-0.5">Falha prevista em 14–21 dias</div>
              <div className="text-[11px]" style={{ color:C.textSub }}>Degradação acelerada no rolamento dianteiro. Probabilidade de falha: 73% nas próximas 3 semanas.</div>
            </div>
            <div className="text-center">
              <div className="text-[28px] font-bold text-yellow-400" style={{ fontFamily:"'Rajdhani',sans-serif" }}>73%</div>
              <div className="text-[10px]" style={{ color:C.slate }}>Prob. Falha</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={HEALTH30}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.steel} strokeOpacity={.05} />
              <XAxis dataKey="d" tick={{ fontSize:9, fill:C.slate, fontFamily:"JetBrains Mono" }} axisLine={false} tickLine={false} interval={4} />
              <YAxis domain={[20,100]} tick={{ fontSize:9, fill:C.slate }} axisLine={false} tickLine={false} />
              <Tooltip content={<TT_ />} />
              <ReferenceLine y={50} stroke={C.red} strokeDasharray="4 4" strokeOpacity={.35} />
              <Line type="monotone" dataKey="r" name="Saúde Real"  stroke={C.steel}  strokeWidth={2}   dot={false} />
              <Line type="monotone" dataKey="p" name="Projeção IA" stroke={C.yellow} strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
          <SH title="Recomendações de Manutenção" />
          <div className="space-y-2">
            {[
              { pri:"Alta",  a:"Substituir rolamento SKF 6310-2Z — mancal dianteiro",      m:"Análise espectral confirmou degradação de pista interna. Tempo: ~4h.", prazo:"07/07/2025" },
              { pri:"Média", a:"Revisar alinhamento do eixo de transmissão",               m:"Vibração axial sugere desalinhamento angular de ~0.08 mm.",           prazo:"14/07/2025" },
              { pri:"Baixa", a:"Análise de óleo — verificar viscosidade e partículas",     m:"Ciclo vence em 30 dias. Verificar contaminação.",                     prazo:"23/07/2025" },
            ].map(r=>(
              <div key={r.a} className="flex items-start gap-3 p-3 rounded-md" style={{ background:C.bgDeep, border:`1px solid ${C.border}` }}>
                <span className="text-[10px] font-bold font-mono px-1.5 py-1 rounded flex-shrink-0"
                  style={r.pri==="Alta"?{background:"rgba(251,146,60,0.15)",color:C.orange,border:"1px solid rgba(251,146,60,0.3)"}:r.pri==="Média"?{background:"rgba(251,191,36,0.12)",color:C.yellow,border:"1px solid rgba(251,191,36,0.3)"}:{background:"rgba(109,129,150,0.15)",color:C.slate,border:`1px solid ${C.border}`}}>
                  {r.pri}
                </span>
                <div>
                  <div className="text-[12px] font-medium mb-0.5" style={{ color:C.text }}>{r.a}</div>
                  <div className="text-[11px]" style={{ color:C.slate }}>{r.m}</div>
                  <div className="text-[10px] font-mono mt-1.5" style={{ color:C.steel }}>Prazo: {r.prazo}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
          <SH title="Indicadores" />
          {[
            { l:"Temperatura", v:72 }, { l:"Vibração",  v:45 },
            { l:"Pressão",     v:88 }, { l:"Corrente",  v:68 },
            { l:"Nível Óleo",  v:42 },
          ].map(ind=>(
            <div key={ind.l} className="mb-3">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span style={{ color:C.slate }}>{ind.l}</span>
                <span className="font-mono font-bold" style={{ color:ind.v>=75?C.red:ind.v>=55?C.yellow:C.green }}>{ind.v}%</span>
              </div>
              <Bar_ v={ind.v} />
            </div>
          ))}
        </div>
        <div className="rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
          <SH title="Modelo IA" />
          {[["Modelo","PredictaNet v3.2"],["Inferência","14:38:01"],["Confiança","91.4%"],["Dados treino","847 ativos"],["Features","38 variáveis"]].map(([k,v])=>(
            <div key={k} className="flex justify-between py-1.5 text-[11px]" style={{ borderBottom:`1px solid ${C.border}40` }}>
              <span style={{ color:C.slate }}>{k}</span>
              <span className="font-mono" style={{ color:C.textSub }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AtivoTec({ a }: { a: typeof ASSETS[0] }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {[
        { title:"Identificação", rows:[["Tag / ID",a.id],["Nome",a.nome],["Tipo",a.tipo],["N° de Série",a.serie],["Fabricante",a.fab],["Modelo",a.modelo],["Data de Instalação","15/03/2019"],["Garantia até","15/03/2024 (vencida)"]] },
        { title:"Dados Técnicos", rows:[["Potência Nominal",a.pot],["Rotação Nominal",`${a.rpm} rpm`],["Classe de Proteção","IP55"],["Tensão de Operação","380V / 60Hz"],["Corrente Nominal (FLA)","46.2 A"],["Fluido Bombeado","Água industrial"],["Temp. Máx Operação","85 °C"],["Pressão Máx Operação","10 bar"]] },
      ].map(sec=>(
        <div key={sec.title} className="rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
          <SH title={sec.title} />
          {sec.rows.map(([k,v])=>(
            <div key={k} className="flex items-center justify-between py-2" style={{ borderBottom:`1px solid ${C.border}40` }}>
              <span className="text-[11px]" style={{ color:C.slate }}>{k}</span>
              <span className="text-[11px] font-mono" style={{ color:C.text }}>{v}</span>
            </div>
          ))}
        </div>
      ))}
      <div className="rounded-lg p-4 col-span-2" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
        <SH title="Sensores Instalados" />
        <div className="grid grid-cols-4 gap-3">
          {[
            { tipo:"PT100",             gd:"Temperatura mancal",     prot:"4-20mA"      },
            { tipo:"Acelerômetro MEMS", gd:"Vibração triaxial",       prot:"Modbus RTU"  },
            { tipo:"Transdutor 4-20mA", gd:"Pressão de saída",        prot:"4-20mA"      },
            { tipo:"TC Split-core",     gd:"Corrente elétrica",       prot:"Modbus RTU"  },
          ].map(s=>(
            <div key={s.tipo} className="p-3 rounded-md" style={{ background:C.bgDeep, border:`1px solid ${C.border}` }}>
              <Radio size={12} style={{ color:C.steel }} className="mb-2" />
              <div className="text-[11px] font-medium mb-0.5" style={{ color:C.text }}>{s.tipo}</div>
              <div className="text-[10px]" style={{ color:C.slate }}>{s.gd}</div>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded mt-2 inline-block" style={{ background:`${C.steel}15`, color:C.steel }}>{s.prot}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 12. Lista de Alertas ─────────────────────────────────────────────────────────
function ListaAlertas({ nav }: { nav: Nav }) {
  return (
    <L cur="alertas" nav={nav} bc={["Alertas","Lista de Alertas"]}
      right={<div className="flex gap-2"><IBtn icon={Download} label="Exportar" /><IBtn icon={Settings} label="Configurar" /></div>}
    >
      <div className="grid grid-cols-4 gap-3">
        {[
          { l:"Total Abertos",v:"5", c:C.red    },
          { l:"Críticos",     v:"2", c:C.red    },
          { l:"Altos",        v:"1", c:C.orange },
          { l:"Médios",       v:"2", c:C.yellow },
        ].map(s=>(
          <div key={s.l} className="flex items-center justify-between p-3 rounded-lg" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
            <div>
              <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color:C.slate }}>{s.l}</div>
              <div className="text-[26px] font-bold" style={{ fontFamily:"'Rajdhani',sans-serif", color:s.c }}>{s.v}</div>
            </div>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background:s.c, boxShadow:`0 0 8px ${s.c}` }} />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:C.slate }} />
          <input placeholder="Buscar alertas..." className="w-full pl-9 pr-3 py-2 text-xs rounded-md focus:outline-none" style={{ background:C.bgCard, border:`1px solid ${C.border}`, color:C.text }} />
        </div>
        {["Todos os Tipos","Todos os Status","Últimas 24h"].map((o,i)=>(
          <select key={i} className="px-3 py-2 text-xs rounded-md focus:outline-none" style={{ background:C.bgCard, border:`1px solid ${C.border}`, color:C.text }}><option>{o}</option></select>
        ))}
      </div>

      <div className="rounded-lg overflow-hidden" style={{ border:`1px solid ${C.border}` }}>
        <table className="w-full" style={{ background:C.bgCard }}>
          <thead style={{ borderBottom:`1px solid ${C.border}` }}>
            <tr>
              {["ID","Título / Ativo","Tipo","Severidade","Status","Data / Hora",""].map(h=>(
                <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color:C.slate }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ALERTS.map((a,i)=>(
              <tr key={a.id} onClick={()=>nav("alerta-detalhe")} className="cursor-pointer transition-all hover:bg-[#112035]"
                style={{ borderBottom:`1px solid ${C.border}40`, background:i%2===1?"rgba(12,24,41,0.5)":undefined }}>
                <td className="px-4 py-3"><span style={{ fontFamily:"'JetBrains Mono',monospace", color:C.steel, fontSize:10 }}>{a.id}</span></td>
                <td className="px-4 py-3">
                  <div className="text-[12px] font-medium" style={{ color:C.text }}>{a.titulo}</div>
                  <div className="text-[10px] font-mono" style={{ color:C.slate }}>{a.ativo} — {a.nAtivo}</div>
                </td>
                <td className="px-4 py-3 text-[11px]" style={{ color:C.textSub }}>{a.tipo}</td>
                <td className="px-4 py-3"><SevBadge s={a.sev} /></td>
                <td className="px-4 py-3"><Badge s={a.status} /></td>
                <td className="px-4 py-3 text-[11px] font-mono" style={{ color:C.slate }}>{a.data}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button className="p-1 rounded hover:bg-[#0A1525]" style={{ color:C.slate }}><Eye size={12}/></button>
                    <button className="p-1 rounded hover:bg-[#0A1525]" style={{ color:C.slate }}><MoreHorizontal size={12}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </L>
  );
}

// 13. Detalhe do Alerta ────────────────────────────────────────────────────────
function DetalheAlerta({ nav }: { nav: Nav }) {
  const al = ALERTS[0];
  return (
    <L cur="alertas" nav={nav} bc={["Alertas","Lista de Alertas",al.id]}
      right={
        <div className="flex items-center gap-2">
          <IBtn icon={RotateCcw} label="Reabrir" />
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all"
            style={{ background:"rgba(52,211,153,0.15)", border:"1px solid rgba(52,211,153,0.3)", color:C.green }}>
            <CheckCircle2 size={12}/> Resolver
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-4">
          {/* Header card */}
          <div className="p-4 rounded-lg" style={{ background:"rgba(248,113,113,0.04)", border:"1px solid rgba(248,113,113,0.2)" }}>
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1.5">
                  <h2 className="text-[16px] font-bold" style={{ fontFamily:"'Rajdhani',sans-serif", color:C.text }}>{al.titulo}</h2>
                  <SevBadge s={al.sev} /><Badge s={al.status} />
                </div>
                <p className="text-[12px] leading-relaxed" style={{ color:C.textSub }}>{al.desc}</p>
              </div>
            </div>
          </div>

          {/* Details grid */}
          <div className="rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
            <SH title="Detalhes do Alerta" />
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              {[
                ["ID","ALT-2025-0847"],["Ativo",`${al.ativo} — ${al.nAtivo}`],
                ["Tipo",al.tipo],["Data/Hora de Detecção",al.data],
                ["Método","Análise espectral + Threshold adaptativo"],["Responsável","Carlos H. Matos"],
              ].map(([k,v])=>(
                <div key={k}>
                  <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color:C.slate }}>{k}</div>
                  <div className="text-[12px] font-mono" style={{ color:C.text }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Spike chart */}
          <div className="rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
            <SH title="Vibração no Momento do Alerta" />
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={TELEM.slice(16)}>
                <defs><linearGradient id="gv" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.red} stopOpacity={.15}/><stop offset="95%" stopColor={C.red} stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.steel} strokeOpacity={.04} />
                <XAxis dataKey="h" tick={{ fontSize:9, fill:C.slate, fontFamily:"JetBrains Mono" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:9, fill:C.slate }} axisLine={false} tickLine={false} />
                <Tooltip content={<TT_ />} />
                <ReferenceLine x="18:00" stroke={C.red} strokeDasharray="3 3" strokeOpacity={.7} />
                <Area type="monotone" dataKey="v" name="Vibração" stroke={C.red} fill="url(#gv)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Timeline */}
          <div className="rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
            <SH title="Linha do Tempo" />
            <div className="space-y-3">
              {[
                { t:"14:32:07", tp:"Detecção",     d:"Sistema detectou vibração de 8.2 mm/s, acima do limite crítico (7.1 mm/s).",   c:"bg-red-400"    },
                { t:"14:32:10", tp:"Alerta Criado", d:"Alerta ALT-2025-0847 criado automaticamente. Notificações disparadas.",          c:"bg-orange-400" },
                { t:"14:35:22", tp:"Notificação",   d:"E-mail e push enviados para Carlos H. Matos e Ana P. Souza.",                   c:"bg-yellow-400" },
                { t:"14:41:05", tp:"Em Análise",    d:"Carlos H. Matos assumiu o alerta.",                                            c:"bg-blue-400"   },
              ].map((ev,i)=>(
                <div key={i} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${ev.c}`} />
                    {i<3 && <div className="w-px h-7 mt-1" style={{ background:`${C.border}` }} />}
                  </div>
                  <div className="pb-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[12px] font-semibold" style={{ color:C.text }}>{ev.tp}</span>
                      <span className="text-[10px] font-mono" style={{ color:C.slate }}>{ev.t}</span>
                    </div>
                    <p className="text-[11px]" style={{ color:C.slate }}>{ev.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
            <SH title="Ativo Relacionado" />
            <button onClick={()=>nav("ativo-overview")} className="w-full text-left p-3 rounded-md transition-all hover:border-[rgba(130,200,229,0.25)]"
              style={{ background:C.bgDeep, border:`1px solid ${C.border}` }}>
              <div className="flex items-center gap-2 mb-2"><Cpu size={13} style={{ color:C.steel }}/><span className="text-[12px] font-medium" style={{ color:C.text }}>{al.nAtivo}</span></div>
              <div className="flex items-center justify-between mb-2">
                <span style={{ fontFamily:"'JetBrains Mono',monospace", color:C.steel, fontSize:11 }}>{al.ativo}</span>
                <Badge s="critico" />
              </div>
              <Bar_ v={41} />
              <div className="text-[10px] mt-1.5" style={{ color:C.slate }}>Saúde: 41% — Crítico</div>
            </button>
          </div>

          <div className="rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
            <SH title="Ações Rápidas" />
            <div className="space-y-2">
              {[
                { l:"Criar Ordem de Serviço",     I:Wrench        },
                { l:"Abrir no Assistente IA",     I:MessageSquare },
                { l:"Ver Histórico do Ativo",     I:Activity      },
                { l:"Escalar para Engenharia",    I:Users         },
                { l:"Fechar como Falso Positivo", I:XCircle       },
              ].map(a=>(
                <button key={a.l} className="w-full flex items-center gap-2.5 p-2 rounded-md text-[11px] transition-all hover:border-[rgba(130,200,229,0.2)]"
                  style={{ background:C.bgDeep, border:`1px solid ${C.border}`, color:C.textSub }}>
                  <a.I size={11} style={{ color:C.steel }}/>{a.l}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
            <SH title="Adicionar Comentário" />
            <textarea rows={3} placeholder="Registre uma observação..." className="w-full rounded-md p-2.5 text-xs resize-none focus:outline-none mb-2"
              style={{ background:C.bgDeep, border:`1px solid ${C.border}`, color:C.text }} />
            <button className="w-full py-2 text-xs font-bold rounded-md text-white" style={{ background:C.cobalt }}>Registrar</button>
          </div>
        </div>
      </div>
    </L>
  );
}

// 14–15. Assistente ───────────────────────────────────────────────────────────
function Assistente({ page, nav }: { page: Page; nav: Nav }) {
  const ctx = page==="assistente-ativo";
  const [inp, setInp] = useState("");
  const [msgs, setMsgs] = useState([
    { r:"ai", t: ctx
      ? "Olá! Estou analisando o ativo **BCP-01 — Bomba Centrífuga #1**. Identifico temperatura elevada de 72.4°C no mancal e vibração crescente desde 18h. Qual aspecto técnico deseja aprofundar?"
      : "Olá! Sou o Assistente Técnico Predicta. Posso ajudá-lo com análise de ativos, telemetria, recomendações de manutenção e muito mais. Como posso ajudar?" },
    ...(ctx?[
      { r:"user", t:"Qual a causa mais provável da vibração elevada no BCP-01?" },
      { r:"ai",   t:"Com base nos dados espectrais das últimas 72h, as causas prováveis em ordem de probabilidade:\n\n**1. Degradação do rolamento dianteiro (73%)** — Padrão a 2.8× e 5.4× da freq. de rotação indica degradação de pista interna do SKF 6310-2Z.\n\n**2. Desalinhamento angular (18%)** — Vibração axial levemente elevada após última manutenção.\n\n**3. Cavitação intermitente (9%)** — Pressão de sucção próxima do limite em alguns períodos.\n\nRecomendo inspeção imediata do rolamento com prioridade alta." },
    ]:[]),
  ]);

  const suggestions = ctx
    ? ["Gerar ordem de serviço","Ver histórico de manutenção","Qual o MTBF atual?","Simular impacto da parada"]
    : ["Qual ativo tem pior saúde?","Listar alertas críticos","Resumo operacional do dia","Planejar manutenções do mês"];

  const send = () => {
    if (!inp.trim()) return;
    setMsgs(m=>[...m,{ r:"user",t:inp },{ r:"ai",t:"Analisando com base nos dados disponíveis no Predicta…" }]);
    setInp("");
  };

  return (
    <L cur={page} nav={nav} bc={["Assistente", ctx?"Contexto: BCP-01":"Assistente IA"]}
      right={
        <div className="flex items-center gap-2">
          {ctx&&<div className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs" style={{ background:`${C.cobalt}18`, border:`1px solid ${C.cobalt}35`, color:C.steel }}><Cpu size={11}/> Contexto: BCP-01</div>}
          <IBtn icon={RotateCcw} label="Nova conversa" />
        </div>
      }
    >
      <div className="flex gap-4" style={{ height:"calc(100vh - 148px)" }}>
        {/* Chat */}
        <div className="flex-1 flex flex-col rounded-lg overflow-hidden" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {msgs.map((m,i)=>(
              <div key={i} className={`flex gap-3 ${m.r==="user"?"flex-row-reverse":""}`}>
                <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center`}
                  style={{ background:m.r==="ai"?`linear-gradient(135deg,${C.cobalt},${C.navy})`:"rgba(130,200,229,0.15)" }}>
                  {m.r==="ai"?<Bot size={13} className="text-white"/>:<User size={13} style={{ color:C.steel }}/>}
                </div>
                <div className={`max-w-[75%] px-3.5 py-2.5 rounded-xl text-[12px] leading-relaxed`}
                  style={m.r==="ai"
                    ? { background:"#0F1E35", border:`1px solid ${C.border}`, color:C.text }
                    : { background:`${C.cobalt}28`, border:`1px solid ${C.cobalt}40`, color:C.text }}>
                  {m.t.split('\n').map((ln,li)=>(
                    <p key={li} className={li>0?"mt-1.5":""}>
                      {ln.split(/\*\*(.*?)\*\*/).map((pt,pi)=>
                        pi%2===1?<strong key={pi} style={{ color:C.steel }}>{pt}</strong>:pt
                      )}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="px-4 pb-2 flex flex-wrap gap-2">
            {suggestions.map(s=>(
              <button key={s} onClick={()=>setInp(s)} className="text-[11px] px-2.5 py-1.5 rounded-full transition-all"
                style={{ border:`1px solid ${C.border}`, color:C.slate }}>
                {s}
              </button>
            ))}
          </div>

          <div className="p-3" style={{ borderTop:`1px solid ${C.border}` }}>
            <div className="flex items-center gap-2 rounded-lg px-3 py-2 transition-all" style={{ background:C.bgDeep, border:`1px solid ${C.border}` }}>
              <input value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()}
                placeholder={ctx?"Pergunte sobre BCP-01...":"Pergunte sobre seus ativos..."}
                className="flex-1 bg-transparent text-sm focus:outline-none" style={{ color:C.text }} />
              <button onClick={send} disabled={!inp.trim()} className="p-1.5 rounded-md text-white transition-all disabled:opacity-40 hover:brightness-110"
                style={{ background:C.cobalt }}>
                <Send size={12}/>
              </button>
            </div>
          </div>
        </div>

        {/* Context panel */}
        {ctx&&(
          <div className="w-56 space-y-3">
            <div className="rounded-lg p-3" style={{ background:C.bgCard, border:`1px solid ${C.cobalt}35` }}>
              <div className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color:C.slate }}>Contexto Ativo</div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background:`${C.cobalt}20`, border:`1px solid ${C.cobalt}35` }}>
                  <Cpu size={14} style={{ color:C.steel }} />
                </div>
                <div>
                  <div className="text-[11px] font-semibold" style={{ color:C.text }}>BCP-01</div>
                  <div className="text-[10px]" style={{ color:C.slate }}>Bomba Centrífuga #1</div>
                </div>
              </div>
              {[["Saúde","78%",C.yellow],["Status","Atenção",C.yellow],["Temp.","72.4°C",C.orange],["Vibração","3.8 mm/s",C.yellow]].map(([l,v,c])=>(
                <div key={l} className="flex justify-between text-[11px] mb-1.5">
                  <span style={{ color:C.slate }}>{l}</span>
                  <span className="font-mono font-bold" style={{ color:c as string }}>{v}</span>
                </div>
              ))}
            </div>

            <div className="rounded-lg p-3" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
              <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color:C.slate }}>Alertas Ativos</div>
              {ALERTS.filter(a=>a.ativo==="BCP-01").map(a=>(
                <div key={a.id} className="p-2 rounded-md mb-2" style={{ background:"rgba(251,191,36,0.06)", border:"1px solid rgba(251,191,36,0.2)" }}>
                  <div className="text-[11px] font-medium text-yellow-400">{a.titulo}</div>
                  <div className="text-[10px] font-mono mt-0.5" style={{ color:C.slate }}>{a.id}</div>
                </div>
              ))}
            </div>

            <div className="rounded-lg p-3" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
              <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color:C.slate }}>Outros Ativos</div>
              {ASSETS.slice(1,5).map(a=>(
                <button key={a.id} className="w-full flex items-center justify-between p-1.5 rounded transition-all hover:bg-[#112035] mb-1">
                  <div className="text-left">
                    <div className="text-[11px] font-mono" style={{ color:C.steel }}>{a.id}</div>
                    <div className="text-[10px] truncate max-w-[120px]" style={{ color:C.slate }}>{a.nome}</div>
                  </div>
                  <Badge s={a.status} />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </L>
  );
}

// 9. Cadastro Manual ───────────────────────────────────────────────────────────
function CadastroManual({ nav }: { nav: Nav }) {
  const [step, setStep] = useState(1);
  const steps = ["Identificação","Localização","Dados Técnicos","Sensores","Revisão"];
  return (
    <L cur="cadastro-manual" nav={nav} bc={["Cadastro","Novo Ativo"]}>
      {/* Stepper */}
      <div className="flex items-center mb-2">
        {steps.map((s,i)=>(
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <button onClick={()=>setStep(i+1)} className="flex items-center gap-2 flex-shrink-0">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all"
                style={step>i+1?{background:"rgba(52,211,153,0.15)",border:"1px solid rgba(52,211,153,0.4)",color:C.green}:step===i+1?{background:C.cobalt,border:`1px solid ${C.cobalt}`,color:"white"}:{border:`1px solid ${C.border}`,color:C.slate}}>
                {step>i+1?<CheckCircle2 size={13}/>:i+1}
              </div>
              <span className="text-[11px] transition-all" style={{ color:step===i+1?C.steel:step>i+1?C.green:C.slate }}>{s}</span>
            </button>
            {i<steps.length-1&&<div className="flex-1 h-px mx-3" style={{ background:step>i+1?"rgba(52,211,153,0.3)":C.border }} />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 rounded-lg p-5" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
          {step===1&&(
            <>
              <SH title="Identificação do Ativo" />
              <div className="grid grid-cols-2 gap-4">
                {["Tag / Identificador *","Nome do Ativo *","Tipo de Equipamento *","Classe de Criticidade *","Fabricante","Modelo","Número de Série","Data de Instalação"].map(f=>(
                  <div key={f}>
                    <label className="block text-[10px] uppercase tracking-[0.15em] mb-1.5" style={{ color:C.slate }}>{f}</label>
                    <input className="w-full rounded-md px-3 py-2 text-sm focus:outline-none" style={{ background:C.bgDeep, border:`1px solid ${C.border}`, color:C.text }} />
                  </div>
                ))}
                <div className="col-span-2">
                  <label className="block text-[10px] uppercase tracking-[0.15em] mb-1.5" style={{ color:C.slate }}>Observações</label>
                  <textarea rows={3} className="w-full rounded-md px-3 py-2 text-sm focus:outline-none resize-none" style={{ background:C.bgDeep, border:`1px solid ${C.border}`, color:C.text }} />
                </div>
              </div>
            </>
          )}
          {step===2&&(
            <>
              <SH title="Localização na Planta" />
              <div className="grid grid-cols-2 gap-4">
                {["Empresa *","Planta / Unidade *","Área *","Sistema","Localização Física","Coordenada no Mapa"].map(f=>(
                  <div key={f}>
                    <label className="block text-[10px] uppercase tracking-[0.15em] mb-1.5" style={{ color:C.slate }}>{f}</label>
                    <input className="w-full rounded-md px-3 py-2 text-sm focus:outline-none" style={{ background:C.bgDeep, border:`1px solid ${C.border}`, color:C.text }} />
                  </div>
                ))}
              </div>
            </>
          )}
          {step===3&&(
            <>
              <SH title="Dados Técnicos" />
              <div className="grid grid-cols-2 gap-4">
                {["Potência Nominal (kW)","Rotação Nominal (rpm)","Tensão de Operação (V)","Frequência (Hz)","Corrente Nominal (A)","Temperatura Máx (°C)","Pressão Máx (bar)","Classe de Proteção (IP)"].map(f=>(
                  <div key={f}>
                    <label className="block text-[10px] uppercase tracking-[0.15em] mb-1.5" style={{ color:C.slate }}>{f}</label>
                    <input className="w-full rounded-md px-3 py-2 text-sm focus:outline-none" style={{ background:C.bgDeep, border:`1px solid ${C.border}`, color:C.text }} />
                  </div>
                ))}
              </div>
            </>
          )}
          {step===4&&(
            <>
              <SH title="Sensores e Monitoramento" />
              <div className="space-y-3 mb-4">
                {[
                  { t:"PT100",             g:"Temperatura do Mancal", p:"4-20mA",    on:true  },
                  { t:"Acelerômetro MEMS", g:"Vibração Triaxial",     p:"Modbus RTU",on:true  },
                  { t:"Transdutor 4-20mA", g:"Pressão de Saída",      p:"4-20mA",    on:false },
                ].map((s,i)=>(
                  <div key={i} className="flex items-center gap-3 p-3 rounded-md" style={{ background:C.bgDeep, border:`1px solid ${C.border}` }}>
                    <input type="checkbox" defaultChecked={s.on} className="accent-blue-600" />
                    <Radio size={13} style={{ color:C.steel }} />
                    <div className="grid grid-cols-3 gap-4 flex-1">
                      <div><div className="text-[10px]" style={{ color:C.slate }}>Sensor</div><div className="text-[12px]" style={{ color:C.text }}>{s.t}</div></div>
                      <div><div className="text-[10px]" style={{ color:C.slate }}>Grandeza</div><div className="text-[12px]" style={{ color:C.text }}>{s.g}</div></div>
                      <div><div className="text-[10px]" style={{ color:C.slate }}>Protocolo</div><div className="text-[12px] font-mono" style={{ color:C.text }}>{s.p}</div></div>
                    </div>
                    <button style={{ color:C.slate }}><X size={12}/></button>
                  </div>
                ))}
              </div>
              <button className="flex items-center gap-2 text-[11px] px-3 py-2 rounded-md transition-all" style={{ border:`1px solid ${C.border}`, color:C.steel }}>
                <PlusCircle size={12}/> Adicionar sensor
              </button>
            </>
          )}
          {step===5&&(
            <>
              <SH title="Revisão e Confirmação" />
              <div className="flex items-center gap-2 p-3 rounded-md mb-4" style={{ background:"rgba(52,211,153,0.06)", border:"1px solid rgba(52,211,153,0.2)" }}>
                <CheckCircle2 size={13} style={{ color:C.green }} />
                <span className="text-[12px]" style={{ color:C.green }}>Todos os campos obrigatórios preenchidos. Pronto para cadastro.</span>
              </div>
              {[["Tag","BCP-03"],["Nome","Bomba Centrífuga #3"],["Tipo","Bomba"],["Planta","Planta Norte"],["Fabricante","KSB"],["Potência","75 kW"],["Sensores","2 configurados"]].map(([k,v])=>(
                <div key={k} className="flex justify-between py-2 text-[12px]" style={{ borderBottom:`1px solid ${C.border}40` }}>
                  <span style={{ color:C.slate }}>{k}</span>
                  <span className="font-mono" style={{ color:C.text }}>{v}</span>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="space-y-3">
          <div className="rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
            <div className="flex items-center gap-2 mb-2"><Info size={13} style={{ color:C.steel }}/><span className="text-[12px] font-semibold" style={{ color:C.text }}>Dica</span></div>
            <p className="text-[11px] leading-relaxed" style={{ color:C.slate }}>O Tag deve seguir o padrão do Dicionário de Rastreabilidade da planta antes de cadastrar.</p>
          </div>
          <div className="rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
            <div className="flex items-center gap-2 mb-2"><ScanLine size={13} style={{ color:C.steel }}/><span className="text-[12px] font-semibold" style={{ color:C.text }}>Digitalização OCR</span></div>
            <p className="text-[11px] leading-relaxed mb-3" style={{ color:C.slate }}>Tem a plaqueta do equipamento? Preencha os dados automaticamente.</p>
            <button onClick={()=>nav("cadastro-ocr")} className="w-full py-2 text-[11px] font-semibold rounded-md transition-all"
              style={{ background:`${C.cobalt}20`, border:`1px solid ${C.cobalt}35`, color:C.steel }}>
              Usar OCR
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4" style={{ borderTop:`1px solid ${C.border}` }}>
        <button onClick={()=>nav("ativos")} className="px-4 py-2 text-xs rounded-md transition-all" style={{ border:`1px solid ${C.border}`, color:C.slate }}>Cancelar</button>
        <div className="flex items-center gap-2">
          {step>1&&<button onClick={()=>setStep(s=>s-1)} className="px-4 py-2 text-xs rounded-md transition-all" style={{ border:`1px solid ${C.border}`, color:C.steel }}>Voltar</button>}
          {step<5
            ?<button onClick={()=>setStep(s=>s+1)} className="px-5 py-2 text-xs font-bold text-white rounded-md" style={{ background:C.cobalt }}>Continuar →</button>
            :<button onClick={()=>nav("ativos")} className="px-5 py-2 text-xs font-bold text-white rounded-md" style={{ background:"#059669" }}>Cadastrar Ativo</button>
          }
        </div>
      </div>
    </L>
  );
}

// 10. OCR ─────────────────────────────────────────────────────────────────────
function OCRScreen({ nav }: { nav: Nav }) {
  const [done] = useState(true);
  return (
    <L cur="cadastro-ocr" nav={nav} bc={["Cadastro","Leitura OCR"]}>
      <div className="grid grid-cols-2 gap-5">
        <div className="space-y-4">
          <div className="rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
            <SH title="Imagem da Plaqueta" />
            <div className="relative rounded-lg overflow-hidden" style={{ border:`2px dashed ${done?"rgba(52,211,153,0.3)":C.border}`, background:C.bgDeep }}>
              {done?(
                <div className="h-56 flex items-center justify-center relative">
                  {/* Simulated plaqueta */}
                  <div className="relative w-72 h-42 rounded-lg p-4 flex flex-col items-center gap-2" style={{ background:"rgba(200,169,110,0.08)", border:"2px solid rgba(200,169,110,0.25)" }}>
                    <div className="text-[11px] font-bold tracking-[0.4em]" style={{ color:"rgba(200,169,110,0.7)" }}>K S B</div>
                    <div className="text-xs font-mono tracking-widest" style={{ color:C.textSub }}>MEGABLOCK 100-315</div>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-0.5 mt-2">
                      {[["SN:","KSB2024003"],["Pot.:","75 kW"],["RPM:","1.450"],["IP:","IP55"],["Tensão:","380V/60Hz"],["FLA:","46.2 A"]].map(([k,v])=>(
                        <div key={k} className="text-[10px] font-mono" style={{ color:"rgba(200,169,110,0.55)" }}>{k} <span style={{ color:"rgba(200,169,110,0.8)" }}>{v}</span></div>
                      ))}
                    </div>
                    {/* OCR highlight */}
                    <div className="absolute top-2 left-2 right-2 h-6 rounded animate-pulse" style={{ border:"1.5px solid rgba(130,200,229,0.5)" }} />
                  </div>
                </div>
              ):(
                <div className="h-48 flex flex-col items-center justify-center gap-3 cursor-pointer">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background:`${C.cobalt}20`, border:`1px solid ${C.cobalt}35` }}>
                    <Camera size={22} style={{ color:C.steel }} />
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium" style={{ color:C.text }}>Arraste a imagem aqui</div>
                    <div className="text-xs mt-0.5" style={{ color:C.slate }}>JPG, PNG ou WEBP — máx. 10 MB</div>
                  </div>
                </div>
              )}
            </div>
            {done&&(
              <div className="flex items-center gap-2 mt-3 p-2.5 rounded-md" style={{ background:"rgba(52,211,153,0.06)", border:"1px solid rgba(52,211,153,0.2)" }}>
                <CheckCircle2 size={13} style={{ color:C.green }} />
                <span className="text-[12px]" style={{ color:C.green }}>OCR concluído — 7 campos extraídos com 94% de confiança</span>
              </div>
            )}
          </div>

          <div className="rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
            <SH title="Campos Detectados" />
            <div className="space-y-1.5">
              {[
                { f:"Fabricante",       v:"KSB",               c:99 },
                { f:"Modelo",          v:"Megablock 100-315",  c:97 },
                { f:"N° de Série",      v:"KSB2024003",         c:95 },
                { f:"Potência",        v:"75 kW",              c:98 },
                { f:"Rotação",         v:"1.450 rpm",          c:96 },
                { f:"Tensão / Freq.",  v:"380V / 60Hz",        c:94 },
                { f:"Corrente Nominal",v:"46.2 A",             c:91 },
              ].map(d=>(
                <div key={d.f} className="flex items-center gap-3 p-2 rounded-md" style={{ background:C.bgDeep, border:`1px solid ${C.border}` }}>
                  <CheckCircle2 size={11} style={{ color:C.green }} />
                  <span className="text-[11px] w-32 flex-shrink-0" style={{ color:C.slate }}>{d.f}</span>
                  <span className="text-[11px] font-mono flex-1" style={{ color:C.text }}>{d.v}</span>
                  <span className="text-[10px] font-mono" style={{ color:d.c>=95?C.green:C.yellow }}>{d.c}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
          <SH title="Formulário de Cadastro" right={<span className="text-[11px] flex items-center gap-1" style={{ color:C.green }}><CheckCircle2 size={10}/> Auto-preenchido</span>} />
          <div className="space-y-3">
            {[
              { l:"Tag / Identificador *", v:"BCP-03",             auto:false },
              { l:"Fabricante",            v:"KSB",                auto:true  },
              { l:"Modelo",               v:"Megablock 100-315",  auto:true  },
              { l:"Número de Série",      v:"KSB2024003",         auto:true  },
              { l:"Potência Nominal",     v:"75 kW",              auto:true  },
              { l:"Rotação Nominal",      v:"1.450 rpm",          auto:true  },
              { l:"Tensão de Operação",   v:"380V / 60Hz",        auto:true  },
              { l:"Corrente Nominal",     v:"46.2 A",             auto:true  },
            ].map(f=>(
              <div key={f.l}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] uppercase tracking-[0.15em]" style={{ color:C.slate }}>{f.l}</label>
                  {f.auto&&<span className="text-[9px] flex items-center gap-0.5" style={{ color:C.green }}><Bot size={8}/> OCR</span>}
                </div>
                <input defaultValue={f.v} className="w-full rounded-md px-3 py-2 text-sm focus:outline-none"
                  style={{ background:C.bgDeep, border:`1px solid ${f.auto?"rgba(52,211,153,0.25)":C.border}`, color:C.text }} />
              </div>
            ))}
            <div>
              <label className="block text-[10px] uppercase tracking-[0.15em] mb-1" style={{ color:C.slate }}>Área / Localização</label>
              <select className="w-full rounded-md px-3 py-2 text-sm focus:outline-none" style={{ background:C.bgDeep, border:`1px solid ${C.border}`, color:C.text }}>
                <option>Área de Bombeamento — Planta Norte</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-5">
            <button onClick={()=>nav("cadastro-manual")} className="flex-1 py-2 text-xs rounded-md transition-all" style={{ border:`1px solid ${C.border}`, color:C.slate }}>Editar formulário completo</button>
            <button onClick={()=>nav("ativos")} className="flex-1 py-2 text-xs font-bold text-white rounded-md" style={{ background:C.cobalt }}>Cadastrar Ativo</button>
          </div>
        </div>
      </div>
    </L>
  );
}

// 11. Mapa da Planta ───────────────────────────────────────────────────────────
function MapaPlanta({ nav }: { nav: Nav }) {
  const [sel, setSel] = useState<string|null>(null);
  const sc: Record<string,string> = { normal:C.green, atencao:C.yellow, critico:C.red, offline:C.slate };
  const areas = [
    { id:"BOM", l:"Bombeamento",  x:40, y:55, w:195,h:130, assets:["BCP-01","BCP-02"] },
    { id:"PRA", l:"Produção A",   x:255,y:55, w:175,h:130, assets:["ME-07"]           },
    { id:"PRB", l:"Produção B",   x:450,y:55, w:175,h:130, assets:["RV-12"]           },
    { id:"UTL", l:"Utilidades",   x:40, y:210,w:195,h:110, assets:["CA-03","VT-05"]   },
    { id:"ARM", l:"Armazenagem",  x:255,y:210,w:175,h:110, assets:["GR-04"]           },
    { id:"SUB", l:"Subestação",   x:450,y:210,w:175,h:110, assets:["TR-09"]           },
  ];
  const apos: Record<string,{x:number,y:number,s:string}> = {
    "BCP-01":{x:105,y:110,s:"atencao"},"BCP-02":{x:185,y:140,s:"offline"},
    "ME-07": {x:338,y:115,s:"critico"},"RV-12": {x:533,y:115,s:"normal"},
    "CA-03": {x:120,y:262,s:"normal"}, "VT-05": {x:185,y:288,s:"atencao"},
    "GR-04": {x:338,y:262,s:"atencao"},"TR-09": {x:533,y:268,s:"normal"},
  };
  return (
    <L cur="mapa-planta" nav={nav} bc={["Ativos","Mapa da Planta"]}
      right={<div className="flex gap-2"><IBtn icon={Filter} label="Filtrar"/><IBtn icon={Download} label="Exportar"/></div>}
    >
      <div className="grid grid-cols-4 gap-4">
        <div className="col-span-3 rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
          <SH title="Planta Norte — Vista Superior"
            right={
              <div className="flex items-center gap-4 text-[10px]" style={{ color:C.slate }}>
                {Object.entries(sc).map(([s,c])=>(
                  <span key={s} className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full inline-block" style={{ background:c }}/>{s.charAt(0).toUpperCase()+s.slice(1)}</span>
                ))}
              </div>
            }
          />
          <div className="rounded-lg overflow-hidden" style={{ background:C.bgDeep }}>
            <svg width="100%" height="360" viewBox="0 0 660 350" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="fp" width="32" height="32" patternUnits="userSpaceOnUse">
                  <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#82C8E5" strokeWidth=".3" strokeOpacity=".08"/>
                </pattern>
                <radialGradient id="bg" cx="50%" cy="50%">
                  <stop offset="0%" stopColor={C.cobalt} stopOpacity=".05"/>
                  <stop offset="100%" stopColor="transparent"/>
                </radialGradient>
              </defs>
              <rect width="660" height="350" fill="url(#fp)"/>
              <rect width="660" height="350" fill="url(#bg)"/>

              {areas.map(a=>{
                const hasCrit = a.assets.some(id=>apos[id]?.s==="critico");
                const hasAtt  = a.assets.some(id=>["atencao","offline"].includes(apos[id]?.s));
                const bdrCol  = hasCrit?"rgba(248,113,113,0.5)":hasAtt?"rgba(251,191,36,0.35)":"rgba(130,200,229,0.15)";
                return (
                  <g key={a.id} onClick={()=>setSel(a.id)} style={{ cursor:"pointer" }}>
                    <rect x={a.x} y={a.y} width={a.w} height={a.h} rx={6}
                      fill={sel===a.id?`${C.cobalt}20`:"rgba(15,30,53,0.7)"}
                      stroke={sel===a.id?C.steel:bdrCol}
                      strokeWidth={sel===a.id?1.5:1}
                    />
                    <text x={a.x+a.w/2} y={a.y+17} textAnchor="middle" fontSize="10" fontFamily="Inter" fill={C.slate}>{a.l}</text>
                  </g>
                );
              })}

              {Object.entries(apos).map(([id,pos])=>(
                <g key={id} onClick={()=>nav("ativo-overview")} style={{ cursor:"pointer" }}>
                  <circle cx={pos.x} cy={pos.y} r={10} fill={sc[pos.s]} fillOpacity={.12} stroke={sc[pos.s]} strokeWidth={1.5}/>
                  <circle cx={pos.x} cy={pos.y} r={3.5} fill={sc[pos.s]}/>
                  <text x={pos.x} y={pos.y+20} textAnchor="middle" fontSize="8" fontFamily="JetBrains Mono" fill={C.textSub}>{id}</text>
                </g>
              ))}

              <text x={630} y={335} fontSize="11" fill={C.slate} fontFamily="Inter">N ↑</text>
            </svg>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
            <SH title="Resumo" />
            {[["Total","10",C.steel],["Normais","5",C.green],["Atenção","3",C.yellow],["Críticos","1",C.red],["Offline","1",C.slate]].map(([l,v,c])=>(
              <div key={l} className="flex justify-between py-1.5 text-[11px]">
                <span style={{ color:C.slate }}>{l}</span>
                <span className="font-bold font-mono" style={{ color:c as string }}>{v}</span>
              </div>
            ))}
          </div>
          <div className="rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
            <SH title="Ativos" />
            {ASSETS.map(a=>(
              <button key={a.id} onClick={()=>nav("ativo-overview")} className="w-full flex items-center gap-2 p-1.5 rounded-md transition-all hover:bg-[#112035] mb-1">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background:sc[a.status] }}/>
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-[11px] truncate" style={{ color:C.text }}>{a.nome}</div>
                  <div className="text-[10px] font-mono" style={{ color:C.slate }}>{a.id}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </L>
  );
}

// 16. Governança ──────────────────────────────────────────────────────────────
function Governanca({ nav }: { nav: Nav }) {
  return (
    <L cur="governanca" nav={nav} bc={["Governança","Visão Geral"]}>
      <div className="grid grid-cols-4 gap-3">
        <KPI label="Documentos Aprovados" val="142" sub="89% do total"    icon={FileText}     color={C.green}  />
        <KPI label="Em Revisão"           val="18"  sub="Ação necessária" icon={Clock}         color={C.yellow} />
        <KPI label="Pendentes"            val="23"  sub="Sem documentação"icon={AlertCircle}   color={C.red}    />
        <KPI label="Conformidade Geral"   val="87%" sub="Meta: 95%"       icon={Target}        color={C.steel}  />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { l:"Hierarquia de Ativos",         d:"Estrutura empresa > planta > área > ativo",      I:GitBranch, p:"hierarquia"  as Page, c:C.cobalt  },
          { l:"Matriz D-I-C-I",               d:"Ciclo de vida documental de cada ativo",          I:Layers,    p:"dici"        as Page, c:C.steel   },
          { l:"Dicionário de Rastreabilidade",d:"Definições, unidades e limites de sensores",      I:BookOpen,  p:"dicionario"  as Page, c:C.slate   },
          { l:"Permissões RBAC",              d:"Usuários, papéis e controle de acesso",           I:Key,       p:"rbac"        as Page, c:C.green   },
          { l:"Rastreabilidade / Auditoria",  d:"Trilha completa de eventos e alterações",         I:Hash,      p:"dicionario"  as Page, c:C.yellow  },
          { l:"Configurações do Sistema",     d:"Parâmetros globais da plataforma Predicta",       I:Settings,  p:"governanca"  as Page, c:C.slate   },
        ].map(item=>(
          <button key={item.l} onClick={()=>nav(item.p)}
            className="text-left p-4 rounded-lg transition-all group"
            style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
            <div className="w-9 h-9 rounded-xl mb-3 flex items-center justify-center" style={{ background:`${item.c}1A`, border:`1px solid ${item.c}30` }}>
              <item.I size={16} style={{ color:item.c }} />
            </div>
            <div className="text-[13px] font-bold mb-1 transition-colors group-hover:text-[#82C8E5]" style={{ fontFamily:"'Rajdhani',sans-serif", color:C.text }}>{item.l}</div>
            <div className="text-[11px]" style={{ color:C.slate }}>{item.d}</div>
          </button>
        ))}
      </div>

      {/* Compliance bars */}
      <div className="rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
        <SH title="Conformidade por Planta" />
        <div className="space-y-3">
          {[
            { p:"Planta Norte",   tot:89, ap:79, rv:6,  pnd:4,  pct:89 },
            { p:"Planta Sul",     tot:42, ap:37, rv:3,  pnd:2,  pct:88 },
            { p:"Planta Geração", tot:32, ap:26, rv:4,  pnd:2,  pct:81 },
          ].map(p=>(
            <div key={p.p} className="flex items-center gap-4">
              <div className="w-28 text-[12px]" style={{ color:C.textSub }}>{p.p}</div>
              <div className="flex-1 flex gap-0.5 h-3 rounded overflow-hidden" style={{ background:C.bgDeep }}>
                <div style={{ width:`${(p.ap/p.tot)*100}%`, background:"rgba(52,211,153,0.65)" }} />
                <div style={{ width:`${(p.rv/p.tot)*100}%`, background:"rgba(251,191,36,0.65)" }} />
                <div style={{ width:`${(p.pnd/p.tot)*100}%`, background:"rgba(109,129,150,0.35)" }} />
              </div>
              <span className="text-[14px] font-bold w-12 text-right font-mono" style={{ fontFamily:"'Rajdhani',sans-serif", color:p.pct>=88?C.green:p.pct>=80?C.yellow:C.red }}>{p.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </L>
  );
}

// 17. Hierarquia ──────────────────────────────────────────────────────────────
type HNode = { id:string; l:string; tp:string; kids:HNode[] };
const HTREE: HNode[] = [{
  id:"EMP-001", l:"Forzy Indústria S.A.", tp:"Empresa", kids:[{
    id:"PLT-N", l:"Planta Norte", tp:"Planta", kids:[
      { id:"ARE-BOM", l:"Bombeamento", tp:"Área", kids:[
        { id:"SIS-B1", l:"Sistema de Recalque #1", tp:"Sistema", kids:[
          { id:"BCP-01", l:"Bomba BCP-01", tp:"Ativo", kids:[] },
          { id:"BCP-02", l:"Bomba BCP-02", tp:"Ativo", kids:[] },
        ]},
      ]},
      { id:"ARE-PRD", l:"Produção A", tp:"Área", kids:[
        { id:"ME-07", l:"Motor ME-07", tp:"Ativo", kids:[] },
      ]},
    ],
  },{
    id:"PLT-S", l:"Planta Sul", tp:"Planta", kids:[] },
  ]
}];

function HiNode({ n, depth, nav }: { n:HNode; depth:number; nav:Nav }) {
  const [open, setOpen] = useState(depth<3);
  const typeI: Record<string,any> = { Empresa:Building2, Planta:Map, Área:Layers, Sistema:Network, Ativo:Cpu };
  const typeC: Record<string,string> = { Empresa:C.steel, Planta:C.cobalt, Área:C.slate, Sistema:C.textSub, Ativo:C.green };
  const I = typeI[n.tp]||Cpu; const col = typeC[n.tp]||C.slate;
  return (
    <div>
      <div className={`flex items-center gap-2 py-1.5 rounded-md transition-all cursor-pointer hover:bg-[#112035] group`}
        style={{ paddingLeft:`${depth*18+8}px` }}
        onClick={()=>n.kids.length?setOpen(o=>!o):nav("ativo-overview")}>
        {n.kids.length
          ? <span style={{ color:C.slate }}>{open?<ChevronDown size={12}/>:<ChevronRight size={12}/>}</span>
          : <span className="w-3"/>
        }
        <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{ background:`${col}1A` }}>
          <I size={10} style={{ color:col }} />
        </div>
        <span className="text-[12px] flex-1" style={{ color:C.text }}>{n.l}</span>
        <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity mr-2" style={{ color:C.slate }}>{n.tp}</span>
      </div>
      {open && n.kids.map(k=><HiNode key={k.id} n={k} depth={depth+1} nav={nav}/>)}
    </div>
  );
}

function Hierarquia({ nav }: { nav: Nav }) {
  return (
    <L cur="hierarquia" nav={nav} bc={["Governança","Hierarquia"]}
      right={<IBtn icon={PlusCircle} label="Adicionar nó" />}
    >
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
          <SH title="Árvore de Hierarquia — Forzy Indústria S.A."
            right={
              <div className="relative">
                <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color:C.slate }}/>
                <input placeholder="Buscar nó..." className="pl-8 pr-3 py-1.5 text-xs rounded-md focus:outline-none w-36" style={{ background:C.bgDeep, border:`1px solid ${C.border}`, color:C.text }}/>
              </div>
            }
          />
          {HTREE.map(n=><HiNode key={n.id} n={n} depth={0} nav={nav}/>)}
        </div>
        <div className="space-y-3">
          <div className="rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
            <SH title="Legenda" />
            {[["Empresa",Building2,C.steel],["Planta",Map,C.cobalt],["Área",Layers,C.slate],["Sistema",Network,C.textSub],["Ativo",Cpu,C.green]].map(([tp,I,c]:any[])=>(
              <div key={tp} className="flex items-center gap-2 mb-2.5">
                <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background:`${c}1A`}}><I size={11} style={{ color:c }}/></div>
                <span className="text-[12px]" style={{ color:C.textSub }}>{tp}</span>
              </div>
            ))}
          </div>
          <div className="rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
            <SH title="Totais" />
            {[["Empresas","1"],["Plantas","3"],["Áreas","8"],["Sistemas","12"],["Ativos","247"]].map(([k,v])=>(
              <div key={k} className="flex justify-between py-1.5 text-[11px]" style={{ borderBottom:`1px solid ${C.border}40` }}>
                <span style={{ color:C.slate }}>{k}</span>
                <span className="font-bold font-mono" style={{ color:C.steel }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </L>
  );
}

// 18. D-I-C-I ─────────────────────────────────────────────────────────────────
function DICIScreen({ nav }: { nav: Nav }) {
  const si: Record<string,any> = { aprovado:CheckCircle2, em_revisao:Clock, pendente:AlertCircle };
  const sc: Record<string,string> = { aprovado:C.green, em_revisao:C.yellow, pendente:C.slate };
  return (
    <L cur="dici" nav={nav} bc={["Governança","Matriz D-I-C-I"]} right={<IBtn icon={Download} label="Exportar"/>}>
      <div className="flex items-start gap-2 p-3 rounded-lg mb-1" style={{ background:`${C.cobalt}0C`, border:`1px solid ${C.cobalt}28` }}>
        <Info size={13} style={{ color:C.steel }} className="flex-shrink-0 mt-0.5"/>
        <p className="text-[12px]" style={{ color:C.textSub }}>
          <strong style={{ color:C.steel }}>D-I-C-I:</strong> ciclo de vida documental —
          <span style={{ color:C.steel, fontFamily:"'JetBrains Mono',monospace" }}> D</span> Desenho &nbsp;·&nbsp;
          <span style={{ color:C.steel, fontFamily:"'JetBrains Mono',monospace" }}>I</span> Instalação &nbsp;·&nbsp;
          <span style={{ color:C.steel, fontFamily:"'JetBrains Mono',monospace" }}>C</span> Comissionamento &nbsp;·&nbsp;
          <span style={{ color:C.steel, fontFamily:"'JetBrains Mono',monospace" }}>I</span> Inspeção
        </p>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4">
        {["Desenho","Instalação","Comissionamento","Inspeção"].map((f,fi)=>{
          const keys = ["D","I","C","In"] as const;
          const counts = DICI.reduce((acc,item)=>{ const v=item[keys[fi]]; acc[v]=(acc[v]||0)+1; return acc; },{}as Record<string,number>);
          return (
            <div key={f} className="rounded-lg p-3" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
              <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color:C.slate }}>{f}</div>
              <div className="flex items-center gap-3 text-[11px]">
                <CheckCircle2 size={11} style={{ color:C.green }}/><span style={{ color:C.green, fontFamily:"'JetBrains Mono',monospace" }}>{counts.aprovado||0}</span>
                <Clock size={11} style={{ color:C.yellow }}/><span style={{ color:C.yellow, fontFamily:"'JetBrains Mono',monospace" }}>{counts.em_revisao||0}</span>
                <AlertCircle size={11} style={{ color:C.slate }}/><span style={{ color:C.slate, fontFamily:"'JetBrains Mono',monospace" }}>{counts.pendente||0}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-lg overflow-hidden" style={{ border:`1px solid ${C.border}` }}>
        <table className="w-full" style={{ background:C.bgCard }}>
          <thead style={{ borderBottom:`1px solid ${C.border}` }}>
            <tr>
              <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color:C.slate }}>Ativo</th>
              {["D — Desenho","I — Instalação","C — Comissionamento","I — Inspeção"].map(h=>(
                <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.15em] text-center" style={{ color:C.slate }}>{h}</th>
              ))}
              <th className="px-4 py-3"/>
            </tr>
          </thead>
          <tbody>
            {DICI.map((item,i)=>(
              <tr key={item.id} className="transition-all hover:bg-[#112035]"
                style={{ borderBottom:`1px solid ${C.border}40`, background:i%2===1?"rgba(12,24,41,0.5)":undefined }}>
                <td className="px-4 py-3">
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", color:C.steel, fontSize:11 }}>{item.id}</div>
                  <div className="text-[10px]" style={{ color:C.slate }}>{item.nome}</div>
                </td>
                {([item.D,item.I,item.C,item.In] as string[]).map((s,si)=>{
                  const I2=si[s]; return (
                    <td key={si} className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-1.5">
                        {s==="aprovado"?<CheckCircle2 size={14} style={{ color:sc[s] }}/>:s==="em_revisao"?<Clock size={14} style={{ color:sc[s] }}/>:<AlertCircle size={14} style={{ color:sc[s] }}/>}
                        <Badge s={s} />
                      </div>
                    </td>
                  );
                })}
                <td className="px-4 py-3"><button style={{ color:C.slate }}><MoreHorizontal size={12}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </L>
  );
}

// 19. Dicionário ───────────────────────────────────────────────────────────────
function Dicionario({ nav }: { nav: Nav }) {
  return (
    <L cur="dicionario" nav={nav} bc={["Governança","Dicionário de Rastreabilidade"]}
      right={<div className="flex gap-2"><IBtn icon={PlusCircle} label="Nova entrada"/><IBtn icon={Download} label="Exportar"/></div>}
    >
      <div className="flex items-center gap-3 mb-1">
        <div className="relative flex-1 max-w-sm">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:C.slate }}/>
          <input placeholder="Buscar campo, sensor, unidade..." className="w-full pl-9 pr-3 py-2 text-xs rounded-md focus:outline-none" style={{ background:C.bgCard, border:`1px solid ${C.border}`, color:C.text }}/>
        </div>
        {["Todas as grandezas","Todos os tipos"].map((o,i)=>(
          <select key={i} className="px-3 py-2 text-xs rounded-md focus:outline-none" style={{ background:C.bgCard, border:`1px solid ${C.border}`, color:C.text }}><option>{o}</option></select>
        ))}
      </div>

      <div className="rounded-lg overflow-hidden" style={{ border:`1px solid ${C.border}` }}>
        <table className="w-full" style={{ background:C.bgCard }}>
          <thead style={{ borderBottom:`1px solid ${C.border}` }}>
            <tr>
              {["ID Tag","Campo / Grandeza","Tipo","Unidade","Faixa Operacional","Limite Crítico","Aplicável a","Sensor"].map(h=>(
                <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color:C.slate }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DICT.map((d,i)=>(
              <tr key={d.id} className="transition-all hover:bg-[#112035]"
                style={{ borderBottom:`1px solid ${C.border}40`, background:i%2===1?"rgba(12,24,41,0.5)":undefined }}>
                <td className="px-4 py-3"><span style={{ fontFamily:"'JetBrains Mono',monospace", color:C.steel, fontSize:10 }}>{d.id}</span></td>
                <td className="px-4 py-3 text-[12px] font-medium" style={{ color:C.text }}>{d.campo}</td>
                <td className="px-4 py-3"><span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background:`${C.steel}12`, color:C.steel }}>{d.tipo}</span></td>
                <td className="px-4 py-3 text-[11px] font-mono" style={{ color:C.textSub }}>{d.un}</td>
                <td className="px-4 py-3 text-[11px] font-mono" style={{ color:C.slate }}>{d.faixa}</td>
                <td className="px-4 py-3 text-[11px] font-mono" style={{ color:C.red }}>{d.crit}</td>
                <td className="px-4 py-3 text-[11px]" style={{ color:C.slate }}>{d.ativo}</td>
                <td className="px-4 py-3 text-[11px]" style={{ color:C.textSub }}>{d.sensor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </L>
  );
}

// 20. RBAC ────────────────────────────────────────────────────────────────────
function RBACScreen({ nav }: { nav: Nav }) {
  const PI: Record<string,any> = { full:<CheckCircle2 size={13} style={{ color:C.green }}/>, read:<Eye size={13} style={{ color:C.steel }}/>, none:<XCircle size={13} style={{ color:`${C.slate}50` }}/> };
  return (
    <L cur="rbac" nav={nav} bc={["Governança","Permissões RBAC"]}
      right={<div className="flex gap-2"><IBtn icon={PlusCircle} label="Novo usuário"/><IBtn icon={Settings} label="Papéis"/></div>}
    >
      {/* Users */}
      <div className="rounded-lg overflow-hidden mb-4" style={{ border:`1px solid ${C.border}` }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom:`1px solid ${C.border}`, background:C.bgCard }}>
          <span className="text-[12px] font-bold uppercase tracking-widest" style={{ fontFamily:"'Rajdhani',sans-serif", color:C.text }}>Usuários ({USERS.length})</span>
          <div className="relative">
            <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color:C.slate }}/>
            <input placeholder="Buscar..." className="pl-8 pr-3 py-1.5 text-xs rounded-md focus:outline-none w-40" style={{ background:C.bgDeep, border:`1px solid ${C.border}`, color:C.text }}/>
          </div>
        </div>
        <table className="w-full" style={{ background:C.bgCard }}>
          <thead style={{ borderBottom:`1px solid ${C.border}` }}>
            <tr>
              {["Usuário","Papel","Status","Último Acesso","Módulos",""].map(h=>(
                <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color:C.slate }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {USERS.map((u,i)=>(
              <tr key={u.id} className="transition-all hover:bg-[#112035]"
                style={{ borderBottom:`1px solid ${C.border}40`, background:i%2===1?"rgba(12,24,41,0.5)":undefined }}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                      style={{ background:`linear-gradient(135deg,${C.cobalt},${C.navy})` }}>
                      {u.nome.split(" ").map((n:string)=>n[0]).slice(0,2).join("")}
                    </div>
                    <div>
                      <div className="text-[12px] font-medium" style={{ color:C.text }}>{u.nome}</div>
                      <div className="text-[10px]" style={{ color:C.slate }}>{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-[11px]" style={{ color:C.textSub }}>{u.papel}</td>
                <td className="px-4 py-3"><Badge s={u.status}/></td>
                <td className="px-4 py-3 text-[11px] font-mono" style={{ color:C.slate }}>{u.acesso}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {u.mods.slice(0,3).map((m:string)=><span key={m} className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background:`${C.cobalt}18`,color:C.steel,border:`1px solid ${C.cobalt}30`}}>{m}</span>)}
                    {u.mods.length>3&&<span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background:`${C.slate}18`,color:C.slate,border:`1px solid ${C.border}`}}>+{u.mods.length-3}</span>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button className="p-1 rounded hover:bg-[#0A1525]" style={{ color:C.slate }}><Settings size={12}/></button>
                    <button className="p-1 rounded hover:bg-[#0A1525]" style={{ color:C.slate }}><Lock size={12}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Permissions matrix */}
      <div className="rounded-lg overflow-hidden" style={{ border:`1px solid ${C.border}` }}>
        <div className="px-4 py-3" style={{ borderBottom:`1px solid ${C.border}`, background:C.bgCard }}>
          <span className="text-[12px] font-bold uppercase tracking-widest" style={{ fontFamily:"'Rajdhani',sans-serif", color:C.text }}>Matriz de Permissões por Papel</span>
        </div>
        <div className="overflow-x-auto" style={{ background:C.bgCard }}>
          <table className="w-full">
            <thead style={{ borderBottom:`1px solid ${C.border}` }}>
              <tr>
                <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.15em] w-40" style={{ color:C.slate }}>Papel</th>
                {MODS.map(m=><th key={m} className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-center" style={{ color:C.slate }}>{m}</th>)}
              </tr>
            </thead>
            <tbody>
              {ROLES.map((r,i)=>(
                <tr key={r} style={{ borderBottom:`1px solid ${C.border}40`, background:i%2===1?"rgba(12,24,41,0.5)":undefined }}>
                  <td className="px-4 py-2.5 text-[12px] font-medium" style={{ color:C.textSub }}>{r}</td>
                  {MODS.map(m=><td key={m} className="px-3 py-2.5 text-center">{PI[PERM[r]?.[m]||"none"]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-5 px-4 py-3 text-[11px]" style={{ borderTop:`1px solid ${C.border}`, background:C.bgCard, color:C.slate }}>
          <span className="flex items-center gap-1.5"><CheckCircle2 size={11} style={{ color:C.green }}/> Acesso total</span>
          <span className="flex items-center gap-1.5"><Eye size={11} style={{ color:C.steel }}/> Somente leitura</span>
          <span className="flex items-center gap-1.5"><XCircle size={11} style={{ color:`${C.slate}50` }}/> Sem acesso</span>
        </div>
      </div>
    </L>
  );
}

// ── Screen map ────────────────────────────────────────────────────────────────
type Section = { label: string; pages: { p: Page; l: string }[] };
const SECTIONS: Section[] = [
  { label:"Acesso",    pages:[{ p:"login",            l:"Login"                  }]},
  { label:"Operação",  pages:[{ p:"dashboard",         l:"Dashboard"              },{ p:"operacional",       l:"Painel Operacional"     }]},
  { label:"Ativos",    pages:[{ p:"ativos",            l:"Lista de Ativos"        },{ p:"ativo-overview",    l:"Ativo — Visão Geral"    },{ p:"ativo-telemetria",  l:"Ativo — Telemetria"    },{ p:"ativo-saude",       l:"Ativo — Saúde & IA"    },{ p:"ativo-tecnico",     l:"Ativo — Dados Técnicos"}]},
  { label:"Alertas",   pages:[{ p:"alertas",           l:"Lista de Alertas"       },{ p:"alerta-detalhe",    l:"Detalhe do Alerta"      }]},
  { label:"Assistente",pages:[{ p:"assistente",        l:"Assistente"             },{ p:"assistente-ativo",  l:"Assistente — BCP-01"    }]},
  { label:"Cadastro",  pages:[{ p:"cadastro-manual",   l:"Cadastro Manual"        },{ p:"cadastro-ocr",      l:"Leitura OCR"            },{ p:"mapa-planta",       l:"Mapa da Planta"         }]},
  { label:"Governança",pages:[{ p:"governanca",        l:"Governança"             },{ p:"hierarquia",        l:"Hierarquia"             },{ p:"dici",              l:"Matriz D-I-C-I"         },{ p:"dicionario",        l:"Dicionário"             },{ p:"rbac",              l:"RBAC"                   }]},
];

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState<Page>("login");
  const nav: Nav = p => setPage(p);

  const render = () => {
    switch(page) {
      case "login":            return <LoginScreen nav={nav} />;
      case "dashboard":        return <DashboardScreen nav={nav} />;
      case "operacional":      return <PainelScreen nav={nav} />;
      case "ativos":           return <ListaAtivos nav={nav} />;
      case "ativo-overview":
      case "ativo-telemetria":
      case "ativo-saude":
      case "ativo-tecnico":    return <AtivoDetail page={page} nav={nav} />;
      case "alertas":          return <ListaAlertas nav={nav} />;
      case "alerta-detalhe":   return <DetalheAlerta nav={nav} />;
      case "assistente":
      case "assistente-ativo": return <Assistente page={page} nav={nav} />;
      case "cadastro-manual":  return <CadastroManual nav={nav} />;
      case "cadastro-ocr":     return <OCRScreen nav={nav} />;
      case "mapa-planta":      return <MapaPlanta nav={nav} />;
      case "governanca":       return <Governanca nav={nav} />;
      case "hierarquia":       return <Hierarquia nav={nav} />;
      case "dici":             return <DICIScreen nav={nav} />;
      case "dicionario":       return <Dicionario nav={nav} />;
      case "rbac":             return <RBACScreen nav={nav} />;
      default:                 return <DashboardScreen nav={nav} />;
    }
  };

  return (
    <div className="w-full h-screen flex flex-col overflow-hidden" style={{ background:C.bgDeep, fontFamily:"'Inter',system-ui,sans-serif" }}>
      {/* Navigator strip */}
      <div className="flex-shrink-0 flex items-center gap-0 px-3 py-1 overflow-x-auto" style={{ background:"#030A13", borderBottom:`1px solid ${C.border}`, minHeight:32 }}>
        <div className="flex items-center gap-2 mr-3 flex-shrink-0">
          <div className="w-4 h-4 rounded flex items-center justify-center" style={{ background:`linear-gradient(135deg,${C.cobalt},${C.navy})` }}>
            <Target size={9} className="text-white"/>
          </div>
          <span className="text-[9px] font-bold tracking-[0.2em] uppercase" style={{ color:C.slate }}>Wireframes</span>
        </div>
        {SECTIONS.map(sec=>(
          <div key={sec.label} className="flex items-center flex-shrink-0 mr-1.5">
            <span className="hidden xl:block text-[9px] tracking-widest uppercase mr-1" style={{ color:`${C.slate}50` }}>{sec.label}:</span>
            {sec.pages.map(({ p, l })=>(
              <button key={p} onClick={()=>nav(p)}
                className="px-2 py-0.5 text-[9px] rounded mx-0.5 flex-shrink-0 transition-all font-medium"
                style={page===p?{ background:C.cobalt, color:"white" }:{ color:C.slate }}>
                {l}
              </button>
            ))}
            <div className="w-px h-3 mx-1" style={{ background:`${C.border}` }}/>
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">{render()}</div>
    </div>
  );
}
