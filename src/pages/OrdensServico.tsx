// Ordens de Serviço ──────────────────────────────────────────────────────────
// Fila real de manutenção: criar, avançar status (aberta → em andamento → concluída)
// e abrir o ativo. Ações de escrita são gated por RBAC; toda mudança vira auditoria.
import { useMemo, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Wrench, Plus, X, Search, ArrowRight, CheckCircle2, Cpu } from "lucide-react";
import { toast } from "sonner";
import { C } from "@/lib/theme";
import { SH, IBtn } from "@/components/ui-shared";
import { GatedButton } from "@/components/gov";
import { usePageChrome } from "@/components/layout/chrome";
import { useStore } from "@/store/useStore";
import { fmtDateTime } from "@/lib/format";
import type { OSPrioridade, OSStatus, WorkOrder } from "@/lib/types";

const STATUS: Record<OSStatus, { l: string; c: string }> = {
  aberta:       { l: "Aberta",       c: C.slate },
  em_andamento: { l: "Em andamento", c: C.yellow },
  concluida:    { l: "Concluída",    c: C.green },
};
const PRIO: Record<OSPrioridade, { l: string; c: string }> = {
  baixa:   { l: "Baixa",   c: C.slate },
  media:   { l: "Média",   c: C.steel },
  alta:    { l: "Alta",    c: C.orange },
  critica: { l: "Crítica", c: C.red },
};
const NEXT: Record<OSStatus, OSStatus | null> = { aberta: "em_andamento", em_andamento: "concluida", concluida: null };
const FILTERS: { k: "todas" | OSStatus; l: string }[] = [
  { k: "todas", l: "Todas" }, { k: "aberta", l: "Abertas" }, { k: "em_andamento", l: "Em andamento" }, { k: "concluida", l: "Concluídas" },
];

const blank = (assetId: string): WorkOrder => ({
  id: "", assetId, titulo: "", descricao: "", prioridade: "media", status: "aberta", criadoEm: 0, origem: "manual",
});

