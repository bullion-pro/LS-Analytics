/**
 * Engagement (WhatsApp + Social) mock data — grounded in a full read of LS's
 * real schema (`whatsapp.prisma`, `whatsappFlow.prisma`, `social.prisma`),
 * not just the earlier high-level crm-analysis.md summary:
 *
 * - `WhatsappConversation.status` is a real 3-value enum: OPEN | PENDING | RESOLVED.
 * - `WhatsappMessage.pricingCategory` is real Meta billing data, stored as
 *   lowercase free text: 'service' | 'utility' | 'marketing' | 'authentication'
 *   (there is no per-message price field — only a `billable` boolean — so
 *   this page shows message-count mix, never invented AED costs).
 * - `WaBroadcast` has real denormalized counters: totalRecipients, sentCount,
 *   deliveredCount, readCount, failedCount, skippedCount.
 * - `WaFlowExecution.currentNodeId` is the real drop-off signal for a
 *   non-completed chatbot run — this automation layer has NO analytics UI
 *   anywhere in CRM today (genuinely greenfield, confirmed by schema read).
 * - `SocialPost.metrics` is ONLY `{likes, comments, shares}` in the real
 *   schema — no reach/impressions/saves exist, so none are shown here.
 * - Social tables carry NO organizationId/branchId (only `userId` scoping) —
 *   the opposite of WhatsApp's mature branch-scoped model. Social sections
 *   on this page are therefore company-wide, not branch-filterable; this is
 *   a real schema asymmetry, not an oversight.
 * - CRM has no formal Salesman<->WhatsApp link (`assignedUserId` points at
 *   `User`, not `Salesman`). Modeling WA agents as branch staff (reusing the
 *   SALESMEN roster) is a deliberate illustrative simplification, flagged
 *   here rather than presented as a real join.
 */
import { createRng, rngGaussian, rngInt, rngWeightedPick } from "./rng";
import { MONTHS } from "./calendar";
import { BRANCHES, SALESMEN } from "./dimensions";
import type { BranchFilter } from "@/store/filters";
import type { CompositionDatum } from "@/components/charts/CompositionBar";
import type { RankedBarDatum } from "@/components/charts/RankedBar";

const TODAY = new Date(2026, 8, 24); // matches calendar.ts's TODAY, see mock/pipeline.ts's identical note

export type ConversationStatus = "Open" | "Pending" | "Resolved";
export type PricingCategory = "Service" | "Utility" | "Marketing" | "Authentication";
export type SocialPlatform = "Instagram" | "Facebook" | "Threads";

