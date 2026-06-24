// 17. Hierarquia ──────────────────────────────────────────────────────────────
// Editable + persisted asset tree (empresa → planta → área → sistema → ativo).
import { useState } from "react";
import { useNavigate } from "react-router";
import { Building2, Map, Layers, Network, Cpu, ChevronDown, ChevronRight, Search, PlusCircle, Plus, Pencil, Trash2, Check, CornerDownRight } from "lucide-react";
import { toast } from "sonner";
import { C } from "@/lib/theme";
import { SH, IBtn } from "@/components/ui-shared";
import { usePageChrome } from "@/components/layout/chrome";
import { useStore } from "@/store/useStore";
import { useCan } from "@/auth/rbac";
import type { HNode } from "@/lib/types";

const CHILD_TYPE: Record<string, string> = { Empresa:"Planta", Planta:"Área", Área:"Sistema", Sistema:"Ativo", Ativo:"Ativo" };

// Per-level indentation in px. Used both for layout and for placing the vertical guide lines.
const INDENT = 22;

function addChildTo(nodes: HNode[], parentId: string, child: HNode): HNode[] {
  return nodes.map((n) => n.id === parentId ? { ...n, kids: [...n.kids, child] } : { ...n, kids: addChildTo(n.kids, parentId, child) });
}
function renameIn(nodes: HNode[], id: string, label: string): HNode[] {
  return nodes.map((n) => n.id === id ? { ...n, l: label } : { ...n, kids: renameIn(n.kids, id, label) });
}
function removeFrom(nodes: HNode[], id: string): HNode[] {
  return nodes.filter((n) => n.id !== id).map((n) => ({ ...n, kids: removeFrom(n.kids, id) }));
}
function countByType(nodes: HNode[], acc: Record<string, number> = {}): Record<string, number> {
  for (const n of nodes) { acc[n.tp] = (acc[n.tp] || 0) + 1; countByType(n.kids, acc); }
  return acc;
}
function countDescendants(n: HNode): number {
  return n.kids.reduce((s, k) => s + 1 + countDescendants(k), 0);
}

const TYPE_ICON: Record<string,any> = { Empresa:Building2, Planta:Map, Área:Layers, Sistema:Network, Ativo:Cpu };
const TYPE_COLOR: Record<string,string> = { Empresa:C.steel, Planta:C.cobalt, Área:C.steel, Sistema:C.textSub, Ativo:C.green };

