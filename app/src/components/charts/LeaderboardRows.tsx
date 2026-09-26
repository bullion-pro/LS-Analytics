import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Gem, Scale, Sparkles, Users } from "lucide-react";
import type { Archetype } from "@/mock/derive";

export interface LeaderboardRowDatum {
  key: string;
  label: string;
  sublabel: string;
  value: number;
  target: number;
  attainment: number;
  momentum?: number;
  archetype: Archetype;
}

const ARCHETYPE_META: Record<Exclude<Archetype, null>, { label: string; icon: typeof Sparkles }> = {
  star: { label: "Star performer", icon: Sparkles },
  volume: { label: "Volume driver", icon: Users },
  premium: { label: "Premium closer", icon: Gem },
  support: { label: "Needs support", icon: Scale },
};

/**
 * A leaderboard is fundamentally a ranked list — that contract stays the
 * spine here. What the quadrant/bullet/bump candidates each showed
 * separately (target context, momentum, volume-vs-value character) folds
 * in as secondary/tertiary signal per row, instead of trading rank away
 * for one of those views.
 */
export function LeaderboardRows({
  data,
  valueFormatter,
}: {
  data: LeaderboardRowDatum[];
  valueFormatter: (v: number) => string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {data.map((rep, i) => {
        const scaleMax = Math.max(rep.value, rep.target) * 1.08;
        const achievedPct = (rep.value / scaleMax) * 100;
        const targetTickPct = (rep.target / scaleMax) * 100;
        const tier = rep.attainment >= 1 ? "good" : rep.attainment >= 0.85 ? "warning" : "critical";
        const archetypeMeta = rep.archetype ? ARCHETYPE_META[rep.archetype] : null;
        const ArchetypeIcon = archetypeMeta?.icon;

        return (
          <div key={rep.key}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <div className="flex min-w-0 items-baseline gap-2">
                <span className="font-label text-[10px] font-semibold tabular text-[var(--color-ink-muted)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="truncate text-[12.5px] font-medium text-[var(--color-ink)]">{rep.label}</span>
                <span className="shrink-0 font-label text-[11px] text-[var(--color-ink-muted)]">{rep.sublabel}</span>
                {archetypeMeta && ArchetypeIcon && (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--color-accent-light)] px-1.5 py-0.5 font-label text-[9.5px] font-semibold uppercase tracking-wide text-[var(--color-accent-dark)]">
                    <ArchetypeIcon size={9} strokeWidth={2.5} />
                    {archetypeMeta.label}
                  </span>
                )}
              </div>
              <div className="flex shrink-0 items-baseline gap-2">
                {rep.momentum !== undefined && rep.momentum !== 0 && (
                  <span
                    className={`flex items-center gap-0.5 font-label text-[10.5px] font-semibold tabular ${
                      rep.momentum > 0 ? "text-[#0a6b0a]" : "text-[#a12626]"
                    }`}
                    title={`${rep.momentum > 0 ? "Up" : "Down"} ${Math.abs(rep.momentum)} rank${Math.abs(rep.momentum) === 1 ? "" : "s"} vs 3 months ago`}
                  >
                    {rep.momentum > 0 ? <ArrowUp size={11} strokeWidth={3} /> : <ArrowDown size={11} strokeWidth={3} />}
                    {Math.abs(rep.momentum)}
                  </span>
                )}
                <span
                  className={`tabular rounded-full px-1.5 py-0.5 font-label text-[10px] font-semibold ${
                    tier === "good"
                      ? "bg-[var(--color-good-tint)] text-[#0a6b0a]"
                      : tier === "warning"
                        ? "bg-[var(--color-warning-tint)] text-[#8a5a06]"
                        : "bg-[var(--color-critical-tint)] text-[#a12626]"
                  }`}
                >
                  {(rep.attainment * 100).toFixed(0)}%
                </span>
                <span className="tabular text-[12.5px] font-semibold text-[var(--color-ink)]">{valueFormatter(rep.value)}</span>
              </div>
            </div>

            <div className="relative h-[7px] rounded-full bg-[var(--color-surface-sunken)]">
              <div
                className="h-[7px] rounded-full bg-[linear-gradient(180deg,#f0d9a8_0%,var(--color-accent)_55%,var(--color-accent-dark)_100%)]"
                style={{ width: mounted ? `${achievedPct}%` : 0, transition: `width .6s cubic-bezier(.16,1,.3,1) ${i * 40}ms` }}
              />
              <div
                className="absolute top-1/2 h-2.5 w-px -translate-y-1/2 bg-[var(--color-ink)]"
                style={{ left: `${targetTickPct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
