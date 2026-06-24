// Sidebar "Gêmeo Digital" entry target — the twin is per-asset, so this picks the
// asset that most needs attention (lowest health, online) and redirects to it.
import { Navigate } from "react-router";
import { useStore } from "@/store/useStore";

export default function GemeoRedirect() {
  const assets = useStore((s) => s.assets);
  const twins = useStore((s) => s.twins);
  const online = assets.filter((a) => !a.offline && twins[a.id]);
  const target = online.sort((a, b) => (twins[a.id]!.health) - (twins[b.id]!.health))[0] ?? assets[0];
  return <Navigate to={`/ativos/${target.id}/gemeo`} replace />;
}