// `ancestors` is the list of "does this ancestor at depth k have a sibling after it"
// flags — used to decide whether to keep drawing its vertical guide line through
// this row. `isLast` says whether *this* node is the last child of its parent.
function HiNode({ n, depth, ancestors, isLast, editing, setEditing }: {
  n: HNode; depth: number; ancestors: boolean[]; isLast: boolean;
  editing: string | null; setEditing: (id: string | null) => void;
}) {
  const navigate = useNavigate();
  const hierarchy = useStore((s) => s.hierarchy);
  const setHierarchy = useStore((s) => s.setHierarchy);
  const canEdit = useCan("Governança", "full");
  const [open, setOpen] = useState(depth < 3);
  const [draft, setDraft] = useState(n.l);
  const I = TYPE_ICON[n.tp] || Cpu;
  const col = TYPE_COLOR[n.tp] || C.slate;
  const isRoot = depth === 0;
  const hasKids = n.kids.length > 0;
  const descendants = countDescendants(n);

  const addChild = (e: React.MouseEvent) => {
    e.stopPropagation();
    const child: HNode = { id:`NODE-${Date.now()}`, l:`Novo ${CHILD_TYPE[n.tp]}`, tp:CHILD_TYPE[n.tp], kids:[] };
    setHierarchy(addChildTo(hierarchy, n.id, child));
    setOpen(true);
    toast.success("Nó adicionado", { description: child.l });
  };
  const remove = (e: React.MouseEvent) => { e.stopPropagation(); setHierarchy(removeFrom(hierarchy, n.id)); toast("Nó removido", { description:n.l }); };
  const saveRename = () => { setHierarchy(renameIn(hierarchy, n.id, draft.trim() || n.l)); setEditing(null); };

  const isEditing = editing === n.id;

  return (
    <div>
      <div
        className="relative flex items-center gap-2 rounded-md transition-colors duration-150 group cursor-pointer"
        style={{
          paddingLeft: `${depth * INDENT + 10}px`,
          paddingRight: 8,
          minHeight: isRoot ? 40 : 32,
          marginBottom: 1,
          background: isRoot ? `${C.steel}0E` : undefined,
          border: isRoot ? `1px solid ${C.steel}26` : "1px solid transparent",
        }}
        onMouseEnter={(e)=>{ if(!isRoot) e.currentTarget.style.background = C.bgHover; }}
        onMouseLeave={(e)=>{ if(!isRoot) e.currentTarget.style.background = "transparent"; }}
        onClick={()=>n.kids.length?setOpen(o=>!o):(n.tp==="Ativo"&&navigate(`/ativos/${n.id}/overview`))}
      >
        {/* Tree guide lines: one vertical rail per ancestor level + the elbow into this row */}
        {!isRoot && (
          <div className="absolute inset-y-0 left-0 pointer-events-none" aria-hidden>
            {ancestors.map((hasNext, i) => (
              hasNext && (
                <span
                  key={i}
                  className="absolute top-0 bottom-0"
                  style={{ left: i * INDENT + 18, width: 1, background: C.border }}
                />
              )
            ))}
            {/* vertical segment for this node's own level */}
            <span
              className="absolute"
              style={{
                left: (depth - 1) * INDENT + 18, width: 1,
                top: 0, bottom: isLast ? "50%" : 0,
                background: C.border,
              }}
            />
            {/* horizontal elbow connecting the rail to the icon */}
            <span
              className="absolute"
              style={{ left: (depth - 1) * INDENT + 18, top: "50%", width: INDENT - 6, height: 1, background: C.border }}
            />
          </div>
        )}

        {hasKids
          ? <span
              className="flex items-center justify-center w-4 h-4 rounded transition-colors hover:bg-white/5"
              style={{ color: open ? C.steel : C.slate }}
            >{open ? <ChevronDown size={13}/> : <ChevronRight size={13}/>}</span>
          : <span className="w-4 flex items-center justify-center" style={{ color:`${C.slate}80` }}><CornerDownRight size={11}/></span>}

        <div
          className="rounded-md flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
          style={{
            width: isRoot ? 28 : 24, height: isRoot ? 28 : 24,
            background: `${col}1A`, border: `1px solid ${col}33`,
          }}
        ><I size={isRoot ? 14 : 12} style={{ color:col }} /></div>

        {isEditing
          ? <input autoFocus value={draft} onChange={(e)=>setDraft(e.target.value)} onKeyDown={(e)=>{ if(e.key==="Enter") saveRename(); if(e.key==="Escape") setEditing(null); }} onClick={(e)=>e.stopPropagation()}
              className="text-[12px] flex-1 px-2 py-1 rounded focus:outline-none min-w-0" style={{ background:C.bgDeep, border:`1px solid ${C.cobalt}`, color:C.text }} />
          : <span
              className="flex-1 truncate"
              style={{ color: isRoot ? C.text : C.text, fontSize: isRoot ? 13 : 12, fontWeight: isRoot ? 600 : 500, letterSpacing: isRoot ? "0.01em" : undefined }}
            >{n.l}</span>}

        {/* child-count chip (discreet) */}
        {hasKids && !isEditing && (
          <span
            className="text-[10px] font-mono px-1.5 py-0.5 rounded-full flex-shrink-0 transition-opacity group-hover:opacity-40"
            style={{ color:C.slate, background:`${C.slate}14`, border:`1px solid ${C.border}` }}
            title={`${descendants} descendente(s)`}
          >{n.kids.length}</span>
        )}

        {/* type chip — only revealed on hover to keep the tree calm */}
        {!isEditing && (
          <span
            className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color:col, background:`${col}14`, border:`1px solid ${col}26` }}
          >{n.tp}</span>
        )}

        {canEdit && (
          <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            {isEditing
              ? <button onClick={(e)=>{ e.stopPropagation(); saveRename(); }} className="p-1 rounded hover:bg-white/5" style={{ color:C.green }} title="Salvar"><Check size={13}/></button>
              : <button onClick={(e)=>{ e.stopPropagation(); setDraft(n.l); setEditing(n.id); }} className="p-1 rounded hover:bg-white/5" style={{ color:C.slate }} title="Renomear"><Pencil size={12}/></button>}
            {n.tp!=="Ativo" && <button onClick={addChild} className="p-1 rounded hover:bg-white/5" style={{ color:C.steel }} title={`Adicionar ${CHILD_TYPE[n.tp]}`}><Plus size={13}/></button>}
            <button onClick={remove} className="p-1 rounded hover:bg-white/5" style={{ color:C.red }} title="Remover"><Trash2 size={12}/></button>
          </div>
        )}
      </div>

      {open && n.kids.map((k, i) => (
        <HiNode
          key={k.id}
          n={k}
          depth={depth + 1}
          ancestors={[...ancestors, !isLast]}
          isLast={i === n.kids.length - 1}
          editing={editing}
          setEditing={setEditing}
        />
      ))}
    </div>
  );
}