export default function OrdensServico() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const workOrders = useStore((s) => s.workOrders);
  const assets = useStore((s) => s.assets);
  const simClock = useStore((s) => s.simClock);
  const session = useStore((s) => s.session);
  const addWorkOrder = useStore((s) => s.addWorkOrder);
  const updateWorkOrder = useStore((s) => s.updateWorkOrder);

  const [filter, setFilter] = useState<"todas" | OSStatus>("todas");
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState<WorkOrder | null>(null);

  // Deep-link: /ordens?novo=ASSETID opens the create modal prefilled for that asset.
  useEffect(() => {
    const novo = params.get("novo");
    if (novo) { setDraft(blank(novo.toUpperCase())); params.delete("novo"); setParams(params, { replace: true }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = useMemo(() => {
    const c = { aberta: 0, em_andamento: 0, concluida: 0 } as Record<OSStatus, number>;
    workOrders.forEach((w) => { c[w.status]++; });
    return c;
  }, [workOrders]);

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return workOrders
      .filter((w) => filter === "todas" || w.status === filter)
      .filter((w) => !t || `${w.id} ${w.assetId} ${w.titulo} ${w.responsavel ?? ""}`.toLowerCase().includes(t));
  }, [workOrders, filter, q]);

  const nomeAtivo = (id: string) => assets.find((a) => a.id === id)?.nome ?? id;

  const advance = (w: WorkOrder) => {
    const nx = NEXT[w.status];
    if (!nx) return;
    updateWorkOrder(w.id, { status: nx, ...(nx === "concluida" ? { concluidoEm: simClock } : {}) });
    toast.success("OS atualizada", { description: `${w.id} → ${STATUS[nx].l}` });
  };

  const salvar = () => {
    if (!draft) return;
    if (!draft.assetId) { toast.error("Selecione o ativo."); return; }
    if (!draft.titulo.trim()) { toast.error("Informe o título da OS."); return; }
    const year = new Date(simClock).getFullYear();
    const seq = Math.max(0, ...workOrders.map((w) => parseInt(w.id.split("-").pop() || "0", 10) || 0)) + 1;
    const wo: WorkOrder = { ...draft, id: `OS-${year}-${String(seq).padStart(4, "0")}`, titulo: draft.titulo.trim(), criadoEm: simClock, responsavel: session.nome ?? undefined };
    addWorkOrder(wo);
    toast.success("Ordem de serviço criada", { description: `${wo.id} — ${nomeAtivo(wo.assetId)}` });
    setDraft(null);
  };

  usePageChrome(["Operação", "Ordens de Serviço"],
    <GatedButton modulo="Alertas" nivel="full" onClick={() => setDraft(blank(""))}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium text-white" style={{ background: C.cobalt }}>
      <Plus size={12} /> Nova OS
    </GatedButton>
  );

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { l: "Total", v: workOrders.length, c: C.steel },
          { l: "Abertas", v: counts.aberta, c: C.slate },
          { l: "Em andamento", v: counts.em_andamento, c: C.yellow },
          { l: "Concluídas", v: counts.concluida, c: C.green },
        ].map((k) => (
          <div key={k.l} className="rounded-lg p-3.5" style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
            <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: C.slate }}>{k.l}</div>
            <div className="text-[26px] font-bold leading-none" style={{ fontFamily: "'Rajdhani',sans-serif", color: k.c }}>{k.v}</div>
          </div>
        ))}
      </div>

      <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${C.border}`, background: C.bgCard }}>
          <div className="flex items-center gap-1.5">
            {FILTERS.map((f) => (
              <button key={f.k} onClick={() => setFilter(f.k)} className="px-2.5 py-1 rounded-md text-[11px] transition-colors"
                style={filter === f.k ? { background: `${C.cobalt}25`, color: C.steel, border: `1px solid ${C.cobalt}55` } : { color: C.slate, border: `1px solid ${C.border}` }}>
                {f.l}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: C.slate }} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar OS…" className="pl-8 pr-3 py-1.5 text-xs rounded-md focus:outline-none w-48" style={{ background: C.bgDeep, border: `1px solid ${C.border}`, color: C.text }} />
          </div>
        </div>

        <table className="w-full" style={{ background: C.bgCard }}>
          <thead style={{ borderBottom: `1px solid ${C.border}` }}>
            <tr>{["OS", "Ativo", "Título", "Prioridade", "Status", "Criada", ""].map((h) => (
              <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: C.slate }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {rows.map((w, i) => {
              const st = STATUS[w.status]; const pr = PRIO[w.prioridade]; const nx = NEXT[w.status];
              return (
                <tr key={w.id} style={{ borderBottom: `1px solid ${C.border}40`, background: i % 2 === 1 ? "rgba(12,24,41,0.5)" : undefined }}>
                  <td className="px-4 py-3 text-[11px] font-mono" style={{ color: C.steel }}>{w.id}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => navigate(`/ativos/${w.assetId}/overview`)} className="flex items-center gap-1.5 text-[11px] hover:brightness-125" style={{ color: C.text }}>
                      <Cpu size={11} style={{ color: C.slate }} /> {w.assetId}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-[11px]" style={{ color: C.text }}>{w.titulo}</td>
                  <td className="px-4 py-3"><span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: `${pr.c}1A`, color: pr.c, border: `1px solid ${pr.c}40` }}>{pr.l}</span></td>
                  <td className="px-4 py-3"><span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: `${st.c}1A`, color: st.c, border: `1px solid ${st.c}40` }}>{st.l}</span></td>
                  <td className="px-4 py-3 text-[10px] font-mono" style={{ color: C.slate }}>{fmtDateTime(w.criadoEm)}</td>
                  <td className="px-4 py-3 text-right">
                    {nx && (
                      <GatedButton modulo="Alertas" nivel="full" onClick={() => advance(w)} title={`Avançar para ${STATUS[nx].l}`}
                        className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-md" style={{ background: `${C.cobalt}1A`, border: `1px solid ${C.cobalt}40`, color: C.steel }}>
                        {nx === "concluida" ? <CheckCircle2 size={11} /> : <ArrowRight size={11} />} {STATUS[nx].l}
                      </GatedButton>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-[12px]" style={{ color: C.slate }}>
                <Wrench size={20} className="mx-auto mb-2" style={{ color: C.slate }} /> Nenhuma ordem de serviço {filter !== "todas" ? `(${STATUS[filter as OSStatus]?.l.toLowerCase()})` : ""}.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create modal */}
      {draft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(3,8,18,0.7)" }} onClick={() => setDraft(null)}>
          <div className="w-full max-w-md rounded-lg overflow-hidden" style={{ background: C.bgCard, border: `1px solid ${C.border}` }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${C.border}` }}>
              <span className="text-[13px] font-bold uppercase tracking-widest" style={{ fontFamily: "'Rajdhani',sans-serif", color: C.text }}>Nova Ordem de Serviço</span>
              <button onClick={() => setDraft(null)} className="p-1 rounded hover:bg-[#0A1525]" style={{ color: C.slate }}><X size={15} /></button>
            </div>
            <div className="px-4 py-4 space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.15em] mb-1" style={{ color: C.slate }}>Ativo</label>
                <select value={draft.assetId} onChange={(e) => setDraft({ ...draft, assetId: e.target.value })} className="w-full px-3 py-2 text-xs rounded-md focus:outline-none" style={{ background: C.bgDeep, border: `1px solid ${C.border}`, color: C.text }}>
                  <option value="">Selecione…</option>
                  {assets.map((a) => <option key={a.id} value={a.id}>{a.id} — {a.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.15em] mb-1" style={{ color: C.slate }}>Título</label>
                <input value={draft.titulo} onChange={(e) => setDraft({ ...draft, titulo: e.target.value })} className="w-full px-3 py-2 text-xs rounded-md focus:outline-none" style={{ background: C.bgDeep, border: `1px solid ${C.border}`, color: C.text }} />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.15em] mb-1" style={{ color: C.slate }}>Descrição</label>
                <textarea value={draft.descricao} onChange={(e) => setDraft({ ...draft, descricao: e.target.value })} rows={3} className="w-full px-3 py-2 text-xs rounded-md focus:outline-none resize-none" style={{ background: C.bgDeep, border: `1px solid ${C.border}`, color: C.text }} />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.15em] mb-1" style={{ color: C.slate }}>Prioridade</label>
                <div className="flex rounded-md overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
                  {(Object.keys(PRIO) as OSPrioridade[]).map((p) => (
                    <button key={p} onClick={() => setDraft({ ...draft, prioridade: p })} className="flex-1 px-2 py-1.5 text-[11px] transition-colors"
                      style={{ background: draft.prioridade === p ? `${PRIO[p].c}25` : "transparent", color: draft.prioridade === p ? PRIO[p].c : C.slate }}>{PRIO[p].l}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-4 py-3" style={{ borderTop: `1px solid ${C.border}` }}>
              <IBtn label="Cancelar" icon={X} onClick={() => setDraft(null)} />
              <IBtn label="Criar OS" icon={CheckCircle2} onClick={salvar} variant="primary" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
