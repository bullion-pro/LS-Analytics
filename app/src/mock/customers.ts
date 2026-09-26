/**
 * Customer intelligence mock data — grounded in LS's real model (see
 * docs/crm-analysis.md §3.3 and §3.7): the sales-facing `Customer` master
 * (customerType Individual/VIP/VVIP/Corporate, status, outstandingAmount,
 * CustomerFinancialEntry AR ledger) unified with the legacy `Contact`/
 * `CrmAccount` relationship system (leadSource, relationshipTier, the
 * CrmStatus lifecycle funnel) into one account-health picture — exactly
 * the "Customers" domain scope from project memory (ls-modules-mapping).
 *
 * `CUSTOMERS` is the dimension (who); `CUSTOMER_EVENTS` is a sparse
 * per-month purchase fact (one row per customer per month they bought
 * something) that every derived view — value, recency, frequency, repeat
 * rate, lifecycle stage — is computed from. Deterministic/seeded, like
 * every other mock module here.
 */
import { chartColors } from "@/components/charts/chartColors";
import { createRng, rngGaussian, rngInt, rngRange, rngWeightedPick } from "./rng";
import { MONTHS } from "./calendar";
import { BRANCHES, SALESMEN } from "./dimensions";
import type { BranchFilter } from "@/store/filters";

export type CustomerType = "Individual" | "VIP" | "VVIP" | "Corporate";
export type CustomerStatus = "Active" | "Inactive" | "Blacklisted";
export type LeadSource =
  | "Walk-in"
  | "Referral"
  | "Instagram"
  | "WhatsApp"
  | "Website"
  | "Facebook"
  | "Exhibition"
  | "Cold Call";
export type RelationshipTier = "Tier 1" | "Tier 2" | "Tier 3" | null;

export interface CustomerRecord {
  id: string;
  code: string;
  name: string;
  type: CustomerType;
  status: CustomerStatus;
  branchId: string;
  salesmanId: string;
  leadSource: LeadSource;
  relationshipTier: RelationshipTier;
  preferredMetal: string;
  outstandingAED: number;
  nextOccasion: { label: "Birthday" | "Anniversary"; daysAway: number } | null;
}

export interface CustomerEvent {
  customerId: string;
  monthIdx: number; // index into MONTHS
  amountAED: number;
}

// ─── Name pools — deliberately mixed to read like a real Dubai luxury clientele ───

const FIRST_NAMES = [
  "Layla", "Ahmed", "Fatima", "Omar", "Noura", "Khalid", "Mariam", "Saeed", "Aisha", "Rashid",
  "Hind", "Sultan", "Maha", "Tariq", "Reem", "Faisal", "Salma", "Hamdan", "Dana", "Zayed",
  "Ananya", "Rohan", "Priyanka", "Arjun", "Isabella", "Marco", "Charlotte", "James", "Sofia", "Henrique",
  "Yasmin", "Karim", "Aaliyah", "Mateus", "Elena",
];
const LAST_NAMES = [
  "Al Mansoori", "Al Suwaidi", "Al Falasi", "Al Hashimi", "Al Marzooqi", "Al Nuaimi", "Khan", "Sharma",
  "Mehta", "Kapoor", "Reddy", "Santos", "Cruz", "Reyes", "Rousseau", "Moreau", "Whitfield", "Ashworth",
  "Castellano", "Romano", "Dubois", "Ferreira", "Almeida", "Petrova", "Novak", "Lindqvist",
];
const CORP_PREFIX = [
  "Al Maha", "Zenith", "Meridian", "Al Noor", "Pearl Crest", "Orion", "Falcon Bay", "Al Safwa",
  "Crescent Bay", "Marbella", "Al Rawda", "Silverline", "Emerald Gate", "Al Yasat", "Ravenswood", "Sapphire Coast",
];
const CORP_SUFFIX = [" Holdings", " Trading LLC", " Family Office", " Investments FZE", " Group"];
const CORPORATE_NAMES = CORP_PREFIX.map((p, i) => `${p}${CORP_SUFFIX[i % CORP_SUFFIX.length]}`);

const METAL_PREFS = ["Gold 22K", "Gold 18K", "Gold 24K", "Platinum 950", "Diamond-forward", "Silver 925"];
const METAL_PREF_WEIGHTS = [0.34, 0.22, 0.12, 0.1, 0.16, 0.06];

const LEAD_SOURCES: LeadSource[] = ["Walk-in", "Referral", "Instagram", "WhatsApp", "Website", "Facebook", "Exhibition", "Cold Call"];

/**
 * Channel mix is conditioned on customer tier, not drawn independently of it — a family-office
 * account is genuinely far more likely to have arrived via referral or a trade exhibition than a
 * cold call, and mass-retail walk-ins skew Instagram/Walk-in. Without this correlation, "which
 * channel brings the highest-value customers" is pure noise (customerType's spend range varies by
 * ~60x, which swamps any per-channel value multiplier applied independently of it) and the answer
 * flips unpredictably run to run, occasionally landing on an implausible channel like Cold Call. */
const LEAD_SOURCE_WEIGHTS_MASS = [0.32, 0.14, 0.19, 0.11, 0.1, 0.08, 0.03, 0.03]; // Individual
const LEAD_SOURCE_WEIGHTS_HIGH_TOUCH = [0.18, 0.34, 0.05, 0.07, 0.07, 0.02, 0.21, 0.06]; // VIP/VVIP/Corporate

/** Secondary, smaller nudge on top of the tier correlation above — warm channels convert to
 *  slightly better baskets even within the same tier. */
const LEAD_SOURCE_VALUE_MULTIPLIER: Record<LeadSource, number> = {
  Referral: 1.12,
  "Walk-in": 1.04,
  Exhibition: 1.06,
  WhatsApp: 1.0,
  Website: 0.97,
  Instagram: 0.94,
  Facebook: 0.93,
  "Cold Call": 0.86,
};

