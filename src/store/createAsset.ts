// ── Create asset ──────────────────────────────────────────────────────────────
// Shared by the manual form and the OCR flow: builds an Asset + a fresh healthy
// digital twin (with an initial prediction) and commits both to the store.

import { useStore } from "./useStore";
import { buildHealthyTwin } from "@/data/seed";
import { flaFromKw } from "@/engine/model";
import { predict } from "@/engine/prediction";
import type { Asset } from "@/lib/types";

export interface NewAssetInput {
  id: string;
  nome: string;
  tipo: string;
  area: string;
  planta: string;
  criticidade: Asset["criticidade"];
  fabricante: string;
  modelo: string;
  serie: string;
  potenciaKw: number | null;
  rpmNominal: number | null;
  instaladoEm: string;
}

// Plain (non-hook) creator — builds the Asset + healthy twin (with an initial
// prediction) and commits both to the store. Used by the manual form and OCR flow.
export function createAsset(input: NewAssetInput): Asset {
  const st = useStore.getState();
  const now = st.simClock || Date.now();
  const fla = flaFromKw(input.potenciaKw);
  const asset: Asset = {
    ...input,
    criadoEm: now,
    offline: false,
    limites: { corrente: { alerta: +(fla * 1.05).toFixed(0), critico: +(fla * 1.18).toFixed(0) } },
  };
  const twin = buildHealthyTwin(asset, now);
  const p = predict(asset, twin, st.dictionary);
  twin.rulDias = p.rulDias;
  twin.probFalha = p.probFalha;
  twin.modoCritico = p.modoCritico;
  st.addAsset(asset, twin);
  return asset;
}

export function useCreateAsset() {
  return createAsset;
}

if (import.meta.env?.DEV && typeof window !== "undefined") {
  (window as unknown as { __createAsset: typeof createAsset }).__createAsset = createAsset;
}

// Does an asset id already exist? (uniqueness check for the forms)
export function assetIdExists(id: string): boolean {
  return useStore.getState().assets.some((a) => a.id.toLowerCase() === id.trim().toLowerCase());
}
