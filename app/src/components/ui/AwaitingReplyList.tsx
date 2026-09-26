import { Crown, MessageCircle } from "lucide-react";
import type { AwaitingReplyItem } from "@/mock/engagement";

/**
 * Named, concrete conversations still waiting on a reply — the "what should
 * the user investigate next" layer for the WhatsApp desk, same role as the
 * Pipeline page's OpportunityAttentionList but scored on wait time (+ a VIP
 * priority boost) instead of deal-overdue severity. A list, not a chart —
 * these are individual lookups someone needs to act on, not a shape to read.
 */
export function AwaitingReplyList({ items }: { items: AwaitingReplyItem[] }) {
  if (items.length === 0) {
    return <p className="py-8 text-center text-[13px] text-[var(--color-ink-muted)]">No open conversations are waiting on a reply right now.</p>;
  }
  return (
    <div className="flex flex-col">
      {items.map((item, i) => (
        <div key={item.id} className={`flex items-start gap-3 py-3 ${i !== items.length - 1 ? "border-b border-[var(--color-border)]" : ""}`}>
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-warning-tint)] text-[#8a5a06]">
            <MessageCircle size={14} strokeWidth={1.8} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 truncate text-[12.5px] font-medium leading-snug text-[var(--color-ink)]">
                  {item.contactName}
                  {item.isVip && <Crown size={12} strokeWidth={2} className="shrink-0 text-[var(--color-accent-dark)]" />}
                </p>
                <p className="mt-0.5 truncate font-label text-[11px] text-[var(--color-ink-muted)]">
                  {item.agentName} · {item.branchName} · {item.messagesIn} unread message{item.messagesIn === 1 ? "" : "s"}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-[var(--color-warning-tint)] px-1.5 py-0.5 font-label text-[10px] font-semibold text-[#8a5a06]">
                {item.waitingLabel}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
