// ── What-If Engine · Simulação de Impacto Operacional ─────────────────────────
// Responde: "se o equipamento X falhar, o que acontece na operação?"
//
// Encadeia: equipamento → unidade de produção (serial/paralela) → compromissos/
// pedidos dependentes → valor em risco → urgência → recomendação de prioridade.
//
// PROPRIEDADES (requisitos do módulo):
//  · PURO e DETERMINÍSTICO — sem LLM, sem I/O, sem Date.now/Math.random. O mesmo
//    estado de dados sempre produz o mesmo resultado (auditável).
//  · DESACOPLADO da fonte de dados — recebe os dados via uma `ImpactRepository`
//    injetável (in-memory, store, API REST… o engine não sabe nem se importa).
//  · SAÍDA ESTRUTURADA (objeto/JSON), não texto livre.
//  · Aceita falha REAL (equipamento já crítico) ou HIPOTÉTICA (qualquer equipamento
//    saudável escolhido para simular) — nunca altera o estado real.

// ── Entidades de entrada ──────────────────────────────────────────────────────

export type DependencyType = "serial" | "paralela";

export interface ImpactEquipment {
  id: string;
  unidadeId: string;            // unidade de produção à qual pertence
  criticidade: number;          // 1..5
  tempoAteFalhaHoras: number;   // estimativa até a falha (h); 0 = já em falha/crítico
  capacidade?: number;          // contribuição de capacidade na unidade (paralela). Default 1.
}

export interface ProductionUnit {
  id: string;
  nome: string;
  tipoDependencia: DependencyType;
  // paralela: capacidade mínima necessária para a unidade seguir operando.
  // Se ausente, assume-se = capacidade total da unidade (sem redundância → qualquer
  // perda para a unidade).
  capacidadeNecessaria?: number;
}

export interface Commitment {
  id: string;
  nome: string;
  unidadesDependentes: string[]; // ids de unidades das quais o pedido depende
  prazoHoras: number;            // tempo restante até o prazo (h)
  valor: number;                 // valor financeiro / métrica de prioridade
}

// ── Repositório injetável (a única dependência externa do engine) ─────────────

export interface ImpactRepository {
  getEquipamento(id: string): ImpactEquipment | undefined;
  listarEquipamentosDaUnidade(unidadeId: string): ImpactEquipment[];
  getUnidade(id: string): ProductionUnit | undefined;
  listarCompromissosDaUnidade(unidadeId: string): Commitment[];
}

// ── Saída estruturada ─────────────────────────────────────────────────────────

export type UnitStatus = "parada_total" | "parada_parcial" | "operando";
export type PrioridadeNivel = "baixa" | "media" | "alta" | "critica";

export interface AffectedCommitment {
  id: string;
  nome: string;
  valor: number;
  prazoHoras: number;
  valorEmRisco: number;   // valor ponderado pelo fator de risco (total vs parcial)
  urgente: boolean;
}

export interface ImpactResult {
  equipamento: { id: string; criticidade: number; tempoAteFalhaHoras: number; hipotetico: boolean };
  unidade: { id: string; nome: string; tipoDependencia: DependencyType };
  statusUnidade: UnitStatus;
  capacidade: { total: number; perdida: number; restante: number; necessaria: number; fracaoPerdida: number };
  compromissosAfetados: AffectedCommitment[];
  valorTotalEmRisco: number;
  compromissosUrgentes: AffectedCommitment[];
  prioridade: { score: number; nivel: PrioridadeNivel; recomendacao: string };
}

// ── Constantes do modelo de prioridade (explícitas p/ auditabilidade) ─────────

export const IMPACT_PARAMS = {
  HORIZONTE_TEMPO_H: 30 * 24,   // 30 dias: janela p/ normalizar "tempo até falha"
  VALOR_REF: 100_000,           // valor de referência p/ saturar o score de valor
  PESO_CRITICIDADE: 0.30,
  PESO_TEMPO: 0.30,
  PESO_VALOR: 0.40,
  BOOST_URGENCIA: 0.12,         // acréscimo por haver compromissos urgentes
  // limiares de nível a partir do score [0..1+]
  NIVEL_CRITICA: 0.70,
  NIVEL_ALTA: 0.45,
  NIVEL_MEDIA: 0.22,
} as const;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const fmtValor = (v: number) => "R$ " + Math.round(v).toLocaleString("pt-BR");

