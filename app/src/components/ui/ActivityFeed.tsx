import type { LucideIcon } from "lucide-react";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

export interface ActivityFeedEntry {
  id: string;
  icon: LucideIcon;
  description: string;
  meta: string;
  amountAED: number;
  /** "in" = money/stock moving toward the business (sale, GRN receipt); "out" = moving away (payment, dispatch). */
  direction: "in" | "out";
}

/** A short, concrete feed of transaction-style entries — texture on top of the aggregate charts, closer to how the real operational modules read. Same visual language across Sales, Inventory, and Supplier pages. */
export function ActivityFeed({ entries, valueFormatter }: { entries: ActivityFeedEntry[]; valueFormatter: (v: number) => string }) {
  return (
    <div className="flex flex-col">
      {entries.map((e, i) => {
        const Icon = e.icon;
        return (
          <div
            key={e.id}
            className={`flex items-start gap-3 py-3 ${i !== entries.length - 1 ? "border-b border-[var(--color-border)]" : ""}`}
          >
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-light)] text-[var(--color-accent-dark)]">
              <Icon size={14} strokeWidth={1.8} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[12.5px] font-medium leading-snug text-[var(--color-ink)]">{e.description}</p>
                <span className="flex shrink-0 items-center gap-0.5 tabular text-[12.5px] font-semibold text-[var(--color-ink)]">
                  {e.direction === "in" ? (
                    <ArrowDownLeft size={11} strokeWidth={2.75} className="text-[var(--color-ink-muted)]" />
                  ) : (
                    <ArrowUpRight size={11} strokeWidth={2.75} className="text-[var(--color-ink-muted)]" />
                  )}
                  {valueFormatter(e.amountAED)}
                </span>
              </div>
              <p className="mt-0.5 truncate font-label text-[11px] text-[var(--color-ink-muted)]">{e.meta}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
