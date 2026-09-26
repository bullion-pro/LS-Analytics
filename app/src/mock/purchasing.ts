import { SUPPLIERS, type Supplier } from "./dimensions";
import { MONTHS, daysBeforeLabel } from "./calendar";
import { MONTHLY_SALES } from "./sales";
import { createRng, rngGaussian, rngRange } from "./rng";

export interface MonthlyPurchasingRollup {
  monthKey: string;
  totalSpendAED: number;
  bySupplier: Record<string, number>;
  avgPoCycleDays: number;
}

function normalizedSplit(rng: () => number, total: number, entries: { id: string; weight: number }[], noiseAmp: number) {
  const noised = entries.map((e) => Math.max(0.01, e.weight * (1 + rngGaussian(rng, 0, noiseAmp))));
  const sum = noised.reduce((a, b) => a + b, 0);
  const out: Record<string, number> = {};
  entries.forEach((e, i) => (out[e.id] = Math.round((total * noised[i]) / sum)));
  return out;
}

export const MONTHLY_PURCHASING: MonthlyPurchasingRollup[] = (() => {
  const rng = createRng(7117);
  return MONTHLY_SALES.map((rollup, t) => {
    const totalSpendAED = Math.round(rollup.costOfGoods * (1.04 + rngGaussian(rng, 0, 0.03)));
    const bySupplier = normalizedSplit(rng, totalSpendAED, SUPPLIERS, 0.08);
    const avgPoCycleDays = Math.max(9, 19 - t * 0.12 + rngGaussian(rng, 0, 1.1));
    return { monthKey: MONTHS[t].key, totalSpendAED, bySupplier, avgPoCycleDays: Math.round(avgPoCycleDays * 10) / 10 };
  });
})();

export function purchasingTotalSpend(rollups: MonthlyPurchasingRollup[]): number {
  return rollups.reduce((a, r) => a + r.totalSpendAED, 0);
}

// ─── Supplier scorecard (fixed per supplier — rating/reliability profile) ───

export interface SupplierScorecard {
  supplierId: string;
  supplier: Supplier;
  ratingOutOf5: number;
  onTimeDeliveryPct: number;
  defectRatePct: number;
  trailing12moSpendAED: number;
}

const CATEGORY_RELIABILITY_BIAS: Record<Supplier["category"], number> = {
  Bullion: 0.14,
  Gemstone: 0,
  "Finished Goods": -0.12,
  Packaging: 0.04,
};

export const SUPPLIER_SCORECARDS: SupplierScorecard[] = (() => {
  const rng = createRng(8228);
  const trailing = MONTHLY_PURCHASING.slice(-12);
  return SUPPLIERS.map((s) => {
    const bias = CATEGORY_RELIABILITY_BIAS[s.category];
    const onTimeDeliveryPct = Math.min(99, Math.max(68, Math.round((0.87 + bias + rngGaussian(rng, 0, 0.05)) * 1000) / 10));
    const defectRatePct = Math.max(0.1, Math.round((1.8 - bias * 4 + rngGaussian(rng, 0, 0.5)) * 10) / 10);
    const ratingOutOf5 = Math.min(5, Math.max(2.6, Math.round((3.6 + bias * 3 + rngGaussian(rng, 0, 0.22)) * 10) / 10));
    const trailing12moSpendAED = trailing.reduce((a, r) => a + (r.bySupplier[s.id] ?? 0), 0);
    return { supplierId: s.id, supplier: s, ratingOutOf5, onTimeDeliveryPct, defectRatePct, trailing12moSpendAED };
  });
})();

// ─── AP aging — outstanding payable balance per supplier, bucketed ───

export type ApAgingBucketId = "current" | "1-30" | "31-60" | "61-90+";
export const AP_AGING_BUCKETS: { id: ApAgingBucketId; label: string }[] = [
  { id: "current", label: "Not yet due" },
  { id: "1-30", label: "1-30 days overdue" },
  { id: "31-60", label: "31-60 days overdue" },
  { id: "61-90+", label: "61+ days overdue" },
];

export interface SupplierApAging {
  supplierId: string;
  supplier: Supplier;
  outstandingAED: number;
  buckets: Record<ApAgingBucketId, number>;
}

