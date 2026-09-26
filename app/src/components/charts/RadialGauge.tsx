import { useId } from "react";
import { motion } from "motion/react";

/**
 * A single-metric radial progress ring — reserved for one value against its
 * own ceiling (facility utilization, coverage), never a multi-category
 * part-to-whole (that's CompositionBar's job — see its "never a donut" note).
 */
export function RadialGauge({
  value,
  valueLabel,
  label,
  size = 128,
  strokeWidth = 11,
  tone = "light",
}: {
  /** Fraction 0..1 */
  value: number;
  valueLabel: string;
  label: string;
  size?: number;
  strokeWidth?: number;
  tone?: "light" | "dark";
}) {
  const gradientId = useId();
  const clamped = Math.max(0, Math.min(1, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clamped);
  const trackColor = tone === "dark" ? "rgba(255,255,255,0.14)" : "var(--color-accent-light)";
  const valueColor = tone === "dark" ? "text-white" : "text-[var(--color-ink)]";
  const labelColor = tone === "dark" ? "text-white/55" : "text-[var(--color-ink-muted)]";

  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f0d9a8" />
            <stop offset="55%" stopColor="#b08d4f" />
            <stop offset="100%" stopColor="#8a6c38" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-2 text-center">
        <span className={`text-[21px] font-semibold tracking-tight ${valueColor}`}>{valueLabel}</span>
        <span className={`mt-0.5 font-label text-[9.5px] font-medium uppercase tracking-wide ${labelColor}`}>{label}</span>
      </div>
    </div>
  );
}