export default function Hierarquia() {
  const hierarchy = useStore((s) => s.hierarchy);
  const setHierarchy = useStore((s) => s.setHierarchy);
  const canEdit = useCan("Governança", "full");
  const [editing, setEditing] = useState<string | null>(null);
  const counts = countByType(hierarchy);

  const addRoot = () => {
    const root = hierarchy[0];
    if (!root) return;
    const child: HNode = { id:`NODE-${Date.now()}`, l:"Nova Planta", tp:"Planta", kids:[] };
    setHierarchy(hierarchy.map((n) => n.id === root.id ? { ...n, kids:[...n.kids, child] } : n));
    toast.success("Planta adicionada");
  };

  usePageChrome(["Administração","Estrutura da Planta"], canEdit ? <IBtn icon={PlusCircle} label="Adicionar planta" onClick={addRoot} /> : undefined);

  const totalNodes = Object.values(counts).reduce((s, v) => s + v, 0);

  return (
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
        <div className="mt-1">
          {hierarchy.map((n, i) => (
            <HiNode
              key={n.id}
              n={n}
              depth={0}
              ancestors={[]}
              isLast={i === hierarchy.length - 1}
              editing={editing}
              setEditing={setEditing}
            />
          ))}
        </div>
        {canEdit && (
          <div className="text-[10px] mt-4 pt-3 flex items-center gap-1.5" style={{ color:C.slate, borderTop:`1px solid ${C.border}` }}>
            <Pencil size={9}/>
            Passe o mouse sobre um nó para adicionar filho, renomear ou remover. As alterações são persistidas.
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
          <SH title="Legenda" />
          <div className="mt-1 space-y-1">
            {[["Empresa",Building2,C.steel],["Planta",Map,C.cobalt],["Área",Layers,C.steel],["Sistema",Network,C.textSub],["Ativo",Cpu,C.green]].map(([tp,Ic,c]:any[])=>(
              <div key={tp} className="flex items-center gap-2.5 px-1.5 py-1.5 rounded-md transition-colors hover:bg-[#112035]">
                <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ background:`${c}1A`, border:`1px solid ${c}33` }}><Ic size={12} style={{ color:c }}/></div>
                <span className="text-[12px] flex-1" style={{ color:C.textSub }}>{tp}</span>
                <span className="text-[10px] font-mono" style={{ color:c }}>{counts[tp] || 0}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg p-4" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
          <SH title="Totais" />
          <div className="mt-1">
            {[["Empresas",counts.Empresa||0,C.steel],["Plantas",counts.Planta||0,C.cobalt],["Áreas",counts["Área"]||0,C.steel],["Sistemas",counts.Sistema||0,C.textSub],["Ativos",counts.Ativo||0,C.green]].map(([k,v,c]:any[])=>(
              <div key={k} className="flex items-center justify-between py-2 text-[11px]" style={{ borderBottom:`1px solid ${C.border}` }}>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background:c }}/>
                  <span style={{ color:C.slate }}>{k}</span>
                </div>
                <span className="font-bold font-mono tabular-nums" style={{ color:C.text }}>{v}</span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-3 mt-1 text-[11px]">
              <span className="uppercase tracking-wider text-[10px] font-semibold" style={{ color:C.slate }}>Total de nós</span>
              <span className="font-bold font-mono tabular-nums text-[13px]" style={{ color:C.steel }}>{totalNodes}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