interface TypeWeight { type: CustomerType; weight: number }
const TYPE_WEIGHTS: TypeWeight[] = [
  { type: "Individual", weight: 0.66 },
  { type: "VIP", weight: 0.18 },
  { type: "VVIP", weight: 0.07 },
  { type: "Corporate", weight: 0.09 },
];

/** Trailing-12-month per-visit spend range by type, AED. */
const SPEND_RANGE: Record<CustomerType, [number, number]> = {
  Individual: [600, 3800],
  VIP: [3800, 12000],
  VVIP: [10500, 36000],
  Corporate: [4200, 23500],
};

const ENGAGEMENT_LEVELS = ["high", "medium", "low", "dormant"] as const;
type EngagementLevel = (typeof ENGAGEMENT_LEVELS)[number];
const ENGAGEMENT_WEIGHTS_BY_TYPE: Record<CustomerType, number[]> = {
  Individual: [0.22, 0.33, 0.25, 0.2],
  VIP: [0.38, 0.34, 0.16, 0.12],
  VVIP: [0.5, 0.3, 0.12, 0.08],
  Corporate: [0.3, 0.36, 0.2, 0.14],
};

const TOTAL_CUSTOMERS = 190;

export const CUSTOMERS: CustomerRecord[] = (() => {
  const rng = createRng(5151);
  let personIdx = 0;
  let corpIdx = 0;
  return Array.from({ length: TOTAL_CUSTOMERS }, (_, i) => {
    const type = rngWeightedPick(
      rng,
      TYPE_WEIGHTS.map((t) => t.type),
      TYPE_WEIGHTS.map((t) => t.weight),
    );
    let name: string;
    if (type === "Corporate") {
      name = CORPORATE_NAMES[corpIdx % CORPORATE_NAMES.length];
      corpIdx++;
    } else {
      const first = FIRST_NAMES[personIdx % FIRST_NAMES.length];
      const last = LAST_NAMES[(personIdx * 7 + 3) % LAST_NAMES.length];
      name = `${first} ${last}`;
      personIdx++;
    }
    const branch = rngWeightedPick(rng, BRANCHES, BRANCHES.map((b) => b.weight));
    const branchSalesmen = SALESMEN.filter((s) => s.branchId === branch.id);
    const salesman = branchSalesmen[rngInt(rng, 0, branchSalesmen.length - 1)];
    const isHighTouch = type === "VIP" || type === "VVIP" || type === "Corporate";
    const leadSource = rngWeightedPick(rng, LEAD_SOURCES, isHighTouch ? LEAD_SOURCE_WEIGHTS_HIGH_TOUCH : LEAD_SOURCE_WEIGHTS_MASS);
    const statusRoll = rng();
    const status: CustomerStatus = statusRoll < 0.035 ? "Blacklisted" : statusRoll < 0.09 ? "Inactive" : "Active";
    const relationshipTier: RelationshipTier =
      type === "Corporate" || type === "VVIP" ? (["Tier 1", "Tier 2", "Tier 3"] as const)[rngInt(rng, 0, 2)] : null;
    const preferredMetal = rngWeightedPick(rng, METAL_PREFS, METAL_PREF_WEIGHTS);
    const outstandingAED = rng() < 0.28 ? Math.round(rngRange(rng, 800, SPEND_RANGE[type][1] * 0.6)) : 0;
    const nextOccasion =
      rng() < 0.4 ? { label: (rng() < 0.6 ? "Birthday" : "Anniversary") as "Birthday" | "Anniversary", daysAway: rngInt(rng, 2, 150) } : null;
    return {
      id: `cust-${i + 1}`,
      code: `CUS-${20400 + i}`,
      name,
      type,
      status,
      branchId: branch.id,
      salesmanId: salesman.id,
      leadSource,
      relationshipTier,
      preferredMetal,
      outstandingAED,
      nextOccasion,
    };
  });
})();

/**
 * True first-ever-acquired month per customer, which may fall *before* the
 * visible 24-month window (negative index) — i.e. "this relationship already
 * existed when our data starts." Without this, any customer whose earliest
 * *visible* purchase happens to open the window would wrongly read as
 * newly-acquired in that window (there being no history before it to compare
 * against) — a classic left-censoring artifact. Built alongside
 * `CUSTOMER_EVENTS` since both need the same per-customer engagement level.
 */
export const CUSTOMER_FIRST_EVER: Map<string, number> = new Map();