export interface SimulateOpts {
  // Força marcar como hipotético (não muda nada no estado real). Por padrão é
  // inferido: equipamento ainda não em falha (tempoAteFalhaHoras > 0) → hipotético.
  hipotetico?: boolean;
}

// ── Função principal ──────────────────────────────────────────────────────────

export function simulateOperationalImpact(
  equipamentoId: string,
  repo: ImpactRepository,
  opts: SimulateOpts = {},
): ImpactResult {
  const eq = repo.getEquipamento(equipamentoId);
  if (!eq) throw new Error(`Equipamento "${equipamentoId}" não encontrado.`);

  const unidade = repo.getUnidade(eq.unidadeId);
  if (!unidade) throw new Error(`Unidade de produção "${eq.unidadeId}" (do equipamento ${eq.id}) não encontrada.`);

  const hipotetico = opts.hipotetico ?? eq.tempoAteFalhaHoras > 0;

  // 1) Capacidade da unidade (relevante para dependência paralela).
  const equipamentos = repo.listarEquipamentosDaUnidade(unidade.id);
  const capOf = (e: ImpactEquipment) => (e.capacidade ?? 1);
  const total = equipamentos.reduce((s, e) => s + capOf(e), 0) || capOf(eq);
  const perdida = capOf(eq);
  const restante = +(total - perdida).toFixed(6);
  const necessaria = unidade.capacidadeNecessaria ?? total; // sem redundância declarada → precisa do total

  // 2) Status da unidade.
  let statusUnidade: UnitStatus;
  let fatorRisco: number; // fração do valor de cada compromisso que entra "em risco"
  if (unidade.tipoDependencia === "serial") {
    statusUnidade = "parada_total";   // qualquer falha derruba a unidade inteira
    fatorRisco = 1;
  } else {
    // paralela: para totalmente só se faltar capacidade redundante suficiente.
    if (restante < necessaria) {
      statusUnidade = "parada_total";
      fatorRisco = 1;
    } else {
      statusUnidade = "parada_parcial";
      // risco proporcional à fração de capacidade perdida (degradação).
      fatorRisco = total > 0 ? clamp(perdida / total, 0, 1) : 1;
    }
  }
  const fracaoPerdida = total > 0 ? +(perdida / total).toFixed(6) : 1;

  // 3) Compromissos que dependem da unidade.
  const compromissos = repo.listarCompromissosDaUnidade(unidade.id);

  // 4 + 5) Valor em risco e urgência.
  // URGENTE = prazo restante ≤ tempo até a falha (sem margem operacional p/ reagir
  // antes do problema se concretizar) — regra de negócio do spec.
  const afetados: AffectedCommitment[] = compromissos.map((c) => ({
    id: c.id,
    nome: c.nome,
    valor: c.valor,
    prazoHoras: c.prazoHoras,
    valorEmRisco: +(c.valor * fatorRisco).toFixed(2),
    urgente: c.prazoHoras <= eq.tempoAteFalhaHoras,
  }));
  const valorTotalEmRisco = +afetados.reduce((s, c) => s + c.valorEmRisco, 0).toFixed(2);
  const urgentes = afetados.filter((c) => c.urgente);

  // 6) Recomendação de prioridade — COMBINA criticidade + tempo até falha + valor.
  const critScore = clamp(eq.criticidade / 5, 0, 1);
  const tempoScore = clamp(1 - eq.tempoAteFalhaHoras / IMPACT_PARAMS.HORIZONTE_TEMPO_H, 0, 1);
  const valorScore = valorTotalEmRisco / (valorTotalEmRisco + IMPACT_PARAMS.VALOR_REF); // 0..1, satura
  let score =
    IMPACT_PARAMS.PESO_CRITICIDADE * critScore +
    IMPACT_PARAMS.PESO_TEMPO * tempoScore +
    IMPACT_PARAMS.PESO_VALOR * valorScore;
  if (urgentes.length > 0) score += IMPACT_PARAMS.BOOST_URGENCIA;
  score = +clamp(score, 0, 1.2).toFixed(4);

  const nivel: PrioridadeNivel =
    score >= IMPACT_PARAMS.NIVEL_CRITICA ? "critica" :
    score >= IMPACT_PARAMS.NIVEL_ALTA ? "alta" :
    score >= IMPACT_PARAMS.NIVEL_MEDIA ? "media" : "baixa";

  const recomendacao = buildRecomendacao(eq, unidade, statusUnidade, valorTotalEmRisco, afetados.length, urgentes.length, nivel);

  return {
    equipamento: { id: eq.id, criticidade: eq.criticidade, tempoAteFalhaHoras: eq.tempoAteFalhaHoras, hipotetico },
    unidade: { id: unidade.id, nome: unidade.nome, tipoDependencia: unidade.tipoDependencia },
    statusUnidade,
    capacidade: { total, perdida, restante, necessaria, fracaoPerdida },
    compromissosAfetados: afetados,
    valorTotalEmRisco,
    compromissosUrgentes: urgentes,
    prioridade: { score, nivel, recomendacao },
  };
}

