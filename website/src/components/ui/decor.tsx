import { cn } from "./primitives";

/**
 * Botanical decorations. Pure SVG so they stay crisp, recolour easily and
 * add no network weight. All are decorative (aria-hidden).
 */
export function LeafSprig({ className, flip }: { className?: string; flip?: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 160 220"
      className={cn("pointer-events-none select-none", flip && "-scale-x-100", className)}
    >
      <path d="M30 215C55 160 70 110 120 20" stroke="#3f6e2c" strokeWidth="3" fill="none" strokeLinecap="round" />
      {[
        [48, 170, -40],
        [62, 135, 30],
        [76, 108, -35],
        [90, 80, 35],
        [102, 58, -30],
        [114, 34, 25],
      ].map(([x, y, r], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${r})`}>
          <path
            d={i % 2 ? "M0 0c18-14 42-14 58-2-16 14-40 16-58 2Z" : "M0 0c-18-14-42-14-58-2 16 14 40 16 58 2Z"}
            fill={i % 3 === 0 ? "#2f6b2a" : i % 3 === 1 ? "#4d8a38" : "#5f9c45"}
          />
          <path d={i % 2 ? "M2 0h48" : "M-2 0h-48"} stroke="#e8f2dc" strokeWidth="1" opacity=".55" />
        </g>
      ))}
    </svg>
  );
}

/** Light line-art leaf used as a watermark on cream sections. */
export function LeafOutline({ className, flip }: { className?: string; flip?: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 120 160"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      className={cn("pointer-events-none select-none text-gold/40", flip && "-scale-x-100", className)}
    >
      <path d="M20 150C40 100 60 60 100 10" />
      <path d="M38 112c-20-8-30-26-28-44 18 6 28 24 28 44Z" />
      <path d="M52 86c20-4 34-20 36-38-18 2-34 18-36 38Z" />
      <path d="M64 64c-16-10-22-28-18-44 14 8 22 26 18 44Z" />
      <path d="M80 40c16-2 28-14 30-28-14 0-28 12-30 28Z" />
    </svg>
  );
}