function dateFor(monthIdx: number, day: number): Date {
  return new Date(MONTHS[monthIdx].year, MONTHS[monthIdx].monthIndex, day + 1);
}
function daysBetween(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
function branchMatch<T extends { branchId: string }>(r: T, branch: BranchFilter): boolean {
  return branch === "all" || r.branchId === branch;
}

// ─── Name pools ───

const CONTACT_FIRST = [
  "Huda", "Marwan", "Sara", "Adel", "Jana", "Fahad", "Lina", "Bilal", "Rania", "Suhail",
  "Nour", "Ziad", "Dalia", "Rami", "Yara", "Kareem", "Lara", "Mazen", "Sana", "Firas",
  "Kavya", "Nikhil", "Alessandra", "Diego", "Chloe", "Hugo", "Ines",
];
const CONTACT_LAST = [
  "Al Blooshi", "Al Kaabi", "Al Mheiri", "Al Ketbi", "Haidar", "Awad", "Nasser", "Farouk",
  "Coelho", "Mercier", "Fontaine", "Barros", "Wynn", "Harcourt", "Verma", "Chopra", "Delgado",
];

// ─── Automation: one representative appointment/inquiry chatbot flow ───

export const FLOW_NAME = "Appointment & Inquiry Assistant";
const FLOW_NODES = ["Welcome", "Ask Purpose", "Ask Branch", "Ask Date & Time", "Confirm Details", "Booking Confirmed"];
const DROP_OFF_WEIGHTS = [0.09, 0.14, 0.17, 0.4, 0.2]; // among the 5 non-terminal nodes

// ─── Broadcast campaign names — round-robin, same anti-collision fix used in mock/pipeline.ts ───

const CAMPAIGN_NAMES = [
  "Eid Collection Launch", "VIP Preview: New Diamond Line", "Ramadan Greetings",
  "Anniversary Sale Alert", "New Branch Opening — Sharjah", "Bridal Season Lookbook",
  "Gold Rate Alert: Book Your Rate", "Customer Appreciation Week", "National Day Collection",
  "Winter Wedding Edit", "Loyalty Tier Upgrade Notice", "Custom Commission Open Slots",
];
const SKIP_REASONS = ["not opted in", "invalid number", "number unreachable"];
const SKIP_REASON_WEIGHTS = [0.62, 0.28, 0.1];

// ─── Social post captions — round-robin per platform ───

const POST_CAPTIONS: Record<SocialPlatform, string[]> = {
  Instagram: [
    "New Arrivals: 22K Bridal Collection", "Behind the Scenes: Crafting a Custom Emerald Ring",
    "Client Spotlight: A Custom Engagement Ring Reveal", "Meet Our Master Goldsmith",
    "Wedding Season Lookbook", "Style Edit: Layering Fine Chains", "Heritage Collection Launch",
    "Diamond Care 101", "Eid Mubarak From Our Family to Yours",
  ],
  Facebook: [
    "Now Open: Sharjah City Centre Boutique", "Gold Rate Update: This Week's Fix",
    "Customer Stories: 20 Years of Trust", "Ramadan Kareem: Our Gifting Guide",
    "Meet the Team: Our Bridal Consultants", "Community Spotlight: Local Artisans",
  ],
  Threads: ["Quick Take: This Week's Gold Rate", "Behind the Counter", "Ask Us Anything: Jewellery Care", "New Drop Alert"],
};

// ─── Followers — current snapshot + illustrative monthly growth rate (no history table in the
// real schema; the 30-day comparator below is the same "replay the assumption" technique used
// for Pipeline's hero delta, not a claim that CRM stores follower history). ───

export const FOLLOWER_SNAPSHOT: Record<SocialPlatform, { current: number; monthlyGrowthRate: number }> = {
  Instagram: { current: 48_200, monthlyGrowthRate: 0.018 },
  Facebook: { current: 19_500, monthlyGrowthRate: 0.006 },
  Threads: { current: 3_150, monthlyGrowthRate: 0.04 },
};

export function socialFollowerSnapshot() {
  return (Object.keys(FOLLOWER_SNAPSHOT) as SocialPlatform[]).map((platform) => {
    const { current, monthlyGrowthRate } = FOLLOWER_SNAPSHOT[platform];
    const prior30d = Math.round(current / (1 + monthlyGrowthRate));
    return { platform, current, prior30d };
  });
}

// ─── Conversations ───

export interface ConversationRecord {
  id: string;
  contactName: string;
  branchId: string;
  agentId: string;
  createdMonthIdx: number;
  ageInDays: number;
  status: ConversationStatus;
  isOptedIn: boolean;
  isVip: boolean;
  firstResponseMinutes: number;
  messagesIn: number;
  messagesOut: number;
  resolvedMonthIdx: number | null;
  lastActivityDaysAgo: number;
  awaitingReplyHours: number; // only meaningful for status === "Open"
}

function generateConversations(): ConversationRecord[] {
  const rng = createRng(51423);
  const records: ConversationRecord[] = [];
  let seq = 0;

  MONTHS.forEach((_m, monthIdx) => {
    // Volume, like mock/pipeline.ts's opportunity count, is set for the STEADY-STATE ACTIVE
    // stock (open + pending conversations right now), not the 24-month total: active ≈
    // (conversations/day) × (avg days-to-resolve, ≈5.5d weighted across the bimodal split
    // above). Too few here starves "active conversations" to a handful company-wide even
    // though total historical volume looks fine.
    const count = rngInt(rng, 220, 300);
    for (let i = 0; i < count; i++) {
      seq++;
      const branch = rngWeightedPick(rng, BRANCHES, BRANCHES.map((b) => b.weight));
      const branchAgents = SALESMEN.filter((s) => s.branchId === branch.id);
      const agent = branchAgents[rngInt(rng, 0, branchAgents.length - 1)] ?? SALESMEN[0];
      const contactName = `${CONTACT_FIRST[rngInt(rng, 0, CONTACT_FIRST.length - 1)]} ${CONTACT_LAST[rngInt(rng, 0, CONTACT_LAST.length - 1)]}`;

      const createdDay = rngInt(rng, 0, 27);
      const created = dateFor(monthIdx, createdDay);
      const ageInDays = daysBetween(TODAY, created);
      if (ageInDays < 0) continue;

      // Response-time story: the desk has been getting faster — mean drifts from ~9.5min two
      // years ago to ~5.5min today, with realistic noise on top.
      const progressFrac = monthIdx / (MONTHS.length - 1);
      const meanResponse = 9.5 - progressFrac * 4;
      const firstResponseMinutes = Math.max(0.5, Math.round(clamp(rngGaussian(rng, meanResponse, 3.2), 0.5, 40) * 10) / 10);

      const isOptedIn = rng() < 0.82;
      const isVip = rng() < 0.15;
      const messagesIn = rngInt(rng, 3, 14);
      const messagesOut = rngInt(rng, 3, 16);

      // Resolution time is genuinely bimodal, not a single gaussian: most inquiries (price
      // checks, availability, simple questions) close within a couple of days, but a real
      // minority (custom commissions, repairs, back-and-forth negotiation) stay open for weeks.
      // A single narrow gaussian (mean 4d) understates that tail so badly that the steady-state
      // "currently active" stock collapses to single digits company-wide — the same starvation
      // bug hit (and fixed the same way) in mock/pipeline.ts's open-opportunity stock.
      const isComplexThread = rng() < 0.22;
      const daysToResolve = isComplexThread ? clamp(rngGaussian(rng, 16, 9), 3, 60) : clamp(rngGaussian(rng, 2.2, 1.8), 0.15, 7);
      let status: ConversationStatus;
      let resolvedMonthIdx: number | null = null;
      let lastActivityDaysAgo: number;
      let awaitingReplyHours = 0;

      if (ageInDays >= daysToResolve) {
        status = "Resolved";
        const resolvedOffsetMonths = Math.min(Math.round(daysToResolve / 30), MONTHS.length - 1 - monthIdx);
        resolvedMonthIdx = Math.min(monthIdx + resolvedOffsetMonths, MONTHS.length - 1);
        lastActivityDaysAgo = Math.round(ageInDays - daysToResolve);
      } else {
        status = rng() < 0.55 ? "Open" : "Pending";
        lastActivityDaysAgo = rngInt(rng, 0, Math.max(0, Math.min(10, Math.floor(ageInDays))));
        if (status === "Open") {
          awaitingReplyHours = Math.round(clamp(rngGaussian(rng, 6, 14), 0.1, 120) * 10) / 10;
        }
      }

      records.push({
        id: `wa-${seq}`,
        contactName,
        branchId: branch.id,
        agentId: agent.id,
        createdMonthIdx: monthIdx,
        ageInDays,
        status,
        isOptedIn,
        isVip,
        firstResponseMinutes,
        messagesIn,
        messagesOut,
        resolvedMonthIdx,
        lastActivityDaysAgo,
        awaitingReplyHours,
      });
    }
  });

  return records;
}

export const CONVERSATIONS: ConversationRecord[] = generateConversations();

function conversationsCreatedIn(months: { key: string }[], branch: BranchFilter): ConversationRecord[] {
  const idxSet = new Set(months.map((m) => MONTHS.findIndex((mm) => mm.key === m.key)));
  return CONVERSATIONS.filter((r) => branchMatch(r, branch) && idxSet.has(r.createdMonthIdx));
}

export function activeConversations(branch: BranchFilter): ConversationRecord[] {
  return CONVERSATIONS.filter((r) => branchMatch(r, branch) && r.status !== "Resolved");
}

/** Replays the same seeded timeline as of `daysAgo` days before today (same technique as
 *  mock/pipeline.ts's pipelineHeroTotalsAsOfDaysAgo). */
function activeAsOfDaysAgo(branch: BranchFilter, daysAgo: number): number {
  return CONVERSATIONS.filter((r) => {
    if (!branchMatch(r, branch)) return false;
    const ageAtPast = r.ageInDays - daysAgo;
    if (ageAtPast < 0) return false;
    const daysToResolveAtPast = r.resolvedMonthIdx === null ? Infinity : r.ageInDays - r.lastActivityDaysAgo;
    return ageAtPast < daysToResolveAtPast;
  }).length;
}

export interface EngagementHeroTotals {
  avgFirstResponseMinutes: number;
  resolutionRatePct: number;
  optedInSharePct: number;
  activeCount: number;
}

export function engagementHeroTotals(months: { key: string }[], branch: BranchFilter): EngagementHeroTotals {
  const created = conversationsCreatedIn(months, branch);
  const avgFirstResponseMinutes = created.length ? created.reduce((a, r) => a + r.firstResponseMinutes, 0) / created.length : 0;
  const resolutionRatePct = created.length ? created.filter((r) => r.resolvedMonthIdx !== null).length / created.length : 0;
  const optedInSharePct = created.length ? created.filter((r) => r.isOptedIn).length / created.length : 0;
  const activeCount = activeConversations(branch).length;
  return { avgFirstResponseMinutes, resolutionRatePct, optedInSharePct, activeCount };
}

export function activeConversationsAsOfDaysAgo(branch: BranchFilter, daysAgo: number): number {
  return activeAsOfDaysAgo(branch, daysAgo);
}

export function responseTimeTrendYoY(branch: BranchFilter) {
  const trailing = MONTHS.slice(-12);
  return trailing.map((m, i) => {
    const idx = MONTHS.length - 12 + i;
    const priorIdx = idx - 12;
    const cur = CONVERSATIONS.filter((r) => branchMatch(r, branch) && r.createdMonthIdx === idx);
    const prior = priorIdx >= 0 ? CONVERSATIONS.filter((r) => branchMatch(r, branch) && r.createdMonthIdx === priorIdx) : [];
    const avg = (recs: ConversationRecord[]) => (recs.length ? recs.reduce((a, r) => a + r.firstResponseMinutes, 0) / recs.length : undefined);
    return { key: m.key, label: m.shortLabel, current: Math.round((avg(cur) ?? 0) * 10) / 10, prior: prior.length ? Math.round(avg(prior)! * 10) / 10 : undefined };
  });
}

export function resolutionRateVsTarget(months: { key: string }[], branch: BranchFilter, targetPct = 0.9) {
  const created = conversationsCreatedIn(months, branch);
  const achievedPct = created.length ? created.filter((r) => r.resolvedMonthIdx !== null).length / created.length : 0;
  return { achievedPct, targetPct, resolved: created.filter((r) => r.resolvedMonthIdx !== null).length, total: created.length };
}

export interface AwaitingReplyItem {
  id: string;
  contactName: string;
  branchName: string;
  agentName: string;
  isVip: boolean;
  waitingLabel: string;
  messagesIn: number;
}

export function conversationsAwaitingReply(branch: BranchFilter, n = 6): AwaitingReplyItem[] {
  const open = activeConversations(branch).filter((r) => r.status === "Open");
  const scored = open
    .map((r) => ({ ...r, severity: r.awaitingReplyHours + (r.isVip ? 24 : 0) }))
    .sort((a, b) => b.severity - a.severity)
    .slice(0, n);
  return scored.map((r) => {
    const agent = SALESMEN.find((s) => s.id === r.agentId);
    const branchRec = BRANCHES.find((b) => b.id === r.branchId);
    const waitingLabel = r.awaitingReplyHours >= 24 ? `${Math.round(r.awaitingReplyHours / 24)}d waiting` : `${Math.max(1, Math.round(r.awaitingReplyHours))}h waiting`;
    return {
      id: r.id,
      contactName: r.contactName,
      branchName: branchRec?.name ?? "",
      agentName: agent?.name ?? "—",
      isVip: r.isVip,
      waitingLabel,
      messagesIn: r.messagesIn,
    };
  });
}

// ─── Message mix by pricing category — count-based, combining conversation replies (mostly
// free "service"-window messages) and broadcast sends (mostly billable "marketing" template
// messages) — no per-message AED cost exists in the real schema, so only counts are shown. ───

export function messageMixByCategory(months: { key: string }[], branch: BranchFilter): CompositionDatum[] {
  const created = conversationsCreatedIn(months, branch);
  const outboundFromConversations = created.reduce((a, r) => a + r.messagesOut, 0);
  const broadcastsSent = broadcastCampaignsRaw(months, branch).reduce((a, b) => a + b.sentCount, 0);

  const service = Math.round(outboundFromConversations * 0.85);
  const utilityFromConvos = outboundFromConversations - service - Math.round(outboundFromConversations * 0.03);
  const authentication = Math.round(outboundFromConversations * 0.03);
  const marketingFromBroadcasts = Math.round(broadcastsSent * 0.78);
  const utilityFromBroadcasts = broadcastsSent - marketingFromBroadcasts;

  return [
    { key: "service", label: "Service (agent replies)", value: service },
    { key: "utility", label: "Utility (order/appointment updates)", value: Math.max(0, utilityFromConvos) + utilityFromBroadcasts },
    { key: "marketing", label: "Marketing (campaigns)", value: marketingFromBroadcasts },
    { key: "authentication", label: "Authentication", value: authentication },
  ];
}

// ─── Broadcasts ───

export interface BroadcastRecord {
  id: string;
  name: string;
  branchId: string;
  monthIdx: number;
  kind: "Template" | "Freeform";
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  skippedCount: number;
  topSkipReason: string;
}

function generateBroadcasts(): BroadcastRecord[] {
  const rng = createRng(68217);
  const records: BroadcastRecord[] = [];
  let seq = 0;
  let nameCursor = 0;

  MONTHS.forEach((_m, monthIdx) => {
    const count = rngInt(rng, 2, 4);
    for (let i = 0; i < count; i++) {
      seq++;
      const branch = rngWeightedPick(rng, BRANCHES, BRANCHES.map((b) => b.weight));
      const name = CAMPAIGN_NAMES[nameCursor % CAMPAIGN_NAMES.length];
      nameCursor++;
      const kind: "Template" | "Freeform" = rng() < 0.9 ? "Template" : "Freeform";

      const totalRecipients = Math.round(rngInt(rng, 150, 3200) * (0.6 + branch.weight));
      const skippedCount = Math.round(totalRecipients * (0.02 + rng() * 0.04));
      const attempted = totalRecipients - skippedCount;
      const sentCount = attempted;
      const failedCount = Math.round(attempted * (0.02 + rng() * 0.06));
      const deliveredCount = attempted - failedCount;
      const readCount = Math.round(deliveredCount * (0.5 + rng() * 0.32));
      const topSkipReason = rngWeightedPick(rng, SKIP_REASONS, SKIP_REASON_WEIGHTS);

      records.push({
        id: `bc-${seq}`,
        name,
        branchId: branch.id,
        monthIdx,
        kind,
        totalRecipients,
        sentCount,
        deliveredCount,
        readCount,
        failedCount,
        skippedCount,
        topSkipReason,
      });
    }
  });

  return records;
}

export const BROADCASTS: BroadcastRecord[] = generateBroadcasts();

function broadcastCampaignsRaw(months: { key: string }[], branch: BranchFilter): BroadcastRecord[] {
  const idxSet = new Set(months.map((m) => MONTHS.findIndex((mm) => mm.key === m.key)));
  return BROADCASTS.filter((b) => branchMatch(b, branch) && idxSet.has(b.monthIdx));
}

export interface BroadcastCampaignView {
  id: string;
  name: string;
  branchName: string;
  monthLabel: string;
  totalRecipients: number;
  readRatePct: number;
  buckets: { key: string; label: string; value: number; color: string }[];
}

export function broadcastCampaigns(months: { key: string }[], branch: BranchFilter, ramp: { good: string; warning: string; critical: string }, n = 5): BroadcastCampaignView[] {
  return [...broadcastCampaignsRaw(months, branch)]
    .sort((a, b) => b.totalRecipients - a.totalRecipients)
    .slice(0, n)
    .map((b) => {
      const branchRec = BRANCHES.find((br) => br.id === b.branchId);
      return {
        id: b.id,
        name: b.name,
        branchName: branchRec?.name ?? "",
        // A campaign name recurring (e.g. "Bridal Season Lookbook" run each wedding season)
        // is realistic marketing behavior, not templated data — but reads as a duplicate row
        // in a top-N list without a date to tell the runs apart, so always show it.
        monthLabel: MONTHS[b.monthIdx].label,
        totalRecipients: b.totalRecipients,
        readRatePct: b.totalRecipients ? b.readCount / b.totalRecipients : 0,
        buckets: [
          { key: "read", label: "Read", value: b.readCount, color: ramp.good },
          { key: "delivered", label: "Delivered, unread", value: b.deliveredCount - b.readCount, color: ramp.warning },
          { key: "failed", label: "Failed or skipped", value: b.failedCount + b.skippedCount, color: ramp.critical },
        ],
      };
    });
}

export function broadcastInsight(months: { key: string }[], branch: BranchFilter) {
  const recs = broadcastCampaignsRaw(months, branch);
  const totalFailedSkipped = recs.reduce((a, b) => a + b.failedCount + b.skippedCount, 0);
  const totalRecipients = recs.reduce((a, b) => a + b.totalRecipients, 0);
  const reasonCounts = new Map<string, number>();
  recs.forEach((b) => reasonCounts.set(b.topSkipReason, (reasonCounts.get(b.topSkipReason) ?? 0) + b.skippedCount));
  const topReason = [...reasonCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "not opted in";
  return { failedSkippedSharePct: totalRecipients ? totalFailedSkipped / totalRecipients : 0, topReason, campaignCount: recs.length };
}

// ─── Automation ───

export interface FlowExecutionRecord {
  outcome: "Completed" | "Expired" | "Cancelled" | "Failed";
  dropOffNode: string | null;
  durationMinutes: number;
  branchId: string;
}

function generateFlowExecutions(): FlowExecutionRecord[] {
  const rng = createRng(30144);
  const records: FlowExecutionRecord[] = [];

  MONTHS.forEach(() => {
    const count = rngInt(rng, 18, 30);
    for (let i = 0; i < count; i++) {
      const branch = rngWeightedPick(rng, BRANCHES, BRANCHES.map((b) => b.weight));
      const outcome = rngWeightedPick(rng, ["Completed", "Expired", "Cancelled", "Failed"] as const, [0.52, 0.24, 0.14, 0.1]);
      if (outcome === "Completed") {
        records.push({ outcome, dropOffNode: null, durationMinutes: Math.round(clamp(rngGaussian(rng, 3.5, 1.5), 0.5, 15) * 10) / 10, branchId: branch.id });
      } else {
        const node = rngWeightedPick(rng, FLOW_NODES.slice(0, 5), DROP_OFF_WEIGHTS);
        records.push({ outcome, dropOffNode: node, durationMinutes: 0, branchId: branch.id });
      }
    }
  });

  return records;
}

const FLOW_EXECUTIONS: FlowExecutionRecord[] = generateFlowExecutions();

export function flowCompletionSummary(branch: BranchFilter) {
  const recs = FLOW_EXECUTIONS.filter((r) => branchMatch(r, branch));
  const completed = recs.filter((r) => r.outcome === "Completed");
  const completionRatePct = recs.length ? completed.length / recs.length : 0;
  const avgDurationMinutes = completed.length ? completed.reduce((a, r) => a + r.durationMinutes, 0) / completed.length : 0;
  return { completionRatePct, totalExecutions: recs.length, avgDurationMinutes };
}

export function flowDropOffRanking(branch: BranchFilter): RankedBarDatum[] {
  const recs = FLOW_EXECUTIONS.filter((r) => branchMatch(r, branch) && r.dropOffNode !== null);
  const byNode = new Map<string, number>();
  recs.forEach((r) => byNode.set(r.dropOffNode!, (byNode.get(r.dropOffNode!) ?? 0) + 1));
  return FLOW_NODES.slice(0, 5)
    .map((node) => ({ key: node, label: node, value: byNode.get(node) ?? 0 }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);
}

// ─── Social posts (company-wide — no branch scoping in the real schema) ───

export interface SocialPostRecord {
  id: string;
  platform: SocialPlatform;
  caption: string;
  monthIdx: number;
  likes: number;
  comments: number;
  shares: number;
}

const PLATFORM_WEIGHTS: Record<SocialPlatform, number> = { Instagram: 0.62, Facebook: 0.3, Threads: 0.08 };
const PLATFORM_LIKE_RANGE: Record<SocialPlatform, [number, number]> = {
  Instagram: [180, 2400],
  Facebook: [40, 650],
  Threads: [15, 220],
};
// Comment/share rate relative to likes is genuinely platform-specific, not noise around one
// mean: Instagram is a like-heavy, low-reply visual feed; Threads is a text/reply-first format
// where a much larger share of engagement is conversational even with far smaller raw reach.
// Grounding this distinction is what makes "which platform has deeper engagement" a real,
// non-trivial finding instead of a coin flip between near-identical ratios.
const PLATFORM_COMMENT_RATE: Record<SocialPlatform, [number, number]> = {
  Instagram: [0.02, 0.05],
  Facebook: [0.04, 0.08],
  Threads: [0.08, 0.16],
};
const PLATFORM_SHARE_RATE: Record<SocialPlatform, [number, number]> = {
  Instagram: [0.015, 0.035],
  Facebook: [0.02, 0.045],
  Threads: [0.03, 0.06],
};

function generateSocialPosts(): SocialPostRecord[] {
  const rng = createRng(77209);
  const records: SocialPostRecord[] = [];
  let seq = 0;
  const captionCursor: Record<SocialPlatform, number> = { Instagram: 0, Facebook: 0, Threads: 0 };

  MONTHS.forEach((_m, monthIdx) => {
    const count = rngInt(rng, 6, 11);
    for (let i = 0; i < count; i++) {
      seq++;
      const platform = rngWeightedPick(rng, ["Instagram", "Facebook", "Threads"] as SocialPlatform[], [
        PLATFORM_WEIGHTS.Instagram,
        PLATFORM_WEIGHTS.Facebook,
        PLATFORM_WEIGHTS.Threads,
      ]);
      const pool = POST_CAPTIONS[platform];
      const caption = pool[captionCursor[platform] % pool.length];
      captionCursor[platform]++;

      const [lMin, lMax] = PLATFORM_LIKE_RANGE[platform];
      const likes = Math.round(clamp(rngGaussian(rng, (lMin + lMax) / 2, (lMax - lMin) / 4), lMin, lMax));
      const [cMin, cMax] = PLATFORM_COMMENT_RATE[platform];
      const [sMin, sMax] = PLATFORM_SHARE_RATE[platform];
      const comments = Math.round(likes * (cMin + rng() * (cMax - cMin)));
      const shares = Math.round(likes * (sMin + rng() * (sMax - sMin)));

      records.push({ id: `post-${seq}`, platform, caption, monthIdx, likes, comments, shares });
    }
  });

  return records;
}

export const SOCIAL_POSTS: SocialPostRecord[] = generateSocialPosts();

export interface PlatformEngagementSummary {
  key: SocialPlatform;
  label: SocialPlatform;
  postCount: number;
  avgLikes: number;
  avgComments: number;
  avgShares: number;
  avgTotal: number;
}

/**
 * Per-post AVERAGE engagement, not raw totals — a raw-totals heatmap (platform x metric type)
 * was tried first and abandoned: Instagram's post volume alone (119 posts vs Threads' 24) makes
 * its raw Likes total ~100x anything else in the grid, which collapses 8 of 9 cells to
 * indistinguishable near-white under one shared color scale. Averaging per post removes the
 * posting-frequency confound and answers the sharper question — "where does our content
 * resonate," not "where do we post the most."
 */
export function platformEngagementSummary(months: { key: string }[]): PlatformEngagementSummary[] {
  const idxSet = new Set(months.map((m) => MONTHS.findIndex((mm) => mm.key === m.key)));
  const inPeriod = SOCIAL_POSTS.filter((p) => idxSet.has(p.monthIdx));
  const platforms: SocialPlatform[] = ["Instagram", "Facebook", "Threads"];
  return platforms
    .map((platform) => {
      const posts = inPeriod.filter((p) => p.platform === platform);
      const postCount = posts.length;
      const avgLikes = postCount ? posts.reduce((a, p) => a + p.likes, 0) / postCount : 0;
      const avgComments = postCount ? posts.reduce((a, p) => a + p.comments, 0) / postCount : 0;
      const avgShares = postCount ? posts.reduce((a, p) => a + p.shares, 0) / postCount : 0;
      return { key: platform, label: platform, postCount, avgLikes, avgComments, avgShares, avgTotal: avgLikes + avgComments + avgShares };
    })
    .filter((p) => p.postCount > 0);
}

export function topSocialPosts(months: { key: string }[], n = 6) {
  const idxSet = new Set(months.map((m) => MONTHS.findIndex((mm) => mm.key === m.key)));
  return [...SOCIAL_POSTS]
    .filter((p) => idxSet.has(p.monthIdx))
    .sort((a, b) => b.likes + b.comments + b.shares - (a.likes + a.comments + a.shares))
    .slice(0, n)
    .map((p) => ({ ...p, monthLabel: MONTHS[p.monthIdx].label }));
}
