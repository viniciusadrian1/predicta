// ── Auth ──────────────────────────────────────────────────────────────────────
// Lightweight but real: login validates against the seed users (email + demo
// password), creates a persisted session with an expiry, and "manter conectado"
// controls how long it lasts. Session lives in the persisted store.

import { useStore } from "@/store/useStore";
import type { Session } from "@/lib/types";

const DAY = 24 * 60 * 60 * 1000;

export interface LoginResult { ok: boolean; error?: string }

export function login(email: string, senha: string, keep: boolean): LoginResult {
  const st = useStore.getState();
  const u = st.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
  if (!u) return { ok: false, error: "Usuário não encontrado." };
  if (u.senha !== senha) return { ok: false, error: "Senha incorreta." };
  if (u.status !== "ativo") return { ok: false, error: "Usuário inativo — contate o administrador." };
  const session: Session = {
    userId: u.id, papel: u.papel, nome: u.nome, email: u.email,
    token: `tok-${u.id}-${Date.now()}`,
    expiresAt: Date.now() + (keep ? 30 * DAY : DAY),
  };
  st.setSession(session);
  return { ok: true };
}

export function logout() {
  useStore.getState().clearSession();
}

// Demo: switch the active role without re-logging-in.
export function switchRole(papel: string) {
  const s = useStore.getState();
  s.setSession({ ...s.session, papel });
}

export function sessionValid(s: Session): boolean {
  return !!s.userId && (!s.expiresAt || s.expiresAt > Date.now());
}

export function useSession() { return useStore((s) => s.session); }
export function useIsAuthed(): boolean { return useStore((s) => sessionValid(s.session)); }

export function initials(nome: string | null): string {
  if (!nome) return "?";
  return nome.split(" ").map((n) => n[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}
