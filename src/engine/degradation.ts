// ── Degradation models ────────────────────────────────────────────────────────
// How accumulated damage grows each tick, per failure mode, as a function of the
// current operating stress. Physics-informed and transparent — NOT calibrated on
// real failures. All constants are gathered here so they're easy to reason about.

import type { Asset, FailureMode, TagKey, Tag, TelemetrySample } from "@/lib/types";
import { clamp } from "./model";

// Per-mode growth constants (per hour of simulated operation).
export const K: Record<FailureMode, number> = {
  rolamento: 1.5e-4,      // bearing wear ∝ vibration · speed ratio
  isolamento: 2.0e-4,     // thermal/insulation aging ∝ Arrhenius(temp)
  lubrificacao: 4.0e-4,   // oil depletion ∝ load (~80 days to dry at full load)
  desalinhamento: 5.0e-5, // slow misalignment creep
  cavitacao: 3.0e-4,      // only while suction pressure is low
};

const TEMP_REF = 70; // °C reference for the simplified Arrhenius term

function pressAlertThreshold(dictionary: Tag[]): number {
  return dictionary.find((t) => t.key === "press")?.limiteAlerta ?? 3.8;
}

// Damage increments for `dtHours` of operation at the given reading + load.
export function damageIncrements(
  asset: Asset,
  reading: TelemetrySample | Omit<TelemetrySample, "t">,
  cargaPct: number,
  dictionary: Tag[],
  dtHours: number,
): Record<FailureMode, number> {
  const rpmRatio = asset.rpmNominal ? clamp(reading.rpm / asset.rpmNominal, 0, 2) : 1;
  // Low oil accelerates bearing wear (friction up once oil < 50%).
  const oleoFactor = 1 + 2 * Math.max(0, 0.5 - reading.oleo / 100);

  const dRol = K.rolamento * Math.max(reading.vib, 0.1) * rpmRatio * oleoFactor * dtHours;
  const dIso = K.isolamento * Math.exp((reading.temp - TEMP_REF) / 10) * dtHours;
  const dLub = K.lubrificacao * (0.3 + cargaPct) * dtHours;
  const dDes = K.desalinhamento * (0.5 + cargaPct) * dtHours;
  const lowPress = reading.press < pressAlertThreshold(dictionary);
  const dCav = lowPress ? K.cavitacao * (0.5 + cargaPct) * dtHours : 0;

  return { rolamento: dRol, desalinhamento: dDes, lubrificacao: dLub, isolamento: dIso, cavitacao: dCav };
}

// Apply increments to a damage vector (immutably), clamped to [0,1].
export function stepDamage(
  asset: Asset,
  damage: Record<FailureMode, number>,
  reading: TelemetrySample | Omit<TelemetrySample, "t">,
  cargaPct: number,
  dictionary: Tag[],
  dtHours: number,
): Record<FailureMode, number> {
  const inc = damageIncrements(asset, reading, cargaPct, dictionary, dtHours);
  const out = { ...damage };
  (Object.keys(out) as FailureMode[]).forEach((m) => {
    out[m] = +clamp(out[m] + inc[m], 0, 1).toFixed(4);
  });
  return out;
}

// Per-day growth rate of a single mode at the current state (for RUL extrapolation).
export function dailyRate(
  asset: Asset,
  reading: TelemetrySample | Omit<TelemetrySample, "t">,
  cargaPct: number,
  dictionary: Tag[],
  mode: FailureMode,
): number {
  return damageIncrements(asset, reading, cargaPct, dictionary, 24)[mode];
}

export const TAG_OF_MODE: Record<FailureMode, TagKey> = {
  rolamento: "vib",
  desalinhamento: "rpm",
  lubrificacao: "oleo",
  isolamento: "temp",
  cavitacao: "press",
};