export const CUSTOMER_EVENTS: CustomerEvent[] = (() => {
  const eRng = createRng(6161);
  const out: CustomerEvent[] = [];
  const last = MONTHS.length - 1;
  CUSTOMERS.forEach((c) => {
    const [lo, hi] = SPEND_RANGE[c.type];
    const level = rngWeightedPick(eRng, [...ENGAGEMENT_LEVELS], ENGAGEMENT_WEIGHTS_BY_TYPE[c.type]) as EngagementLevel;

    let activeMonthCount: number;
    let windowStart: number;
    let windowEnd: number;
    let preExistingChance: number; // odds this relationship predates the visible window entirely
    let preHistoryMax: number; // how far before windowStart it can predate it, when it does
    if (level === "high") {
      activeMonthCount = rngInt(eRng, 3, 6);
      windowStart = rngInt(eRng, 0, 4);
      windowEnd = last;
      preExistingChance = 0.55;
      preHistoryMax = 34;
    } else if (level === "medium") {
      activeMonthCount = rngInt(eRng, 2, 4);
      windowStart = rngInt(eRng, 0, 12);
      windowEnd = last - rngInt(eRng, 0, 4);
      preExistingChance = 0.45;
      preHistoryMax = 22;
    } else if (level === "low") {
      // Upper bound reaches close to `last` deliberately — a low-activity customer might
      // simply have joined recently (one purchase, not enough tenure yet to show a pattern).
      // Without recent arrivals in this bucket, nobody in the dataset could ever be "new" in
      // the most recent months, and New Customers would silently trend to zero every period.
      activeMonthCount = rngInt(eRng, 1, 3);
      windowStart = rngInt(eRng, 0, 20);
      windowEnd = last - rngInt(eRng, 0, 6);
      preExistingChance = 0.3;
      preHistoryMax = 10;
    } else {
      activeMonthCount = rngInt(eRng, 1, 4);
      windowStart = rngInt(eRng, 0, 10);
      windowEnd = last - rngInt(eRng, 9, 15);
      preExistingChance = 0.45;
      preHistoryMax = 16;
    }
    windowEnd = Math.max(windowStart, Math.min(windowEnd, last));

    const pool: number[] = [];
    for (let m = windowStart; m <= windowEnd; m++) pool.push(m);
    const chosen = new Set<number>();
    let guard = 0;
    while (chosen.size < Math.min(activeMonthCount, pool.length) && guard < 300) {
      chosen.add(pool[rngInt(eRng, 0, pool.length - 1)]);
      guard++;
    }
    chosen.forEach((m) => {
      const amount = Math.max(
        500,
        Math.round(rngRange(eRng, lo, hi) * LEAD_SOURCE_VALUE_MULTIPLIER[c.leadSource] * (1 + rngGaussian(eRng, 0, 0.15))),
      );
      out.push({ customerId: c.id, monthIdx: m, amountAED: amount });
    });

    // Otherwise this relationship was genuinely acquired within the visible window, at
    // windowStart itself — a real, dateable acquisition month that "new this period" can
    // correctly key off, rather than every customer's visible debut looking like a fresh signup.
    const extraTenure = eRng() < preExistingChance ? rngInt(eRng, 2, preHistoryMax) : 0;
    CUSTOMER_FIRST_EVER.set(c.id, windowStart - extraTenure);
  });
  return out;
})();

const MONTH_IDX_BY_KEY = new Map(MONTHS.map((m, i) => [m.key, i]));
const LAST_MONTH_IDX = MONTHS.length - 1;
const TRAILING_12_SET = new Set(Array.from({ length: 12 }, (_, i) => LAST_MONTH_IDX - i));

function idxSetFor(months: { key: string }[]): Set<number> {
  return new Set(months.map((m) => MONTH_IDX_BY_KEY.get(m.key)!));
}

function customersInBranch(branch: BranchFilter): CustomerRecord[] {
  return branch === "all" ? CUSTOMERS : CUSTOMERS.filter((c) => c.branchId === branch);
}

function percentile(nums: number[], p: number): number {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const idx = Math.min(s.length - 1, Math.max(0, Math.round((p / 100) * (s.length - 1))));
  return s[idx];
}

// ─── Period totals — headline KPIs ───

export interface CustomerPeriodTotals {
  activeCount: number;
  newCount: number;
  returningCount: number;
  repeatRatePct: number;
  revenueAED: number;
  avgCustomerValueAED: number;
}

export function customerTotalsForMonths(months: { key: string }[], branch: BranchFilter): CustomerPeriodTotals {
  const pool = customersInBranch(branch).filter((c) => c.status !== "Blacklisted");
  const poolIds = new Set(pool.map((c) => c.id));
  const idxSet = idxSetFor(months);
  const evts = CUSTOMER_EVENTS.filter((e) => poolIds.has(e.customerId) && idxSet.has(e.monthIdx));

  const byCustomer = new Map<string, number>();
  evts.forEach((e) => byCustomer.set(e.customerId, (byCustomer.get(e.customerId) ?? 0) + e.amountAED));
  const activeIds = [...byCustomer.keys()];
  const minMonthOfPeriod = Math.min(...idxSet);

  let newCount = 0;
  activeIds.forEach((id) => {
    const firstEver = CUSTOMER_FIRST_EVER.get(id) ?? -Infinity;
    if (firstEver >= minMonthOfPeriod) newCount++;
  });

  const activeCount = activeIds.length;
  const returningCount = activeCount - newCount;
  const revenueAED = evts.reduce((a, e) => a + e.amountAED, 0);

  return {
    activeCount,
    newCount,
    returningCount,
    repeatRatePct: activeCount ? returningCount / activeCount : 0,
    revenueAED,
    avgCustomerValueAED: activeCount ? revenueAED / activeCount : 0,
  };
}

// ─── Portfolio mix: who the customers are, count-share vs. value-share ───

const TYPES: CustomerType[] = ["Individual", "VIP", "VVIP", "Corporate"];
export const CUSTOMER_TYPE_COLORS: Record<CustomerType, string> = {
  Individual: chartColors.cat[0],
  Corporate: chartColors.cat[3],
  VIP: chartColors.cat[2],
  VVIP: chartColors.accent,
};

export function customerTypeMix(months: { key: string }[], branch: BranchFilter) {
  const pool = customersInBranch(branch).filter((c) => c.status !== "Blacklisted");
  const idxSet = idxSetFor(months);
  const poolIds = new Set(pool.map((c) => c.id));
  const evts = CUSTOMER_EVENTS.filter((e) => poolIds.has(e.customerId) && idxSet.has(e.monthIdx));
  const valueByCustomer = new Map<string, number>();
  evts.forEach((e) => valueByCustomer.set(e.customerId, (valueByCustomer.get(e.customerId) ?? 0) + e.amountAED));
  const activeIds = new Set(valueByCustomer.keys());

  const countShare = TYPES.map((t) => ({ key: t, label: t, value: pool.filter((c) => c.type === t && activeIds.has(c.id)).length }));
  const valueShare = TYPES.map((t) => {
    const ids = pool.filter((c) => c.type === t).map((c) => c.id);
    return { key: t, label: t, value: ids.reduce((a, id) => a + (valueByCustomer.get(id) ?? 0), 0) };
  });
  return { countShare, valueShare };
}

// ─── Acquisition channels ───

