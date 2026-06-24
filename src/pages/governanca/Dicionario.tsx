// 19. Dicionário de Rastreabilidade ────────────────────────────────────────────
// Editable: the limits here feed the engine's limit-based alerts. Change a limit
// (with Governança=full) and the live alerts react on the next tick.
import { Search, PlusCircle, Download, Trash2, Lock } from "lucide-react";
import { toast } from "sonner";
import { C } from "@/lib/theme";
import { IBtn } from "@/components/ui-shared";
import { usePageChrome } from "@/components/layout/chrome";
import { useStore } from "@/store/useStore";
import { useCan } from "@/auth/rbac";
import { downloadCSV } from "@/lib/csv";
import { TAG_LABEL, TAG_UNIT, type TagKey, type Tag } from "@/lib/types";

const TAG_KEYS: TagKey[] = ["temp", "vib", "press", "corrente", "rpm", "oleo"];

export default function Dicionario() {
  const dictionary = useStore((s) => s.dictionary);
  const upsertTag = useStore((s) => s.upsertTag);
  const removeTag = useStore((s) => s.removeTag);
  const canEdit = useCan("Governança", "full");

  const patch = (t: Tag, p: Partial<Tag>) => upsertTag({ ...t, ...p });
  const numField = (t: Tag, field: "limiteAlerta" | "limiteCritico") => (
    canEdit
      ? <input type="number" value={t[field]} onChange={(e)=>patch(t, { [field]: Number(e.target.value) } as Partial<Tag>)}
          className="w-20 px-1.5 py-0.5 text-[11px] font-mono rounded focus:outline-none" style={{ background:C.bgDeep, border:`1px solid ${C.border}`, color:field==="limiteCritico"?C.red:C.yellow }} />
      : <span className="font-mono" style={{ color:field==="limiteCritico"?C.red:C.yellow }}>{t[field]}</span>
  );

  const novaEntrada = () => {
    const n = dictionary.length + 1;
    upsertTag({ id:`TAG-${String(900+n)}`, key:"temp", campo:"Nova Grandeza", tipo:"Float", un:"°C", faixaMin:0, faixaMax:100, limiteAlerta:75, limiteCritico:80, direcao:"acima", ativo:"Rotativos", sensor:"Sensor" });
    toast.success("Entrada adicionada ao dicionário");
  };
  const exportar = () => downloadCSV(`dicionario-${Date.now()}`, dictionary.map((t)=>({ ID:t.id, Grandeza:t.campo, Sensor:t.key, Tipo:t.tipo, Unidade:t.un, FaixaMin:t.faixaMin, FaixaMax:t.faixaMax, LimiteAlerta:t.limiteAlerta, LimiteCritico:t.limiteCritico, Direcao:t.direcao, Sensor2:t.sensor })));

  usePageChrome(["Administração","Catálogo · Dicionário"],
    <div className="flex gap-2">
      {canEdit && <IBtn icon={PlusCircle} label="Nova entrada" onClick={novaEntrada} />}
      <IBtn icon={Download} label="Exportar" onClick={exportar} />
    </div>
  );

  return (
    <>
      <div className="flex items-center gap-2 mb-1 text-[11px]" style={{ color: canEdit?C.steel:C.slate }}>
        {canEdit
          ? <span>✎ Edição habilitada — alterar um limite muda os alertas do motor em tempo real.</span>
          : <span className="flex items-center gap-1.5"><Lock size={11}/> Somente leitura — seu papel não pode editar o dicionário.</span>}
      </div>

      <div className="flex items-center gap-3 mb-1">
        <div className="relative flex-1 max-w-sm">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:C.slate }}/>
          <input placeholder="Buscar campo, sensor, unidade..." className="w-full pl-9 pr-3 py-2 text-xs rounded-md focus:outline-none" style={{ background:C.bgCard, border:`1px solid ${C.border}`, color:C.text }}/>
        </div>
      </div>

      <div className="rounded-lg overflow-hidden" style={{ border:`1px solid ${C.border}` }}>
        <table className="w-full" style={{ background:C.bgCard }}>
          <thead style={{ borderBottom:`1px solid ${C.border}` }}>
            <tr>
              {["ID Tag","Grandeza","Sensor","Faixa","Limite Alerta","Limite Crítico","Direção","Aplicável a", canEdit?"":""].map((h,i)=>(
                <th key={i} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color:C.slate }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dictionary.map((d,i)=>(
              <tr key={d.id} className="transition-all hover:bg-[#112035]"
                style={{ borderBottom:`1px solid ${C.border}40`, background:i%2===1?"rgba(12,24,41,0.5)":undefined }}>
                <td className="px-4 py-3"><span style={{ fontFamily:"'JetBrains Mono',monospace", color:C.steel, fontSize:10 }}>{d.id}</span></td>
                <td className="px-4 py-3 text-[12px] font-medium" style={{ color:C.text }}>{d.campo}</td>
                <td className="px-4 py-3"><span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background:`${C.steel}12`, color:C.steel }}>{TAG_LABEL[d.key]} ({TAG_UNIT[d.key]})</span></td>
                <td className="px-4 py-3 text-[11px] font-mono" style={{ color:C.slate }}>{d.faixaMin}–{d.faixaMax}</td>
                <td className="px-4 py-3">{numField(d,"limiteAlerta")}</td>
                <td className="px-4 py-3">{numField(d,"limiteCritico")}</td>
                <td className="px-4 py-3">
                  {canEdit
                    ? <select value={d.direcao} onChange={(e)=>patch(d, { direcao: e.target.value as "acima"|"abaixo" })} className="px-1.5 py-0.5 text-[11px] rounded focus:outline-none" style={{ background:C.bgDeep, border:`1px solid ${C.border}`, color:C.text }}><option value="acima">acima</option><option value="abaixo">abaixo</option></select>
                    : <span className="text-[11px]" style={{ color:C.textSub }}>{d.direcao}</span>}
                </td>
                <td className="px-4 py-3 text-[11px]" style={{ color:C.slate }}>{d.ativo}</td>
                {canEdit && <td className="px-4 py-3"><button onClick={()=>{ removeTag(d.id); toast("Tag removida", { description:d.campo }); }} className="p-1 rounded hover:bg-[#0A1525]" style={{ color:C.red }}><Trash2 size={12}/></button></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
