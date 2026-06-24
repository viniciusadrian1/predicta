// ── Planta (detalhe) ──────────────────────────────────────────────────────────
// One plant's view: its floor map (only this plant's assets) + the list of assets
// in it. Clicking an asset opens the asset detail (overview → telemetria → saúde IA
// → Gêmeo Digital → técnico), exactly as before. Reached from /plantas.
import { useMemo } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, ChevronRight, WifiOff, Boxes } from "lucide-react";
import { C } from "@/lib/theme";
import { Bar_ } from "@/components/ui-shared";
import { usePageChrome } from "@/components/layout/chrome";
import { useAssetViews, statusCounts } from "@/store/derive";
import { PlantaMapa } from "@/components/PlantaMapa";

const SC: Record<string, string> = { normal: C.green, atencao: C.yellow, critico: C.red, offline: C.slate };

export default function PlantaDetail() {
  const { planta } = useParams();
  const nome = decodeURIComponent(planta ?? "");
  const navigate = useNavigate();
  const views = useAssetViews();
  const items = useMemo(() => views.filter((v) => v.planta === nome), [views, nome]);
  const counts = statusCounts(items);

  usePageChrome(["Plantas", nome],
    <button onClick={() => navigate("/plantas")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all hover:bg-[#112035]"
      style={{ border: `1px solid ${C.border}`, color: C.slate }}>
      <ArrowLeft size={13} /> Plantas
    </button>
  );

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 text-center py-20">
        <Boxes size={28} style={{ color: C.slate }} />
        <div className="text-[14px] font-medium" style={{ color: C.text }}>Nenhum ativo em "{nome}".</div>
        <button onClick={() => navigate("/plantas")} className="text-[12px] px-3 py-1.5 rounded-md" style={{ background: C.cobalt, color: "#fff" }}>Voltar para plantas</button>
      </div>
    );
  }

  const legend = (
    <div className="flex items-center gap-4 text-[10px]" style={{ color: C.slate }}>
      {Object.entries(SC).map(([s, c]) => (
        <span key={s} className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full inline-block" style={{ background: c }} />{s.charAt(0).toUpperCase() + s.slice(1)}</span>
      ))}
    </div>
  );

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Map */}
      <div className="col-span-2 rounded-lg p-4" style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-[14px] font-bold" style={{ fontFamily: "'Rajdhani',sans-serif", color: C.text }}>{nome} — Vista Superior</h3>
            <div className="text-[11px]" style={{ color: C.slate }}>{items.length} ativos · {counts.critico} críticos · {counts.offline} offline</div>
          </div>
          {legend}
        </div>
        <PlantaMapa assets={items} />
      </div>

      {/* Assets of this plant */}
      <div className="rounded-lg p-4" style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
        <h3 className="text-[13px] font-bold uppercase tracking-widest mb-3" style={{ fontFamily: "'Rajdhani',sans-serif", color: C.text }}>Ativos da planta</h3>
        <div className="space-y-1.5">
          {items.map((a) => (
            <button key={a.id} onClick={() => navigate(`/ativos/${a.id}/overview`)}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-all hover:bg-[#112035]"
              style={{ border: `1px solid ${C.border}` }}>
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: SC[a.status] }} />
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-medium truncate" style={{ color: C.text }}>{a.nome}</div>
                <div className="text-[10px] font-mono" style={{ color: C.slate }}>{a.id} · {a.area}</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {a.status === "offline"
                  ? <WifiOff size={12} style={{ color: C.slate }} />
                  : <div className="flex items-center gap-1.5 w-20"><Bar_ v={a.saude} /><span className="text-[11px] font-mono font-bold w-8" style={{ color: a.saude >= 75 ? C.green : a.saude >= 50 ? C.yellow : C.red }}>{a.saude}%</span></div>}
                <ChevronRight size={14} style={{ color: C.slate }} />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
