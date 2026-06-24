// ── Lista de Plantas ──────────────────────────────────────────────────────────
// Entry point of the asset flow: the project's plants (grouped from each asset's
// `planta`), each a card → /plantas/:planta (map + that plant's assets → asset
// detail / digital twin). A "Todos os ativos" icon opens a slide-over drawer with
// the full factory asset list (the bonus), each row → the asset's detail.
import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { Boxes, ChevronRight, Search, X, Factory, Cpu, AlertTriangle, WifiOff } from "lucide-react";
import { C } from "@/lib/theme";
import { IBtn, Bar_ } from "@/components/ui-shared";
import { usePageChrome } from "@/components/layout/chrome";
import { useAssetViews, statusCounts, type AssetView } from "@/store/derive";
import { useStore } from "@/store/useStore";

const SC: Record<string, string> = { normal: C.green, atencao: C.yellow, critico: C.red, offline: C.slate };

export default function ListaPlantas() {
  const navigate = useNavigate();
  const views = useAssetViews();
  const alerts = useStore((s) => s.alerts);
  const [drawer, setDrawer] = useState(false);
  const [q, setQ] = useState("");

  // Group assets by plant → one card per plant, with live aggregates.
  const plantas = useMemo(() => {
    const map = new Map<string, AssetView[]>();
    for (const v of views) {
      const p = v.planta || "Sem planta";
      if (!map.has(p)) map.set(p, []);
      map.get(p)!.push(v);
    }
    return [...map.entries()].map(([nome, items]) => {
      const counts = statusCounts(items);
      const saude = items.length ? Math.round(items.reduce((s, v) => s + v.saude, 0) / items.length) : 0;
      const abertos = alerts.filter((a) => a.status !== "resolvido" && items.some((v) => v.id === a.assetId)).length;
      return { nome, items, counts, saude, abertos };
    }).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [views, alerts]);

  usePageChrome(["Plantas", "Lista de Plantas"],
    <IBtn icon={Boxes} label="Todos os ativos" onClick={() => setDrawer(true)} />
  );

  const drawerData = views.filter((a) =>
    [a.nome, a.id, a.planta, a.area].some((f) => f.toLowerCase().includes(q.toLowerCase())));

  const openAsset = (id: string) => { setDrawer(false); navigate(`/ativos/${id}/overview`); };

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-bold" style={{ fontFamily: "'Rajdhani',sans-serif", color: C.text }}>Plantas do projeto</h2>
          <p className="text-[12px]" style={{ color: C.slate }}>Selecione uma planta para ver o mapa e seus ativos. Ou abra a lista completa de ativos da fábrica.</p>
        </div>
      </div>

      {/* Plant cards */}
      <div className="grid grid-cols-2 gap-4">
        {plantas.map((pl) => (
          <button key={pl.nome} onClick={() => navigate(`/plantas/${encodeURIComponent(pl.nome)}`)}
            className="group text-left rounded-xl p-5 transition-all hover:border-[rgba(130,200,229,0.3)] hover:bg-[#0C1B2E]"
            style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${C.cobalt}1A`, border: `1px solid ${C.cobalt}35` }}>
                <Factory size={22} style={{ color: C.steel }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[17px] font-bold leading-tight" style={{ fontFamily: "'Rajdhani',sans-serif", color: C.text }}>{pl.nome}</div>
                  <ChevronRight size={18} className="flex-shrink-0 transition-transform group-hover:translate-x-1" style={{ color: C.slate }} />
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: C.slate }}>{pl.items.length} {pl.items.length === 1 ? "ativo monitorado" : "ativos monitorados"}</div>
              </div>
            </div>

            {/* Status dots */}
            <div className="flex items-center gap-4 mt-4 text-[11px]">
              {([["normal", "Normais"], ["atencao", "Atenção"], ["critico", "Críticos"], ["offline", "Offline"]] as const).map(([k, l]) => (
                <span key={k} className="flex items-center gap-1.5" style={{ color: C.slate }}>
                  <span className="w-2 h-2 rounded-full inline-block" style={{ background: SC[k] }} />
                  <span className="font-mono font-bold" style={{ color: C.text }}>{pl.counts[k]}</span> {l}
                </span>
              ))}
            </div>

            {/* Health + alerts */}
            <div className="flex items-center gap-3 mt-4">
              <div className="flex items-center gap-2 flex-1">
                <span className="text-[10px] uppercase tracking-wider" style={{ color: C.slate }}>Saúde média</span>
                <div className="flex-1"><Bar_ v={pl.saude} /></div>
                <span className="text-[12px] font-mono font-bold w-9" style={{ color: pl.saude >= 75 ? C.green : pl.saude >= 50 ? C.yellow : C.red }}>{pl.saude}%</span>
              </div>
              {pl.abertos > 0 && (
                <span className="flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-1 rounded-md" style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", color: C.red }}>
                  <AlertTriangle size={11} /> {pl.abertos}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* ── Drawer: full factory asset list (bonus) ─────────────────────────── */}
      {drawer && (
        <div className="fixed inset-0 z-50 flex justify-end" style={{ background: "rgba(2,8,18,0.6)" }} onClick={() => setDrawer(false)}>
          <div className="w-full max-w-[460px] h-full flex flex-col shadow-2xl" style={{ background: C.bgDeep, borderLeft: `1px solid ${C.border}` }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3.5 flex-shrink-0" style={{ borderBottom: `1px solid ${C.border}` }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${C.cobalt}1A`, border: `1px solid ${C.cobalt}35` }}><Boxes size={15} style={{ color: C.steel }} /></div>
                <div>
                  <div className="text-[13px] font-bold" style={{ fontFamily: "'Rajdhani',sans-serif", color: C.text }}>Todos os ativos</div>
                  <div className="text-[10px]" style={{ color: C.slate }}>{views.length} ativos na fábrica</div>
                </div>
              </div>
              <button onClick={() => setDrawer(false)} className="p-1.5 rounded-md transition-all hover:bg-[#112035]" style={{ color: C.slate }}><X size={16} /></button>
            </div>

            <div className="p-3 flex-shrink-0" style={{ borderBottom: `1px solid ${C.border}` }}>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.slate }} />
                <input value={q} onChange={(e) => setQ(e.target.value)} autoFocus placeholder="Buscar por tag, nome, área ou planta..."
                  className="w-full pl-9 pr-3 py-2 text-[13px] rounded-lg focus:outline-none" style={{ background: C.bgCard, border: `1px solid ${C.border}`, color: C.text }} />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {drawerData.map((a) => (
                <button key={a.id} onClick={() => openAsset(a.id)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-all hover:bg-[#112035]"
                  style={{ border: `1px solid ${C.border}` }}>
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: SC[a.status] }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono" style={{ color: C.steel }}>{a.id}</span>
                      <span className="text-[12px] font-medium truncate" style={{ color: C.text }}>{a.nome}</span>
                    </div>
                    <div className="text-[10px] truncate" style={{ color: C.slate }}>{a.asset.tipo} · {a.area} · {a.planta}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {a.status === "offline"
                      ? <WifiOff size={12} style={{ color: C.slate }} />
                      : <span className="text-[11px] font-mono font-bold w-9 text-right" style={{ color: a.saude >= 75 ? C.green : a.saude >= 50 ? C.yellow : C.red }}>{a.saude}%</span>}
                    <ChevronRight size={14} style={{ color: C.slate }} />
                  </div>
                </button>
              ))}
              {drawerData.length === 0 && (
                <div className="flex flex-col items-center gap-2 text-center px-4 py-10">
                  <Cpu size={22} style={{ color: C.slate }} />
                  <div className="text-[12px]" style={{ color: C.slate }}>Nenhum ativo encontrado para "{q}".</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
