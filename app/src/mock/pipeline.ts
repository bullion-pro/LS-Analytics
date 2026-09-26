/**
 * Commercial pipeline mock data — grounded in LS's real legacy CRM model
 * (see docs/crm-analysis.md §3.7: `Opportunity`/`OpportunityHistory`,
 * the source of stage-transition/aging/velocity analytics) but presented in
 * the business's actual physical sales-journey terms, not the CRM's raw
 * status enum. LS sells exclusively in person, in a showroom — online/social
 * channels (Instagram, WhatsApp, Website, Facebook, Exhibition) only ever
 * produce an enquiry, never a transaction — so every deal's real progression
 * is Enquiry → Product Interest → Showroom Visit → Quotation → Follow-up →
 * Won/Lost (see CLAUDE.md "Business model — physical retail only").
 * `Contact.leadSource` (Walk-in/Referral/Instagram/WhatsApp/Website/
 * Facebook/Exhibition/Cold Call) is where a deal originates, independent of
 * this stage progression.
 * Deliberately separate from `mock/customers.ts` — Pipeline is deal flow
 * (Opportunities), Customers is relationship/account health, exactly as LS
 * itself keeps them as two unrelated modules (see project memory:
 * ls-modules-mapping).
 *
 * `PIPELINE_RECORDS` is the single seeded fact table (one row per
 * Opportunity, created over a 24-month window) that every derived view —
 * the funnel, the aging buckets, the top-deals ranking, the source quadrant,
 * the attention list, the full table — reads from. Nothing here is
 * independently invented per-chart, so the numbers reconcile: the funnel's
 * stage counts, the aging bucket totals, and the table rows all describe the
 * same underlying deals.
 */
import { createRng, rngGaussian, rngInt, rngWeightedPick } from "./rng";
import { MONTHS } from "./calendar";
import { BRANCHES, SALESMEN } from "./dimensions";
import type { BranchFilter } from "@/store/filters";

// Matches calendar.ts's TODAY exactly (kept local since calendar.ts doesn't export it) —
// needed here for day-level aging math, where calendar.ts only tracks month granularity.
const TODAY = new Date(2026, 8, 24);

export type LeadSource = "Walk-in" | "Referral" | "WhatsApp" | "Instagram" | "Exhibition" | "Website" | "Facebook" | "Cold Call";
export const LEAD_SOURCES: LeadSource[] = ["Walk-in", "Referral", "WhatsApp", "Instagram", "Exhibition", "Website", "Facebook", "Cold Call"];

export type DealArchetype = "Retail" | "VIP Commission" | "Corporate Gifting" | "Wholesale";
export type OpenStage = "Enquiry" | "Product Interest" | "Showroom Visit" | "Quotation" | "Follow-up";
export const OPEN_STAGES: OpenStage[] = ["Enquiry", "Product Interest", "Showroom Visit", "Quotation", "Follow-up"];

interface ArchetypeMeta {
  id: DealArchetype;
  weight: number;
  valueRange: [number, number];
  typicalCycleDays: number;
  winMultiplier: number;
  sourceWeights: number[]; // aligned to LEAD_SOURCES order
}

// Channel mix and cycle length are conditioned on deal type, not drawn independently —
// a wholesale consignment overwhelmingly arrives via referral/exhibition (trade
// relationships), never cold-call or Instagram; a retail bridal purchase is the
// opposite. Without this correlation, "which channel produces the strongest deals"
// collapses to noise, the same trap avoided in mock/customers.ts's channel weighting.
const ARCHETYPES: ArchetypeMeta[] = [
  {
    id: "Retail",
    weight: 0.6,
    valueRange: [3_600, 18_400],
    typicalCycleDays: 21,
    winMultiplier: 1.08,
    sourceWeights: [0.3, 0.14, 0.2, 0.18, 0.02, 0.09, 0.05, 0.02],
  },
  {
    id: "VIP Commission",
    weight: 0.15,
    valueRange: [11_200, 62_400],
    typicalCycleDays: 55,
    winMultiplier: 1.0,
    sourceWeights: [0.16, 0.34, 0.12, 0.06, 0.2, 0.07, 0.02, 0.03],
  },
  {
    id: "Corporate Gifting",
    weight: 0.13,
    valueRange: [6_800, 31_200],
    typicalCycleDays: 35,
    winMultiplier: 0.92,
    sourceWeights: [0.06, 0.28, 0.1, 0.04, 0.22, 0.14, 0.02, 0.14],
  },
  {
    id: "Wholesale",
    weight: 0.12,
    valueRange: [20_000, 106_400],
    typicalCycleDays: 80,
    winMultiplier: 0.8,
    sourceWeights: [0.01, 0.38, 0.08, 0.01, 0.3, 0.06, 0.0, 0.16],
  },
];

