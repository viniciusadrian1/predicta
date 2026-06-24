// ── RBAC ──────────────────────────────────────────────────────────────────────
// Permission checks against the (editable) RBAC matrix in the store. A role has a
// level per module: none < read < full.

import { useStore } from "@/store/useStore";
import type { PermLevel, RbacMatrix } from "@/lib/types";

const RANK: Record<PermLevel, number> = { none: 0, read: 1, full: 2 };

export function permLevel(rbac: RbacMatrix, papel: string | null, modulo: string): PermLevel {
  if (!papel) return "none";
  return rbac[papel]?.[modulo] ?? "none";
}

export function can(rbac: RbacMatrix, papel: string | null, modulo: string, nivel: PermLevel = "read"): boolean {
  return RANK[permLevel(rbac, papel, modulo)] >= RANK[nivel];
}

// Reactive hook — re-renders when the role or the matrix changes.
export function useCan(modulo: string, nivel: PermLevel = "read"): boolean {
  return useStore((s) => can(s.rbac, s.session.papel, modulo, nivel));
}

export function usePermLevel(modulo: string): PermLevel {
  return useStore((s) => permLevel(s.rbac, s.session.papel, modulo));
}
