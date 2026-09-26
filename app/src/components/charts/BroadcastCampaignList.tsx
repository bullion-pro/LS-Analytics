import { SeverityCompositionBar } from "./SeverityCompositionBar";
import type { BroadcastCampaignView } from "@/mock/engagement";

/**
 * One row per broadcast campaign, each carrying its own compact delivery-
 * status composition (Read / Delivered-unread / Failed-or-skipped) — message
 * delivery status is genuinely ordinal (a message can't be Read without
 * first being Delivered), so `SeverityCompositionBar` is the analytically
 * correct form here, just applied per-campaign instead of per-aging-bucket
 * (see its use for stage-aging on the Pipeline page). A ranked list of a
 * handful of named campaigns reads more like real operational reporting
 * than one blended aggregate funnel would, and keeps each campaign's name
 * and reach visible — the concrete detail this project favors over a
 * rollup-only view.
 */
export function BroadcastCampaignList({ campaigns }: { campaigns: BroadcastCampaignView[] }) {
  if (campaigns.length === 0) {
    return <p className="py-8 text-center text-[13px] text-[var(--color-ink-muted)]">No broadcasts sent in this period.</p>;
  }
  return (
    <div className="flex flex-col gap-4">
      {campaigns.map((c) => (
        <div key={c.id}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <div className="flex min-w-0 items-baseline gap-1.5">
              <span className="truncate text-[12.5px] font-medium text-[var(--color-ink)]">{c.name}</span>
              <span className="shrink-0 font-label text-[11px] text-[var(--color-ink-muted)]">
                {c.monthLabel} · {c.branchName}
              </span>
            </div>
            <div className="flex shrink-0 items-baseline gap-2">
              <span className="font-label text-[11px] text-[var(--color-ink-muted)]">{c.totalRecipients.toLocaleString()} sent</span>
              <span className="tabular text-[12.5px] font-semibold text-[var(--color-ink)]">{Math.round(c.readRatePct * 100)}% read</span>
            </div>
          </div>
          <SeverityCompositionBar buckets={c.buckets} valueFormatter={(v) => v.toLocaleString()} height={22} compact />
        </div>
      ))}
    </div>
  );
}