const SOURCE_WIN_MULTIPLIER: Record<LeadSource, number> = {
  Referral: 1.18,
  Exhibition: 1.1,
  "Walk-in": 1.05,
  WhatsApp: 1.0,
  Website: 0.95,
  Instagram: 0.92,
  Facebook: 0.88,
  "Cold Call": 0.78,
};

const BASE_WIN_RATE = 0.44;

// ─── Name pools — same "real Dubai luxury clientele" register as mock/customers.ts ───

const FIRST_NAMES = [
  "Amira", "Youssef", "Noor", "Hassan", "Lubna", "Rakan", "Salma", "Waleed", "Farida", "Nasser",
  "Meera", "Jassim", "Ranya", "Badr", "Alia", "Zaid", "Imaan", "Talal", "Widad", "Hamad",
  "Divya", "Rahul", "Anjali", "Vikas", "Isabelle", "Lorenzo", "Giulia", "Thomas", "Camille", "André",
  "Selin", "Tariq", "Noelle", "Bruno",
];
const LAST_NAMES = [
  "Al Zaabi", "Al Qassimi", "Al Rashidi", "Al Dhaheri", "Al Katbi", "Al Shamsi", "Rehman", "Chaudhry",
  "Bhatia", "Iyer", "Fernandes", "Oliveira", "Costa", "Laurent", "Beaumont", "Whitmore", "Ashford",
  "Conti", "Bianchi", "Leclerc", "Silva", "Moraes", "Stoyanova", "Kovac", "Berglund",
];
const CORP_PREFIX = [
  "Meraas", "Rostamani", "Al Bateen", "Horizon", "Continental", "Palm Atelier", "Al Waha", "Noor Al Ain",
  "Beacon", "Sapphire Trail", "Dune Capital", "Ivory Coast", "Al Reem", "Cedar Grove",
];
const CORP_SUFFIX = [" Trading Co.", " Holdings", " Family Office", " Events", " Group", " Partners", " Boutiques", " Enterprises"];
const CORPORATE_ACCOUNTS = CORP_PREFIX.map((p, i) => `${p}${CORP_SUFFIX[i % CORP_SUFFIX.length]}`);

// Wide pools deliberately — Wholesale/VIP deals dominate the top-value rankings (by design,
// matching real jewelry pipeline concentration), so a narrow pool would make the same title
// collide repeatedly at the top of any value-sorted list and read as templated rather than real.
const DEAL_TITLE_TEMPLATES: Record<DealArchetype, string[]> = {
  Retail: [
    "Bridal Set", "Engagement Ring Upgrade", "Anniversary Gift Commission", "22K Wedding Order",
    "Solitaire Ring Consultation", "Push Present Commission", "Graduation Gift Ring", "Milestone Anniversary Upgrade",
  ],
  "VIP Commission": [
    "Private Collection Commission", "VVIP Emerald Suite", "Bespoke High Jewellery Piece", "Custom Kundan Bridal Set",
    "Heirloom Redesign Commission", "Royal Sapphire Parure Commission", "Museum-Grade Solitaire Commission", "Private Vault Collection Order",
  ],
  "Corporate Gifting": [
    "Eid Gifting Program", "Corporate Anniversary Gifts", "Executive Gifting Order", "Year-End Client Gifting",
    "Diplomatic Gifting Order", "Ramadan Corporate Hampers", "Board Retirement Gift Commission",
  ],
  Wholesale: [
    "Wholesale Consignment", "Retail Launch Stock Order", "Seasonal Bullion Jewellery Order", "Boutique Partnership Stock",
    "Trade Showroom Restocking", "Multi-Branch Consignment Renewal", "Gold Souq Wholesale Order",
    "GCC Export Consignment", "Festive Season Bulk Order", "New Boutique Opening Stock",
  ],
};

