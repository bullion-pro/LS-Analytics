import { useEffect, useState } from "react";
import { chartColors } from "./chartColors";
import { ChartLegend } from "./ChartLegend";
import { TooltipCard } from "./ChartTooltip";
import type { PlatformEngagementSummary } from "@/mock/engagement";

const SEGMENT_COLORS = { likes: chartColors.cat[4], comments: chartColors.cat[0], shares: chartColors.cat[2] };

/**
 * Magnitude AND composition in one row per platform — replaces an earlier heatmap attempt that
 * put likes/comments/shares (three metrics at wildly different natural scales) on one shared
 * color intensity, which made every cell except Instagram-Likes read as blank. A ranked bar's
 * length still answers "which platform's content performs best" (avg. engagement per post, so
 * posting frequency doesn't confound the comparison), while each bar's internal segments answer
 * "what kind of engagement" — a like-heavy platform reads very differently from a
 * comment-heavy one even at the same total length.
 */
export function PlatformEngagementBars({ data }: { data: PlatformEngagementSummary[] }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const sorted = [...data].sort((a, b) => b.avgTotal - a.avgTotal);
  const max = Math.max(...sorted.map((d) => d.avgTotal), 1);

  return (
    <div>
      <div className="flex flex-col gap-4">
        {sorted.map((d, i) => {
          const widthPct = Math.max(4, (d.avgTotal / max) * 100);
          const isHovered = hovered === d.key;
          const segments = [
            { key: "likes", label: "Likes", value: d.avgLikes, color: SEGMENT_COLORS.likes },
            { key: "comments", label: "Comments", value: d.avgComments, color: SEGMENT_COLORS.comments },
            { key: "shares", label: "Shares", value: d.avgShares, color: SEGMENT_COLORS.shares },
          ];
          return (
            <div key={d.key} className="group cursor-default" onMouseEnter={() => setHovered(d.key)} onMouseLeave={() => setHovered(null)}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <div className="flex min-w-0 items-baseline gap-1.5">
                  <span className="font-label text-[10px] font-semibold tabular text-[var(--color-ink-muted)]">{String(i + 1).padStart(2, "0")}</span>
                  <span className="truncate text-[12.5px] font-medium text-[var(--color-ink)]">{d.label}</span>
                  <span className="shrink-0 font-label text-[11px] text-[var(--color-ink-muted)]">{d.postCount} posts</span>
                </div>
                <span className="tabular text-[12.5px] font-semibold text-[var(--color-ink)]">{Math.round(d.avgTotal).toLocaleString()} / post</span>
              </div>
              <div className="relative h-[9px] w-full rounded-full bg-[var(--color-surface-sunken)]" style={{ width: `${widthPct}%` }}>
                <div className="flex h-[9px] w-full gap-[1.5px] overflow-hidden rounded-full" style={{ opacity: hovered && !isHovered ? 0.5 : 1, transition: "opacity .2s ease" }}>
                  {segments.map((s) => {
                    const segWidthPct = d.avgTotal ? (s.value / d.avgTotal) * 100 : 0;
                    return (
                      <div
                        key={s.key}
                        className="h-[9px]"
                        style={{
                          width: mounted ? `${segWidthPct}%` : 0,
                          backgroundColor: s.color,
                          backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0) 45%)",
                          transition: `width .6s cubic-bezier(.16,1,.3,1) ${i * 90}ms`,
                        }}
                      />
                    );
                  })}
                </div>
              </div>
              {isHovered && (
                <div className="relative">
                  <div className="pointer-events-none absolute left-0 top-[calc(9px+6px)] z-20">
                    <TooltipCard
                      heading={`${d.label} · avg. per post`}
                      rows={segments.map((s) => ({ key: s.key, label: s.label, value: Math.round(s.value).toLocaleString(), color: s.color, shape: "rect" as const }))}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-5">
        <ChartLegend
          items={[
            { key: "likes", label: "Likes", color: SEGMENT_COLORS.likes, shape: "rect" },
            { key: "comments", label: "Comments", color: SEGMENT_COLORS.comments, shape: "rect" },
            { key: "shares", label: "Shares", color: SEGMENT_COLORS.shares, shape: "rect" },
          ]}
        />
      </div>
    </div>
  );
}