export function leadSourceMix(branch: BranchFilter) {
  const pool = customersInBranch(branch).filter((c) => c.status !== "Blacklisted");
  return LEAD_SOURCES.map((s) => ({ key: s, label: s, value: pool.filter((c) => c.leadSource === s).length })).filter((d) => d.value > 0);
}

export interface ChannelQuality {
  source: LeadSource;
  avgValueAED: number;
  count: number;
  countSharePct: number;
}

/** Lifetime value, not trailing-12 — a bigger sample per channel makes the "which channel is
 *  worth investing in" comparison more stable, consistent with how the opportunity matrix
 *  scores value (see that function's comment on trailing-window value being an unstable axis). */
export function leadSourceQuality(branch: BranchFilter): ChannelQuality[] {
  const pool = customersInBranch(branch).filter((c) => c.status === "Active");
  const valueByCustomer = new Map<string, number>();
  CUSTOMER_EVENTS.forEach((e) => {
    valueByCustomer.set(e.customerId, (valueByCustomer.get(e.customerId) ?? 0) + e.amountAED);
  });
  const bySource = new Map<LeadSource, { sum: number; count: number }>();
  pool.forEach((c) => {
    const v = valueByCustomer.get(c.id) ?? 0;
    if (v <= 0) return;
    const cur = bySource.get(c.leadSource) ?? { sum: 0, count: 0 };
    cur.sum += v;
    cur.count += 1;
    bySource.set(c.leadSource, cur);
  });
  const totalCount = [...bySource.values()].reduce((a, v) => a + v.count, 0) || 1;
  return [...bySource.entries()]
    .filter(([, a]) => a.count >= 5)
    .map(([source, a]) => ({ source, avgValueAED: a.sum / a.count, count: a.count, countSharePct: a.count / totalCount }))
    .sort((a, b) => b.avgValueAED - a.avgValueAED);
}

// ─── Lead funnel: source intake → outcome ───
//
// A genuinely separate dataset from CUSTOMERS/CUSTOMER_EVENTS above, deliberately not reconciled
// to it — same illustrative-but-domain-grounded pattern as Finance's journal entries and the
// Sales/Inventory/Supplier activity feeds (see mock/sales.ts, mock/inventory.ts). In the real LS
// model a "Lead" is just a Contact with `isLead: true` (see markContactAsLead), tracked through the
// early CrmStatus states (NEW_INQUIRER → NEW_CONTACT → OUTREACH_PENDING → ENGAGED_CLIENT) before it
// either becomes a paying customer (FIRST_TIME_BUYER) or goes cold. This models that pre-conversion
// population directly, independent of who's already in the CUSTOMERS master.

export type LeadOutcome = "Converted" | "Nurturing" | "Lost";
export type LeadStage = "New Inquirer" | "Outreach Pending" | "Engaged";

export interface LeadRecord {
  id: string;
  source: LeadSource;
  branchId: string;
  capturedMonthIdx: number;
  outcome: LeadOutcome;
  stage?: LeadStage; // set only when outcome === "Nurturing"
  daysToConvert?: number; // set only when outcome === "Converted"
}

export const LEAD_SOURCE_COLORS: Record<LeadSource, string> = {
  "Walk-in": chartColors.cat[0],
  Website: chartColors.cat[1],
  Referral: chartColors.cat[2],
  Instagram: chartColors.cat[3],
  WhatsApp: chartColors.cat[4],
  Facebook: chartColors.cat[5],
  Exhibition: chartColors.cat[6],
  "Cold Call": chartColors.cat[7],
};

/** [Converted, Nurturing, Lost] — warm, personally-vetted channels (Referral, Exhibition) close at
 *  roughly 2-3x the rate of cold/anonymous ones, the same relationship the value multipliers above
 *  encode for spend. Each row sums to 1. */
const LEAD_OUTCOME_WEIGHTS: Record<LeadSource, [number, number, number]> = {
  Referral: [0.58, 0.22, 0.2],
  Exhibition: [0.5, 0.24, 0.26],
  "Walk-in": [0.38, 0.24, 0.38],
  WhatsApp: [0.34, 0.28, 0.38],
  Website: [0.3, 0.26, 0.44],
  Instagram: [0.26, 0.28, 0.46],
  Facebook: [0.22, 0.26, 0.52],
  "Cold Call": [0.16, 0.22, 0.62],
};

const LEAD_STAGE_OPTIONS: LeadStage[] = ["New Inquirer", "Outreach Pending", "Engaged"];
const TOTAL_LEADS = 340;
/** A lead captured too recently hasn't had a fair chance to convert yet — excluding the freshest
 *  couple of months from the conversion-rate denominator avoids mechanically understating it. */
const CONVERSION_ELIGIBLE_LAG_MONTHS = 2;

export const LEADS: LeadRecord[] = (() => {
  const rng = createRng(8181);
  return Array.from({ length: TOTAL_LEADS }, (_, i) => {
    const branch = rngWeightedPick(rng, BRANCHES, BRANCHES.map((b) => b.weight));
    // Raw inbound intake skews mass-market, same as the mass-tier customer acquisition mix — it's
    // only after qualification that the base tilts toward high-touch channels.
    const source = rngWeightedPick(rng, LEAD_SOURCES, LEAD_SOURCE_WEIGHTS_MASS);
    const capturedMonthIdx = rngInt(rng, 0, LAST_MONTH_IDX);
    const monthsAgo = LAST_MONTH_IDX - capturedMonthIdx;

    const [pConverted, pNurturing] = LEAD_OUTCOME_WEIGHTS[source];
    const roll = rng();
    let outcome: LeadOutcome;
    let stage: LeadStage | undefined;
    let daysToConvert: number | undefined;
    if (roll < pConverted) {
      outcome = "Converted";
      daysToConvert = Math.round(rngRange(rng, 9, 120));
    } else if (roll < pConverted + pNurturing) {
      outcome = "Nurturing";
      // A freshly-captured lead is more likely still a bare inquiry; an older one still in the
      // funnel has had time to move through outreach into genuine engagement.
      const stageWeights = monthsAgo <= 2 ? [0.55, 0.3, 0.15] : monthsAgo <= 6 ? [0.3, 0.4, 0.3] : [0.15, 0.3, 0.55];
      stage = rngWeightedPick(rng, LEAD_STAGE_OPTIONS, stageWeights);
    } else {
      outcome = "Lost";
    }
    return { id: `lead-${i + 1}`, source, branchId: branch.id, capturedMonthIdx, outcome, stage, daysToConvert };
  });
})();

