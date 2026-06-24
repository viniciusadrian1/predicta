// ── Governança embutida — micro-padrões reutilizáveis ────────────────────────
// A governança vive DENTRO das telas como componentes, não como um módulo isolado:
//  · HierarchyBreadcrumb → Matriz de Hierarquia (breadcrumb clicável)
//  · TraceableValue       → Dicionário de Rastreabilidade (origem do número, sob demanda)
//  · AIConfidence         → IA governada (valor+horizonte+confiança+explicação+honestidade)
//  · GatedButton          → RBAC (ação restrita com motivo, em vez de sumir/quebrar)
//  · OriginBadge          → procedência (regra·dicionário / modelo IA / manual / OCR)
import type { ReactNode, CSSProperties, MouseEvent } from "react";
import { useNavigate } from "react-router";
import { ChevronRight, ShieldCheck, Lock, Cpu, BookText, Hand, ScanLine } from "lucide-react";
import { C } from "@/lib/theme";
import { useStore } from "@/store/useStore";
import { useCan } from "@/auth/rbac";
import type { TagKey, PermLevel, Criticidade } from "@/lib/types";

// ── HierarchyBreadcrumb ───────────────────────────────────────────────────────
export interface Crumb { label: string; to?: string }

export function HierarchyBreadcrumb({ items }: { items: Crumb[] }) {
  const navigate = useNavigate();
  return (
    <div className="flex items-center gap-1 text-[11px] flex-wrap" style={{ color: C.slate }}>
      {items.map((c, i) => {
        const last = i === items.length - 1;
        return (
          <span key={`${c.label}-${i}`} className="flex items-center gap-1">
            {i > 0 && <ChevronRight size={11} style={{ color: `${C.slate}70` }} />}
            {c.to && !last ? (
              <button onClick={() => navigate(c.to!)} className="hover:brightness-125 transition-all" style={{ color: C.slate }}>{c.label}</button>
            ) : (
              <span style={{ color: last ? C.steel : C.slate, fontWeight: last ? 600 : 400 }}>{c.label}</span>
            )}
          </span>
        );
      })}
    </div>
  );
}

// Build the empresa → planta → área → ativo chain from an asset.
export const assetCrumb = (a: { planta: string; area: string; id: string; nome?: string }): Crumb[] => [
  { label: "Forzy" },
  { label: a.planta, to: "/mapa" },
  { label: a.area, to: "/ativos" },
  { label: a.id },
];

// ── TraceableValue ────────────────────────────────────────────────────────────
// Wraps a number; on hover reveals its Dicionário origin (campo/unidade/faixa/limite/sensor).
export function TraceableValue({ tagKey, children }: { tagKey: TagKey; children: ReactNode }) {
  const tag = useStore((s) => s.dictionary.find((t) => t.key === tagKey));
  if (!tag) return <span>{children}</span>;
  const op = tag.direcao === "acima" ? ">" : "<";
  return (
    <span className="relative group inline-flex items-center">
      <span className="cursor-help underline decoration-dotted decoration-1 underline-offset-2" style={{ textDecorationColor: `${C.steel}80` }}>{children}</span>
      <span className="absolute left-0 top-full mt-1 z-40 hidden group-hover:block whitespace-nowrap text-[10px] p-2.5 rounded-md leading-relaxed"
        style={{ background: C.bgDeep, border: `1px solid ${C.border}`, color: C.textSub, boxShadow: "0 6px 20px rgba(0,0,0,0.45)" }}>
        <div className="font-bold mb-1" style={{ color: C.steel }}>{tag.campo}</div>
        <div>Unidade <span className="font-mono" style={{ color: C.text }}>{tag.un}</span> · Faixa <span className="font-mono" style={{ color: C.text }}>{tag.faixaMin}–{tag.faixaMax}</span></div>
        <div>Alerta {op} <span className="font-mono" style={{ color: C.yellow }}>{tag.limiteAlerta}</span> · Crítico {op} <span className="font-mono" style={{ color: C.red }}>{tag.limiteCritico}</span></div>
        <div>Sensor {tag.sensor}</div>
        <div className="mt-1 opacity-70">Origem: Dicionário · tag <span className="font-mono">{tag.id}</span></div>
      </span>
    </span>
  );
}

