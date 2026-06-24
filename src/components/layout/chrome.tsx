// ── Page chrome store ─────────────────────────────────────────────────────────
// The Topbar shows a per-page breadcrumb + right-side actions. In the old monolith
// every screen rendered its own <L> wrapper passing `bc`/`right`. With a persistent
// layout route + <Outlet/>, the page (a sibling of the Topbar) needs to publish that
// content upward. We use a tiny external store so setting chrome re-renders ONLY the
// Topbar — never the page — which avoids an effect/render loop.

import { useSyncExternalStore, useLayoutEffect, type ReactNode } from "react";

export interface Chrome { bc: string[]; right?: ReactNode }

let chromeState: Chrome = { bc: [] };
const listeners = new Set<() => void>();

export function setChrome(c: Chrome) {
  chromeState = c;
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

function getSnapshot() {
  return chromeState;
}

export function useChrome(): Chrome {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

// Pages call this in their body to publish breadcrumb + right actions to the Topbar.
// Runs after every render so live `right` handlers (e.g. view toggles) stay fresh.
export function usePageChrome(bc: string[], right?: ReactNode) {
  useLayoutEffect(() => {
    setChrome({ bc, right });
  });
}
