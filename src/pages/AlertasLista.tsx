// 12. Lista de Alertas ─────────────────────────────────────────────────────────
import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { Search, Download, PlusCircle, Eye, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";
import { C } from "@/lib/theme";
import { SevBadge, Badge, IBtn } from "@/components/ui-shared";
import { usePageChrome } from "@/components/layout/chrome";
import { useStore } from "@/store/useStore";
import { useCan } from "@/auth/rbac";
import { downloadCSV } from "@/lib/csv";
import { fmtDateTime } from "@/lib/format";
import { OriginBadge, GatedButton } from "@/components/gov";
import type { Severity } from "@/lib/types";

const SEV_LABEL: Record<string, string> = { todos: "Todas Severidades", critico: "Crítico", alto: "Alto", medio: "Médio", baixo: "Baixo" };
const ST_LABEL: Record<string, string> = { todos: "Todos os Status", aberto: "Aberto", em_analise: "Em Análise", resolvido: "Resolvido" };

export default function AlertasLista() {
  const navigate = useNavigate();
  const alerts = useStore((s) => s.alerts);
  const assets = useStore((s) => s.assets);
  const addAlert = useStore((s) => s.addAlert);
  const resolveAlert = useStore((s) => s.resolveAlert);
  const simClock = useStore((s) => s.simClock);
  const canWrite = useCan("Alertas", "full");

  const [q, setQ] = useState("");
  const [sev, setSev] = useState("todos");
  const [st, setSt] = useState("todos");
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ assetId: assets[0]?.id ?? "", titulo: "", severidade: "medio" as Severity });

  const open = alerts.filter((a) => a.status !== "resolvido");
  const counts = {
    abertos: open.length,
    criticos: open.filter((a) => a.severidade === "critico").length,
    altos: open.filter((a) => a.severidade === "alto").length,
    medios: open.filter((a) => a.severidade === "medio" || a.severidade === "baixo").length,
  };

  const nomeOf = useMemo(() => Object.fromEntries(assets.map((a) => [a.id, a.nome])), [assets]);
  const filtered = useMemo(() => alerts.filter((a) =>
    (a.titulo.toLowerCase().includes(q.toLowerCase()) || a.assetId.toLowerCase().includes(q.toLowerCase())) &&
    (sev === "todos" || a.severidade === sev) &&
    (st === "todos" || a.status === st),
  ).sort((a, b) => b.criadoEm - a.criadoEm), [alerts, q, sev, st]);

  const exportar = () =>
    downloadCSV(`alertas-${Date.now()}`, alerts.map((a) => ({
      ID: a.id, Ativo: a.assetId, Titulo: a.titulo, Tipo: a.tipo,
      Severidade: a.severidade, Status: a.status, Origem: a.origem,
      Criado: fmtDateTime(a.criadoEm), Resolvido: a.resolvidoEm ? fmtDateTime(a.resolvidoEm) : "",
    })));

  const criar = () => {
    if (!form.titulo.trim() || !form.assetId) { toast.error("Preencha o título e o ativo."); return; }
    const seq = Math.max(849, ...alerts.map((a) => parseInt(a.id.split("-").pop() || "0", 10) || 0)) + 1;
    addAlert({
      id: `ALT-${new Date(simClock).getFullYear()}-${String(seq).padStart(4, "0")}`,
      assetId: form.assetId, titulo: form.titulo.trim(), tipo: "Manual",
      severidade: form.severidade, status: "aberto", criadoEm: simClock,
      descricao: `Alerta manual registrado para ${nomeOf[form.assetId] ?? form.assetId}.`,
      origem: "manual",
    });
    toast.success("Alerta criado", { description: `${form.titulo.trim()} — ${form.assetId}` });
    setForm({ assetId: assets[0]?.id ?? "", titulo: "", severidade: "medio" });
    setShowNew(false);
  };

  const resolver = (id: string) => { resolveAlert(id); toast.success("Alerta resolvido", { description: id }); };

  usePageChrome(["Alertas","Lista de Alertas"],
    <div className="flex gap-2">
      <IBtn icon={Download} label="Exportar" onClick={exportar} />
      {canWrite && (
        <button onClick={()=>setShowNew((v)=>!v)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-md transition-all hover:brightness-110" style={{ background:C.cobalt }}>
          <PlusCircle size={12}/> Novo alerta
        </button>
      )}
    </div>
  );

  return (
    <>
      <div className="grid grid-cols-4 gap-3">
        {[
          { l:"Total Abertos",v:counts.abertos, c:C.red    },
          { l:"Críticos",     v:counts.criticos,c:C.red    },
          { l:"Altos",        v:counts.altos,   c:C.orange },
          { l:"Médios",       v:counts.medios,  c:C.yellow },
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

      {canWrite && showNew && (
        <div className="rounded-lg p-3 flex items-end gap-3 flex-wrap" style={{ background:C.bgCard, border:`1px solid ${C.cobalt}40` }}>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-[10px] uppercase tracking-widest mb-1" style={{ color:C.slate }}>Título</label>
            <input value={form.titulo} onChange={(e)=>setForm({...form, titulo:e.target.value})} placeholder="Descreva o alerta..." className="w-full px-3 py-2 text-xs rounded-md focus:outline-none" style={{ background:C.bgDeep, border:`1px solid ${C.border}`, color:C.text }} />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest mb-1" style={{ color:C.slate }}>Ativo</label>
            <select value={form.assetId} onChange={(e)=>setForm({...form, assetId:e.target.value})} className="px-3 py-2 text-xs rounded-md focus:outline-none" style={{ background:C.bgDeep, border:`1px solid ${C.border}`, color:C.text }}>
              {assets.map((a)=><option key={a.id} value={a.id}>{a.id} — {a.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest mb-1" style={{ color:C.slate }}>Severidade</label>
            <select value={form.severidade} onChange={(e)=>setForm({...form, severidade:e.target.value as Severity})} className="px-3 py-2 text-xs rounded-md focus:outline-none" style={{ background:C.bgDeep, border:`1px solid ${C.border}`, color:C.text }}>
              {(["critico","alto","medio","baixo"] as Severity[]).map((s)=><option key={s} value={s}>{SEV_LABEL[s]}</option>)}
            </select>
          </div>
          <button onClick={criar} className="px-4 py-2 text-xs font-bold text-white rounded-md" style={{ background:C.cobalt }}>Criar</button>
          <button onClick={()=>setShowNew(false)} className="p-2 rounded-md" style={{ color:C.slate, border:`1px solid ${C.border}` }}><X size={14}/></button>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:C.slate }} />
          <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Buscar alertas..." className="w-full pl-9 pr-3 py-2 text-xs rounded-md focus:outline-none" style={{ background:C.bgCard, border:`1px solid ${C.border}`, color:C.text }} />
        </div>
        <select value={sev} onChange={(e)=>setSev(e.target.value)} className="px-3 py-2 text-xs rounded-md focus:outline-none" style={{ background:C.bgCard, border:`1px solid ${C.border}`, color:C.text }}>
          {Object.keys(SEV_LABEL).map((k)=><option key={k} value={k}>{SEV_LABEL[k]}</option>)}
        </select>
        <select value={st} onChange={(e)=>setSt(e.target.value)} className="px-3 py-2 text-xs rounded-md focus:outline-none" style={{ background:C.bgCard, border:`1px solid ${C.border}`, color:C.text }}>
          {Object.keys(ST_LABEL).map((k)=><option key={k} value={k}>{ST_LABEL[k]}</option>)}
        </select>
      </div>

      <div className="rounded-lg overflow-hidden" style={{ border:`1px solid ${C.border}` }}>
        <table className="w-full" style={{ background:C.bgCard }}>
          <thead style={{ borderBottom:`1px solid ${C.border}` }}>
            <tr>
              {["ID","Título / Ativo","Tipo","Severidade","Status","Origem","Data / Hora",""].map(h=>(
                <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color:C.slate }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((a,i)=>(
              <tr key={a.id} onClick={()=>navigate(`/alertas/${a.id}`)} className="cursor-pointer transition-all hover:bg-[#112035]"
                style={{ borderBottom:`1px solid ${C.border}40`, background:i%2===1?"rgba(12,24,41,0.5)":undefined }}>
                <td className="px-4 py-3"><span style={{ fontFamily:"'JetBrains Mono',monospace", color:C.steel, fontSize:10 }}>{a.id}</span></td>
                <td className="px-4 py-3">
                  <div className="text-[12px] font-medium" style={{ color:C.text }}>{a.titulo}</div>
                  <div className="text-[10px] font-mono" style={{ color:C.slate }}>{a.assetId} — {nomeOf[a.assetId] ?? ""}</div>
                </td>
                <td className="px-4 py-3 text-[11px]" style={{ color:C.textSub }}>{a.tipo}</td>
                <td className="px-4 py-3"><SevBadge s={a.severidade} /></td>
                <td className="px-4 py-3"><Badge s={a.status} /></td>
                <td className="px-4 py-3"><OriginBadge origem={a.origem} /></td>
                <td className="px-4 py-3 text-[11px] font-mono" style={{ color:C.slate }}>{fmtDateTime(a.criadoEm)}</td>
                <td className="px-4 py-3" onClick={(e)=>e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    <button onClick={()=>navigate(`/alertas/${a.id}`)} className="p-1 rounded hover:bg-[#0A1525]" style={{ color:C.slate }} title="Ver"><Eye size={12}/></button>
                    {a.status!=="resolvido" && <GatedButton modulo="Alertas" nivel="full" onClick={()=>resolver(a.id)} className="p-1 rounded hover:bg-[#0A1525]" style={{ color:C.green }} title="Resolver"><CheckCircle2 size={12}/></GatedButton>}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-[12px]" style={{ color:C.slate }}>Nenhum alerta corresponde ao filtro.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
