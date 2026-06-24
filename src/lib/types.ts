// ── Domain model ──────────────────────────────────────────────────────────────
// The canonical Predicta types. The digital twin (engine) is the live source of
// truth for operational health/status/readings; the Asset record holds the static
// identity + nameplate + per-asset limit overrides.

export type AssetStatus = "normal" | "atencao" | "critico" | "offline";
export type Severity = "critico" | "alto" | "medio" | "baixo";
export type FailureMode = "rolamento" | "desalinhamento" | "lubrificacao" | "isolamento" | "cavitacao";
export type TagKey = "temp" | "vib" | "press" | "corrente" | "rpm" | "oleo";
export type Criticidade = "Baixa" | "Média" | "Alta" | "Crítica";
export type AlertStatus = "aberto" | "em_analise" | "resolvido";
export type AlertOrigem = "regra" | "modelo" | "manual";
export type DiciStatus = "aprovado" | "em_revisao" | "pendente";
export type PermLevel = "full" | "read" | "none";

export const FAILURE_MODES: FailureMode[] = ["rolamento", "desalinhamento", "lubrificacao", "isolamento", "cavitacao"];
export const TAG_KEYS: TagKey[] = ["temp", "vib", "press", "corrente", "rpm", "oleo"];

export const FAILURE_MODE_LABEL: Record<FailureMode, string> = {
  rolamento: "Rolamento",
  desalinhamento: "Desalinhamento",
  lubrificacao: "Lubrificação",
  isolamento: "Isolamento / Térmico",
  cavitacao: "Cavitação",
};

export const TAG_LABEL: Record<TagKey, string> = {
  temp: "Temperatura",
  vib: "Vibração",
  press: "Pressão",
  corrente: "Corrente",
  rpm: "RPM",
  oleo: "Nível de Óleo",
};

export const TAG_UNIT: Record<TagKey, string> = {
  temp: "°C", vib: "mm/s", press: "bar", corrente: "A", rpm: "rpm", oleo: "%",
};

export interface LimitPair { alerta: number; critico: number }

export interface Asset {
  id: string;
  nome: string;
  tipo: string;
  area: string;
  planta: string;
  criticidade: Criticidade;
  fabricante: string;
  modelo: string;
  serie: string;
  potenciaKw: number | null;
  rpmNominal: number | null;
  // Per-asset overrides of the dictionary limits (optional).
  limites?: Partial<Record<TagKey, LimitPair>>;
  instaladoEm: string;   // ISO date
  criadoEm: number;      // ms
  // Which sensors the asset actually has (real IO-Link suite). Undefined = all 6
  // (legacy). Readings outside this set are shown as "não medido" in the twin.
  sensores?: TagKey[];
  // Operational facts not derivable from telemetry:
  offline?: boolean;
}

export interface TelemetrySample {
  t: number;            // timestamp (ms, simulated)
  temp: number;
  vib: number;
  press: number;
  corrente: number;
  rpm: number;
  oleo: number;
}

export interface Alert {
  id: string;
  assetId: string;
  titulo: string;
  tipo: string;
  severidade: Severity;
  status: AlertStatus;
  criadoEm: number;        // ms
  resolvidoEm?: number;    // ms
  descricao: string;
  origem: AlertOrigem;     // regra = dictionary limit; modelo = twin prediction; manual
  tag?: TagKey;            // which tag triggered (used for dedup/auto-resolve)
  responsavel?: string;
  managed?: boolean;       // true = engine-created (engine may auto-escalate/resolve it)
}

export interface ProbPoint { horizonteDias: number; prob: number }

export interface AssetTwin {
  assetId: string;
  state: TelemetrySample;                  // latest simulated reading
  history: TelemetrySample[];              // rolling window
  damage: Record<FailureMode, number>;     // 0..1 accumulated per mode
  health: number;                          // 0..100 derived from damage
  status: AssetStatus;                     // derived band (or offline)
  rulDias: number;                         // Remaining Useful Life (days)
  probFalha: ProbPoint[];                  // failure probability curve
  modoCritico: FailureMode;                // worst mode right now
  syncedAt: number;                        // last physical↔digital sync (ms)
  cargaPct: number;                        // operational load factor (0..1.2)
  // Residual between model-expected and "measured" — anomaly signal for the twin.
  residual: number;
}

