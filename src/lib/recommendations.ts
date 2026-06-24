// ── Maintenance recommendations ───────────────────────────────────────────────
// Derived from the twin's per-failure-mode damage. Each recommendation maps to a
// FailureMode so "Registrar manutenção" can call applyMaintenance(assetId, modo).

import type { AssetTwin, FailureMode } from "@/lib/types";
import { FAILURE_MODES } from "@/lib/types";

export type Prioridade = "Alta" | "Média" | "Baixa";

export interface Recommendation {
  modo: FailureMode;
  pri: Prioridade;
  acao: string;
  motivo: string;
  prazoDias: number;
  damage: number;
}

const ACAO: Record<FailureMode, string> = {
  rolamento: "Substituir rolamento — inspeção espectral do mancal",
  desalinhamento: "Revisar alinhamento a laser do eixo de transmissão",
  lubrificacao: "Reabastecer / trocar lubrificante e analisar óleo",
  isolamento: "Inspeção termográfica e teste de isolação",
  cavitacao: "Verificar NPSH, condições de sucção e válvulas",
};

const MOTIVO: Record<FailureMode, (d: number) => string> = {
  rolamento: (d) => `Dano acumulado no rolamento em ${Math.round(d * 100)}%. Vibração crescente indica degradação de pista.`,
  desalinhamento: (d) => `Desalinhamento estimado em ${Math.round(d * 100)}%. Vibração axial elevada.`,
  lubrificacao: (d) => `Depleção de lubrificação em ${Math.round(d * 100)}%. Nível de óleo em queda.`,
  isolamento: (d) => `Envelhecimento térmico em ${Math.round(d * 100)}%. Temperatura acima do esperado.`,
  cavitacao: (d) => `Indícios de cavitação em ${Math.round(d * 100)}%. Pressão de sucção baixa.`,
};

export function recommendationsFor(twin: AssetTwin, threshold = 0.1): Recommendation[] {
  return FAILURE_MODES
    .filter((m) => twin.damage[m] >= threshold)
    .sort((a, b) => twin.damage[b] - twin.damage[a])
    .map((m) => {
      const d = twin.damage[m];
      const pri: Prioridade = d > 0.5 ? "Alta" : d > 0.25 ? "Média" : "Baixa";
      return {
        modo: m, pri, acao: ACAO[m], motivo: MOTIVO[m](d),
        prazoDias: Math.max(3, Math.round(twin.rulDias * 0.35)),
        damage: d,
      };
    });
}
