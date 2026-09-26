import { useEffect, useState } from "react";
import { chartColors } from "./chartColors";
import { TooltipCard } from "./ChartTooltip";

export interface WaterfallDatum {
  key: string;
  label: string;
  delta: number;
  prior: number;
  current: number;
}

interface Step {
  key: string;
  label: string;
  isTotal: boolean;
  value?: number;
  delta?: number;
  from?: number;
  to?: number;
}

/**
 * A month-over-month contribution bridge: starts at the prior total, each
 * category's floating bar adds/subtracts its own change, lands on the new
 * total. Per waterfall convention the axis is zoomed to the working range
 * (not zero) — the story is the step-by-step journey, not magnitude from
 * zero — and that choice is disclosed in the caption, not hidden.
 */
export function ContributionWaterfall({
  data,
  priorLabel,
  currentLabel,
  valueFormatter,
  height = 300,
}: {
  data: WaterfallDatum[];
  priorLabel: string;
  currentLabel: string;
  valueFormatter: (v: number) => string;
  height?: number;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const priorTotal = data.reduce((a, d) => a + d.prior, 0);
  const currentTotal = data.reduce((a, d) => a + d.current, 0);
  const ordered = [...data].sort((a, b) => b.delta - a.delta);

  let running = priorTotal;
  const steps: Step[] = [{ key: "__prior", label: priorLabel, isTotal: true, value: priorTotal }];
  ordered.forEach((d) => {
    steps.push({ key: d.key, label: d.label, isTotal: false, delta: d.delta, from: running, to: running + d.delta });
    running += d.delta;
  });
  steps.push({ key: "__current", label: currentLabel, isTotal: true, value: currentTotal });

  const allVals = steps.flatMap((s) => (s.isTotal ? [s.value!] : [s.from!, s.to!]));
  const rawMin = Math.min(...allVals);
  const rawMax = Math.max(...allVals);
  const pad = (rawMax - rawMin) * 0.25 || rawMax * 0.05;
  const domainMin = Math.max(0, rawMin - pad);
  const domainMax = rawMax + pad * 0.5;
  const span = domainMax - domainMin || 1;

  const n = steps.length;
  const colPct = 100 / n;
  const barPct = colPct * 0.6;

  const plotHeight = height - 46;

  function yPct(v: number) {
    return ((v - domainMin) / span) * 100;
  }

  return (
    <div>
      <div className="relative" style={{ height: plotHeight }}>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const v = domainMin + span * f;
          return (
            <div key={f} className="absolute left-0 right-0 flex items-center gap-2" style={{ bottom: `${f * 100}%` }}>
              <span className="w-14 shrink-0 text-right font-label text-[10px] text-[var(--color-ink-muted)]">
                {valueFormatter(v)}
              </span>
              <div className="h-px flex-1 bg-[var(--color-hairline)]" />
            </div>
          );
        })}

        <div className="absolute inset-0 pl-16">
          {steps.map((s, i) => {
            const topV = s.isTotal ? s.value! : Math.max(s.from!, s.to!);
            const botV = s.isTotal ? domainMin : Math.min(s.from!, s.to!);
            const isHovered = hovered === s.key;
            const color = s.isTotal ? chartColors.ink : s.delta! >= 0 ? chartColors.good : chartColors.critical;
            const leftPct = colPct * i + (colPct - barPct) / 2;

            return (
              <div key={s.key}>
                {i > 0 && (
                  <div
                    className="absolute border-t border-dashed"
                    style={{
                      left: `${colPct * (i - 1) + colPct / 2}%`,
                      width: `${colPct}%`,
                      bottom: `${yPct(s.isTotal ? s.value! : s.from!)}%`,
                      borderColor: "var(--color-baseline)",
                    }}
                  />
                )}

                <div
                  className="absolute rounded-[4px]"
                  style={{
                    left: `${leftPct}%`,
                    width: `${barPct}%`,
                    bottom: `${yPct(botV)}%`,
                    height: mounted ? `${Math.max(1, yPct(topV) - yPct(botV))}%` : 0,
                    backgroundColor: color,
                    backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 45%)",
                    opacity: hovered && !isHovered ? 0.55 : 1,
                    transition: `height .5s cubic-bezier(.16,1,.3,1) ${i * 90}ms, opacity .2s ease`,
                  }}
                  onMouseEnter={() => setHovered(s.key)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <span
                    className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap font-label text-[10px] font-semibold"
                    style={{
                      bottom: "100%",
                      marginBottom: 4 + (i % 3) * 13,
                      color: s.isTotal ? "var(--color-ink)" : s.delta! >= 0 ? "#0a6b0a" : "#a12626",
                      opacity: mounted ? 1 : 0,
                      transition: `opacity .3s ease ${i * 90 + 300}ms`,
                    }}
                  >
                    {s.isTotal ? valueFormatter(s.value!) : `${s.delta! >= 0 ? "+" : "−"}${valueFormatter(Math.abs(s.delta!))}`}
                  </span>

                  {isHovered && (
                    <div className="pointer-events-none absolute bottom-[calc(100%+22px)] left-1/2 z-20 -translate-x-1/2">
                      {s.isTotal ? (
                        <TooltipCard rows={[{ key: s.key, label: s.label, value: valueFormatter(s.value!), color, shape: "rect" }]} />
                      ) : (
                        <TooltipCard
                          heading={s.label}
                          rows={[
                            { key: "prior", label: priorLabel, value: valueFormatter(s.from!), color: chartColors.baseline },
                            { key: "current", label: currentLabel, value: valueFormatter(s.to!), color },
                            {
                              key: "delta",
                              label: "Change",
                              value: `${s.delta! >= 0 ? "+" : "−"}${valueFormatter(Math.abs(s.delta!))}`,
                              color,
                            },
                          ]}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-2 flex pl-16">
        {steps.map((s, i) => (
          <div
            key={s.key}
            className="text-center"
            style={{ width: `${colPct}%`, marginTop: (i % 3) * 13 }}
          >
            <span
              className={`whitespace-nowrap font-label text-[10.5px] ${s.isTotal ? "font-semibold text-[var(--color-ink)]" : "text-[var(--color-ink-muted)]"}`}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-4 font-label text-[11px] leading-relaxed text-[var(--color-ink-muted)]">
        Axis starts near {valueFormatter(domainMin)}, not zero — a waterfall reads as a step-by-step bridge between two
        totals, not a from-zero magnitude, so the bars stay proportionally honest to the change they represent.
      </p>
    </div>
  );
}
