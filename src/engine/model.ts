// ── Physical model (shared core) ──────────────────────────────────────────────
// The transparent, physics-informed relationships between accumulated damage,
// operating load, and the sensor readings the twin "measures". Used by both the
// seed (initial twin state) and the simulation loop (engine/simulation.ts).
//
// HONESTY: this is a *simulated* degradation model, not a model trained on real
// failures. Constants are chosen to be plausible and legible, not calibrated.

import type { Asset, AssetTwin, AssetStatus, FailureMode, TelemetrySample } from "@/lib/types";
import { FAILURE_MODES } from "@/lib/types";

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function zeroDamage(): Record<FailureMode, number> {
  return { rolamento: 0, desalinhamento: 0, lubrificacao: 0, isolamento: 0, cavitacao: 0 };
}

// Health 0..100 driven by the worst failure mode (the bottleneck), with a small
// secondary penalty so multiple growing modes still pull health down.
export function healthFromDamage(damage: Record<FailureMode, number>): number {
  const vals = FAILURE_MODES.map((m) => damage[m]).sort((a, b) => b - a);
  const worst = vals[0];
  const secondary = vals.slice(1).reduce((a, b) => a + b, 0); // sum of the rest
  const effective = clamp(worst + 0.12 * secondary, 0, 1);
  return clamp(Math.round(100 * (1 - effective)), 0, 100);
}

export function statusFromHealth(health: number, offline?: boolean): AssetStatus {
  if (offline) return "offline";
  if (health >= 75) return "normal";
  if (health >= 50) return "atencao";
  return "critico";
}

export function worstMode(damage: Record<FailureMode, number>): FailureMode {
  return FAILURE_MODES.reduce((best, m) => (damage[m] > damage[best] ? m : best), FAILURE_MODES[0]);
}

// ── Base operating point (nominal, healthy) ───────────────────────────────────
export function flaFromKw(kw: number | null): number {
  // very rough nameplate full-load amps for a 380V 3-phase machine
  return kw ? Math.max(4, kw * 1.65) : 40;
}

export interface BaseInputs { cargaPct: number; ambientDelta: number }

export function baseTemp(_a: Asset, { cargaPct, ambientDelta }: BaseInputs): number {
  return 24 + ambientDelta + 42 * cargaPct;           // ~24..66 °C
}
export function baseVib(_a: Asset, { cargaPct }: BaseInputs): number {
  return 1.6 + 0.9 * cargaPct;                          // ~1.6..2.7 mm/s
}
export function basePress(_a: Asset, { cargaPct }: BaseInputs): number {
  return 4.4 + 1.0 * cargaPct;                          // ~4.4..5.6 bar
}
export function baseCorrente(a: Asset, { cargaPct }: BaseInputs): number {
  return flaFromKw(a.potenciaKw) * (0.55 + 0.45 * cargaPct);
}
export function baseRpm(a: Asset): number {
  return a.rpmNominal ?? 1500;
}

// Deterministic-ish jitter from a seed (avoids Math.random so reloads are stable).
export function jitter(seed: number, amp: number): number {
  const s = Math.sin(seed * 12.9898) * 43758.5453;
  return (s - Math.floor(s) - 0.5) * 2 * amp;
}

// Build a sensor reading from the current damage + load. `noiseSeed` drives a
// small reproducible jitter; pass a per-tick value for live variation, or a fixed
// value for a stable snapshot.
export function readingFromState(
  a: Asset,
  damage: Record<FailureMode, number>,
  cargaPct: number,
  ambientDelta: number,
  noiseSeed = 0,
): Omit<TelemetrySample, "t"> {
  const bi: BaseInputs = { cargaPct, ambientDelta };

  const driftTermico = damage.isolamento * 32 + damage.lubrificacao * 12;
  const driftVib = damage.rolamento * 6.5 + damage.desalinhamento * 3.2;

  const temp = baseTemp(a, bi) + driftTermico + jitter(noiseSeed + 1, 0.8);
  const vib = baseVib(a, bi) + driftVib + jitter(noiseSeed + 2, 0.08);
  const press = basePress(a, bi) - damage.cavitacao * 2.6 + jitter(noiseSeed + 3, 0.06);
  const corrente = baseCorrente(a, bi) + damage.rolamento * 9 + jitter(noiseSeed + 4, 0.6);
  const rpm = baseRpm(a) * (1 - damage.desalinhamento * 0.03) + jitter(noiseSeed + 5, 3);
  const oleo = clamp(100 - damage.lubrificacao * 100, 0, 100) + jitter(noiseSeed + 6, 0.4);

  return {
    temp: +temp.toFixed(1),
    vib: +vib.toFixed(2),
    press: +clamp(press, 0, 16).toFixed(2),
    corrente: +clamp(corrente, 0, 999).toFixed(1),
    rpm: Math.round(clamp(rpm, 0, 6000)),
    oleo: +clamp(oleo, 0, 100).toFixed(1),
  };
}

// Recompute the derived twin fields (health/status/modoCritico) from its damage.
// RUL + probFalha are filled by engine/prediction.ts.
export function deriveTwinHealth(twin: AssetTwin, offline?: boolean): void {
  twin.health = healthFromDamage(twin.damage);
  twin.status = statusFromHealth(twin.health, offline);
  twin.modoCritico = worstMode(twin.damage);
}
