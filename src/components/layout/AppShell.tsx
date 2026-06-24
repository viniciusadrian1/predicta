// ── AppShell ──────────────────────────────────────────────────────────────────
// The persistent application layout (the old <L>): Sidebar + Topbar + scrollable
// content area rendering the matched route via <Outlet/>. The content wrapper keeps
// the original `p-5 space-y-4` so pages return the same top-level blocks they used
// to pass as children of <L>.

import { Outlet, Navigate } from "react-router";
import { C } from "@/lib/theme";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { useEngineRunner } from "@/engine/useEngine";
import { useIsAuthed } from "@/auth/useAuth";

export function AppShell() {
  const authed = useIsAuthed();
  useEngineRunner();
  // Visitante não autenticado entra pela landing (marketing); "Entrar" → /login.
  if (!authed) return <Navigate to="/landing" replace />;
  return (
    <div className="flex h-full overflow-hidden" style={{ background:C.bg }}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
