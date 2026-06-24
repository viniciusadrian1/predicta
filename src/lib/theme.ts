// ── Predicta design system — color palette + helpers ──────────────────────────
// Extracted verbatim from the original App.tsx `C` object. This is the single
// source of truth for colors across the whole app. Do not hardcode hex values
// elsewhere — import from here.

export const C = {
  bg:      "#07101E",
  bgCard:  "#0C1829",
  bgDeep:  "#050C16",
  bgHover: "#112035",
  bgInput: "#091422",
  navy:    "#000080",
  cobalt:  "#0047AB",
  steel:   "#82C8E5",
  slate:   "#6D8196",
  text:    "#DDE6F0",
  textSub: "#8FA8BC",
  border:  "rgba(130,200,229,0.1)",
  borderMd:"rgba(130,200,229,0.2)",
  green:   "#34D399",
  yellow:  "#FBBF24",
  red:     "#F87171",
  orange:  "#FB923C",
} as const;

export type ColorKey = keyof typeof C;

// Health score (0–100) → status color. Mirrors the inline `v>=75?green:v>=50?yellow:red`
// expression used throughout the screens.
export function corDaSaude(v: number): string {
  return v >= 75 ? C.green : v >= 50 ? C.yellow : C.red;
}

// Asset operational status → dot/badge color.
export function corDoStatus(status: string): string {
  const map: Record<string, string> = {
    normal: C.green,
    atencao: C.yellow,
    critico: C.red,
    offline: C.slate,
  };
  return map[status] ?? C.slate;
}

// Criticality label → emphasis color (used in the asset list).
export function corDaCriticidade(crit: string): string {
  if (crit === "Crítica" || crit === "Alta") return C.orange;
  if (crit === "Média") return C.yellow;
  return C.slate;
}
