// ── Sidebar ───────────────────────────────────────────────────────────────────
// Same look as the original, but nav items are real <NavLink>s driving the URL.
// The active highlight comes from the router. The alerts badge reflects the real
// count of non-resolved alerts (seed for now; store-driven in Phase 1).

import { NavLink, useLocation } from "react-router";
import {
  LayoutDashboard, Activity, Cpu, Map, Bell, MessageSquare,
  PlusCircle, ScanLine, SlidersHorizontal, GitBranch, Layers, BookOpen,
  Key, Settings, Boxes, History, ClipboardList,
} from "lucide-react";
import { C } from "@/lib/theme";
import { PredictaMark } from "@/components/brand/Logo";
import { useOpenAlertCount } from "@/store/hooks";
import { useStore } from "@/store/useStore";
import { permLevel } from "@/auth/rbac";
import { useSession, initials } from "@/auth/useAuth";

// Each item carries a `match(pathname)` so the active highlight is exact even when
// the URL differs from `to`, plus a `modulo` used for RBAC gating.
type Item = { l: string; i: any; to: string; modulo: string; badge?: boolean; match: (p: string) => boolean };
const exact = (path: string) => (p: string) => p === path;
const NAV: { sec: string; items: Item[] }[] = [
  { sec:"OPERAÇÃO", items:[
    { l:"Dashboard",          i:LayoutDashboard, to:"/dashboard",   modulo:"Dashboard", match: exact("/dashboard") },
    { l:"Painel Operacional", i:Activity,        to:"/operacional", modulo:"Dashboard", match: exact("/operacional") },
  ]},
  { sec:"ATIVOS", items:[
    { l:"Lista de Ativos", i:Cpu,   to:"/ativos", modulo:"Ativos", match: (p)=> p.startsWith("/ativos") && !p.endsWith("/gemeo") },
    { l:"Gêmeo Digital",   i:Boxes, to:"/gemeo",  modulo:"Ativos", match: (p)=> p === "/gemeo" || p.endsWith("/gemeo") },
    { l:"Mapa da Planta",  i:Map,   to:"/mapa",   modulo:"Mapa",   match: exact("/mapa") },
  ]},
  { sec:"ALERTAS & MANUTENÇÃO", items:[
    { l:"Alertas", i:Bell, to:"/alertas", modulo:"Alertas", badge:true, match: (p)=> p.startsWith("/alertas") },
    { l:"Ordens de Serviço", i:ClipboardList, to:"/ordens", modulo:"Alertas", match: exact("/ordens") },
  ]},
  { sec:"ASSISTENTE", items:[
    { l:"Assistente IA", i:MessageSquare, to:"/assistente", modulo:"Assistente", match: (p)=> p.startsWith("/assistente") },
  ]},
  { sec:"CADASTRO", items:[
    { l:"Cadastro Manual", i:PlusCircle, to:"/cadastro",     modulo:"Cadastro", match: exact("/cadastro") },
    { l:"Leitura OCR",     i:ScanLine,   to:"/cadastro/ocr", modulo:"OCR",      match: exact("/cadastro/ocr") },
  ]},
  // Administração: a governança não é um módulo isolado — aqui ficam as funções de
  // administração da operação (acessos, estrutura, catálogo, ciclo, auditoria).
  { sec:"ADMINISTRAÇÃO", items:[
    { l:"Visão Geral",         i:SlidersHorizontal, to:"/admin",            modulo:"Governança", match: exact("/admin") },
    { l:"Acessos",             i:Key,               to:"/admin/acessos",    modulo:"RBAC",       match: exact("/admin/acessos") },
    { l:"Estrutura da Planta", i:GitBranch,         to:"/admin/estrutura",  modulo:"Governança", match: exact("/admin/estrutura") },
    { l:"Catálogo",            i:BookOpen,          to:"/admin/catalogo",   modulo:"Governança", match: exact("/admin/catalogo") },
    { l:"Ciclo do Ativo",      i:Layers,            to:"/admin/ciclo",      modulo:"Governança", match: exact("/admin/ciclo") },
    { l:"Auditoria",           i:History,           to:"/admin/auditoria",  modulo:"Governança", match: exact("/admin/auditoria") },
  ]},
];

export function Sidebar() {
  const openCount = useOpenAlertCount();
  const { pathname } = useLocation();
  const rbac = useStore((s) => s.rbac);
  const session = useSession();
  const visible = (m: string) => permLevel(rbac, session.papel, m) !== "none";
  return (
    <aside className="w-[220px] h-full flex flex-col flex-shrink-0" style={{ background:C.bgDeep, borderRight:`1px solid ${C.border}` }}>
      {/* Logo */}
      <div className="px-4 pt-3 pb-2.5" style={{ borderBottom:`1px solid ${C.border}` }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center relative overflow-hidden" style={{ background:`linear-gradient(135deg,${C.cobalt},${C.navy})` }}>
            <span className="relative z-10"><PredictaMark size={17} variant="white" /></span>
            <div className="absolute inset-0 opacity-30" style={{ background:`repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(255,255,255,.1) 3px,rgba(255,255,255,.1) 4px)` }} />
          </div>
          <div>
            <div className="text-[15px] font-bold tracking-[0.1em]" style={{ fontFamily:"'Rajdhani',sans-serif", color:C.text }}>PREDICTA</div>
            <div className="text-[9px] tracking-[0.25em]" style={{ color:C.slate+"80" }}>BY FORZY</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {NAV.map(g => {
          const items = g.items.filter((it) => visible(it.modulo));
          if (!items.length) return null;
          return (
          <div key={g.sec} className="mb-1.5">
            <div className="px-2 pt-0.5 pb-0.5 text-[9px] font-bold tracking-[0.2em] uppercase" style={{ color:C.slate+"60" }}>{g.sec}</div>
            {items.map(item => {
              const active = item.match(pathname);
              return (
                <NavLink key={item.to} to={item.to}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-[5px] rounded-md text-[12px] leading-tight font-medium mb-0.5 transition-all text-left ${active ? "" : "hover:text-[#DDE6F0]"}`}
                  style={active
                    ? { background:`${C.cobalt}22`, border:`1px solid ${C.cobalt}44`, color:C.steel }
                    : { border:"1px solid transparent", color:C.slate }}
                >
                  <item.i size={13} />
                  <span className="flex-1">{item.l}</span>
                  {item.badge && openCount > 0 && <span className="text-[9px] bg-red-500 text-white rounded-full px-1.5 py-[1px] font-bold font-mono">{openCount}</span>}
                </NavLink>
              );
            })}
          </div>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-2" style={{ borderTop:`1px solid ${C.border}` }}>
        <NavLink to="/configuracoes" className="flex items-center gap-2.5 p-2 rounded-md hover:bg-[#112035] transition-all cursor-pointer">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ background:`linear-gradient(135deg,${C.cobalt},${C.navy})` }}>{initials(session.nome)}</div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold truncate" style={{ color:C.text }}>{session.nome ?? "—"}</div>
            <div className="text-[10px] truncate" style={{ color:C.slate }}>{session.papel ?? "—"}</div>
          </div>
          <Settings size={11} style={{ color:C.slate }} />
        </NavLink>
      </div>
    </aside>
  );
}