function tempoLegivel(h: number): string {
  if (h <= 0) return "já em falha";
  if (h < 48) return `~${Math.round(h)} h`;
  return `~${Math.round(h / 24)} d`;
}

function buildRecomendacao(
  eq: ImpactEquipment, unidade: ProductionUnit, status: UnitStatus,
  valor: number, nAfetados: number, nUrgentes: number, nivel: PrioridadeNivel,
): string {
  if (nAfetados === 0) {
    return `Prioridade ${nivel.toUpperCase()}: a unidade "${unidade.nome}" ` +
      `${status === "parada_total" ? "para totalmente" : "opera de forma degradada"}, ` +
      `mas nenhum compromisso depende dela — impacto operacional nulo no momento. ` +
      `Trate como manutenção planejável (criticidade ${eq.criticidade}/5, falha em ${tempoLegivel(eq.tempoAteFalhaHoras)}).`;
  }
  const statusTxt = status === "parada_total" ? "PARA TOTALMENTE" : "opera parcialmente (capacidade reduzida)";
  const urgTxt = nUrgentes > 0
    ? ` ${nUrgentes} ${nUrgentes === 1 ? "compromisso é urgente" : "compromissos são urgentes"} (prazo ≤ tempo até falha): replaneje-os AGORA.`
    : " Nenhum compromisso é urgente — há margem para agir antes do prazo.";
  return `Prioridade ${nivel.toUpperCase()}: equipamento ${eq.id} (criticidade ${eq.criticidade}/5, falha em ` +
    `${tempoLegivel(eq.tempoAteFalhaHoras)}) → unidade "${unidade.nome}" ${statusTxt}, ` +
    `${nAfetados} ${nAfetados === 1 ? "compromisso afetado" : "compromissos afetados"}, ${fmtValor(valor)} em risco.${urgTxt}`;
}

// ── Repositório in-memory (fonte de dados desacoplada, p/ testes e uso direto) ─

export interface ImpactDataset {
  equipamentos: ImpactEquipment[];
  unidades: ProductionUnit[];
  compromissos: Commitment[];
}

export function createInMemoryRepository(data: ImpactDataset): ImpactRepository {
  return {
    getEquipamento: (id) => data.equipamentos.find((e) => e.id === id),
    listarEquipamentosDaUnidade: (unidadeId) => data.equipamentos.filter((e) => e.unidadeId === unidadeId),
    getUnidade: (id) => data.unidades.find((u) => u.id === id),
    listarCompromissosDaUnidade: (unidadeId) => data.compromissos.filter((c) => c.unidadesDependentes.includes(unidadeId)),
  };
}
