// 5–9. Detalhe do Ativo ────────────────────────────────────────────────────────
// Layout for /ativos/:id — resolves the asset + its live digital twin from the
// store and feeds them to the tab sub-routes via the outlet context. Tabs:
// overview / telemetria / saude / gemeo / tecnico.
import { useParams, useNavigate, Outlet, NavLink, useOutletContext } from "react-router";
import { Cpu, MapPin, Package, Wifi, WifiOff, MessageSquare, Bell, Wrench } from "lucide-react";
import { C } from "@/lib/theme";
import { Badge, IBtn } from "@/components/ui-shared";
import { usePageChrome } from "@/components/layout/chrome";
import { useStore } from "@/store/useStore";
import { recommendationsFor } from "@/lib/recommendations";
import { HierarchyBreadcrumb, assetCrumb, CritBadge } from "@/components/gov";
import type { Asset, AssetTwin } from "@/lib/types";

export interface AtivoCtx { asset: Asset; twin: AssetTwin | undefined }
export function useAtivo() { return useOutletContext<AtivoCtx>(); }

const TABS = [
  { l:"Visão Geral",     to:"overview"   },
  { l:"Telemetria",      to:"telemetria" },
  { l:"Saúde & IA",      to:"saude"      },
  { l:"Gêmeo Digital",   to:"gemeo"      },
  { l:"Dados Técnicos",  to:"tecnico"    },
];

const AVAIL: Record<string, number> = { normal: 99.5, atencao: 98, critico: 92, offline: 70 };

export default function AtivoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const assets = useStore((s) => s.assets);
  const twins = useStore((s) => s.twins);
  const asset = assets.find((a) => a.id === id) ?? assets[0];
  const twin = twins[asset.id];

  const saude = twin?.health ?? 0;
  const status = twin?.status ?? (asset.offline ? "offline" : "normal");
  const recs = twin ? recommendationsFor(twin, 0.15) : [];
  const proxManut = recs[0] ? `${recs[0].prazoDias} d` : "—";

  usePageChrome(["Ativos","Lista de Ativos",asset.id],
    <div className="flex items-center gap-2">
      <IBtn icon={MessageSquare} label="Assistente" onClick={()=>navigate(`/assistente/${asset.id}`)} />
      <IBtn icon={Bell} label="Alertas" onClick={()=>navigate("/alertas")} />
      <IBtn icon={Wrench} label="Ordem de Serviço" onClick={()=>navigate(`/ordens?novo=${asset.id}`)} />
    </div>
  );

  return (
    <>
      {/* Asset header */}
      <div className="flex items-center gap-5 p-4 rounded-lg" style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background:`${C.cobalt}20`, border:`1px solid ${C.cobalt}35` }}>
          <Cpu size={22} style={{ color:C.steel }} />
        </div>
        <div className="flex-1">
          <div className="mb-1"><HierarchyBreadcrumb items={assetCrumb(asset)} /></div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-[18px] font-bold" style={{ fontFamily:"'Rajdhani',sans-serif", color:C.text }}>{asset.nome}</h1>
            <Badge s={status} />
            <CritBadge crit={asset.criticidade} />
            <span className="text-[11px] px-2 py-0.5 rounded font-mono" style={{ background:C.bgDeep, border:`1px solid ${C.border}`, color:C.steel }}>{asset.id}</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]" style={{ color:C.slate }}>
            <span className="flex items-center gap-1"><MapPin size={10}/>{asset.area} — {asset.planta}</span>
            <span className="flex items-center gap-1"><Package size={10}/>{asset.tipo}</span>
            {status==="offline"
              ? <span className="flex items-center gap-1"><WifiOff size={10}/>Offline</span>
              : <span className="flex items-center gap-1"><Wifi size={10} style={{ color:C.green }}/>Ao vivo</span>}
          </div>
        </div>
        <div className="flex items-center gap-6">
          {[
            { v:`${saude}%`, l:"Saúde", c:saude>=75?C.green:saude>=50?C.yellow:C.red },
            { v:proxManut,   l:"Próx. Manut.", c:C.steel },
            { v:`${AVAIL[status]}%`, l:"Disponib.", c:C.textSub },
          ].map(s=>(
            <div key={s.l} className="text-center">
              <div className="text-2xl font-bold" style={{ fontFamily:"'Rajdhani',sans-serif", color:s.c }}>{s.v}</div>
              <div className="text-[10px] mt-0.5" style={{ color:C.slate }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 pb-0" style={{ borderBottom:`1px solid ${C.border}` }}>
        {TABS.map(t=>(
          <NavLink key={t.to} to={t.to}
            className="px-4 py-2.5 text-xs font-medium border-b-2 -mb-px transition-all"
            style={({ isActive })=>({ borderBottomColor:isActive?C.steel:"transparent", color:isActive?C.steel:C.slate })}>
            {t.l}
          </NavLink>
        ))}
      </div>

      <Outlet context={{ asset, twin } satisfies AtivoCtx} />
    </>
  );
}