export const AP_AGING: SupplierApAging[] = (() => {
  const rng = createRng(9339);
  const lastMonthSpend = MONTHLY_PURCHASING[MONTHLY_PURCHASING.length - 1];
  return SUPPLIERS.map((s) => {
    const monthsOutstanding = s.paymentTermsDays / 30;
    const spend = lastMonthSpend.bySupplier[s.id] ?? 0;
    const outstandingAED = Math.round(spend * monthsOutstanding * rngRange(rng, 0.75, 1.15));

    // Riskier / longer-terms suppliers skew more into overdue buckets.
    const riskFactor = Math.min(1, s.paymentTermsDays / 60);
    const base = [0.52 - riskFactor * 0.18, 0.28, 0.13 + riskFactor * 0.08, 0.07 + riskFactor * 0.1];
    const shares = base.map((b) => Math.max(0.02, b * (1 + rngGaussian(rng, 0, 0.07))));
    const sum = shares.reduce((a, b) => a + b, 0);
    const buckets = {} as Record<ApAgingBucketId, number>;
    AP_AGING_BUCKETS.forEach((b, i) => (buckets[b.id] = Math.round((outstandingAED * shares[i]) / sum)));

    return { supplierId: s.id, supplier: s, outstandingAED, buckets };
  });
})();

export function apAgingTotalsByBucket(): Record<ApAgingBucketId, number> {
  const totals = { current: 0, "1-30": 0, "31-60": 0, "61-90+": 0 } as Record<ApAgingBucketId, number>;
  AP_AGING.forEach((s) => AP_AGING_BUCKETS.forEach((b) => (totals[b.id] += s.buckets[b.id])));
  return totals;
}

export function totalOutstandingAP(): number {
  return AP_AGING.reduce((a, s) => a + s.outstandingAED, 0);
}

// ─── Recent PO / GRN activity — concrete texture beneath the spend rollups ───

interface SupplierLineTemplate {
  desc: string;
  amountRangeAED: [number, number];
  docPrefix: string;
}

const SUPPLIER_LINE_TEMPLATES: Record<Supplier["category"], SupplierLineTemplate[]> = {
  Bullion: [
    { desc: "999.9 Fine Gold Bars, 200g", amountRangeAED: [39000, 46000], docPrefix: "PO" },
    { desc: "22K Gold Casting Grain, 400g", amountRangeAED: [77000, 82000], docPrefix: "PO" },
  ],
  Gemstone: [
    { desc: "0.30–0.50ct GIA-Certified Diamonds, 10-stone parcel", amountRangeAED: [13000, 28000], docPrefix: "PO" },
    { desc: "Burmese Ruby & Sapphire Parcel, calibrated", amountRangeAED: [8000, 18000], docPrefix: "PO" },
    { desc: "South Sea Pearl Strand Parcel", amountRangeAED: [3500, 9000], docPrefix: "PO" },
  ],
  "Finished Goods": [
    { desc: "22K Gold Necklace Sets, ready-to-retail (3 pcs)", amountRangeAED: [28000, 52000], docPrefix: "GRN" },
    { desc: "18K Diamond Ring Collection, assorted (6 pcs)", amountRangeAED: [19000, 38000], docPrefix: "GRN" },
  ],
  Packaging: [
    { desc: "Branded Gift Boxes & Velvet Pouches (400 units)", amountRangeAED: [3500, 6700], docPrefix: "GRN" },
    { desc: "Display Trays & Window Props", amountRangeAED: [1800, 4300], docPrefix: "GRN" },
  ],
};

export interface PurchaseActivityEntry {
  id: string;
  date: string;
  docNo: string;
  category: Supplier["category"];
  description: string;
  supplier: string;
  amountAED: number;
}

/** A short, illustrative feed of individual PO/GRN lines — same spirit as Finance's journal feed, grounded in the actual bullion/gemstone/finished-goods/packaging supply chain rather than another spend rollup. */
export function recentPurchaseActivity(count = 6): PurchaseActivityEntry[] {
  const rng = createRng(51913);
  const anchor = MONTHS[MONTHS.length - 1].date;
  const yy = String(anchor.getFullYear()).slice(2);
  const mm = String(anchor.getMonth() + 1).padStart(2, "0");

  let cursorDay = 0;
  const out: PurchaseActivityEntry[] = [];
  for (let i = 0; i < count; i++) {
    cursorDay += 2 + Math.floor(rng() * 3);
    const supplier = SUPPLIERS[Math.floor(rng() * SUPPLIERS.length)];
    const templates = SUPPLIER_LINE_TEMPLATES[supplier.category];
    const template = templates[Math.floor(rng() * templates.length)];
    const amountAED = Math.round(
      (template.amountRangeAED[0] + rng() * (template.amountRangeAED[1] - template.amountRangeAED[0])) / 10,
    ) * 10;
    const docSeq = 3100 + Math.floor(rng() * 899);

    out.push({
      id: `purchase-${i}`,
      date: daysBeforeLabel(anchor, cursorDay),
      docNo: `${template.docPrefix}-${yy}${mm}-${docSeq}`,
      category: supplier.category,
      description: template.desc,
      supplier: supplier.name,
      amountAED,
    });
  }
  return out;
}
