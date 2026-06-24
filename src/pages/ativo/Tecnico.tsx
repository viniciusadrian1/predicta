// Ativo — Dados Técnicos ───────────────────────────────────────────────────────
import { Radio } from "lucide-react";
import { C } from "@/lib/theme";
import { SH } from "@/components/ui-shared";
import { fmtDate } from "@/lib/format";
import { useAtivo } from "../AtivoDetail";
import { TraceableValue } from "@/components/gov";

export default function AtivoTecnico() {
  const { asset } = useAtivo();
  const pot = asset.potenciaKw != null ? `${asset.potenciaKw} kW` : "—";
  const rpm = asset.rpmNominal != null
    ? <TraceableValue tagKey="rpm">{`${asset.rpmNominal.toLocaleString("pt-BR")} rpm`}</TraceableValue>
    : "—";
  const fla = asset.limites?.corrente
    ? <TraceableValue tagKey="corrente">{`${Math.round((asset.limites.corrente.alerta)/1.05)} A`}</TraceableValue>
    : "—";
  return (
    <div className="grid grid-cols-2 gap-4">
      {[
        { title:"Identificação", rows:[["Tag / ID",asset.id],["Nome",asset.nome],["Tipo",asset.tipo],["N° de Série",asset.serie],["Fabricante",asset.fabricante],["Modelo",asset.modelo],["Criticidade",asset.criticidade],["Data de Instalação",fmtDate(asset.instaladoEm)]] },
        { title:"Dados Técnicos", rows:[["Potência Nominal",pot],["Rotação Nominal",rpm],["Classe de Proteção","IP55"],["Tensão de Operação","380V / 60Hz"],["Corrente Nominal (FLA)", fla],["Área","" + asset.area],["Planta",asset.planta],["Status","Monitorado"]] },
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
