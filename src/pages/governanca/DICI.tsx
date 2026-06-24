// 18. D-I-C-I ─────────────────────────────────────────────────────────────────
// Editable lifecycle matrix — click a status (with Governança=full) to cycle it.
import { CheckCircle2, Clock, AlertCircle, Info, Download } from "lucide-react";
import { C } from "@/lib/theme";
import { Badge, IBtn } from "@/components/ui-shared";
import { usePageChrome } from "@/components/layout/chrome";
import { useStore } from "@/store/useStore";
import { useCan } from "@/auth/rbac";
import { downloadCSV } from "@/lib/csv";
import type { DiciRow, DiciStatus } from "@/lib/types";

const NEXT: Record<DiciStatus, DiciStatus> = { aprovado: "em_revisao", em_revisao: "pendente", pendente: "aprovado" };
const COL: { key: keyof Pick<DiciRow, "D" | "I" | "C" | "In">; label: string }[] = [
  { key:"D", label:"D — Desenho" }, { key:"I", label:"I — Instalação" },
  { key:"C", label:"C — Comissionamento" }, { key:"In", label:"I — Inspeção" },
];
const sc: Record<DiciStatus, string> = { aprovado: "#34D399", em_revisao: "#FBBF24", pendente: "#6D8196" };

export default function DICIPage() {
  const dici = useStore((s) => s.dici);
  const setDici = useStore((s) => s.setDici);
  const canEdit = useCan("Governança", "full");

  const cycle = (id: string, key: "D" | "I" | "C" | "In") => {
    if (!canEdit) return;
    setDici(dici.map((r) => (r.id === id ? { ...r, [key]: NEXT[r[key]] } : r)));
  };
  const exportar = () => downloadCSV(`dici-${Date.now()}`, dici.map((r)=>({ Ativo:r.id, Nome:r.nome, Desenho:r.D, Instalacao:r.I, Comissionamento:r.C, Inspecao:r.In })));

  usePageChrome(["Administração","Ciclo do Ativo"], <IBtn icon={Download} label="Exportar" onClick={exportar}/>);

  const counts = (key: "D"|"I"|"C"|"In") => dici.reduce((a, r) => { a[r[key]]=(a[r[key]]||0)+1; return a; }, {} as Record<string, number>);
  const StatusIcon = (s: DiciStatus) => s==="aprovado"?<CheckCircle2 size={14} style={{ color:sc[s] }}/>:s==="em_revisao"?<Clock size={14} style={{ color:sc[s] }}/>:<AlertCircle size={14} style={{ color:sc[s] }}/>;

  return (
    <>
      <div className="flex items-start gap-2 p-3 rounded-lg mb-1" style={{ background:`${C.cobalt}0C`, border:`1px solid ${C.cobalt}28` }}>
        <Info size={13} style={{ color:C.steel }} className="flex-shrink-0 mt-0.5"/>
        <p className="text-[12px]" style={{ color:C.textSub }}>
          <strong style={{ color:C.steel }}>D-I-C-I:</strong> ciclo de vida documental.
          {canEdit ? " Clique num status para alterá-lo." : " (somente leitura)"}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4">
        {COL.map((col)=>{
          const c = counts(col.key);
          return (
            <div key={col.key} className="rounded-lg p-3" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
              <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color:C.slate }}>{col.label.split(" — ")[1]}</div>
              <div className="flex items-center gap-3 text-[11px]">
                <CheckCircle2 size={11} style={{ color:C.green }}/><span style={{ color:C.green, fontFamily:"'JetBrains Mono',monospace" }}>{c.aprovado||0}</span>
                <Clock size={11} style={{ color:C.yellow }}/><span style={{ color:C.yellow, fontFamily:"'JetBrains Mono',monospace" }}>{c.em_revisao||0}</span>
                <AlertCircle size={11} style={{ color:C.slate }}/><span style={{ color:C.slate, fontFamily:"'JetBrains Mono',monospace" }}>{c.pendente||0}</span>
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
              {COL.map(col=><th key={col.key} className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.15em] text-center" style={{ color:C.slate }}>{col.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {dici.map((item,i)=>(
              <tr key={item.id} className="transition-all hover:bg-[#112035]"
                style={{ borderBottom:`1px solid ${C.border}40`, background:i%2===1?"rgba(12,24,41,0.5)":undefined }}>
                <td className="px-4 py-3">
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", color:C.steel, fontSize:11 }}>{item.id}</div>
                  <div className="text-[10px]" style={{ color:C.slate }}>{item.nome}</div>
                </td>
                {COL.map((col)=>{
                  const s = item[col.key];
                  return (
                    <td key={col.key} className="px-4 py-3 text-center">
                      <button disabled={!canEdit} onClick={()=>cycle(item.id, col.key)} className={`flex flex-col items-center gap-1.5 mx-auto ${canEdit?"hover:scale-110 transition-transform cursor-pointer":""}`}>
                        {StatusIcon(s)}
                        <Badge s={s} />
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
