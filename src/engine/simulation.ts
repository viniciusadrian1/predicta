// ── Simulation loop (the heart) ───────────────────────────────────────────────
// Advances every online asset's digital twin one step at a time, turns dictionary
// limit breaches into real alerts (deduped + auto-resolved), and drives the live
// telemetry/health the whole app reads. Runs as a central 1s interval against the
// Zustand store (no per-component timers).

import type {
  Asset, AssetTwin, Alert, Tag, Severity, FailureMode, TagKey, ProbPoint,
} from "@/lib/types";
import { FAILURE_MODE_LABEL, TAG_LABEL, TAG_UNIT, FAILURE_MODES } from "@/lib/types";
import { readingFromState, zeroDamage, deriveTwinHealth, worstMode, clamp } from "./model";
import { stepDamage, TAG_OF_MODE } from "./degradation";
import { predict, computeRUL, failureCurve, failureDate } from "./prediction";
import { getState } from "@/store/useStore";

const HISTORY_CAP = 288; // 24h at 5-min steps
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

// ── Advance one twin by `dtMinutes` of simulated time ─────────────────────────
export function advanceTwin(
  asset: Asset,
  twin: AssetTwin,
  dictionary: Tag[],
  t: number,
  dtMinutes: number,
  ambientDelta: number,
  noise = true,
): AssetTwin {
  const dtHours = dtMinutes / 60;
  const damage = stepDamage(asset, twin.damage, twin.state, twin.cargaPct, dictionary, dtHours);
  const noiseSeed = noise ? t / 60000 : 0;
  const reading = { t, ...readingFromState(asset, damage, twin.cargaPct, ambientDelta, noiseSeed) };

  // Residual = deviation of measured vibration from the healthy baseline (anomaly
  // signal that grows as the asset degrades).
  const healthyVib = readingFromState(asset, zeroDamage(), twin.cargaPct, ambientDelta, 0).vib;
  const residual = +clamp(100 * (reading.vib / Math.max(healthyVib, 0.1) - 1), 0, 300).toFixed(1);

  const next: AssetTwin = {
    ...twin,
    damage,
    state: reading,
    history: [...twin.history, reading].slice(-HISTORY_CAP),
    syncedAt: t,
    residual,
  };
  deriveTwinHealth(next, asset.offline);
  const p = predict(asset, next, dictionary);
  next.rulDias = p.rulDias;
  next.probFalha = p.probFalha;
  next.modoCritico = p.modoCritico;
  return next;
}

// ── Alert generation from dictionary limits + model triggers ──────────────────
const RULE_TITLE: Record<TagKey, string> = {
  temp: "Temperatura Elevada no Mancal",
  vib: "Vibração Acima do Limite",
  press: "Pressão Abaixo do Setpoint",
  corrente: "Sobrecorrente Detectada",
  rpm: "Rotação Fora do Padrão",
  oleo: "Nível de Óleo Baixo",
};
const RULE_TIPO: Record<TagKey, string> = {
  temp: "Térmico", vib: "Mecânico", press: "Processo", corrente: "Elétrico", rpm: "Mecânico", oleo: "Manutenção",
};

function ruleDesc(asset: Asset, tag: Tag, value: number, threshold: number, crit: boolean): string {
  const v = tag.tipo === "Integer" ? Math.round(value) : value.toFixed(1);
  return `${asset.nome}: ${TAG_LABEL[tag.key]} em ${v} ${TAG_UNIT[tag.key]}. Limite ${crit ? "crítico" : "de alerta"}: ${threshold} ${TAG_UNIT[tag.key]}.`;
}

function nextSeq(alerts: Alert[]): number {
  return Math.max(849, ...alerts.map((a) => parseInt(a.id.split("-").pop() || "0", 10) || 0));
}

