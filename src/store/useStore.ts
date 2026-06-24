// ── Global store (Zustand + persist) ──────────────────────────────────────────
// Single source of truth for the whole app: assets, digital twins, alerts, users,
// data dictionary, hierarchy, D-I-C-I, RBAC, settings and session. Persisted to
// localStorage under "predicta-state" so reloads keep the live state; the engine
// (Phase 2) reads/writes twins + alerts through here.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Asset, Alert, AssetTwin, Tag, User, HNode, DiciRow, RbacMatrix,
  Settings, Session, FailureMode, ChatSession, AuditEvent, WorkOrder,
} from "@/lib/types";
import {
  SEED_ASSETS, SEED_ALERTS, SEED_DICTIONARY, SEED_USERS, SEED_HIERARCHY, SEED_DICI,
  ROLES, MODS, PERM, buildSeedTwins, SEED_WORKORDERS,
} from "@/data/seed";
import { deriveTwinHealth } from "@/engine/model";

const now = () => Date.now();
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

// Append an audit event (cap the trail) — governança embutida: toda escrita deixa rastro.
function pushAudit(trail: AuditEvent[], actor: string | null, action: string, target?: string, detail?: string): AuditEvent[] {
  const e: AuditEvent = { id: `aud-${now()}-${Math.random().toString(36).slice(2, 7)}`, ts: now(), actor, action, target, detail };
  return [e, ...trail].slice(0, 250);
}

export interface CommitTickPayload {
  twins: Record<string, AssetTwin>;
  simClock: number;
  alerts: Alert[];
}

export interface PredictaState {
  // ── data slices ──
  assets: Asset[];
  twins: Record<string, AssetTwin>;
  alerts: Alert[];
  workOrders: WorkOrder[];
  users: User[];
  dictionary: Tag[];
  hierarchy: HNode[];
  dici: DiciRow[];
  rbac: RbacMatrix;
  roles: string[];
  modules: string[];
  chats: ChatSession[];          // persisted assistant conversations
  activeChatId: string | null;   // currently open conversation
  audit: AuditEvent[];           // governance audit trail (writes leave a record)
  settings: Settings;
  session: Session;
  simClock: number;     // current simulated time (ms)
  wallClockAt: number;  // real Date.now() of the last commit (for reload catch-up)

  // ── asset actions ──
  addAsset: (a: Asset, twin: AssetTwin) => void;
  updateAsset: (id: string, patch: Partial<Asset>) => void;
  removeAsset: (id: string) => void;

  // ── user actions ──
  addUser: (u: User) => void;
  updateUser: (id: number, patch: Partial<User>) => void;
  removeUser: (id: number) => void;

  // ── work order actions ──
  addWorkOrder: (wo: WorkOrder) => void;
  updateWorkOrder: (id: string, patch: Partial<WorkOrder>) => void;

  // ── alert actions ──
  addAlert: (a: Alert) => void;
  ackAlert: (id: string) => void;
  resolveAlert: (id: string) => void;
  reopenAlert: (id: string) => void;

  // ── dictionary actions ──
  upsertTag: (tag: Tag) => void;
  removeTag: (id: string) => void;

  // ── twin / maintenance ──
  applyMaintenance: (assetId: string, modo: FailureMode) => void;

  // ── settings / session ──
  setSimSpeed: (speed: number) => void;
  togglePause: () => void;
  setPaused: (paused: boolean) => void;
  setAmbiente: (delta: number) => void;
  setSession: (s: Session) => void;
  clearSession: () => void;

  // ── governance (editable in Phase 8) ──
  setDici: (rows: DiciRow[]) => void;
  setRbac: (rbac: RbacMatrix) => void;
  setHierarchy: (nodes: HNode[]) => void;

  // ── audit ──
  logAudit: (action: string, target?: string, detail?: string) => void;

  // ── assistant chat sessions ──
  createChat: (chat: ChatSession) => void;
  updateChat: (id: string, patch: Partial<ChatSession>) => void;
  renameChat: (id: string, title: string) => void;
  deleteChat: (id: string) => void;
  setActiveChat: (id: string | null) => void;
  clearChats: () => void;

  // ── engine hook (Phase 2) + reset ──
  commitTick: (p: CommitTickPayload) => void;
  resetDemo: () => void;
}

