import type { LucideIcon } from "lucide-react";
import { Receipt, Landmark, Users, Wallet, Truck, Gem, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import type { JournalEntry } from "@/mock/finance";

const TYPE_ICON: Record<string, LucideIcon> = {
  Sales: Receipt,
  Tax: Landmark,
  Payroll: Users,
  Financing: Wallet,
  Purchase: Truck,
  Revaluation: Gem,
};

/** A short, concrete feed of journal-voucher-style entries — texture on top of the aggregate charts, closer to how the real accounting module reads. */
export function JournalActivityFeed({ entries, valueFormatter }: { entries: JournalEntry[]; valueFormatter: (v: number) => string }) {
  return (
    <div className="flex flex-col">
      {entries.map((e, i) => {
        const Icon = TYPE_ICON[e.type] ?? Receipt;
        const isCredit = e.direction === "credit";
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
                  {isCredit ? (
                    <ArrowDownLeft size={11} strokeWidth={2.75} className="text-[var(--color-ink-muted)]" />
                  ) : (
                    <ArrowUpRight size={11} strokeWidth={2.75} className="text-[var(--color-ink-muted)]" />
                  )}
                  {valueFormatter(e.amountAED)}
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="font-label text-[11px] text-[var(--color-ink-muted)]">{e.account}</span>
                <span className="text-[var(--color-ink-muted)]">·</span>
                <span className="font-label text-[11px] text-[var(--color-ink-muted)]">{e.date}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
