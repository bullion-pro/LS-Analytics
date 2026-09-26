import { AlertTriangle, PauseCircle } from "lucide-react";
import type { AttentionItem } from "@/mock/pipeline";

const TONE_STYLES: Record<AttentionItem["tone"], { bg: string; fg: string; icon: string }> = {
  warning: { bg: "bg-[var(--color-warning-tint)]", fg: "text-[#8a5a06]", icon: "text-[#8a5a06]" },
  critical: { bg: "bg-[var(--color-critical-tint)]", fg: "text-[#a12626]", icon: "text-[#a12626]" },
};

/**
 * Named, concrete deals that need a decision this week — overdue past their
 * expected close, stalled in-stage, or paused on hold. Deliberately a list,
 * not another chart: "which specific deals" is a lookup question, and the
 * dataviz skill's own guidance is that a ranked/attention list beats a chart
 * once the reader needs to act on individual named rows, not read a shape.
 */
export function OpportunityAttentionList({ items, valueFormatter }: { items: AttentionItem[]; valueFormatter: (v: number) => string }) {
  if (items.length === 0) {
    return <p className="py-8 text-center text-[13px] text-[var(--color-ink-muted)]">No open deals are overdue or stalled right now.</p>;
  }
  return (
    <div className="flex flex-col">
      {items.map((item, i) => {
        const tone = TONE_STYLES[item.tone];
        const Icon = item.tag === "On hold" ? PauseCircle : AlertTriangle;
        return (
          <div
            key={item.id}
            className={`flex items-start gap-3 py-3 ${i !== items.length - 1 ? "border-b border-[var(--color-border)]" : ""}`}
          >
            <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tone.bg} ${tone.icon}`}>
              <Icon size={14} strokeWidth={1.8} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-medium leading-snug text-[var(--color-ink)]">{item.title}</p>
                  <p className="mt-0.5 truncate font-label text-[11px] text-[var(--color-ink-muted)]">
                    {item.stageLabel} · {item.salesmanName} · {item.branchName}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="tabular text-[12.5px] font-semibold text-[var(--color-ink)]">{valueFormatter(item.valueAED)}</span>
                  <span className={`rounded-full px-1.5 py-0.5 font-label text-[10px] font-semibold ${tone.bg} ${tone.fg}`}>{item.tag}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
