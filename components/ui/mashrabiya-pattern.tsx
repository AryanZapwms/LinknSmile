// components/ui/mashrabiya-pattern.tsx
//
// Subtle Islamic/Arabic geometric lattice (mashrabiya-style) decorative
// texture, AE-only. Pure CSS (see .pattern-mashrabiya in app/globals.css),
// not an image — crisp at any size, near-zero weight. `color` sets the
// lattice line color via currentColor; keep `opacity` low (0.04–0.08) so
// it reads as texture, not a busy pattern.
import { cn } from "@/lib/utils";

interface MashrabiyaPatternProps {
  className?: string;
  /** 0–1. Defaults to a very subtle 0.06. */
  opacity?: number;
}

export function MashrabiyaPattern({ className, opacity = 0.06 }: MashrabiyaPatternProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("pattern-mashrabiya pointer-events-none absolute inset-0", className)}
      style={{ opacity }}
    />
  );
}
