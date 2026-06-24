// ── Assistant tools ───────────────────────────────────────────────────────────
// Tool definitions (Anthropic JSON-schema) + a client-side executor that runs each
// tool against the live store / engine. The model calls these; we execute and feed
// the result back into the conversation.

import { toast } from "sonner";
import { useStore } from "@/store/useStore";
import { runScenario } from "@/engine/simulation";
import { FAILURE_MODE_LABEL, type FailureMode } from "@/lib/types";
import { fmtDateTime, fmtDate } from "@/lib/format";

// OpenAI function-calling format: { type:"function", function:{ name, description, parameters } }
export const ASSISTANT_TOOLS = [
  {
    type: "function",
    function: {
      name: "get_twin_state",
      description: "Retorna o estado atual do gêmeo digital de um ativo: saúde, status, RUL (vida útil restante), modo de falha dominante, probabilidade de falha e leituras de sensores.",
      parameters: { type: "object", properties: { assetId: { type: "string", description: "Tag do ativo, ex.: BCP-01" } }, required: ["assetId"] },
    },
  },
  {
    type: "function",
    function: {
      name: "list_alerts",
      description: "Lista os alertas, opcionalmente filtrados por ativo e/ou severidade. Por padrão retorna apenas os abertos.",
      parameters: {
        type: "object",
        properties: {
          assetId: { type: "string" },
          severidade: { type: "string", enum: ["critico", "alto", "medio", "baixo"] },
          incluirResolvidos: { type: "boolean" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_whatif",
      description: "Roda uma simulação de cenário 'e se' no gêmeo digital de um ativo (sem afetar o estado real) e retorna o novo RUL, a variação vs. a base e a nova data de falha estimada.",
      parameters: {
        type: "object",
        properties: {
          assetId: { type: "string" },
          cargaPct: { type: "number", description: "Fator de carga em % (50–120). Use 0 para 'parar o ativo'." },
          manutencaoModo: { type: "string", enum: ["rolamento", "desalinhamento", "lubrificacao", "isolamento", "cavitacao"], description: "Executar manutenção deste modo agora." },
          horizonteDias: { type: "number" },
        },
        required: ["assetId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_work_order",
      description: "Cria uma ordem de serviço (alerta manual) para um ativo. Use quando o usuário pedir para gerar uma OS.",
      parameters: {
        type: "object",
        properties: { assetId: { type: "string" }, titulo: { type: "string" }, descricao: { type: "string" } },
        required: ["assetId", "titulo"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_fleet_summary",
      description: "Resumo da frota: piores ativos por saúde e contagem de alertas por severidade.",
      parameters: { type: "object", properties: {} },
    },
  },
];

export function executeTool(name: string, input: Record<string, unknown>): unknown {
  const s = useStore.getState();
  const asId = (v: unknown) => String(v ?? "").toUpperCase();

  switch (name) {
    case "get_twin_state": {
      const id = asId(input.assetId);
      const a = s.assets.find((x) => x.id === id);
      const tw = s.twins[id];
      if (!a || !tw) return { erro: `Ativo ${id} não encontrado.` };
      return {
        id: a.id, nome: a.nome, tipo: a.tipo, criticidade: a.criticidade,
        saude: tw.health, status: tw.status, rulDias: tw.rulDias,
        modoCritico: FAILURE_MODE_LABEL[tw.modoCritico],
        probFalha21d: tw.probFalha.find((p) => p.horizonteDias === 21)?.prob ?? 0,
        cargaPct: Math.round(tw.cargaPct * 100),
        leituras: { temp: tw.state.temp, vib: tw.state.vib, press: tw.state.press, corrente: tw.state.corrente, rpm: tw.state.rpm, oleo: tw.state.oleo },
      };
    }
    case "list_alerts": {
      let alerts = s.alerts;
      if (!input.incluirResolvidos) alerts = alerts.filter((a) => a.status !== "resolvido");
      if (input.assetId) alerts = alerts.filter((a) => a.assetId === asId(input.assetId));
      if (input.severidade) alerts = alerts.filter((a) => a.severidade === input.severidade);
      return {
        total: alerts.length,
        alertas: alerts.slice(0, 20).map((a) => ({ id: a.id, ativo: a.assetId, titulo: a.titulo, severidade: a.severidade, status: a.status, origem: a.origem, criado: fmtDateTime(a.criadoEm) })),
      };
    }
    case "run_whatif": {
      const id = asId(input.assetId);
      const a = s.assets.find((x) => x.id === id);
      const tw = s.twins[id];
      if (!a || !tw) return { erro: `Ativo ${id} não encontrado ou offline.` };
      const horizonte = Number(input.horizonteDias) || 30;
      const base = runScenario(a, tw, s.dictionary, { cargaPct: tw.cargaPct, ambienteDelta: s.settings.ambienteDelta, horizonteDias: horizonte });
      const scen = runScenario(a, tw, s.dictionary, {
        cargaPct: input.cargaPct != null ? Number(input.cargaPct) / 100 : tw.cargaPct,
        ambienteDelta: s.settings.ambienteDelta,
        horizonteDias: horizonte,
        manutencaoModo: (input.manutencaoModo as FailureMode) ?? null,
      });
      return {
        rulBaseDias: base.rulDias,
        rulCenarioDias: scen.rulDias,
        deltaRulDias: scen.rulDias - base.rulDias,
        novaDataFalha: scen.dataFalhaMs ? fmtDate(scen.dataFalhaMs) : "sem falha no horizonte",
        saudeFinalCenario: scen.healthFinal,
      };
    }
    case "create_work_order": {
      const id = asId(input.assetId);
      const a = s.assets.find((x) => x.id === id);
      if (!a) return { erro: `Ativo ${id} não encontrado.` };
      const seq = Math.max(0, ...s.workOrders.map((w) => parseInt(w.id.split("-").pop() || "0", 10) || 0)) + 1;
      const newId = `OS-${new Date(s.simClock).getFullYear()}-${String(seq).padStart(4, "0")}`;
      s.addWorkOrder({
        id: newId, assetId: id, titulo: String(input.titulo),
        descricao: String(input.descricao ?? `Ordem de serviço criada pelo assistente para ${a.nome}.`),
        prioridade: "media", status: "aberta", criadoEm: s.simClock, origem: "assistente",
      });
      toast.success("Ordem de serviço criada", { description: `${newId} — ${a.nome}` });
      return { ok: true, id: newId };
    }
    case "get_fleet_summary": {
      const views = s.assets.map((a) => ({ id: a.id, nome: a.nome, saude: s.twins[a.id]?.health ?? 0, status: s.twins[a.id]?.status ?? "offline" }));
      const open = s.alerts.filter((a) => a.status !== "resolvido");
      const piores = [...views].sort((x, y) => x.saude - y.saude).slice(0, 5);
      return {
        totalAtivos: views.length,
        porStatus: { normal: views.filter((v) => v.status === "normal").length, atencao: views.filter((v) => v.status === "atencao").length, critico: views.filter((v) => v.status === "critico").length, offline: views.filter((v) => v.status === "offline").length },
        alertasAbertos: { total: open.length, critico: open.filter((a) => a.severidade === "critico").length, alto: open.filter((a) => a.severidade === "alto").length, medio: open.filter((a) => a.severidade === "medio").length },
        pioresAtivos: piores,
      };
    }
    default:
      return { erro: `Ferramenta desconhecida: ${name}` };
  }
}
