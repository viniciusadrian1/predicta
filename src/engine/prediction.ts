// ── Prediction ────────────────────────────────────────────────────────────────
// Remaining Useful Life (RUL) + failure-probability curve, derived from the twin's
// accumulated damage and its current degradation rate.
//
// ⚠️ HONESTY: this is the Predicta Digital Twin Engine v1 — a *simulated*,
// physics-informed model, NOT a model trained on historical failures. The
// `PredictionModel` interface below exists so a real trained model (e.g. an ONNX
// graph or a remote endpoint) can be swapped in later without touching the UI.

import type { Asset, AssetTwin, Tag, FailureMode, ProbPoint } from "@/lib/types";
import { FAILURE_MODES } from "@/lib/types";
import { dailyRate } from "./degradation";
import { worstMode, clamp } from "./model";

export const HORIZONS = [7, 14, 21, 30, 60];
const WEIBULL_BETA = 2.2; // shape: failures cluster around the RUL estimate
const RUL_CAP = 3650;     // 10 years — "effectively healthy"

export interface Prediction {
  rulDias: number;
  probFalha: ProbPoint[];
  modoCritico: FailureMode;
}

export interface PredictionModel {
  readonly name: string;
  readonly metodo: string;
  predict(asset: Asset, twin: AssetTwin, dictionary: Tag[]): Prediction;
}

// Smoothed daily damage rate for a mode (floors tiny rates so RUL stays finite).
function smoothedRate(asset: Asset, twin: AssetTwin, dictionary: Tag[], mode: FailureMode): number {
  return Math.max(dailyRate(asset, twin.state, twin.cargaPct, dictionary, mode), 1e-5);
}

// RUL = time until the FIRST failure mode reaches 1.0 (the binding constraint),
// not just the highest-damage one — so fixing the worst part correctly reveals the
// next bottleneck.
export function computeRUL(asset: Asset, twin: AssetTwin, dictionary: Tag[]): number {
  let min = RUL_CAP;
  for (const mode of FAILURE_MODES) {
    const remaining = clamp(1 - twin.damage[mode], 0, 1);
    const rate = smoothedRate(asset, twin, dictionary, mode);
    min = Math.min(min, remaining / rate);
  }
  return clamp(Math.round(min), 0, RUL_CAP);
}

// Weibull CDF on the RUL estimate: P(fail within `horizon` days).
export function failureProb(rulDias: number, horizonDias: number): number {
  if (rulDias <= 0) return 1;
  const x = horizonDias / Math.max(rulDias, 0.5);
  return clamp(1 - Math.exp(-Math.pow(x, WEIBULL_BETA)), 0, 1);
}

export function failureCurve(rulDias: number): ProbPoint[] {
  return HORIZONS.map((h) => ({ horizonteDias: h, prob: +failureProb(rulDias, h).toFixed(3) }));
}

// The default, in-app simulated model.
export const simulatedModel: PredictionModel = {
  name: "Predicta Digital Twin Engine v1",
  metodo: "Degradação físico-informada + Weibull",
  predict(asset, twin, dictionary) {
    const modoCritico = worstMode(twin.damage);
    const rulDias = computeRUL(asset, twin, dictionary);
    return { rulDias, probFalha: failureCurve(rulDias), modoCritico };
  },
};

// Active model (swap here to plug a trained model later).
export const predictionModel: PredictionModel = simulatedModel;

export function predict(asset: Asset, twin: AssetTwin, dictionary: Tag[]): Prediction {
  return predictionModel.predict(asset, twin, dictionary);
}

// Estimated failure date (ms) from a base sim-clock + RUL.
export function failureDate(simClock: number, rulDias: number): number {
  return simClock + rulDias * 24 * 60 * 60 * 1000;
}
