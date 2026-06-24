// 4. Lista de Ativos ───────────────────────────────────────────────────────────
import { useState } from "react";
import { useNavigate } from "react-router";
import { Download, PlusCircle, Search, SlidersHorizontal, Eye, MoreHorizontal, WifiOff } from "lucide-react";
import { C } from "@/lib/theme";
import { IBtn, Badge, Bar_ } from "@/components/ui-shared";
import { usePageChrome } from "@/components/layout/chrome";
import { useAssetViews } from "@/store/derive";
import { downloadCSV } from "@/lib/csv";
import { useCan } from "@/auth/rbac";
import { GatedButton, CritBadge } from "@/components/gov";

export default function AtivosLista() {
  const navigate = useNavigate();
  const views = useAssetViews();
  const canCadastrar = useCan("Cadastro", "full");
  const [q, setQ] = useState("");
  const data = views.filter((a) => a.nome.toLowerCase().includes(q.toLowerCase()) || a.id.toLowerCase().includes(q.toLowerCase()));

  const exportar = () =>
    downloadCSV(`ativos-${Date.now()}`, views.map((a) => ({
      Tag: a.id, Nome: a.nome, Tipo: a.asset.tipo, Area: a.area, Planta: a.planta,
      Status: a.status, "Saude(%)": a.saude, Criticidade: a.crit,
      Fabricante: a.fab, Modelo: a.modelo, Serie: a.serie, Potencia: a.pot, RPM: a.rpm,
    })));

  usePageChrome(["Ativos","Lista de Ativos"],
    <div className="flex items-center gap-2">
      <IBtn icon={Download} label="Exportar" onClick={exportar} />
      {canCadastrar && (
        <GatedButton modulo="Cadastro" nivel="full" onClick={()=>navigate("/cadastro")} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-md transition-all hover:brightness-110"
          style={{ background:C.cobalt }}><PlusCircle size={12}/> Novo Ativo</GatedButton>
      )}
    </div>
  );

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:C.slate }} />
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar por tag, nome ou área..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg focus:outline-none"
            style={{ background:C.bgCard, border:`1px solid ${C.border}`, color:C.text }} />
        </div>
        {["Todos os Status","Normal","Atenção","Crítico","Offline"].map((o,i)=>(
          <select key={i} className="px-3 py-2 text-xs rounded-md focus:outline-none" style={{ background:C.bgCard, border:`1px solid ${C.border}`, color:C.text }}><option>{o}</option></select>
        )).slice(0,3)}
        <IBtn icon={SlidersHorizontal} label="Filtros" />
      </div>

      <div className="rounded-lg overflow-hidden" style={{ border:`1px solid ${C.border}` }}>
        <table className="w-full" style={{ background:C.bgCard }}>
          <thead style={{ borderBottom:`1px solid ${C.border}` }}>
            <tr>
              {["Tag","Nome / Tipo","Área / Planta","Status","Saúde","Criticidade","Última Leitura",""].map(h=>(
                <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color:C.slate }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((a,i)=>(
              <tr key={a.id} onClick={()=>navigate(`/ativos/${a.id}/overview`)} className="cursor-pointer transition-all hover:bg-[#112035]"
                style={{ borderBottom:`1px solid ${C.border}40`, background:i%2===1?"rgba(12,24,41,0.5)":undefined }}>
                <td className="px-4 py-3"><span style={{ fontFamily:"'JetBrains Mono',monospace", color:C.steel, fontSize:11 }}>{a.id}</span></td>
                <td className="px-4 py-3">
                  <div className="text-[12px] font-medium" style={{ color:C.text }}>{a.nome}</div>
                  <div className="text-[10px]" style={{ color:C.slate }}>{a.asset.tipo}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-[11px]" style={{ color:C.textSub }}>{a.area}</div>
                  <div className="text-[10px]" style={{ color:C.slate }}>{a.planta}</div>
                </td>
                <td className="px-4 py-3"><Badge s={a.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 w-24">
                    <Bar_ v={a.saude} />
                    <span className="text-[11px] font-mono font-bold w-8" style={{ color:a.saude>=75?C.green:a.saude>=50?C.yellow:C.red }}>{a.saude}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-[11px] font-mono" style={{ color:a.crit==="Crítica"||a.crit==="Alta"?C.orange:a.crit==="Média"?C.yellow:C.slate }}><CritBadge crit={a.crit} /></td>
                <td className="px-4 py-3 text-[11px] font-mono" style={{ color:C.slate }}>
                  {a.status==="offline"?<span className="flex items-center gap-1"><WifiOff size={10}/>Offline</span>:"ao vivo"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button className="p-1 rounded transition-all hover:bg-[#0A1525]" style={{ color:C.slate }}><Eye size={12}/></button>
                    <button className="p-1 rounded transition-all hover:bg-[#0A1525]" style={{ color:C.slate }}><MoreHorizontal size={12}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderTop:`1px solid ${C.border}`, background:C.bgCard }}>
          <span className="text-[11px]" style={{ color:C.slate }}>Exibindo {data.length} de {views.length} ativos</span>
          <div className="flex items-center gap-1">
            {[1,2,3,"...",12].map((p,i)=>(
              <button key={i} className="w-7 h-7 text-[11px] rounded transition-all"
                style={p===1?{background:`${C.cobalt}30`,border:`1px solid ${C.cobalt}50`,color:C.steel}:{color:C.slate}}>{p}</button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