export function evaluateAlerts(
  assets: Asset[],
  twins: Record<string, AssetTwin>,
  dictionary: Tag[],
  existing: Alert[],
  simClock: number,
): Alert[] {
  let alerts = existing.filter(Boolean); // drop any malformed/undefined entries defensively
  let seq = nextSeq(alerts);
  const year = new Date(simClock).getFullYear();
  const newId = () => `ALT-${year}-${String(++seq).padStart(4, "0")}`;

  const openFor = (assetId: string, pred: (a: Alert) => boolean) =>
    alerts.find((a) => a.assetId === assetId && a.status !== "resolvido" && pred(a));

  // An alert resolved within the last 24 sim-hours is "snoozed": don't recreate it
  // while the condition persists (avoids respawn right after a manual resolve). It
  // re-fires only after it normalizes and breaches again later.
  const SNOOZE = 24 * 60 * 60 * 1000;
  const snoozed = (assetId: string, pred: (a: Alert) => boolean) =>
    alerts.some((a) => a.assetId === assetId && a.status === "resolvido" && a.resolvidoEm != null && simClock - a.resolvidoEm < SNOOZE && pred(a));

  for (const asset of assets) {
    const twin = twins[asset.id];
    if (!twin) continue;

    // ── Connectivity ──
    if (asset.offline) {
      if (!openFor(asset.id, (a) => a.tipo === "Conectividade") && !snoozed(asset.id, (a) => a.tipo === "Conectividade")) {
        alerts = [{
          id: newId(), assetId: asset.id, titulo: "Ativo Offline — Perda de Sinal", tipo: "Conectividade",
          severidade: "critico", status: "aberto", criadoEm: simClock,
          descricao: `${asset.nome} sem transmissão. Verificar conectividade do gateway IoT.`,
          origem: "regra", managed: true,
        }, ...alerts];
      }
      continue; // offline assets skip telemetry rules
    } else {
      // back online → auto-resolve our connectivity alert
      alerts = alerts.map((a) =>
        a.managed && a.assetId === asset.id && a.tipo === "Conectividade" && a.status !== "resolvido"
          ? { ...a, status: "resolvido", resolvidoEm: simClock } : a);
    }

    // ── Limit-based rules (per dictionary tag) ──
    for (const tag of dictionary) {
      const lim = asset.limites?.[tag.key];
      const limAlerta = lim?.alerta ?? tag.limiteAlerta;
      const limCritico = lim?.critico ?? tag.limiteCritico;
      const v = twin.state[tag.key];
      const breachCrit = tag.direcao === "acima" ? v >= limCritico : v <= limCritico;
      const breachAlert = tag.direcao === "acima" ? v >= limAlerta : v <= limAlerta;
      const open = openFor(asset.id, (a) => a.tag === tag.key && a.origem === "regra");

      if (breachAlert) {
        const sev: Severity = breachCrit ? "critico" : "alto";
        if (!open && !snoozed(asset.id, (a) => a.tag === tag.key && a.origem === "regra")) {
          alerts = [{
            id: newId(), assetId: asset.id, titulo: RULE_TITLE[tag.key], tipo: RULE_TIPO[tag.key],
            severidade: sev, status: "aberto", criadoEm: simClock,
            descricao: ruleDesc(asset, tag, v, breachCrit ? limCritico : limAlerta, breachCrit),
            origem: "regra", tag: tag.key, managed: true,
          }, ...alerts];
        } else if (open.managed && open.severidade !== "critico" && sev === "critico") {
          alerts = alerts.map((a) => a.id === open.id
            ? { ...a, severidade: "critico", descricao: ruleDesc(asset, tag, v, limCritico, true) } : a);
        }
      } else if (open && open.managed) {
        alerts = alerts.map((a) => a.id === open.id ? { ...a, status: "resolvido", resolvidoEm: simClock } : a);
      }
    }

    // ── Model-based alert (twin prediction) ──
    const prob21 = twin.probFalha.find((p) => p.horizonteDias === 21)?.prob ?? 0;
    const openModel = openFor(asset.id, (a) => a.origem === "modelo");
    if (prob21 > 0.6 && twin.rulDias < 60) {
      if (!openModel && !snoozed(asset.id, (a) => a.origem === "modelo")) {
        alerts = [{
          id: newId(), assetId: asset.id, titulo: `Falha prevista em ~${twin.rulDias} dias`, tipo: "Preditivo",
          severidade: prob21 > 0.8 ? "critico" : "alto", status: "aberto", criadoEm: simClock,
          descricao: `Gêmeo digital projeta ${Math.round(prob21 * 100)}% de probabilidade de falha em 21 dias. Modo dominante: ${FAILURE_MODE_LABEL[twin.modoCritico]}.`,
          origem: "modelo", tag: TAG_OF_MODE[twin.modoCritico], managed: true,
        }, ...alerts];
      }
    } else if (openModel && openModel.managed && prob21 < 0.4) {
      alerts = alerts.map((a) => a.id === openModel.id ? { ...a, status: "resolvido", resolvidoEm: simClock } : a);
    }
  }

  return alerts;
}

// ── Stepping ──────────────────────────────────────────────────────────────────
function stepOnce(dtMin: number, noise: boolean) {
  const st = getState();
  const newClock = st.simClock + dtMin * 60000;
  const twins: Record<string, AssetTwin> = {};
  for (const a of st.assets) {
    const tw = st.twins[a.id];
    if (!tw) continue;
    twins[a.id] = a.offline
      ? { ...tw, syncedAt: newClock }
      : advanceTwin(a, tw, st.dictionary, newClock, dtMin, st.settings.ambienteDelta, noise);
  }
  const alerts = evaluateAlerts(st.assets, twins, st.dictionary, st.alerts, newClock);
  st.commitTick({ twins, simClock: newClock, alerts });
}

export function tick() {
  const st = getState();
  stepOnce(st.settings.minutesPerTick * st.settings.simSpeed, true);
}

