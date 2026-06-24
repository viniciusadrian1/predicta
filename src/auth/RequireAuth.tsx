// ── Route guards ──────────────────────────────────────────────────────────────
import type { ReactNode } from "react";
import { Navigate } from "react-router";
import { ShieldAlert } from "lucide-react";
import { C } from "@/lib/theme";
import { useIsAuthed } from "./useAuth";
import { useCan } from "./rbac";
import type { PermLevel } from "@/lib/types";

// Redirects to /login if there's no valid session.
export function RequireAuth({ children }: { children: ReactNode }) {
  const authed = useIsAuthed();
  if (!authed) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// Module-level gate: renders an "Acesso negado" panel if the role lacks permission.
export function Gate({ modulo, nivel = "read", children }: { modulo: string; nivel?: PermLevel; children: ReactNode }) {
  const allowed = useCan(modulo, nivel);
  if (allowed) return <>{children}</>;
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background:"rgba(248,113,113,0.1)", border:"1px solid rgba(248,113,113,0.3)" }}>
        <ShieldAlert size={26} style={{ color:C.red }} />
      </div>
      <div className="text-[18px] font-bold" style={{ fontFamily:"'Rajdhani',sans-serif", color:C.text }}>Acesso negado</div>
      <p className="text-[12px] max-w-sm" style={{ color:C.slate }}>
        Seu papel não tem permissão para acessar o módulo <strong style={{ color:C.steel }}>{modulo}</strong>.
        Contate o administrador ou troque de papel nas Configurações.
      </p>
    </div>
  );
}
