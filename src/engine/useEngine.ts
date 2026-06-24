// ── Engine lifecycle hook ─────────────────────────────────────────────────────
// Mount once (in AppShell) to run the central simulation interval while the user
// is inside the app. Reference-counted so it survives fast refreshes / re-mounts.

import { useEffect } from "react";
import { startEngine, stopEngine } from "./simulation";

let mounts = 0;

export function useEngineRunner() {
  useEffect(() => {
    mounts += 1;
    startEngine();
    return () => {
      mounts -= 1;
      if (mounts <= 0) { mounts = 0; stopEngine(); }
    };
  }, []);
}
