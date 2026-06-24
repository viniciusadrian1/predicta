// ── PlantaMapa ────────────────────────────────────────────────────────────────
// Reusable plant floor-plan: the illustrated map (public/mapa-planta.png) with a
// live status marker over each asset passed in. Used by the per-plant view
// (PlantaDetail) to show only that plant's assets on the shared floor plan.
// Positions are percent-of-image (POS); assets without a position are skipped here
// (they still appear in the plant's asset list beside the map).
import { useState } from "react";
import { useNavigate } from "react-router";
import { ImageOff } from "lucide-react";
import { C } from "@/lib/theme";
import type { AssetView } from "@/store/derive";

const MAP_SRCS = ["/mapa-planta.png", "/mapa-planta.jpg", "/mapa-planta.jpeg", "/mapa-planta.webp"];
const SC: Record<string, string> = { normal: C.green, atencao: C.yellow, critico: C.red, offline: C.slate };

// Marker position over the illustration, as percent of image width/height.
const POS: Record<string, { x: number; y: number }> = {
  "BCP-01": { x: 20.5, y: 16.0 },
  "BCP-02": { x: 20.5, y: 30.0 },
  "CA-03":  { x: 47.5, y: 15.5 },
  "ME-07":  { x: 60.0, y: 27.0 },
  "MWE-22": { x: 69.0, y: 15.5 },
  "RV-12":  { x: 18.5, y: 51.0 },
  "VT-05":  { x: 48.7, y: 43.5 },
  "VC-08":  { x: 69.5, y: 49.0 },
  "GR-04":  { x: 18.5, y: 66.5 },
  "TR-09":  { x: 41.0, y: 66.5 },
  "TG-01":  { x: 66.0, y: 67.5 },
};

export function PlantaMapa({ assets }: { assets: AssetView[] }) {
  const navigate = useNavigate();
  const [srcIdx, setSrcIdx] = useState(0);
  const imgOk = srcIdx < MAP_SRCS.length;

  return (
    <div className="relative rounded-lg overflow-hidden" style={{ background: C.bgDeep }}>
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

      {imgOk && assets.map((v) => {
        const p = POS[v.id]; if (!p) return null;
        const c = SC[v.status] ?? C.green;
        return (
          <button key={v.id} onClick={() => navigate(`/ativos/${v.id}/overview`)}
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
  );
}
