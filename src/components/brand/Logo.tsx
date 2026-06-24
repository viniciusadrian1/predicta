// ── Predicta · marca oficial (logo) ──────────────────────────────────────────
// O símbolo do "gêmeo": o sinal FÍSICO (linha cheia, steel) e seu reflexo DIGITAL
// (linha tracejada, cobalto), espelhados sobre o eixo do "agora", terminando em
// dois pontos — observado (steel cheio) e previsto (cobalto vazado). Fonte de
// verdade: Guia de Marca / src/lib/theme.ts (paleta C).
import { C } from "@/lib/theme";

type Variant = "color" | "white" | "dark";

export function PredictaMark({ size = 32, variant = "color" }: { size?: number; variant?: Variant }) {
  // physical (solid) = steel · digital (dashed) = cobalt · axis = slate
  const sig = variant === "color" ? C.steel : variant === "white" ? "#ffffff" : "#07101E";
  const dig = variant === "color" ? C.cobalt : variant === "white" ? "#ffffff" : "#07101E";
  const axis = variant === "color" ? C.slate : variant === "white" ? "#ffffff" : "#07101E";
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" role="img" aria-label="Predicta">
      <line x1="9" y1="32" x2="55" y2="32" stroke={axis} strokeWidth="1" strokeOpacity={variant === "color" ? 0.5 : 0.4} strokeDasharray="2 3" />
      <polyline points="9,40 17,34 24,38 31,28 38,31 46,20 54,15" fill="none" stroke={sig} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="9,24 17,30 24,26 31,36 38,33 46,44 54,49" fill="none" stroke={dig} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 4" />
      <circle cx="54" cy="15" r="3" fill={sig} />
      <circle cx="54" cy="49" r="3" fill="none" stroke={dig} strokeWidth="2" />
    </svg>
  );
}

// Lockup completo: marca + wordmark "Predicta" + endosso "by Forzy".
export function PredictaLockup({ size = 36, variant = "color", by = true }: { size?: number; variant?: Variant; by?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <PredictaMark size={size} variant={variant} />
      <div className="leading-none">
        <div className="font-bold tracking-[0.01em]" style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: size * 0.62, color: variant === "dark" ? "#07101E" : C.text }}>Predicta</div>
        {by && <div className="mt-1" style={{ fontFamily: "'Inter',sans-serif", fontSize: Math.max(9, size * 0.26), color: C.slate }}>by <span style={{ color: C.steel }}>Forzy</span></div>}
      </div>
    </div>
  );
}