function leadsInBranch(branch: BranchFilter): LeadRecord[] {
  return branch === "all" ? LEADS : LEADS.filter((l) => l.branchId === branch);
}

export interface LeadFunnelTotals {
  newLeadsCount: number;
  conversionRatePct: number;
  avgDaysToConvert: number;
  eligibleCount: number;
  convertedCount: number;
}

export function leadFunnelData(months: { key: string }[], branch: BranchFilter): LeadFunnelTotals {
  const pool = leadsInBranch(branch);
  const idxSet = idxSetFor(months);
  const newLeadsCount = pool.filter((l) => idxSet.has(l.capturedMonthIdx)).length;

  // Lifetime, not period-filtered — conversion takes months to play out, so scoring it only
  // within the selected period would understate it the same way a trailing-window value axis
  // would (see opportunityMatrixData's comment on independent measurement windows).
  const eligible = pool.filter((l) => LAST_MONTH_IDX - l.capturedMonthIdx >= CONVERSION_ELIGIBLE_LAG_MONTHS);
  const converted = eligible.filter((l) => l.outcome === "Converted");
  const conversionRatePct = eligible.length ? converted.length / eligible.length : 0;
  const avgDaysToConvert = converted.length ? converted.reduce((a, l) => a + (l.daysToConvert ?? 0), 0) / converted.length : 0;

  return { newLeadsCount, conversionRatePct, avgDaysToConvert, eligibleCount: eligible.length, convertedCount: converted.length };
}

export interface LeadFlowNode {
  key: string;
  label: string;
  color: string;
  total: number;
  convertedPct?: number;
}
export interface LeadFlowLink {
  sourceKey: string;
  outcomeKey: LeadOutcome;
  value: number;
}

const OUTCOME_META: Record<LeadOutcome, { label: string; color: string }> = {
  Converted: { label: "Converted to Customer", color: chartColors.good },
  Nurturing: { label: "Currently Nurturing", color: chartColors.accent },
  Lost: { label: "Lost / No Response", color: chartColors.critical },
};
const OUTCOME_ORDER: LeadOutcome[] = ["Converted", "Nurturing", "Lost"];

export function leadSourceFlowData(branch: BranchFilter) {
  const pool = leadsInBranch(branch);

  // Keep the highest-volume sources distinct and roll the long tail into "Other" — the same
  // small-sample guard leadSourceQuality applies, so the diagram doesn't collapse under eight
  // thin, unreadable ribbons.
  const countBySource = new Map<LeadSource, number>();
  pool.forEach((l) => countBySource.set(l.source, (countBySource.get(l.source) ?? 0) + 1));
  const top = [...countBySource.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([s]) => s);
  const keyFor = (s: LeadSource): string => (top.includes(s) ? s : "Other");
  const colorFor = (key: string): string => (key === "Other" ? chartColors.baseline : LEAD_SOURCE_COLORS[key as LeadSource]);

  const sourceTotals = new Map<string, number>();
  const sourceConverted = new Map<string, number>();
  const outcomeTotals = new Map<LeadOutcome, number>();
  const linkCounts = new Map<string, number>();

  pool.forEach((l) => {
    const key = keyFor(l.source);
    sourceTotals.set(key, (sourceTotals.get(key) ?? 0) + 1);
    if (l.outcome === "Converted") sourceConverted.set(key, (sourceConverted.get(key) ?? 0) + 1);
    outcomeTotals.set(l.outcome, (outcomeTotals.get(l.outcome) ?? 0) + 1);
    const linkKey = `${key}|${l.outcome}`;
    linkCounts.set(linkKey, (linkCounts.get(linkKey) ?? 0) + 1);
  });

  const sources: LeadFlowNode[] = [...sourceTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key, total]) => ({
      key,
      label: key,
      color: colorFor(key),
      total,
      convertedPct: total ? (sourceConverted.get(key) ?? 0) / total : 0,
    }));

  const outcomes: LeadFlowNode[] = OUTCOME_ORDER.map((key) => ({
    key,
    label: OUTCOME_META[key].label,
    color: OUTCOME_META[key].color,
    total: outcomeTotals.get(key) ?? 0,
  }));

  const links: LeadFlowLink[] = [];
  sources.forEach((s) => {
    OUTCOME_ORDER.forEach((o) => {
      const value = linkCounts.get(`${s.key}|${o}`) ?? 0;
      if (value > 0) links.push({ sourceKey: s.key, outcomeKey: o, value });
    });
  });

  // A confident "best channel" headline needs real volume behind it, same guard as leadSourceQuality.
  const bestSource = [...sources].filter((s) => s.total >= 12).sort((a, b) => (b.convertedPct ?? 0) - (a.convertedPct ?? 0))[0];

  return { sources, outcomes, links, bestSource };
}

// ─── Revenue concentration (Pareto/Lorenz) ───

export interface ConcentrationPoint { cumCustomerPct: number; cumRevenuePct: number }