function dateFor(monthIdx: number, day: number): Date {
  return new Date(MONTHS[monthIdx].year, MONTHS[monthIdx].monthIndex, day + 1);
}
function daysBetween(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
function stageRankFromFraction(frac: number): 0 | 1 | 2 | 3 | 4 {
  if (frac < 0.2) return 0;
  if (frac < 0.4) return 1;
  if (frac < 0.6) return 2;
  if (frac < 0.8) return 3;
  return 4;
}

export interface OpportunityRecord {
  id: string;
  title: string;
  accountName: string;
  archetype: DealArchetype;
  source: LeadSource;
  branchId: string;
  salesmanId: string;
  valueAED: number;
  createdMonthIdx: number;
  cycleDaysActual: number;
  typicalCycleDays: number;
  outcome: "open" | "won" | "lost";
  currentStage: OpenStage; // meaningful for "open"; nominal for closed
  furthestStageRank: 0 | 1 | 2 | 3 | 4 | 5; // 0..4 = open stages reached, 5 = won
  onHold: boolean;
  closedMonthIdx: number | null;
  ageInDays: number;
  daysInCurrentStage: number;
  expectedCloseDaysFromNow: number; // negative = overdue vs the archetype's typical cycle
}

function generatePipelineRecords(): OpportunityRecord[] {
  const rng = createRng(90210);
  const records: OpportunityRecord[] = [];
  let seq = 0;
  // Round-robin per archetype (not a random pick each time) — guarantees even coverage of each
  // title pool across the full dataset. A pure random pick collides visibly whenever a small
  // value-sorted subset (e.g. "top 5 open opportunities") happens to draw the same template
  // twice, which reads as templated data even though each full title+account combination differs.
  const titleCursor: Record<DealArchetype, number> = { Retail: 0, "VIP Commission": 0, "Corporate Gifting": 0, Wholesale: 0 };

  MONTHS.forEach((_month, monthIdx) => {
    // Volume is set so the STEADY-STATE OPEN BOOK (not total records generated) lands around
    // 100-150 concurrently open deals: open stock ≈ (records/day) × (avg archetype cycle days,
    // ≈39d weighted). Too few records/month starves the open snapshot even though total
    // historical volume looks fine — every open-pipeline view (aging, top deals, attention
    // list, per-branch/salesman slices) depends on this steady-state count being healthy, not
    // on the 24-month total.
    const count = rngInt(rng, 65, 92);
    for (let i = 0; i < count; i++) {
      seq++;
      const archetypeMeta = rngWeightedPick(rng, ARCHETYPES, ARCHETYPES.map((a) => a.weight));
      const archetype = archetypeMeta.id;
      const branch = rngWeightedPick(rng, BRANCHES, BRANCHES.map((b) => b.weight));
      const branchSalesmen = SALESMEN.filter((s) => s.branchId === branch.id);
      const salesman = branchSalesmen[rngInt(rng, 0, branchSalesmen.length - 1)] ?? SALESMEN[0];
      const source = rngWeightedPick(rng, LEAD_SOURCES, archetypeMeta.sourceWeights);

      const [vMin, vMax] = archetypeMeta.valueRange;
      const vMid = (vMin + vMax) / 2;
      const valueAED = Math.round(clamp(rngGaussian(rng, vMid, (vMax - vMin) / 5), vMin, vMax) / 500) * 500;

      const cycleDaysActual = Math.round(
        clamp(rngGaussian(rng, archetypeMeta.typicalCycleDays, archetypeMeta.typicalCycleDays * 0.35), archetypeMeta.typicalCycleDays * 0.4, archetypeMeta.typicalCycleDays * 2.2),
      );

      const createdDay = rngInt(rng, 0, 27);
      const created = dateFor(monthIdx, createdDay);
      const ageInDays = daysBetween(TODAY, created);

      const isCorp = archetype === "Corporate Gifting" || archetype === "Wholesale";
      const accountName = isCorp
        ? CORPORATE_ACCOUNTS[rngInt(rng, 0, CORPORATE_ACCOUNTS.length - 1)]
        : `${FIRST_NAMES[rngInt(rng, 0, FIRST_NAMES.length - 1)]} ${LAST_NAMES[rngInt(rng, 0, LAST_NAMES.length - 1)]}`;
      const pool = DEAL_TITLE_TEMPLATES[archetype];
      const titleBase = pool[titleCursor[archetype] % pool.length];
      titleCursor[archetype]++;
      const title = `${titleBase} — ${accountName}`;

      let outcome: "open" | "won" | "lost" = "open";
      let currentStage: OpenStage = "Enquiry";
      let furthestStageRank: 0 | 1 | 2 | 3 | 4 | 5 = 0;
      let onHold = false;
      let closedMonthIdx: number | null = null;
      let daysInCurrentStage = 0;

      if (ageInDays >= cycleDaysActual && ageInDays >= 0) {
        // Deal has resolved by now — decide the outcome.
        const winProb = clamp(BASE_WIN_RATE * archetypeMeta.winMultiplier * SOURCE_WIN_MULTIPLIER[source], 0.1, 0.85);
        outcome = rng() < winProb ? "won" : "lost";
        furthestStageRank = outcome === "won" ? 5 : (rngWeightedPick(rng, [0, 1, 2, 3, 4], [0.15, 0.22, 0.24, 0.21, 0.18]) as 0 | 1 | 2 | 3 | 4);
        currentStage = OPEN_STAGES[Math.min(furthestStageRank, 4)];
        const closedOffsetMonths = Math.min(Math.round(cycleDaysActual / 30), MONTHS.length - 1 - monthIdx);
        closedMonthIdx = Math.min(monthIdx + closedOffsetMonths, MONTHS.length - 1);
      } else if (ageInDays >= 0) {
        // Most open deals progress roughly proportionally to their eventual cycle length. But a
        // real pipeline's oldest, stuck deals are stuck precisely BECAUSE they broke that
        // proportional pace — tying days-in-stage strictly to (age - stage-entry-fraction *
        // cycle) mathematically caps it under ~35% of the cycle length, which silently zeroes
        // out every aging bucket past ~60 days. Model a "stalled" branch explicitly: stage
        // doesn't reflect elapsed time, and days-in-stage is drawn independently (still capped
        // at the deal's real age) so genuinely old, stuck deals can actually appear.
        const stalled = rng() < 0.22;
        if (stalled) {
          furthestStageRank = rngWeightedPick(rng, [0, 1, 2, 3, 4], [0.3, 0.27, 0.2, 0.14, 0.09]) as 0 | 1 | 2 | 3 | 4;
          daysInCurrentStage = Math.min(ageInDays, rngInt(rng, 40, 150));
          onHold = rng() < 0.3;
        } else {
          const frac = ageInDays / cycleDaysActual;
          furthestStageRank = stageRankFromFraction(frac);
          onHold = rng() < 0.05;
          const stageEntryFrac = [0, 0.2, 0.4, 0.6, 0.8][furthestStageRank];
          daysInCurrentStage = Math.max(1, Math.round(ageInDays - stageEntryFrac * cycleDaysActual));
        }
        currentStage = OPEN_STAGES[furthestStageRank];
      } else {
        // Created "in the future" relative to TODAY — shouldn't happen since MONTHS ends at
        // the current month, but guard defensively rather than emit a negative-age record.
        continue;
      }

      const expectedCloseDaysFromNow = outcome === "open" ? Math.round(archetypeMeta.typicalCycleDays - ageInDays) : 0;

      records.push({
        id: `opp-${seq}`,
        title,
        accountName,
        archetype,
        source,
        branchId: branch.id,
        salesmanId: salesman.id,
        valueAED,
        createdMonthIdx: monthIdx,
        cycleDaysActual,
        typicalCycleDays: archetypeMeta.typicalCycleDays,
        outcome,
        currentStage,
        furthestStageRank,
        onHold,
        closedMonthIdx,
        ageInDays,
        daysInCurrentStage,
        expectedCloseDaysFromNow,
      });
    }
  });

  return records;
}

export const PIPELINE_RECORDS: OpportunityRecord[] = generatePipelineRecords();

function branchMatch(r: OpportunityRecord, branch: BranchFilter): boolean {
  return branch === "all" || r.branchId === branch;
}

export function openPipelineRecords(branch: BranchFilter): OpportunityRecord[] {
  return PIPELINE_RECORDS.filter((r) => r.outcome === "open" && branchMatch(r, branch));
}

function stageProbability(rank: 0 | 1 | 2 | 3 | 4 | 5, onHold: boolean): number {
  const base = rank === 0 ? 0.1 : rank === 1 ? 0.25 : rank === 2 ? 0.45 : rank === 3 ? 0.65 : rank === 4 ? 0.85 : 1;
  return onHold ? base * 0.6 : base;
}

// ─── Tier 1: hero snapshot ───

export interface PipelineHeroTotals {
  openValueAED: number;
  weightedValueAED: number;
  openCount: number;
  avgDealSizeAED: number;
}

function totalsFor(records: OpportunityRecord[]): PipelineHeroTotals {
  const openValueAED = records.reduce((a, r) => a + r.valueAED, 0);
  const weightedValueAED = records.reduce((a, r) => a + r.valueAED * stageProbability(r.furthestStageRank, r.onHold), 0);
  const openCount = records.length;
  return { openValueAED, weightedValueAED, openCount, avgDealSizeAED: openCount ? openValueAED / openCount : 0 };
}

export function pipelineHeroTotals(branch: BranchFilter): PipelineHeroTotals {
  return totalsFor(openPipelineRecords(branch));
}

/** Replays the same seeded timeline as of `daysAgo` days before today — a record counted as
 *  "open" then only if it existed yet and hadn't already resolved by that point. */
export function pipelineHeroTotalsAsOfDaysAgo(branch: BranchFilter, daysAgo: number): PipelineHeroTotals {
  const pastRecords = PIPELINE_RECORDS.filter((r) => {
    if (!branchMatch(r, branch)) return false;
    const createdAgeFromPast = r.ageInDays - daysAgo; // how old the record was, at the past date
    if (createdAgeFromPast < 0) return false; // didn't exist yet
    return createdAgeFromPast < r.cycleDaysActual; // still unresolved at that point
  });
  return totalsFor(pastRecords);
}

export function periodWinRate(months: { key: string }[], branch: BranchFilter): number {
  const monthIdxSet = new Set(months.map((m) => MONTHS.findIndex((mm) => mm.key === m.key)));
  const closed = PIPELINE_RECORDS.filter((r) => branchMatch(r, branch) && r.closedMonthIdx !== null && monthIdxSet.has(r.closedMonthIdx));
  const won = closed.filter((r) => r.outcome === "won").length;
  return closed.length ? won / closed.length : 0;
}

// ─── Tier 2: pipeline movement — cohort funnel + won/lost mirror ───

export interface FunnelStageDatum {
  key: string;
  label: string;
  count: number;
  valueAED: number;
}

export interface StageFunnelResult {
  stages: FunnelStageDatum[]; // Enquiries -> Product Interest -> Showroom Visit -> Quotation -> Follow-up -> Won, monotonic
  lost: { count: number; valueAED: number };
  cohortSize: number;
}

/** Cohort funnel: of deals CREATED in the given months, how many reached each stage (or Won),
 *  and how many were lost along the way — standard funnel semantics, not a point-in-time snapshot.
 *  Stages mirror LS's real physical sales journey (no online checkout — see CLAUDE.md "Business
 *  model — physical retail only"): every deal has to be walked into a showroom before it can close. */
export function stageFunnelData(months: { key: string }[], branch: BranchFilter): StageFunnelResult {
  const monthIdxSet = new Set(months.map((m) => MONTHS.findIndex((mm) => mm.key === m.key)));
  const cohort = PIPELINE_RECORDS.filter((r) => branchMatch(r, branch) && monthIdxSet.has(r.createdMonthIdx));

  const valueAtLeast = (rank: number) => cohort.filter((r) => r.furthestStageRank >= rank).reduce((a, r) => a + r.valueAED, 0);
  const countAtLeast = (rank: number) => cohort.filter((r) => r.furthestStageRank >= rank).length;

  const stages: FunnelStageDatum[] = [
    { key: "enquiries", label: "Enquiries", count: countAtLeast(0), valueAED: valueAtLeast(0) },
    { key: "product-interest", label: "Product Interest", count: countAtLeast(1), valueAED: valueAtLeast(1) },
    { key: "showroom-visit", label: "Showroom Visit", count: countAtLeast(2), valueAED: valueAtLeast(2) },
    { key: "quotation", label: "Quotation", count: countAtLeast(3), valueAED: valueAtLeast(3) },
    { key: "follow-up", label: "Follow-up", count: countAtLeast(4), valueAED: valueAtLeast(4) },
    { key: "won", label: "Won", count: cohort.filter((r) => r.outcome === "won").length, valueAED: cohort.filter((r) => r.outcome === "won").reduce((a, r) => a + r.valueAED, 0) },
  ];
  const lostRecords = cohort.filter((r) => r.outcome === "lost");
  return { stages, lost: { count: lostRecords.length, valueAED: lostRecords.reduce((a, r) => a + r.valueAED, 0) }, cohortSize: cohort.length };
}

export interface WinLossSide {
  count: number;
  valueAED: number;
  avgCycleDays: number;
}

export function wonLostMirror(months: { key: string }[], branch: BranchFilter): { won: WinLossSide; lost: WinLossSide } {
  const monthIdxSet = new Set(months.map((m) => MONTHS.findIndex((mm) => mm.key === m.key)));
  const closed = PIPELINE_RECORDS.filter((r) => branchMatch(r, branch) && r.closedMonthIdx !== null && monthIdxSet.has(r.closedMonthIdx));
  const side = (outcome: "won" | "lost"): WinLossSide => {
    const recs = closed.filter((r) => r.outcome === outcome);
    return {
      count: recs.length,
      valueAED: recs.reduce((a, r) => a + r.valueAED, 0),
      avgCycleDays: recs.length ? Math.round(recs.reduce((a, r) => a + r.cycleDaysActual, 0) / recs.length) : 0,
    };
  };
  return { won: side("won"), lost: side("lost") };
}

// ─── Win-rate trend, YoY (same shape as revenueTrendYoY in mock/derive.ts) ───

export function winRateTrendYoY(branch: BranchFilter) {
  const trailing = MONTHS.slice(-12);
  return trailing.map((m, i) => {
    const idx = MONTHS.length - 12 + i;
    const priorIdx = idx - 12;
    const current = periodWinRate([m], branch);
    const prior = priorIdx >= 0 ? periodWinRate([MONTHS[priorIdx]], branch) : undefined;
    return { key: m.key, label: m.shortLabel, current: Math.round(current * 1000) / 10, prior: prior !== undefined ? Math.round(prior * 1000) / 10 : undefined };
  });
}

// ─── Tier 3: pipeline quality — aging + top deals ───

export interface AgingBucketResult {
  key: string;
  label: string;
  value: number;
  color: string;
}

const AGING_BUCKETS = [
  { key: "0-30", label: "0–30 days", max: 30 },
  { key: "31-60", label: "31–60 days", max: 60 },
  { key: "61-90", label: "61–90 days", max: 90 },
  { key: "90+", label: "90+ days", max: Infinity },
];

export function stageAgingBuckets(branch: BranchFilter, ramp: readonly string[]) {
  const open = openPipelineRecords(branch);
  return AGING_BUCKETS.map((b, i) => {
    const prevMax = i === 0 ? 0 : AGING_BUCKETS[i - 1].max;
    const inBucket = open.filter((r) => r.daysInCurrentStage > prevMax && r.daysInCurrentStage <= b.max);
    return { key: b.key, label: b.label, value: inBucket.reduce((a, r) => a + r.valueAED, 0), color: ramp[i] };
  });
}

export function stalledPipelineValue(branch: BranchFilter, thresholdDays = 60) {
  const open = openPipelineRecords(branch);
  const stalled = open.filter((r) => r.daysInCurrentStage > thresholdDays);
  return { count: stalled.length, valueAED: stalled.reduce((a, r) => a + r.valueAED, 0) };
}

export function topOpenOpportunities(branch: BranchFilter, n = 8) {
  return [...openPipelineRecords(branch)]
    .sort((a, b) => b.valueAED - a.valueAED)
    .slice(0, n)
    .map((r) => ({ key: r.id, label: r.title, sublabel: r.accountName, value: r.valueAED, secondaryValue: r.currentStage }));
}

// ─── Tier 4: drivers — source quadrant + salesman ranking ───

export interface SourceQuadrantPoint {
  key: string;
  label: string;
  winRatePct: number;
  avgValueAED: number;
  count: number;
}

export function sourceQuadrantData(branch: BranchFilter): { points: SourceQuadrantPoint[]; avgWinRatePct: number; avgValueAED: number } {
  const all = PIPELINE_RECORDS.filter((r) => branchMatch(r, branch));
  const points = LEAD_SOURCES.map((source) => {
    const recs = all.filter((r) => r.source === source);
    const closed = recs.filter((r) => r.outcome !== "open");
    const won = closed.filter((r) => r.outcome === "won").length;
    return {
      key: source,
      label: source,
      winRatePct: closed.length ? Math.round((won / closed.length) * 1000) / 10 : 0,
      avgValueAED: recs.length ? recs.reduce((a, r) => a + r.valueAED, 0) / recs.length : 0,
      count: recs.length,
    };
  }).filter((p) => p.count > 0);

  const closedAll = all.filter((r) => r.outcome !== "open");
  const wonAll = closedAll.filter((r) => r.outcome === "won").length;
  const avgWinRatePct = closedAll.length ? Math.round((wonAll / closedAll.length) * 1000) / 10 : 0;
  const avgValueAED = all.length ? all.reduce((a, r) => a + r.valueAED, 0) / all.length : 0;
  return { points, avgWinRatePct, avgValueAED };
}

export function salesmanPipelineRanked(branch: BranchFilter, n = 6) {
  const open = openPipelineRecords(branch);
  const byRep = new Map<string, { value: number; count: number }>();
  open.forEach((r) => {
    const cur = byRep.get(r.salesmanId) ?? { value: 0, count: 0 };
    cur.value += r.valueAED;
    cur.count += 1;
    byRep.set(r.salesmanId, cur);
  });
  return [...byRep.entries()]
    .map(([salesmanId, agg]) => {
      const s = SALESMEN.find((sm) => sm.id === salesmanId);
      const b = BRANCHES.find((br) => br.id === s?.branchId);
      return { key: salesmanId, label: s?.name ?? "—", sublabel: b?.name ?? "", value: agg.value, secondaryValue: `${agg.count} deals` };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, n);
}

// ─── Tier 5: attention list ───

export interface AttentionItem {
  id: string;
  title: string;
  accountName: string;
  valueAED: number;
  stageLabel: string;
  salesmanName: string;
  branchName: string;
  tag: string;
  tone: "warning" | "critical";
}

export function attentionOpportunities(branch: BranchFilter, n = 6): AttentionItem[] {
  const open = openPipelineRecords(branch);
  const scored = open
    .map((r) => {
      const overdueDays = Math.max(0, -r.expectedCloseDaysFromNow);
      const stalledDays = r.daysInCurrentStage;
      const flagged = overdueDays > 0 || stalledDays > 45 || r.onHold;
      if (!flagged) return null;
      const severity = overdueDays * 1.5 + stalledDays + (r.onHold ? 20 : 0) + r.valueAED / 20_000;
      const tone: "warning" | "critical" = overdueDays > 30 || stalledDays > 90 ? "critical" : "warning";
      const tag = overdueDays > 0 ? `${overdueDays}d overdue` : r.onHold ? "On hold" : `${stalledDays}d in stage`;
      const s = SALESMEN.find((sm) => sm.id === r.salesmanId);
      const b = BRANCHES.find((br) => br.id === r.branchId);
      return { id: r.id, title: r.title, accountName: r.accountName, valueAED: r.valueAED, stageLabel: r.currentStage, salesmanName: s?.name ?? "—", branchName: b?.name ?? "", tag, tone, severity };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.severity - a.severity)
    .slice(0, n);
  return scored.map(({ severity: _severity, ...rest }) => rest);
}

// ─── Tier 6: full open-pipeline table ───

export interface OpenPipelineRow {
  id: string;
  title: string;
  accountName: string;
  archetype: DealArchetype;
  stageLabel: string;
  valueAED: number;
  source: LeadSource;
  salesmanName: string;
  branchName: string;
  daysInStage: number;
  expectedCloseLabel: string;
}

export function openPipelineTable(branch: BranchFilter): OpenPipelineRow[] {
  return openPipelineRecords(branch)
    .map((r) => {
      const s = SALESMEN.find((sm) => sm.id === r.salesmanId);
      const b = BRANCHES.find((br) => br.id === r.branchId);
      const expectedCloseLabel = r.expectedCloseDaysFromNow >= 0 ? `In ${r.expectedCloseDaysFromNow}d` : `${-r.expectedCloseDaysFromNow}d overdue`;
      return {
        id: r.id,
        title: r.title,
        accountName: r.accountName,
        archetype: r.archetype,
        stageLabel: r.onHold ? `${r.currentStage} (On hold)` : r.currentStage,
        valueAED: r.valueAED,
        source: r.source,
        salesmanName: s?.name ?? "—",
        branchName: b?.name ?? "",
        daysInStage: r.daysInCurrentStage,
        expectedCloseLabel,
      };
    })
    .sort((a, b) => b.valueAED - a.valueAED);
}
