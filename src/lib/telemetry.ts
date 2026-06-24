// ── Telemetry helpers ─────────────────────────────────────────────────────────
// Window + shape the twin's rolling history for charts and CSV export.

import type { TelemetrySample, TagKey } from "@/lib/types";
import { fmtTime } from "./format";

export type Win = "1h" | "6h" | "24h" | "7d" | "30d";
const WIN_MS: Record<Win, number> = {
  "1h": 3600e3, "6h": 6 * 3600e3, "24h": 24 * 3600e3, "7d": 7 * 24 * 3600e3, "30d": 30 * 24 * 3600e3,
};

export function windowSamples(history: TelemetrySample[], win: Win): TelemetrySample[] {
  if (!history.length) return [];
  const latest = history[history.length - 1].t;
  const cutoff = latest - WIN_MS[win];
  return history.filter((s) => s.t >= cutoff);
}

export interface ChartPoint {
  t: number; h: string;
  temp: number; vib: number; press: number; corrente: number; rpm: number; oleo: number;
}

export function toChartData(samples: TelemetrySample[]): ChartPoint[] {
  return samples.map((s) => ({
    t: s.t, h: fmtTime(s.t),
    temp: s.temp, vib: s.vib, press: s.press, corrente: s.corrente, rpm: s.rpm, oleo: s.oleo,
  }));
}

export function stats(samples: TelemetrySample[], key: TagKey) {
  const vals = samples.map((s) => s[key]);
  if (!vals.length) return { min: 0, max: 0, avg: 0 };
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  return { min, max, avg };
}
