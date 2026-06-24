// ── pt-BR formatting helpers ──────────────────────────────────────────────────
// Centralized formatting so dates/numbers/units stay consistent. Expanded in
// later phases (live telemetry, exports). Phase 0 ships a small, safe baseline.

const NF = new Intl.NumberFormat("pt-BR");

export function fmtNum(n: number, decimals = 0): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

export function fmtInt(n: number): string {
  return NF.format(Math.round(n));
}

// "23/06/2025 14:32"
export function fmtDateTime(d: Date | number): string {
  const date = typeof d === "number" ? new Date(d) : d;
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Short label like "Jun 10" (matches the wireframe's compact axis style).
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
export function fmtShortDate(d: Date | number): string {
  const date = typeof d === "number" ? new Date(d) : d;
  return `${MESES[date.getMonth()]} ${date.getDate()}`;
}

// "14:32"
export function fmtTime(d: Date | number): string {
  const date = typeof d === "number" ? new Date(d) : d;
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// "14:32:07"
export function fmtTimeSec(d: Date | number): string {
  const date = typeof d === "number" ? new Date(d) : d;
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// "23/06" — compact day/month for chart axes
export function fmtDayMonth(d: Date | number): string {
  const date = typeof d === "number" ? new Date(d) : d;
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
}

// "23/06/2025" — accepts a Date, ms timestamp, or ISO/date string (Asset.instaladoEm
// is an ISO string; passing a string to the old number-only path threw at runtime).
export function fmtDate(d: Date | number | string): string {
  const date = d instanceof Date ? d
    : typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(d + "T00:00:00") // local, not UTC
    : new Date(d ?? NaN);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// Relative "há X" label from a past timestamp to a reference (simulated) clock.
export function fmtAgo(fromMs: number, nowMs: number): string {
  const sec = Math.max(0, Math.round((nowMs - fromMs) / 1000));
  if (sec < 60) return `${sec} seg`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h`;
  return `${Math.round(h / 24)} d`;
}