const DEFAULT_SETTINGS: Settings = { simSpeed: 1, minutesPerTick: 5, ambienteDelta: 0, paused: false };
const EMPTY_SESSION: Session = { userId: null, papel: null, token: null, expiresAt: null, nome: null, email: null };

function freshData(t = now()) {
  return {
    assets: clone(SEED_ASSETS),
    twins: buildSeedTwins(t, 0),
    alerts: clone(SEED_ALERTS),
    workOrders: clone(SEED_WORKORDERS),
    users: clone(SEED_USERS),
    dictionary: clone(SEED_DICTIONARY),
    hierarchy: clone(SEED_HIERARCHY),
    dici: clone(SEED_DICI),
    rbac: clone(PERM) as RbacMatrix,
    roles: [...ROLES],
    modules: [...MODS],
    settings: { ...DEFAULT_SETTINGS },
    simClock: t,
    wallClockAt: t,
  };
}

export const useStore = create<PredictaState>()(
  persist(
    (set, get) => ({
      ...freshData(),
      chats: [],
      activeChatId: null,
      audit: [],
      session: { ...EMPTY_SESSION },

      addAsset: (a, twin) =>
        set((s) => ({ assets: [...s.assets, a], twins: { ...s.twins, [a.id]: twin } })),

      updateAsset: (id, patch) =>
        set((s) => ({ assets: s.assets.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),

      removeAsset: (id) =>
        set((s) => {
          const twins = { ...s.twins };
          delete twins[id];
          return { assets: s.assets.filter((a) => a.id !== id), twins };
        }),

      addUser: (u) => set((s) => ({ users: [...s.users, u] })),

      updateUser: (id, patch) =>
        set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, ...patch } : u)) })),

      removeUser: (id) => set((s) => ({ users: s.users.filter((u) => u.id !== id) })),

      addWorkOrder: (wo) =>
        set((s) => ({ workOrders: [wo, ...s.workOrders], audit: pushAudit(s.audit, s.session.papel, "os.criar", wo.assetId, `OS ${wo.id} — ${wo.titulo}`) })),
      updateWorkOrder: (id, patch) =>
        set((s) => ({
          workOrders: s.workOrders.map((w) => (w.id === id ? { ...w, ...patch } : w)),
          audit: pushAudit(s.audit, s.session.papel, "os.atualizar", id, patch.status ? `OS → ${patch.status}` : "OS atualizada"),
        })),

      addAlert: (a) => set((s) => ({ alerts: [a, ...s.alerts] })),

      ackAlert: (id) =>
        set((s) => ({
          alerts: s.alerts.map((a) => (a.id === id ? { ...a, status: "em_analise" } : a)),
          audit: pushAudit(s.audit, s.session.papel, "alerta.analisar", id, "Alerta movido para em análise"),
        })),

      resolveAlert: (id) =>
        set((s) => ({
          alerts: s.alerts.map((a) =>
            a.id === id ? { ...a, status: "resolvido", resolvidoEm: get().simClock } : a,
          ),
          audit: pushAudit(s.audit, s.session.papel, "alerta.resolver", id, "Alerta resolvido"),
        })),

      reopenAlert: (id) =>
        set((s) => ({
          alerts: s.alerts.map((a) =>
            a.id === id ? { ...a, status: "aberto", resolvidoEm: undefined } : a,
          ),
          audit: pushAudit(s.audit, s.session.papel, "alerta.reabrir", id, "Alerta reaberto"),
        })),

      upsertTag: (tag) =>
        set((s) => {
          const i = s.dictionary.findIndex((t) => t.id === tag.id);
          const audit = pushAudit(s.audit, s.session.papel, "dicionario.editar", tag.id, `Tag ${tag.campo} (${tag.un}) atualizada`);
          if (i === -1) return { dictionary: [...s.dictionary, tag], audit };
          const dictionary = s.dictionary.slice();
          dictionary[i] = tag;
          return { dictionary, audit };
        }),

      removeTag: (id) =>
        set((s) => ({
          dictionary: s.dictionary.filter((t) => t.id !== id),
          audit: pushAudit(s.audit, s.session.papel, "dicionario.remover", id, "Tag removida do dicionário"),
        })),

      applyMaintenance: (assetId, modo) =>
        set((s) => {
          const twin = s.twins[assetId];
          if (!twin) return {};
          const next: AssetTwin = clone(twin);
          // Repair: knock the targeted mode's damage down to a small residual.
          next.damage[modo] = +(next.damage[modo] * 0.08).toFixed(3);
          if (modo === "lubrificacao") next.state = { ...next.state, oleo: 100 };
          const asset = s.assets.find((a) => a.id === assetId);
          deriveTwinHealth(next, asset?.offline);
          next.syncedAt = s.simClock;
          return {
            twins: { ...s.twins, [assetId]: next },
            audit: pushAudit(s.audit, s.session.papel, "manutencao.aplicar", assetId, `Manutenção registrada — modo ${modo}`),
          };
        }),

      setSimSpeed: (speed) => set((s) => ({ settings: { ...s.settings, simSpeed: speed } })),
      togglePause: () => set((s) => ({ settings: { ...s.settings, paused: !s.settings.paused } })),
      setPaused: (paused) => set((s) => ({ settings: { ...s.settings, paused } })),
      setAmbiente: (delta) => set((s) => ({ settings: { ...s.settings, ambienteDelta: delta } })),

      setSession: (session) => set({ session }),
      clearSession: () => set({ session: { ...EMPTY_SESSION } }),

      setDici: (dici) => set((s) => ({ dici, audit: pushAudit(s.audit, s.session.papel, "dici.atualizar", undefined, "Ciclo do Ativo (D-I-C-I) alterado") })),
      setRbac: (rbac) => set((s) => ({ rbac, audit: pushAudit(s.audit, s.session.papel, "rbac.atualizar", undefined, "Matriz de permissões alterada") })),
      setHierarchy: (hierarchy) => set((s) => ({ hierarchy, audit: pushAudit(s.audit, s.session.papel, "hierarquia.atualizar", undefined, "Estrutura da planta alterada") })),

      logAudit: (action, target, detail) => set((s) => ({ audit: pushAudit(s.audit, s.session.papel, action, target, detail) })),

      createChat: (chat) => set((s) => ({ chats: [chat, ...s.chats], activeChatId: chat.id })),
      updateChat: (id, patch) =>
        set((s) => ({ chats: s.chats.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: now() } : c)) })),
      renameChat: (id, title) =>
        set((s) => ({ chats: s.chats.map((c) => (c.id === id ? { ...c, title } : c)) })),
      deleteChat: (id) =>
        set((s) => ({ chats: s.chats.filter((c) => c.id !== id), activeChatId: s.activeChatId === id ? null : s.activeChatId })),
      setActiveChat: (id) => set({ activeChatId: id }),
      clearChats: () => set({ chats: [], activeChatId: null }),

      commitTick: ({ twins, simClock, alerts }) => set({ twins, simClock, alerts, wallClockAt: Date.now() }),

      resetDemo: () => set((s) => ({ ...freshData(), session: s.session })),
    }),
    {
      name: "predicta-state",
      version: 3,
      storage: createJSONStorage(() => localStorage),
      // Persist data + session, not the action functions (they come from the store
      // factory). Twin history is capped on write — the engine commits every second,
      // so we keep localStorage writes small (the full window lives in memory).
      partialize: (s) => ({
        assets: s.assets,
        twins: Object.fromEntries(
          Object.entries(s.twins).map(([id, t]) => [id, { ...t, history: t.history.slice(-48) }]),
        ),
        alerts: s.alerts, workOrders: s.workOrders, users: s.users,
        dictionary: s.dictionary, hierarchy: s.hierarchy, dici: s.dici, rbac: s.rbac,
        roles: s.roles, modules: s.modules, chats: s.chats, activeChatId: s.activeChatId,
        audit: s.audit, settings: s.settings, session: s.session,
        simClock: s.simClock, wallClockAt: s.wallClockAt,
      }),
      // On a breaking schema bump, drop the old persisted data and reseed (merge
      // with the fresh initial state). Within a version, persist normally.
      // On a breaking schema bump, drop the old persisted data and reseed — but keep
      // the user's session so they stay logged in (v3 adds workOrders + the W22 asset).
      migrate: (persisted, version) =>
        version < 3
          ? ({ session: (persisted as { session?: Session })?.session } as PredictaState)
          : (persisted as PredictaState),
    },
  ),
);

// Non-hook accessors for the engine / imperative code.
export const getState = useStore.getState;
export const setState = useStore.setState;

// Dev-only: expose the store for inspection in the browser console.
if (import.meta.env?.DEV && typeof window !== "undefined") {
  (window as unknown as { __predicta: typeof useStore }).__predicta = useStore;
}