// Advance many simulated minutes in one commit (advance-7-days, reload catch-up).
export function advanceMinutes(totalMin: number) {
  const st = getState();
  if (totalMin <= 0) return;
  const chunk = st.settings.minutesPerTick * 12; // ~1h chunks for stable accumulation
  const steps = Math.min(Math.ceil(totalMin / chunk), 6000);
  const dt = totalMin / steps;
  let clock = st.simClock;
  let work = { ...st.twins };
  for (let i = 0; i < steps; i++) {
    clock += dt * 60000;
    const nt: Record<string, AssetTwin> = {};
    for (const a of st.assets) {
      const tw = work[a.id];
      if (!tw) continue;
      nt[a.id] = a.offline ? { ...tw, syncedAt: clock }
        : advanceTwin(a, tw, st.dictionary, clock, dt, st.settings.ambienteDelta, false);
    }
    work = nt;
  }
  const alerts = evaluateAlerts(st.assets, work, st.dictionary, st.alerts, clock);
  st.commitTick({ twins: work, simClock: clock, alerts });
}

export const advanceDays = (days: number) => advanceMinutes(days * 24 * 60);

// ── Engine controller (central interval) ──────────────────────────────────────
let timer: ReturnType<typeof setInterval> | null = null;

function catchUp() {
  const st = getState();
  const gapMs = Date.now() - st.wallClockAt;
  if (gapMs < 5000) return;
  const dtMin = st.settings.minutesPerTick * st.settings.simSpeed;
  const simMissed = Math.min((gapMs / 1000) * dtMin, 3 * 24 * 60); // cap at 3 sim-days
  advanceMinutes(simMissed);
}

function onVisible() {
  if (typeof document !== "undefined" && !document.hidden) catchUp();
}

export function startEngine() {
  if (timer) return;
  catchUp();
  timer = setInterval(() => {
    if (!getState().settings.paused) tick();
  }, 1000);
  if (typeof document !== "undefined") document.addEventListener("visibilitychange", onVisible);
}

export function stopEngine() {
  if (timer) { clearInterval(timer); timer = null; }
  if (typeof document !== "undefined") document.removeEventListener("visibilitychange", onVisible);
}

// ── What-if scenario (headless, non-persisting) ───────────────────────────────
export interface Scenario {
  cargaPct: number;
  ambienteDelta: number;
  horizonteDias: number;
  manutencaoModo?: FailureMode | null;
}

export interface ScenarioPoint {
  dia: number;
  health: number;
  rolamento: number; desalinhamento: number; lubrificacao: number; isolamento: number; cavitacao: number;
}

export interface ScenarioResult {
  curva: ScenarioPoint[];
  rulDias: number;
  probFalha: ProbPoint[];
  dataFalhaMs: number | null;
  dataFalhaDias: number | null;
  healthFinal: number;
  modoCritico: FailureMode;
}

function snapshot(dia: number, tw: AssetTwin): ScenarioPoint {
  return {
    dia, health: tw.health,
    rolamento: +(tw.damage.rolamento * 100).toFixed(1),
    desalinhamento: +(tw.damage.desalinhamento * 100).toFixed(1),
    lubrificacao: +(tw.damage.lubrificacao * 100).toFixed(1),
    isolamento: +(tw.damage.isolamento * 100).toFixed(1),
    cavitacao: +(tw.damage.cavitacao * 100).toFixed(1),
  };
}

export function runScenario(asset: Asset, baseTwin: AssetTwin, dictionary: Tag[], scenario: Scenario): ScenarioResult {
  const tw = clone(baseTwin);
  tw.cargaPct = scenario.cargaPct;
  if (scenario.manutencaoModo) {
    tw.damage[scenario.manutencaoModo] = +(tw.damage[scenario.manutencaoModo] * 0.08).toFixed(4);
  }
  tw.state = { t: baseTwin.syncedAt, ...readingFromState(asset, tw.damage, scenario.cargaPct, scenario.ambienteDelta, 0) };
  deriveTwinHealth(tw, asset.offline);

  const rulStart = computeRUL(asset, tw, dictionary);
  const curva: ScenarioPoint[] = [snapshot(0, tw)];
  let clock = baseTwin.syncedAt;
  let dataFalhaDias: number | null = null;

  for (let d = 1; d <= scenario.horizonteDias; d++) {
    clock += 24 * 60 * 60 * 1000;
    const adv = advanceTwin(asset, tw, dictionary, clock, 24 * 60, scenario.ambienteDelta, false);
    Object.assign(tw, adv);
    curva.push(snapshot(d, tw));
    if (dataFalhaDias === null && FAILURE_MODES.some((m) => tw.damage[m] >= 0.999)) dataFalhaDias = d;
  }
  if (dataFalhaDias === null && rulStart <= scenario.horizonteDias) dataFalhaDias = rulStart;

  return {
    curva,
    rulDias: rulStart,
    probFalha: failureCurve(rulStart),
    dataFalhaMs: dataFalhaDias != null ? failureDate(baseTwin.syncedAt, dataFalhaDias) : (rulStart < 3650 ? failureDate(baseTwin.syncedAt, rulStart) : null),
    dataFalhaDias,
    healthFinal: tw.health,
    modoCritico: worstMode(tw.damage),
  };
}
