// ── Derived views ─────────────────────────────────────────────────────────────
// Combine static Asset records with their live twins into the shapes the screens
// render, plus the dashboard aggregations. Keeps page JSX close to the wireframe.

import { useStore } from "./useStore";
import type { Asset, AssetTwin, Alert, AssetStatus, Tag } from "@/lib/types";
import { fmtDayMonth } from "@/lib/format";
import { dailyRate } from "@/engine/degradation";
import { worstMode } from "@/engine/model";

export interface AssetView {
  id: string; nome: string; tipo: string; area: string; planta: string;
  saude: number; status: AssetStatus; leitura: string;
  crit: string; fab: string; modelo: string; serie: string; pot: string; rpm: string;
  asset: Asset; twin: AssetTwin | undefined;
}

export function assetView(asset: Asset, twin: AssetTwin | undefined): AssetView {
  return {
    id: asset.id, nome: asset.nome, tipo: asset.tipo, area: asset.area, planta: asset.planta,
    saude: twin?.health ?? 0,
    status: twin?.status ?? (asset.offline ? "offline" : "normal"),
    leitura: asset.offline ? "Offline" : "agora",
    crit: asset.criticidade,
    fab: asset.fabricante, modelo: asset.modelo, serie: asset.serie,
    pot: asset.potenciaKw != null ? `${asset.potenciaKw} kW` : "—",
    rpm: asset.rpmNominal != null ? asset.rpmNominal.toLocaleString("pt-BR") : "—",
    asset, twin,
  };
}

export function useAssetViews(): AssetView[] {
  const assets = useStore((s) => s.assets);
  const twins = useStore((s) => s.twins);
  return assets.map((a) => assetView(a, twins[a.id]));
}

export function statusCounts(views: AssetView[]) {
  const c = { normal: 0, atencao: 0, critico: 0, offline: 0 };
  for (const v of views) c[v.status] += 1;
  return c;
}

// Per-status nominal availability → fleet average (KPI).
const AVAIL: Record<AssetStatus, number> = { normal: 99.5, atencao: 98, critico: 92, offline: 70 };
export function fleetAvailability(views: AssetView[]): number {
  if (!views.length) return 0;
  return +(views.reduce((a, v) => a + AVAIL[v.status], 0) / views.length).toFixed(1);
}

// Alert bar chart — alerts created per day for the last `days` sim-days, by severity.
export function alertsByDay(alerts: Alert[], simClock: number, days = 7) {
  const out: { d: string; c: number; a: number; m: number }[] = [];
  const DAY = 24 * 60 * 60 * 1000;
  for (let i = days - 1; i >= 0; i--) {
    const dayStart = new Date(simClock - i * DAY);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = dayStart.getTime() + DAY;
    const inDay = alerts.filter((al) => al.criadoEm >= dayStart.getTime() && al.criadoEm < dayEnd);
    out.push({
      d: fmtDayMonth(dayStart),
      c: inDay.filter((a) => a.severidade === "critico").length,
      a: inDay.filter((a) => a.severidade === "alto").length,
      m: inDay.filter((a) => a.severidade === "medio" || a.severidade === "baixo").length,
    });
  }
  return out;
}

// Open-alert severity distribution (pie).
export function severityDistribution(alerts: Alert[]) {
  const open = alerts.filter((a) => a.status !== "resolvido");
  return {
    critico: open.filter((a) => a.severidade === "critico").length,
    alto: open.filter((a) => a.severidade === "alto").length,
    medio: open.filter((a) => a.severidade === "medio").length,
    baixo: open.filter((a) => a.severidade === "baixo").length,
  };
}

// Fleet health: a model-based reconstruction of the recent past (real) + forward
// projection (IA), since each twin only keeps a 24h sample window. Honest: the
// projection is the simulated engine's extrapolation, not a measured 30-day log.
export function fleetHealthTrend(assets: Asset[], twins: Record<string, AssetTwin>, dictionary: Tag[], simClock: number) {
  const online = assets.filter((a) => !a.offline && twins[a.id]);
  if (!online.length) return [] as { d: string; r: number | null; p: number | null }[];

  const avgHealth = online.reduce((s, a) => s + twins[a.id].health, 0) / online.length;
  // Average daily health drop from each twin's worst-mode degradation rate.
  const avgDrop = online.reduce((s, a) => {
    const tw = twins[a.id];
    return s + 100 * dailyRate(a, tw.state, tw.cargaPct, dictionary, worstMode(tw.damage));
  }, 0) / online.length;

  const DAY = 24 * 60 * 60 * 1000;
  const out: { d: string; r: number | null; p: number | null }[] = [];
  for (let off = -22; off <= 7; off++) {
    const d = fmtDayMonth(simClock + off * DAY);
    const r = off <= 0 ? +Math.max(0, Math.min(100, avgHealth + avgDrop * -off)).toFixed(1) : null;
    const p = off >= 0 ? +Math.max(0, Math.min(100, avgHealth - avgDrop * off)).toFixed(1) : null;
    out.push({ d, r, p });
  }
  return out;
}
