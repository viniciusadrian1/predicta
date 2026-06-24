// ── App ───────────────────────────────────────────────────────────────────────
// Providers + RouterProvider. The store/engine live in src/store + src/engine;
// the engine is started by the AppShell layout route.

import { RouterProvider } from "react-router";
import { Toaster } from "sonner";
import { router } from "./routes";
import { C } from "./lib/theme";

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster
        theme="dark"
        position="top-right"
        toastOptions={{
          style: {
            background: C.bgCard,
            border: `1px solid ${C.borderMd}`,
            color: C.text,
            fontFamily: "'Inter',system-ui,sans-serif",
          },
        }}
      />
    </>
  );
}
