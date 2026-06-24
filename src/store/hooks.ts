// ── Store selector hooks ──────────────────────────────────────────────────────
// Thin, focused selectors so components subscribe to only what they use (avoids
// re-rendering the whole tree on every engine tick). Array slices return the stable
// store reference; derived values return primitives so equality checks short-circuit.

import { useStore } from "./useStore";

export const useAssets = () => useStore((s) => s.assets);
export const useAsset = (id?: string) => useStore((s) => s.assets.find((a) => a.id === id));
export const useTwins = () => useStore((s) => s.twins);
export const useTwin = (id?: string) => useStore((s) => (id ? s.twins[id] : undefined));
export const useAlerts = () => useStore((s) => s.alerts);
export const useDictionary = () => useStore((s) => s.dictionary);
export const useUsers = () => useStore((s) => s.users);
export const useHierarchy = () => useStore((s) => s.hierarchy);
export const useDici = () => useStore((s) => s.dici);
export const useRbac = () => useStore((s) => s.rbac);
export const useRoles = () => useStore((s) => s.roles);
export const useModules = () => useStore((s) => s.modules);
export const useSettings = () => useStore((s) => s.settings);
export const useSession = () => useStore((s) => s.session);
export const useSimClock = () => useStore((s) => s.simClock);

// Derived primitives (stable equality → no needless re-renders).
export const useOpenAlertCount = () =>
  useStore((s) => s.alerts.reduce((n, a) => (a.status !== "resolvido" ? n + 1 : n), 0));
