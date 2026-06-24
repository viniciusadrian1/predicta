// ── RootLayout ────────────────────────────────────────────────────────────────
// The outermost wrapper that used to live in App(): full-screen flex column, deep
// background, and the global Inter font family. Wraps both the public /login route
// and the authenticated AppShell. The old "Wireframes" navigator strip is gone.

import { Outlet } from "react-router";
import { C } from "@/lib/theme";

export function RootLayout() {
  return (
    <div className="w-full h-screen flex flex-col overflow-hidden" style={{ background:C.bgDeep, fontFamily:"'Inter',system-ui,sans-serif" }}>
      <div className="flex-1 min-h-0">
        <Outlet />
      </div>
    </div>
  );
}