export function concentrationCurveData(branch: BranchFilter) {
  const pool = customersInBranch(branch).filter((c) => c.status !== "Blacklisted");
  const poolIds = new Set(pool.map((c) => c.id));
  const valueByCustomer = new Map<string, number>();
  CUSTOMER_EVENTS.forEach((e) => {
    if (poolIds.has(e.customerId) && TRAILING_12_SET.has(e.monthIdx)) {
      valueByCustomer.set(e.customerId, (valueByCustomer.get(e.customerId) ?? 0) + e.amountAED);
    }
  });
  const ranked = [...valueByCustomer.entries()].sort((a, b) => b[1] - a[1]);
  const totalRevenue = ranked.reduce((a, [, v]) => a + v, 0) || 1;
  const n = ranked.length || 1;

  let cumRevenue = 0;
  const points: ConcentrationPoint[] = ranked.map(([, v], i) => {
    cumRevenue += v;
    return { cumCustomerPct: ((i + 1) / n) * 100, cumRevenuePct: (cumRevenue / totalRevenue) * 100 };
  });
  points.unshift({ cumCustomerPct: 0, cumRevenuePct: 0 });

  const top20Count = Math.max(1, Math.round(n * 0.2));
  const top20SharePct = (ranked.slice(0, top20Count).reduce((a, [, v]) => a + v, 0) / totalRevenue) * 100;

  return { points, top20Count, top20SharePct, activeCount: n };
}

export interface RankedBarDatumLike { key: string; label: string; sublabel?: string; value: number; secondaryValue?: string }

