// Administração — Auditoria ──────────────────────────────────────────────────
// Trilha consolidada de TODAS as escritas governadas do sistema (resolver alerta,
// registrar manutenção, editar permissão/limite/estrutura/ciclo). A auditoria é
// embutida: cada ação registra o evento no store; aqui apenas o consolidamos.
import { useMemo, useState } from "react";
import { History, Search, Download } from "lucide-react";
import { C } from "@/lib/theme";
import { SH, IBtn } from "@/components/ui-shared";
import { usePageChrome } from "@/components/layout/chrome";
import { useStore } from "@/store/useStore";
import { fmtDateTime } from "@/lib/format";
import { downloadCSV } from "@/lib/csv";

const ACTION_LABEL: Record<string, { l: string; c: string }> = {
  "alerta.resolver":     { l: "Alerta resolvido",        c: C.green },
  "alerta.reabrir":      { l: "Alerta reaberto",         c: C.orange },
  "alerta.analisar":     { l: "Alerta em análise",       c: C.yellow },
  "manutencao.aplicar":  { l: "Manutenção registrada",   c: C.steel },
  "rbac.atualizar":      { l: "Permissão alterada",      c: C.red },
  "dicionario.editar":   { l: "Dicionário editado",      c: C.cobalt },
  "dicionario.remover":  { l: "Tag removida",            c: C.red },
  "dici.atualizar":      { l: "Ciclo do Ativo alterado", c: C.steel },
  "hierarquia.atualizar":{ l: "Estrutura alterada",      c: C.cobalt },
  "os.criar":            { l: "Ordem de serviço criada", c: C.steel },
};

export default function Auditoria() {
  const audit = useStore((s) => s.audit);
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return audit;
    return audit.filter((e) => `${e.actor} ${e.action} ${e.target} ${e.detail}`.toLowerCase().includes(t));
  }, [audit, q]);

  const exportar = () => downloadCSV(`auditoria-${Date.now()}`, audit.map((e) => ({
    Data: fmtDateTime(e.ts), Papel: e.actor ?? "—", Acao: e.action, Alvo: e.target ?? "—", Detalhe: e.detail ?? "",
  })));

  usePageChrome(["Administração", "Auditoria"],
    <div className="flex gap-2"><IBtn icon={Download} label="Exportar" onClick={exportar} /></div>
  );

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${C.border}`, background: C.bgCard }}>
        <SH title={`Trilha de Auditoria (${rows.length})`} />
        <div className="relative">
          <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: C.slate }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…"
            className="pl-8 pr-3 py-1.5 text-xs rounded-md focus:outline-none w-48" style={{ background: C.bgDeep, border: `1px solid ${C.border}`, color: C.text }} />
        </div>
      </div>
      <table className="w-full" style={{ background: C.bgCard }}>
        <thead style={{ borderBottom: `1px solid ${C.border}` }}>
          <tr>
            {["Quando", "Papel", "Evento", "Alvo", "Detalhe"].map((h) => (
              <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: C.slate }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((e, i) => {
            const a = ACTION_LABEL[e.action] ?? { l: e.action, c: C.slate };
            return (
              <tr key={e.id} style={{ borderBottom: `1px solid ${C.border}40`, background: i % 2 === 1 ? "rgba(12,24,41,0.5)" : undefined }}>
                <td className="px-4 py-2.5 text-[11px] font-mono whitespace-nowrap" style={{ color: C.slate }}>{fmtDateTime(e.ts)}</td>
                <td className="px-4 py-2.5 text-[11px]" style={{ color: C.textSub }}>{e.actor ?? "—"}</td>
                <td className="px-4 py-2.5"><span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: `${a.c}1A`, color: a.c, border: `1px solid ${a.c}40` }}>{a.l}</span></td>
                <td className="px-4 py-2.5 text-[11px] font-mono" style={{ color: C.steel }}>{e.target ?? "—"}</td>
                <td className="px-4 py-2.5 text-[11px]" style={{ color: C.slate }}>{e.detail ?? ""}</td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr><td colSpan={5} className="px-4 py-10 text-center text-[12px]" style={{ color: C.slate }}>
              <History size={20} className="mx-auto mb-2" style={{ color: C.slate }} />
              Nenhum evento de auditoria ainda. Ações como resolver alerta, registrar manutenção ou alterar permissões aparecem aqui.
            </td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
