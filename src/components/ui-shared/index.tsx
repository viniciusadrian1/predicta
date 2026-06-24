// ── Shared appearance primitives ──────────────────────────────────────────────
// Moved verbatim from App.tsx: Badge, SevBadge, Bar_, KPI, SH, TT_, BC, IBtn.
// These define the Predicta look (badges, cards, section headers, chart tooltip,
// breadcrumb, icon buttons). Keep visuals identical — only imports changed.

import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { C } from "@/lib/theme";

export function Badge({ s }: { s: string }) {
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

export function SevBadge({ s }: { s: string }) {
  const m: Record<string,string> = {
    critico:"bg-red-400/10 text-red-400 border border-red-400/25",
    alto:"bg-orange-400/10 text-orange-400 border border-orange-400/25",
    medio:"bg-yellow-400/10 text-yellow-400 border border-yellow-400/25",
    baixo:"bg-slate-500/15 text-slate-400 border border-slate-500/25",
  };
  const lbl: Record<string,string> = { critico:"Crítico",alto:"Alto",medio:"Médio",baixo:"Baixo" };
  return <span style={{ fontFamily:"'JetBrains Mono',monospace" }} className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-medium ${m[s]}`}>{lbl[s]}</span>;
}

export function Bar_({ v }: { v: number }) {
  const col = v >= 75 ? "#34D399" : v >= 50 ? "#FBBF24" : "#F87171";
  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background:"rgba(130,200,229,0.08)" }}>
      <div className="h-full rounded-full transition-all" style={{ width:`${v}%`, background:col }} />
    </div>
  );
}

export function KPI({ label, val, sub, icon: I, color = C.steel }: { label:string;val:string;sub?:string;icon:any;color?:string }) {
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

export function SH({ title, right }: { title:string; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ fontFamily:"'Rajdhani',sans-serif", color:C.slate }}>{title}</h3>
      {right}
    </div>
  );
}

export function TT_({ active, payload, label }: any) {
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

export function BC({ items }: { items: string[] }) {
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

export function IBtn({ icon: I, label, onClick, variant="ghost" }: { icon:any;label?:string;onClick?:()=>void;variant?:"ghost"|"primary"|"danger" }) {
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