export function topCustomersRanked(branch: BranchFilter, topN = 8): RankedBarDatumLike[] {
  const pool = customersInBranch(branch).filter((c) => c.status !== "Blacklisted");
  const byId = new Map(pool.map((c) => [c.id, c]));
  const agg = new Map<string, { value: number; count: number }>();
  CUSTOMER_EVENTS.forEach((e) => {
    if (!byId.has(e.customerId) || !TRAILING_12_SET.has(e.monthIdx)) return;
    const cur = agg.get(e.customerId) ?? { value: 0, count: 0 };
    cur.value += e.amountAED;
    cur.count += 1;
    agg.set(e.customerId, cur);
  });
  return [...agg.entries()]
    .map(([id, a]) => {
      const c = byId.get(id)!;
      return { key: id, label: c.name, sublabel: c.type, value: a.value, secondaryValue: `${a.count} visit${a.count === 1 ? "" : "s"}` };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, topN);
}

// ─── Value vs. recency opportunity/risk matrix (RFM-style) ───

export type SegmentKey = "champion" | "steady" | "rising" | "atRisk" | "dormant";
export const SEGMENT_META: Record<SegmentKey, { label: string; color: string }> = {
  champion: { label: "Champion", color: chartColors.accent },
  steady: { label: "Steady", color: chartColors.seq[400] },
  rising: { label: "New & Rising", color: chartColors.good },
  atRisk: { label: "At Risk", color: chartColors.warning },
  dormant: { label: "Dormant", color: chartColors.critical },
};

export interface OpportunityPoint {
  id: string;
  name: string;
  type: CustomerType;
  valueAED: number;
  recencyMonths: number;
  frequency: number;
  segment: SegmentKey;
  segmentLabel: string;
  segmentColor: string;
}

/** Jewelry purchase cadence is naturally sparse (gifting occasions — birthdays, anniversaries,
 *  Eid, wedding season — are roughly annual even for healthy customers), so "recent" and "stale"
 *  are calibrated far looser than a general-retail/subscription business would use. A 6-month
 *  gap here is unremarkable; it only becomes a signal past about three-quarters of a year. */
export const RECENT_MONTHS = 4;
export const STALE_MONTHS = 9;

export function opportunityMatrixData(branch: BranchFilter) {
  const pool = customersInBranch(branch).filter((c) => c.status === "Active");
  // Lifetime (all 24mo), not trailing-12 — value and recency must be independent axes. A
  // customer who spent heavily 10 months ago and then went quiet is exactly who "At Risk"
  // should surface; scoring value only within a trailing-12 window would mathematically
  // starve anyone stale of value by construction (little of a 12mo window is left to count
  // once several stale months are excluded), collapsing that quadrant to near-empty.
  const aggByCustomer = new Map<string, { lifetimeValue: number; lifetimeCount: number; lastMonthIdx: number }>();
  CUSTOMER_EVENTS.forEach((e) => {
    const cur = aggByCustomer.get(e.customerId) ?? { lifetimeValue: 0, lifetimeCount: 0, lastMonthIdx: -1 };
    cur.lifetimeValue += e.amountAED;
    cur.lifetimeCount += 1;
    if (e.monthIdx > cur.lastMonthIdx) cur.lastMonthIdx = e.monthIdx;
    aggByCustomer.set(e.customerId, cur);
  });

  const rows = pool
    .map((c) => {
      const agg = aggByCustomer.get(c.id);
      if (!agg || agg.lastMonthIdx < 0) return null;
      return {
        id: c.id,
        name: c.name,
        type: c.type,
        valueAED: agg.lifetimeValue,
        recencyMonths: LAST_MONTH_IDX - agg.lastMonthIdx,
        frequency: agg.lifetimeCount,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null && r.valueAED > 0);

  const highValueThreshold = percentile(rows.map((r) => r.valueAED), 75);

  const points: OpportunityPoint[] = rows.map((r) => {
    let segment: SegmentKey;
    if (r.valueAED >= highValueThreshold && r.recencyMonths <= RECENT_MONTHS) segment = "champion";
    else if (r.valueAED >= highValueThreshold && r.recencyMonths > STALE_MONTHS) segment = "atRisk";
    else if (r.recencyMonths <= RECENT_MONTHS && r.frequency <= 2) segment = "rising";
    else if (r.recencyMonths > STALE_MONTHS) segment = "dormant";
    else segment = "steady";
    return { ...r, segment, segmentLabel: SEGMENT_META[segment].label, segmentColor: SEGMENT_META[segment].color };
  });

  const summary = (Object.keys(SEGMENT_META) as SegmentKey[]).map((key) => {
    const items = points.filter((p) => p.segment === key);
    return {
      key,
      label: SEGMENT_META[key].label,
      color: SEGMENT_META[key].color,
      count: items.length,
      valueAED: items.reduce((a, p) => a + p.valueAED, 0),
    };
  });

  return { points, summary, highValueThreshold };
}

// ─── Relationship lifecycle funnel ───

export interface SeverityBucketLike { key: string; label: string; value: number; color: string }

const LIFECYCLE_ORDER = ["New Inquirer", "Engaged Prospect", "Active Customer", "VIC", "V-VIC", "Disengaged / Dormant"];
const LIFECYCLE_COLORS = [
  chartColors.seq[200],
  chartColors.seq[400],
  chartColors.good,
  chartColors.accent,
  chartColors.accentDark,
  chartColors.critical,
];

export function lifecycleFunnelData(branch: BranchFilter): SeverityBucketLike[] {
  const pool = customersInBranch(branch).filter((c) => c.status !== "Blacklisted");
  const lastByCustomer = new Map<string, number>();
  const lifetimeValue = new Map<string, number>();
  CUSTOMER_EVENTS.forEach((e) => {
    lastByCustomer.set(e.customerId, Math.max(lastByCustomer.get(e.customerId) ?? -Infinity, e.monthIdx));
    lifetimeValue.set(e.customerId, (lifetimeValue.get(e.customerId) ?? 0) + e.amountAED);
  });

  const p90 = percentile(pool.map((c) => lifetimeValue.get(c.id) ?? 0), 90);
  const p70 = percentile(pool.map((c) => lifetimeValue.get(c.id) ?? 0), 70);

  const buckets: Record<string, number> = Object.fromEntries(LIFECYCLE_ORDER.map((k) => [k, 0]));
  pool.forEach((c) => {
    const lastM = lastByCustomer.get(c.id);
    if (lastM === undefined) {
      buckets["New Inquirer"]++;
      return;
    }
    // True acquisition tenure — may predate the visible window (see CUSTOMER_FIRST_EVER) — not
    // just "months since their earliest visible purchase," so a long-standing customer who
    // happens to have re-engaged recently isn't miscounted as a brand-new inquirer.
    const tenure = LAST_MONTH_IDX - (CUSTOMER_FIRST_EVER.get(c.id) ?? LAST_MONTH_IDX);
    const recency = LAST_MONTH_IDX - lastM;
    const value = lifetimeValue.get(c.id) ?? 0;
    if (recency > STALE_MONTHS) buckets["Disengaged / Dormant"]++;
    else if (tenure <= 2) buckets["New Inquirer"]++;
    else if (tenure <= 6) buckets["Engaged Prospect"]++;
    else if (value >= p90 || c.type === "VVIP") buckets["V-VIC"]++;
    else if (value >= p70 || c.type === "VIP") buckets["VIC"]++;
    else buckets["Active Customer"]++;
  });

  return LIFECYCLE_ORDER.map((label, i) => ({ key: label, label, value: buckets[label], color: LIFECYCLE_COLORS[i] }));
}

// ─── New vs. returning customers, trailing 12 months ───

export interface CohortDatum { key: string; label: string; newCount: number; returningCount: number }

export function newVsReturningTrend(branch: BranchFilter): CohortDatum[] {
  const pool = customersInBranch(branch).filter((c) => c.status !== "Blacklisted");
  const poolIds = new Set(pool.map((c) => c.id));

  return Array.from({ length: 12 }, (_, i) => LAST_MONTH_IDX - 11 + i).map((monthIdx) => {
    const m = MONTHS[monthIdx];
    const customersThisMonth = new Set(
      CUSTOMER_EVENTS.filter((e) => poolIds.has(e.customerId) && e.monthIdx === monthIdx).map((e) => e.customerId),
    );
    let newCount = 0;
    customersThisMonth.forEach((id) => {
      if (CUSTOMER_FIRST_EVER.get(id) === monthIdx) newCount++;
    });
    return { key: m.key, label: m.shortLabel, newCount, returningCount: customersThisMonth.size - newCount };
  });
}

// ─── Purchase history: monthly revenue, full window ───

export interface PurchaseHistoryDatum {
  key: string;
  label: string;
  newRevenueAED: number;
  returningRevenueAED: number;
  totalRevenueAED: number;
  cumulativeRevenueAED: number;
  transactionCount: number;
}

/** Unlike newVsReturningTrend (trailing 12, headcount), this spans the full visible window and
 *  tracks AED, not accounts — "how much has the base actually spent, month by month, and what has
 *  that compounded to." newRevenueAED/returningRevenueAED are kept per month for the tooltip and
 *  headline stat, but deliberately NOT charted as a stacked split: in a repeat-heavy luxury
 *  business, new-customer revenue is routinely under 5% of the monthly total, so stacking it would
 *  render as an invisible sliver — the same trap CustomerCohortBars' own comment warns about for
 *  headcount, just as true for AED. */
export function purchaseHistoryTrend(branch: BranchFilter): PurchaseHistoryDatum[] {
  const pool = customersInBranch(branch).filter((c) => c.status !== "Blacklisted");
  const poolIds = new Set(pool.map((c) => c.id));

  const byMonth = new Map<number, { newRevenueAED: number; returningRevenueAED: number; transactionCount: number }>();
  CUSTOMER_EVENTS.forEach((e) => {
    if (!poolIds.has(e.customerId)) return;
    const bucket = byMonth.get(e.monthIdx) ?? { newRevenueAED: 0, returningRevenueAED: 0, transactionCount: 0 };
    bucket.transactionCount += 1;
    if (CUSTOMER_FIRST_EVER.get(e.customerId) === e.monthIdx) bucket.newRevenueAED += e.amountAED;
    else bucket.returningRevenueAED += e.amountAED;
    byMonth.set(e.monthIdx, bucket);
  });

  let cumulative = 0;
  return MONTHS.map((m, monthIdx) => {
    const b = byMonth.get(monthIdx) ?? { newRevenueAED: 0, returningRevenueAED: 0, transactionCount: 0 };
    const totalRevenueAED = b.newRevenueAED + b.returningRevenueAED;
    cumulative += totalRevenueAED;
    return {
      key: m.key,
      label: m.shortLabel,
      newRevenueAED: b.newRevenueAED,
      returningRevenueAED: b.returningRevenueAED,
      totalRevenueAED,
      cumulativeRevenueAED: cumulative,
      transactionCount: b.transactionCount,
    };
  });
}

// ─── Strategic accounts — the deep-dive table ───

export interface StrategicAccountRow {
  id: string;
  name: string;
  type: CustomerType;
  tier: string;
  ytdSpendAED: number;
  outstandingAED: number;
  lastPurchaseLabel: string;
  segment: string;
  nextOccasionLabel: string;
}

export function strategicAccountsTable(branch: BranchFilter, topN = 12): StrategicAccountRow[] {
  const pool = customersInBranch(branch).filter(
    (c) => c.status === "Active" && (c.type === "VIP" || c.type === "VVIP" || c.type === "Corporate"),
  );
  const agg = new Map<string, { value: number; lastMonthIdx: number }>();
  CUSTOMER_EVENTS.forEach((e) => {
    if (!TRAILING_12_SET.has(e.monthIdx)) return;
    const cur = agg.get(e.customerId) ?? { value: 0, lastMonthIdx: -1 };
    cur.value += e.amountAED;
    cur.lastMonthIdx = Math.max(cur.lastMonthIdx, e.monthIdx);
    agg.set(e.customerId, cur);
  });
  const { points } = opportunityMatrixData(branch);
  const segmentById = new Map(points.map((p) => [p.id, p.segmentLabel]));

  return pool
    .map((c) => {
      const a = agg.get(c.id);
      const lastPurchaseLabel = a && a.lastMonthIdx >= 0 ? MONTHS[a.lastMonthIdx].label : "No purchase in window";
      return {
        id: c.id,
        name: c.name,
        type: c.type,
        tier: c.relationshipTier ?? "—",
        ytdSpendAED: a?.value ?? 0,
        outstandingAED: c.outstandingAED,
        lastPurchaseLabel,
        segment: segmentById.get(c.id) ?? "—",
        nextOccasionLabel: c.nextOccasion ? `${c.nextOccasion.label} in ${c.nextOccasion.daysAway}d` : "—",
      };
    })
    .sort((a, b) => b.ytdSpendAED - a.ytdSpendAED)
    .slice(0, topN);
}

// ─── AR aging — money owed TO the business, mirrors purchasing.ts's AP aging ───
// LS sells physically, showroom-only (see CLAUDE.md "Business model — physical
// retail only") — `outstandingAED` is never an unpaid online order, it's a
// layaway/installment balance on a big-ticket bridal or investment piece,
// agreed in person and collected over subsequent showroom visits.

export type ArAgingBucketId = "current" | "1-30" | "31-60" | "61-90+";
export const AR_AGING_BUCKETS: { id: ArAgingBucketId; label: string }[] = [
  { id: "current", label: "Not yet due" },
  { id: "1-30", label: "1-30 days overdue" },
  { id: "31-60", label: "31-60 days overdue" },
  { id: "61-90+", label: "61-90+ days overdue" },
];

export interface CustomerArAging {
  customerId: string;
  customer: CustomerRecord;
  outstandingAED: number;
  buckets: Record<ArAgingBucketId, number>;
}

export const AR_AGING: CustomerArAging[] = (() => {
  const rng = createRng(6431);
  return CUSTOMERS.filter((c) => c.outstandingAED > 0).map((c) => {
    // VIP/VVIP/Corporate relationships run structured, relationship-managed installment
    // plans and stay current more often; mass-market layaway drifts overdue faster —
    // same high-touch-vs-mass split the rest of this file conditions on (see
    // ENGAGEMENT_WEIGHTS_BY_TYPE, LEAD_SOURCE_WEIGHTS_HIGH_TOUCH).
    const currentBias = c.type === "VVIP" || c.type === "Corporate" ? 0.18 : c.type === "VIP" ? 0.08 : 0;
    const shares = [0.42 + currentBias, 0.28, 0.18 - currentBias * 0.5, 0.12 - currentBias * 0.5].map((s) =>
      Math.max(0.03, s * (1 + rngGaussian(rng, 0, 0.28))),
    );
    const sum = shares.reduce((a, b) => a + b, 0);
    const buckets = {} as Record<ArAgingBucketId, number>;
    AR_AGING_BUCKETS.forEach((b, i) => (buckets[b.id] = Math.round((c.outstandingAED * shares[i]) / sum)));
    return { customerId: c.id, customer: c, outstandingAED: c.outstandingAED, buckets };
  });
})();

export function arAgingTotalsByBucket(): Record<ArAgingBucketId, number> {
  const totals = { current: 0, "1-30": 0, "31-60": 0, "61-90+": 0 } as Record<ArAgingBucketId, number>;
  AR_AGING.forEach((c) => AR_AGING_BUCKETS.forEach((b) => (totals[b.id] += c.buckets[b.id])));
  return totals;
}

export function totalOutstandingAR(): number {
  return AR_AGING.reduce((a, c) => a + c.outstandingAED, 0);
}

// ─── Upcoming special dates — relationship touchpoints, not a campaign tool ───

export interface UpcomingOccasion { id: string; name: string; type: CustomerType; label: string; daysAway: number }

export function upcomingOccasions(branch: BranchFilter, limit = 6): UpcomingOccasion[] {
  return customersInBranch(branch)
    .filter((c) => c.status === "Active" && c.nextOccasion)
    .map((c) => ({ id: c.id, name: c.name, type: c.type, label: c.nextOccasion!.label, daysAway: c.nextOccasion!.daysAway }))
    .sort((a, b) => a.daysAway - b.daysAway)
    .slice(0, limit);
}
