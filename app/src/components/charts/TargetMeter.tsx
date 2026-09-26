import { chartColors } from "./chartColors";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";

const aedCompact = new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED", notation: "compact" });

/**
 * Target-vs-achieved: the fill carries progress in the accent, the unfilled
 * track is a lighter step of the same ramp, and a marker flag drops exactly
 * at the target point — clearer than a plain progress bar because both the
 * current position and the goal line are visible at once.
 */
export function TargetMeter({
  achievedLabel,
  targetLabel,
  achievedValue,
  targetValue,
  captionOverride,
  valueFormatter = (v: number) => aedCompact.format(v),
}: {
  achievedLabel: string;
  targetLabel: string;
  achievedValue: number;
  targetValue: number;
  captionOverride?: string;
  /** Defaults to AED-compact (this component's original, only use) — pass a different
   *  formatter to plot a non-currency ratio (e.g. a percentage) against its target. */
  valueFormatter?: (v: number) => string;
}) {
  const pct = targetValue > 0 ? achievedValue / targetValue : 0;
  const fillPct = Math.min(100, pct * 100);
  const overshoot = pct > 1;

  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <div className="font-label text-[10.5px] font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">
            {achievedLabel}
          </div>
          <AnimatedNumber
            value={achievedValue}
            format={valueFormatter}
            className="text-[20px] font-semibold text-[var(--color-ink)]"
          />
        </div>
        <div className="text-right">
          <div className="font-label text-[10.5px] font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">
            {targetLabel}
          </div>
          <div className="tabular text-[13px] font-medium text-[var(--color-ink-secondary)]">{valueFormatter(targetValue)}</div>
        </div>
      </div>

      <div className="relative mt-4 h-2.5 rounded-full bg-[var(--color-accent-light)]">
        <div
          className="h-2.5 rounded-full bg-[linear-gradient(180deg,#d9b978_0%,var(--color-accent)_55%,var(--color-accent-dark)_100%)] shadow-[0_1px_0_rgba(255,255,255,0.35)_inset] transition-[width] duration-500"
          style={{ width: `${fillPct}%` }}
        />
        <div
          className="absolute top-1/2 flex -translate-y-1/2 flex-col items-center"
          style={{ left: "100%", transform: "translate(-2px, -50%)" }}
        >
          <div className="h-4 w-[2px] bg-[var(--color-ink)]" />
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="text-[11.5px] font-medium" style={{ color: overshoot ? chartColors.good : chartColors.accentDark }}>
          {captionOverride ?? `${(pct * 100).toFixed(1)}% of target`}
        </span>
        {!overshoot && (
          <span className="font-label text-[11px] text-[var(--color-ink-muted)]">
            {valueFormatter(targetValue - achievedValue)} remaining
          </span>
        )}
      </div>
    </div>
  );
}
