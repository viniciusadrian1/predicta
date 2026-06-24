// ── Topbar ────────────────────────────────────────────────────────────────────
// Breadcrumb + per-page actions (from the chrome store) + the logged-in user and
// a logout control. The avatar opens a profile dropdown (settings / logout).

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Bell, Settings, LogOut } from "lucide-react";
import { toast } from "sonner";
import { C } from "@/lib/theme";
import { BC } from "@/components/ui-shared";
import { useChrome } from "./chrome";
import { useSession, initials, logout } from "@/auth/useAuth";
import { useStore } from "@/store/useStore";

export function Topbar() {
  const { bc, right } = useChrome();
  const navigate = useNavigate();
  const session = useSession();
  const openAlerts = useStore((s) => s.alerts.filter((a) => a.status !== "resolvido").length);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const sair = () => { logout(); toast("Sessão encerrada"); navigate("/login"); };

  // Close on outside click + Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onPointer); document.removeEventListener("keydown", onKey); };
  }, [menuOpen]);

  const go = (path: string) => { setMenuOpen(false); navigate(path); };

  return (
    <header className="h-12 flex items-center px-5 gap-4 flex-shrink-0" style={{ background:"#060E1A", borderBottom:`1px solid ${C.border}` }}>
      <BC items={bc} />
      <div className="flex-1" />
      {right}
      <div className="flex items-center gap-1.5 ml-2">
        <button onClick={() => navigate("/alertas")}
          title={openAlerts ? `${openAlerts} alerta(s) aberto(s) — ver alertas` : "Ver alertas"}
          className="relative w-7 h-7 rounded flex items-center justify-center transition-all hover:bg-[#112035]" style={{ color:C.slate }}>
          <Bell size={14} />
          {openAlerts > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-1 flex items-center justify-center text-[8px] font-bold text-white rounded-full"
              style={{ background:C.red }}>{openAlerts > 9 ? "9+" : openAlerts}</span>
          )}
        </button>
        <button onClick={() => navigate("/configuracoes")} title="Configurações" className="w-7 h-7 rounded flex items-center justify-center transition-all hover:bg-[#112035]" style={{ color:C.slate }}>
          <Settings size={13} />
        </button>
        <button onClick={sair} title="Sair" className="w-7 h-7 rounded flex items-center justify-center transition-all hover:bg-[#112035]" style={{ color:C.slate }}>
          <LogOut size={13} />
        </button>

        {/* Avatar → profile menu */}
        <div className="relative ml-1" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            title={session.nome ?? "Perfil"}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-white transition-all hover:brightness-110"
            style={{
              background:`linear-gradient(135deg,${C.cobalt},${C.navy})`,
              boxShadow: menuOpen ? `0 0 0 2px ${C.borderMd}` : "none",
            }}>
            {initials(session.nome)}
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-2 w-60 rounded-lg overflow-hidden z-50"
              style={{
                background:C.bgCard,
                border:`1px solid ${C.border}`,
                boxShadow:"0 12px 32px rgba(0,0,0,0.55)",
              }}>
              {/* Header: nome + email + papel */}
              <div className="px-3.5 py-3 flex items-center gap-3" style={{ background:C.bgDeep, borderBottom:`1px solid ${C.border}` }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                  style={{ background:`linear-gradient(135deg,${C.cobalt},${C.navy})` }}>
                  {initials(session.nome)}
                </div>
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold text-white truncate" style={{ fontFamily:"Rajdhani, sans-serif" }}>
                    {session.nome ?? "Usuário"}
                  </div>
                  <div className="text-[10px] truncate" style={{ color:C.slate, fontFamily:"'JetBrains Mono', monospace" }}>
                    {session.email ?? "—"}
                  </div>
                  {session.papel && (
                    <div className="mt-1 inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider"
                      style={{ background:C.borderMd, color:"#fff", letterSpacing:"0.08em" }}>
                      {session.papel}
                    </div>
                  )}
                </div>
              </div>

              {/* Items */}
              <div className="py-1">
                <button
                  role="menuitem"
                  onClick={() => go("/configuracoes")}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[12px] text-left transition-colors hover:bg-[#112035]"
                  style={{ color:"#D6E2EE" }}>
                  <Settings size={14} style={{ color:C.slate }} />
                  Configurações
                </button>
                <button
                  role="menuitem"
                  onClick={() => { setMenuOpen(false); sair(); }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[12px] text-left transition-colors hover:bg-[#112035]"
                  style={{ color:C.red }}>
                  <LogOut size={14} />
                  Sair
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