// Dictionary tag definition — drives the engine's limit-based alerts.
export interface Tag {
  id: string;
  key: TagKey;
  campo: string;
  tipo: string;          // "Float" | "Integer"
  un: string;
  faixaMin: number;
  faixaMax: number;
  limiteAlerta: number;
  limiteCritico: number;
  direcao: "acima" | "abaixo";   // breach when value goes above / below the limit
  ativo: string;         // applicable asset class (display)
  sensor: string;
}

export interface User {
  id: number;
  nome: string;
  email: string;
  senha: string;
  papel: string;
  status: "ativo" | "inativo";
  acesso: string;
  mods: string[];
}

// ── Assistant chat sessions (persisted like everything else) ──
export interface ChatCitation {
  doc_title: string;
  section: string;
  page: number | null;
  snippet: string;
}
export interface ChatBubble {
  role: "user" | "ai" | "tool";
  text: string;
  // RAG-only (manuais técnicos): present on grounded answers.
  citations?: ChatCitation[];
  confidence?: "alta" | "media" | "baixa";
  noSource?: boolean;
}

// ── Ordens de Serviço (manutenção) ──
export type OSStatus = "aberta" | "em_andamento" | "concluida";
export type OSPrioridade = "baixa" | "media" | "alta" | "critica";
export interface WorkOrder {
  id: string;
  assetId: string;
  titulo: string;
  descricao?: string;
  prioridade: OSPrioridade;
  status: OSStatus;
  criadoEm: number;
  concluidoEm?: number;
  responsavel?: string;
  origem?: "manual" | "assistente" | "alerta";
}

// ── Audit trail (governança embutida — toda escrita deixa rastro) ──
export interface AuditEvent {
  id: string;
  ts: number;            // ms
  actor: string | null;  // papel/usuário da sessão
  action: string;        // ex.: "rbac.update" | "manutencao.aplicar" | "alerta.resolver"
  target?: string;       // ex.: id do ativo/alerta/tag
  detail?: string;       // descrição legível
}
export interface ChatSession {
  id: string;
  title: string;
  assetId: string | null;   // context the conversation was started in (null = fleet)
  bubbles: ChatBubble[];     // what the UI renders
  convo: unknown[];          // provider message history (ChatMessage[]) — opaque to the store
  createdAt: number;
  updatedAt: number;
}

export interface HNode {
  id: string;
  l: string;
  tp: string;
  kids: HNode[];
}
export type HierarchyNode = HNode;

export interface DiciRow {
  id: string;
  nome: string;
  D: DiciStatus;
  I: DiciStatus;
  C: DiciStatus;
  In: DiciStatus;
}

export type RbacMatrix = Record<string, Record<string, PermLevel>>;

export interface Settings {
  simSpeed: number;        // 1 | 10 | 60 (× real-time)
  minutesPerTick: number;  // simulated minutes advanced per engine tick at 1×
  ambienteDelta: number;   // ambient temperature offset (°C)
  paused: boolean;
}

export interface Session {
  userId: number | null;
  papel: string | null;
  token: string | null;
  expiresAt: number | null;
  nome: string | null;
  email: string | null;
}

// ── Legacy shapes (PHASE 0/transition) ────────────────────────────────────────
// Still used by the not-yet-migrated screens + the legacy demo constants in
// data/seed.ts. Removed in Phase 3 once every page reads from the store.
export interface LegacyAsset {
  id: string; nome: string; tipo: string; area: string; planta: string;
  saude: number; status: string; leitura: string; crit: string;
  fab: string; modelo: string; serie: string; pot: string; rpm: string;
}

export interface LegacyAlert {
  id: string; ativo: string; nAtivo: string; titulo: string; tipo: string;
  sev: string; data: string; status: string; desc: string;
}