// ── AIConfidence ──────────────────────────────────────────────────────────────
const CONF: Record<string, { bg: string; fg: string; label: string }> = {
  alta:  { bg: "rgba(52,211,153,0.12)", fg: C.green,  label: "Confiança alta" },
  media: { bg: "rgba(251,191,36,0.12)", fg: C.yellow, label: "Confiança média" },
  baixa: { bg: "rgba(248,113,113,0.12)", fg: C.red,   label: "Confiança baixa" },
};

export function AIConfidence({
  confianca, horizonte, explicacao, simulado = true, compact = false,
}: { confianca: "alta" | "media" | "baixa"; horizonte?: string; explicacao?: string; simulado?: boolean; compact?: boolean }) {
  const c = CONF[confianca] ?? CONF.media;
  return (
    <div className={compact ? "inline-flex items-center gap-1.5 flex-wrap" : "flex flex-col gap-1.5"}>
      <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded w-fit" style={{ background: c.bg, color: c.fg }}>
        <ShieldCheck size={9} /> {c.label}{horizonte ? ` · ${horizonte}` : ""}
      </span>
      {explicacao && !compact && <span className="text-[10px]" style={{ color: C.slate }}>{explicacao}</span>}
      {simulado && (
        <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded w-fit" style={{ background: `${C.slate}1A`, color: C.slate, border: `1px solid ${C.border}` }}
          title="Predição de um modelo de degradação SIMULADO (físico-informado + Weibull), não treinado em falhas reais.">
          ⚠ Modelo simulado
        </span>
      )}
    </div>
  );
}

// ── GatedButton ───────────────────────────────────────────────────────────────
export function GatedButton({
  modulo, nivel = "full", onClick, children, className = "", style, title,
}: { modulo: string; nivel?: PermLevel; onClick?: () => void; children: ReactNode; className?: string; style?: CSSProperties; title?: string }) {
  const allowed = useCan(modulo, nivel);
  const handle = (e: MouseEvent) => { e.stopPropagation(); if (allowed) onClick?.(); };
  return (
    <button
      disabled={!allowed}
      onClick={handle}
      title={allowed ? title : `Sem permissão — requer ${modulo} = ${nivel}`}
      className={`${className} ${allowed ? "" : "opacity-50 cursor-not-allowed"}`}
      style={style}
    >
      {!allowed && <Lock size={11} className="inline mr-1 -mt-0.5" />}
      {children}
    </button>
  );
}

// ── OriginBadge ───────────────────────────────────────────────────────────────
const ORIGIN = {
  regra:  { label: "Regra · Dicionário", color: C.steel,  icon: BookText },
  modelo: { label: "Modelo IA",          color: C.cobalt, icon: Cpu },
  manual: { label: "Manual",             color: C.slate,  icon: Hand },
  ocr:    { label: "OCR da placa",       color: C.steel,  icon: ScanLine },
} as const;

export function OriginBadge({ origem }: { origem: "regra" | "modelo" | "manual" | "ocr" }) {
  const m = ORIGIN[origem] ?? ORIGIN.manual;
  const I = m.icon;
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: `${m.color}1A`, color: m.color, border: `1px solid ${m.color}40` }}>
      <I size={9} /> {m.label}
    </span>
  );
}

// Criticidade badge (governance: asset criticality is part of its identity).
const CRIT: Record<string, string> = { Baixa: C.slate, "Média": C.steel, Alta: C.orange, "Crítica": C.red };
export function CritBadge({ crit }: { crit: Criticidade | string }) {
  const color = CRIT[crit] ?? C.slate;
  return <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: `${color}1A`, color, border: `1px solid ${color}40` }}>{crit}</span>;
}
