// 11. Mapa da Planta ───────────────────────────────────────────────────────────
// Illustrated plant floor-plan (public/mapa-planta.png) as the background, with a
// live status marker over each machine. Markers are positioned by percent of the
// image (POS table) so the layout is responsive; clicking a marker opens the asset.
// DEV: click anywhere on the map to log the %-coords (handy for tuning POS).
import { useState } from "react";
import { useNavigate } from "react-router";
import { Download, ImageOff } from "lucide-react";
import { C } from "@/lib/theme";
import { SH, IBtn } from "@/components/ui-shared";
import { usePageChrome } from "@/components/layout/chrome";
import { useAssetViews, statusCounts } from "@/store/derive";
import { downloadCSV } from "@/lib/csv";

// Candidate paths (served from public/). First that loads wins.
const MAP_SRCS = ["/mapa-planta.png", "/mapa-planta.jpg", "/mapa-planta.jpeg", "/mapa-planta.webp"];
const SC: Record<string, string> = { normal: C.green, atencao: C.yellow, critico: C.red, offline: C.slate };

// Marker position over the illustration, as percent of image width/height. Each
// sits just above its machine. Tune via the DEV click-to-log helper below.
const POS: Record<string, { x: number; y: number }> = {
  "BCP-01": { x: 20.5, y: 16.0 },
  "BCP-02": { x: 20.5, y: 30.0 },
  "CA-03":  { x: 47.5, y: 15.5 },
  "ME-07":  { x: 60.0, y: 27.0 },   // trocado de lugar com o MWE-22
  "MWE-22": { x: 69.0, y: 15.5 },   // Motor WEG W22 — agora na posição original do ME-07 (Produção A)
  "RV-12":  { x: 18.5, y: 51.0 },
  "VT-05":  { x: 48.7, y: 43.5 },
  "VC-08":  { x: 69.5, y: 49.0 },
  "GR-04":  { x: 18.5, y: 66.5 },
  "TR-09":  { x: 41.0, y: 66.5 },
  "TG-01":  { x: 66.0, y: 67.5 },
};

export default function MapaPlanta() {
  const navigate = useNavigate();
  const views = useAssetViews();
  const [srcIdx, setSrcIdx] = useState(0);
  const imgOk = srcIdx < MAP_SRCS.length;
  const counts = statusCounts(views);

  const exportar = () => downloadCSV(`mapa-planta-${Date.now()}`,
    views.map((v) => ({ Tag: v.id, Nome: v.nome, Tipo: v.tipo, Area: v.area, Status: v.status, "Saude(%)": v.saude })));

  // DEV-only: click the map to log the %-coordinates of where you clicked.
  const logCoords = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!import.meta.env.DEV) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (((e.clientX - r.left) / r.width) * 100).toFixed(1);
    const y = (((e.clientY - r.top) / r.height) * 100).toFixed(1);
    // eslint-disable-next-line no-console
    console.log(`mapa-planta click → { x: ${x}, y: ${y} }`);
  };

  usePageChrome(["Ativos", "Mapa da Planta"],
    <div className="flex gap-2"><IBtn icon={Download} label="Exportar" onClick={exportar} /></div>
  );

  const legend = (
    <div className="flex items-center gap-4 text-[10px]" style={{ color: C.slate }}>
      {Object.entries(SC).map(([s, c]) => (
        <span key={s} className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full inline-block" style={{ background: c }} />{s.charAt(0).toUpperCase() + s.slice(1)}</span>
      ))}
    </div>
  );

  return (
    <div className="grid grid-cols-4 gap-4">
      <div className="col-span-3 rounded-lg p-4" style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
        <SH title="Planta Industrial — Vista Superior" right={legend} />

        <div className="relative rounded-lg overflow-hidden" style={{ background: C.bgDeep }} onClick={logCoords}>
          {imgOk ? (
            <img src={MAP_SRCS[srcIdx]} alt="Planta industrial" className="w-full block select-none" draggable={false} onError={() => setSrcIdx((i) => i + 1)} />
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 text-center px-6" style={{ minHeight: 360 }}>
              <ImageOff size={26} style={{ color: C.slate }} />
              <div className="text-[13px] font-medium" style={{ color: C.text }}>Imagem da planta não encontrada</div>
              <div className="text-[11px] leading-relaxed" style={{ color: C.slate }}>
                Salve a ilustração da planta em <span className="font-mono" style={{ color: C.steel }}>public/mapa-planta.png</span> e recarregue.
              </div>
            </div>
          )}

          {imgOk && views.map((v) => {
            const p = POS[v.id]; if (!p) return null;
            const c = SC[v.status] ?? C.green;
            return (
              <button key={v.id} onClick={(e) => { e.stopPropagation(); navigate(`/ativos/${v.id}/overview`); }}
                title={`${v.id} — ${v.nome} · ${v.status} · saúde ${v.saude}%`}
                className="absolute -translate-x-1/2 -translate-y-1/2 group"
                style={{ left: `${p.x}%`, top: `${p.y}%` }}>
                <span className="relative flex items-center justify-center">
                  <span className="absolute w-6 h-6 rounded-full animate-ping" style={{ background: c, opacity: 0.25 }} />
                  <span className="w-3.5 h-3.5 rounded-full" style={{ background: c, border: "2px solid rgba(255,255,255,0.85)", boxShadow: `0 0 8px ${c}` }} />
                </span>
                <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 whitespace-nowrap text-[9px] font-mono px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ background: C.bgDeep, border: `1px solid ${c}`, color: C.text }}>
                  {v.id} · {v.saude}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <div className="rounded-lg p-4" style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
          <SH title="Resumo" />
          {([["Total", String(views.length), C.steel], ["Normais", String(counts.normal), C.green], ["Atenção", String(counts.atencao), C.yellow], ["Críticos", String(counts.critico), C.red], ["Offline", String(counts.offline), C.slate]] as const).map(([l, v, c]) => (
            <div key={l} className="flex justify-between py-1.5 text-[11px]">
              <span style={{ color: C.slate }}>{l}</span>
              <span className="font-bold font-mono" style={{ color: c as string }}>{v}</span>
            </div>
          ))}
        </div>
        <div className="rounded-lg p-4" style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
          <SH title="Ativos" />
          {views.map((a) => (
            <button key={a.id} onClick={() => navigate(`/ativos/${a.id}/overview`)}
              className="w-full flex items-center gap-2 p-1.5 rounded-md transition-all hover:bg-[#112035] mb-1">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: SC[a.status] }} />
              <div className="flex-1 min-w-0 text-left">
                <div className="text-[11px] truncate" style={{ color: C.text }}>{a.nome}</div>
                <div className="text-[10px] font-mono" style={{ color: C.slate }}>{a.id} · {a.area}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
