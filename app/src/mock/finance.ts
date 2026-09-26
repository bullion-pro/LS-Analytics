import { BRANCHES } from "./dimensions";
import { MONTHS, daysBeforeLabel } from "./calendar";
import { MONTHLY_SALES, rollupFor } from "./sales";
import { STOCK_VALUATION, latestStockValuation } from "./inventory";
import { MONTHLY_PURCHASING, totalOutstandingAP } from "./purchasing";
import { totalOutstandingAR } from "./customers";
import { createRng, rngGaussian } from "./rng";
import type { BranchFilter } from "@/store/filters";

/**
 * LS's account-module already runs the real chart of accounts, journal
 * vouchers, and bank accounts (see project memory: ls-modules-mapping). This
 * derives an illustrative but internally-consistent P&L, balance sheet, and
 * cash position from the SAME underlying revenue/COGS/stock/AP series the
 * Sales, Inventory, and Supplier pages already use — so the numbers here
 * reconcile with those pages rather than being invented independently.
 */

export interface OpexCategory {
  id: string;
  name: string;
  shareOfRevenue: number;
}

/** Illustrative opex structure for a UAE multi-branch luxury jewelry retailer. */
export const OPEX_CATEGORIES: OpexCategory[] = [
  { id: "staff", name: "Staff salaries & commissions", shareOfRevenue: 0.088 },
  { id: "rent", name: "Branch rent & utilities", shareOfRevenue: 0.058 },
  { id: "marketing", name: "Marketing & selling", shareOfRevenue: 0.024 },
  { id: "admin", name: "Admin, insurance & IT", shareOfRevenue: 0.019 },
  { id: "depreciation", name: "Depreciation & amortization", shareOfRevenue: 0.014 },
  { id: "finance", name: "Bullion financing & bank charges", shareOfRevenue: 0.012 },
];

const VAT_RATE = 0.05; // UAE standard rate
const CT_RATE = 0.09; // UAE federal corporate tax (effective June 2023)
const CT_MONTHLY_RELIEF = 375_000 / 12; // small-business-relief threshold, spread monthly

export interface MonthlyFinanceRollup {
  monthKey: string;
  revenue: number;
  costOfGoods: number;
  grossProfit: number;
  grossMarginPct: number;
  opexByCategory: Record<string, number>;
  totalOpex: number;
  depreciation: number;
  financeCosts: number;
  ebitda: number;
  netProfitBeforeTax: number;
  corporateTax: number;
  netProfit: number; // after 9% UAE corporate tax — the headline figure
  netMarginPct: number;
  vatOutput: number;
  vatInput: number;
  vatPayable: number;
  fixedAssets: number;
  cashChange: number;
  cashClosing: number;
}

// Branch occupancy cost varies a lot in practice — a prime Dubai Mall unit
// costs far more per sq ft than a traditional Deira Gold Souq lease.
// Normalized so the revenue-weighted average multiplier is exactly 1, which
// keeps total company rent reconciled to OPEX_CATEGORIES.rent. Module-scoped
// so both the monthly generator and the branch P&L breakdown share one figure.
const RAW_RENT_MULTIPLIER: Record<string, number> = {
  "br-dxb-mall": 1.55,
  "br-dxb-gold": 0.5,
  "br-auh-corn": 1.05,
  "br-shj-city": 0.78,
};
const RENT_MULTIPLIER: Record<string, number> = (() => {
  const weightedAvgRaw = BRANCHES.reduce((a, b) => a + RAW_RENT_MULTIPLIER[b.id] * b.weight, 0);
  const out: Record<string, number> = {};
  BRANCHES.forEach((b) => {
    out[b.id] = RAW_RENT_MULTIPLIER[b.id] / weightedAvgRaw;
  });
  return out;
})();

export const MONTHLY_FINANCE: MonthlyFinanceRollup[] = (() => {
  const rng = createRng(3535);
  let cash = 240_000;
  let fixedAssets = 1_010_000;

  return MONTHLY_SALES.map((sales, t) => {
    const revenue = sales.revenue;
    const costOfGoods = sales.costOfGoods;
    const grossProfit = sales.grossMargin;
    const grossMarginPct = sales.grossMarginPct;

    const opexByCategory: Record<string, number> = {};
    OPEX_CATEGORIES.forEach((c) => {
      const noise = 1 + rngGaussian(rng, 0, 0.05);
      opexByCategory[c.id] = Math.round(revenue * c.shareOfRevenue * noise);
    });
    const totalOpex = Object.values(opexByCategory).reduce((a, v) => a + v, 0);
    const depreciation = opexByCategory.depreciation;
    const financeCosts = opexByCategory.finance;

    const ebitda = grossProfit - (totalOpex - depreciation - financeCosts);
    const netProfitBeforeTax = grossProfit - totalOpex;
    const corporateTax = Math.max(0, (netProfitBeforeTax - CT_MONTHLY_RELIEF) * CT_RATE);
    const netProfit = netProfitBeforeTax - corporateTax;
    const netMarginPct = revenue ? netProfit / revenue : 0;

    // Output VAT on sales; input VAT recoverable on COGS and non-payroll opex
    // (salaries and depreciation aren't VAT-bearing supplies).
    const vatOutput = Math.round(revenue * VAT_RATE);
    const vatableInputs = costOfGoods + (totalOpex - opexByCategory.staff - depreciation);
    const vatInput = Math.round(vatableInputs * VAT_RATE);
    const vatPayable = vatOutput - vatInput;

    const purchasing = MONTHLY_PURCHASING[t];
    const apProxy = purchasing.totalSpendAED;
    const apPrev = t > 0 ? MONTHLY_PURCHASING[t - 1].totalSpendAED : apProxy;
    const stockNow = STOCK_VALUATION[t].stockValueAED;
    const stockPrev = t > 0 ? STOCK_VALUATION[t - 1].stockValueAED : stockNow;
    const workingCapitalChange = stockNow - stockPrev - (apProxy - apPrev);

    const capex = Math.round(revenue * 0.006);
    fixedAssets = Math.max(230_000, fixedAssets + capex - depreciation);

    const cashChangeRaw = netProfitBeforeTax + depreciation - capex - workingCapitalChange - corporateTax - vatPayable * 0.3;
    const cashBefore = cash;
    cash = Math.max(45_000, cash + cashChangeRaw);
    const cashChange = Math.round(cash - cashBefore);

    return {
      monthKey: sales.monthKey,
      revenue,
      costOfGoods,
      grossProfit,
      grossMarginPct,
      opexByCategory,
      totalOpex,
      depreciation,
      financeCosts,
      ebitda,
      netProfitBeforeTax,
      corporateTax,
      netProfit,
      netMarginPct,
      vatOutput,
      vatInput,
      vatPayable,
      fixedAssets: Math.round(fixedAssets),
      cashChange,
      cashClosing: Math.round(cash),
    };
  });
})();

export function financeRowFor(monthKey: string): MonthlyFinanceRollup {
  return MONTHLY_FINANCE.find((r) => r.monthKey === monthKey)!;
}

export function latestFinance(): MonthlyFinanceRollup {
  return MONTHLY_FINANCE[MONTHLY_FINANCE.length - 1];
}

interface BranchAllocatedRow {
  revenue: number;
  grossProfit: number;
  opexByCategory: Record<string, number>;
  totalOpex: number;
  depreciation: number;
  financeCosts: number;
  ebitda: number;
  netProfitBeforeTax: number;
  corporateTax: number;
  netProfit: number;
  vatPayable: number;
}

/**
 * The single source of truth for "how much of this month's P&L belongs to
 * branch X" — applies the rent multiplier to the rent line specifically
 * rather than scaling every line by a flat revenue share, so a cheap-lease
 * branch's opex (and everything downstream of it) comes out lower, not just
 * proportionally smaller. `branch: "all"` is the identity case. Every
 * branch-aware figure on the Finance page (period totals, the trend, the
 * branch comparison cards) is summed from this one function.
 */
function allocateToBranch(row: MonthlyFinanceRollup, branch: BranchFilter): BranchAllocatedRow {
  if (branch === "all") {
    return {
      revenue: row.revenue,
      grossProfit: row.grossProfit,
      opexByCategory: row.opexByCategory,
      totalOpex: row.totalOpex,
      depreciation: row.depreciation,
      financeCosts: row.financeCosts,
      ebitda: row.ebitda,
      netProfitBeforeTax: row.netProfitBeforeTax,
      corporateTax: row.corporateTax,
      netProfit: row.netProfit,
      vatPayable: row.vatPayable,
    };
  }

  const salesRow = rollupFor(row.monthKey);
  const branchRevenue = salesRow.byBranch[branch] ?? 0;
  const share = salesRow.revenue ? branchRevenue / salesRow.revenue : 0;
  const rentMult = RENT_MULTIPLIER[branch] ?? 1;

  const grossProfit = row.grossProfit * share;
  const opexByCategory: Record<string, number> = {};
  OPEX_CATEGORIES.forEach((c) => {
    const base = row.opexByCategory[c.id] * share;
    opexByCategory[c.id] = c.id === "rent" ? base * rentMult : base;
  });
  const totalOpex = Object.values(opexByCategory).reduce((a, v) => a + v, 0);
  const depreciation = opexByCategory.depreciation;
  const financeCosts = opexByCategory.finance;
  const ebitda = grossProfit - (totalOpex - depreciation - financeCosts);
  const netProfitBeforeTax = grossProfit - totalOpex;
  // Corporate tax is filed at the legal-entity level, not per branch — this
  // pro-rates the entity's actual tax bill by revenue share for a segment
  // view, rather than re-deriving a hypothetical branch-only tax bill.
  const corporateTax = row.corporateTax * share;
  const netProfit = netProfitBeforeTax - corporateTax;
  const vatPayable = row.vatPayable * share;

  return { revenue: branchRevenue, grossProfit, opexByCategory, totalOpex, depreciation, financeCosts, ebitda, netProfitBeforeTax, corporateTax, netProfit, vatPayable };
}

export interface FinancePeriodTotals {
  revenue: number;
  grossProfit: number;
  grossMarginPct: number;
  totalOpex: number;
  opexByCategory: Record<string, number>;
  depreciation: number;
  financeCosts: number;
  ebitda: number;
  netProfitBeforeTax: number;
  corporateTax: number;
  netProfit: number;
  netMarginPct: number;
  vatPayable: number;
}

export function financeTotalsForMonths(months: { key: string }[], branch: BranchFilter): FinancePeriodTotals {
  const allocated = months.map((m) => allocateToBranch(financeRowFor(m.key), branch));

  const revenue = allocated.reduce((a, x) => a + x.revenue, 0);
  const grossProfit = allocated.reduce((a, x) => a + x.grossProfit, 0);
  const totalOpex = allocated.reduce((a, x) => a + x.totalOpex, 0);
  const depreciation = allocated.reduce((a, x) => a + x.depreciation, 0);
  const financeCosts = allocated.reduce((a, x) => a + x.financeCosts, 0);
  const ebitda = allocated.reduce((a, x) => a + x.ebitda, 0);
  const netProfitBeforeTax = allocated.reduce((a, x) => a + x.netProfitBeforeTax, 0);
  const corporateTax = allocated.reduce((a, x) => a + x.corporateTax, 0);
  const netProfit = allocated.reduce((a, x) => a + x.netProfit, 0);
  const vatPayable = allocated.reduce((a, x) => a + x.vatPayable, 0);

  const opexByCategory: Record<string, number> = {};
  OPEX_CATEGORIES.forEach((c) => {
    opexByCategory[c.id] = allocated.reduce((a, x) => a + x.opexByCategory[c.id], 0);
  });

  return {
    revenue,
    grossProfit,
    grossMarginPct: revenue ? grossProfit / revenue : 0,
    totalOpex,
    opexByCategory,
    depreciation,
    financeCosts,
    ebitda,
    netProfitBeforeTax,
    corporateTax,
    netProfit,
    netMarginPct: revenue ? netProfit / revenue : 0,
    vatPayable,
  };
}

export function netProfitTrendYoY(branch: BranchFilter) {
  const trailing = MONTHS.slice(-12);
  return trailing.map((m) => {
    const idx = MONTHS.findIndex((mm) => mm.key === m.key);
    const row = financeRowFor(m.key);
    const priorRow = idx >= 12 ? MONTHLY_FINANCE[idx - 12] : undefined;
    return {
      key: m.key,
      label: m.shortLabel,
      current: Math.round(allocateToBranch(row, branch).netProfit),
      prior: priorRow ? Math.round(allocateToBranch(priorRow, branch).netProfit) : undefined,
    };
  });
}

export function opexCompositionForMonths(months: { key: string }[], branch: BranchFilter) {
  const totals = financeTotalsForMonths(months, branch);
  return OPEX_CATEGORIES.map((c) => ({ key: c.id, label: c.name, value: Math.round(totals.opexByCategory[c.id]) }));
}

export interface ProfitBridgeStep {
  key: string;
  label: string;
  prior: number;
  current: number;
  delta: number;
}

/** Bridges prior-period net profit to current-period net profit through each P&L line, cost lines signed negative so they subtract. */
export function profitBridge(
  months: { key: string }[],
  priorMonths: { key: string }[],
  branch: BranchFilter,
): ProfitBridgeStep[] {
  if (!priorMonths.length) return [];
  const current = financeTotalsForMonths(months, branch);
  const prior = financeTotalsForMonths(priorMonths, branch);

  const rows: { key: string; label: string; prior: number; current: number }[] = [
    { key: "gross-profit", label: "Gross profit", prior: prior.grossProfit, current: current.grossProfit },
    ...OPEX_CATEGORIES.map((c) => ({
      key: c.id,
      label: c.name,
      prior: -prior.opexByCategory[c.id],
      current: -current.opexByCategory[c.id],
    })),
    { key: "tax", label: "UAE corporate tax (9%)", prior: -prior.corporateTax, current: -current.corporateTax },
  ];
  return rows.map((r) => ({ ...r, delta: r.current - r.prior }));
}

export interface CashFlowPoint {
  key: string;
  label: string;
  netChange: number;
  balance: number;
}

export function cashFlowTrend(): CashFlowPoint[] {
  const trailing = MONTHS.slice(-12);
  return trailing.map((m) => {
    const row = financeRowFor(m.key);
    return { key: m.key, label: m.shortLabel, netChange: row.cashChange, balance: row.cashClosing };
  });
}

/** Opex category × month — where cost pressure actually showed up, not just the period snapshot. */
export function opexHeatmapData(monthCount = 8) {
  const trailing = MONTHS.slice(-monthCount);
  const cells = OPEX_CATEGORIES.flatMap((c) =>
    trailing.map((m) => ({ rowKey: c.id, colKey: m.key, value: financeRowFor(m.key).opexByCategory[c.id] })),
  );
  return {
    rows: OPEX_CATEGORIES.map((c) => ({ key: c.id, label: c.name })),
    cols: trailing.map((m) => ({ key: m.key, label: m.shortLabel })),
    cells,
  };
}

export interface BranchFinanceTotals {
  key: string;
  label: string;
  city: string;
  revenue: number;
  grossProfit: number;
  grossMarginPct: number;
  opex: number;
  ebitda: number;
  /** Pre-tax operating contribution — UAE corporate tax is filed at the legal-entity level, not per branch. */
  netProfit: number;
  netMarginPct: number;
}

/** Branch-level P&L, built from the same allocateToBranch used everywhere else on the page — the single source of truth for branch profitability, so the ranked view, the summary table, and the top-level totals never disagree. Net profit here is pre-tax (see BranchFinanceTotals). */
export function branchFinanceForMonths(months: { key: string }[]): BranchFinanceTotals[] {
  return BRANCHES.map((b) => {
    const allocated = months.map((m) => allocateToBranch(financeRowFor(m.key), b.id));
    const revenue = allocated.reduce((a, x) => a + x.revenue, 0);
    const grossProfit = allocated.reduce((a, x) => a + x.grossProfit, 0);
    const opex = allocated.reduce((a, x) => a + x.totalOpex, 0);
    const ebitda = allocated.reduce((a, x) => a + x.ebitda, 0);
    const netProfit = allocated.reduce((a, x) => a + x.netProfitBeforeTax, 0);

    return {
      key: b.id,
      label: b.name,
      city: b.city,
      revenue,
      grossProfit,
      grossMarginPct: revenue ? grossProfit / revenue : 0,
      opex,
      ebitda,
      netProfit,
      netMarginPct: revenue ? netProfit / revenue : 0,
    };
  });
}

export interface BalanceSheetSnapshot {
  cash: number;
  receivables: number;
  inventory: number;
  fixedAssets: number;
  totalAssets: number;
  tradePayables: number;
  vatPayable: number;
  bullionFinancing: number;
  bullionFacilityLimit: number;
  otherCurrentLiabilities: number;
  totalLiabilities: number;
  equity: number;
}

export function balanceSheetSnapshot(): BalanceSheetSnapshot {
  const latest = latestFinance();
  const stock = latestStockValuation();

  const cash = latest.cashClosing;
  // Bottom-up from the same per-customer AR ledger (outstandingAED / AR_AGING) the
  // Dashboard and Customers page read — layaway/installment balances on big-ticket
  // bridal & investment pieces, not e-commerce order debt (LS sells showroom-only).
  const receivables = totalOutstandingAR();
  const inventory = stock.stockValueAED;
  const fixedAssets = latest.fixedAssets;
  const totalAssets = cash + receivables + inventory + fixedAssets;

  const tradePayables = totalOutstandingAP();
  const vatPayable = Math.max(0, Math.round(latest.vatPayable));
  // A meaningful share of bullion stock is financed via consignment / metal-loan facilities rather than owned outright.
  const bullionFinancing = Math.round(inventory * 0.22);
  // Facilities are drawn at a working utilization, not maxed out — the bank keeps headroom priced in.
  const bullionFacilityLimit = Math.round(bullionFinancing / 0.64 / 500_000) * 500_000;
  const otherCurrentLiabilities = Math.round(latest.opexByCategory.staff * 0.5);
  const totalLiabilities = tradePayables + vatPayable + bullionFinancing + otherCurrentLiabilities;

  const equity = totalAssets - totalLiabilities;

  return { cash, receivables, inventory, fixedAssets, totalAssets, tradePayables, vatPayable, bullionFinancing, bullionFacilityLimit, otherCurrentLiabilities, totalLiabilities, equity };
}

export interface JournalEntry {
  id: string;
  date: string;
  type: string;
  description: string;
  account: string;
  amountAED: number;
  direction: "debit" | "credit";
}

/**
 * A handful of realistic journal-voucher-style entries for the latest month —
 * concrete texture on top of the aggregate charts, in the same spirit as
 * LS's real chart-of-accounts / journal-voucher module this page reports on.
 */
export function recentJournalActivity(): JournalEntry[] {
  const latest = latestFinance();
  const anchor = MONTHS[MONTHS.length - 1].date;
  const stockNow = STOCK_VALUATION[STOCK_VALUATION.length - 1].stockValueAED;
  const stockPrev = STOCK_VALUATION[STOCK_VALUATION.length - 2].stockValueAED;
  const revaluation = stockNow - stockPrev;

  return [
    {
      id: "je-sales",
      date: daysBeforeLabel(anchor, 1),
      type: "Sales",
      description: "Daily Z-report settlement, all branches",
      account: "Sales Revenue — Jewellery",
      amountAED: Math.round(latest.revenue / 30),
      direction: "credit",
    },
    {
      id: "je-vat",
      date: daysBeforeLabel(anchor, 3),
      type: "Tax",
      description: "VAT output/input netting entry",
      account: "VAT Payable (FTA)",
      amountAED: Math.round(latest.vatPayable),
      direction: "credit",
    },
    {
      id: "je-payroll",
      date: daysBeforeLabel(anchor, 5),
      type: "Payroll",
      description: "Salary & commission run",
      account: "Staff Salaries & Commissions",
      amountAED: Math.round(latest.opexByCategory.staff),
      direction: "debit",
    },
    {
      id: "je-bullion-interest",
      date: daysBeforeLabel(anchor, 6),
      type: "Financing",
      description: "Bullion financing facility — interest accrual",
      account: "Bullion Financing & Bank Charges",
      amountAED: Math.round(latest.financeCosts),
      direction: "debit",
    },
    {
      id: "je-supplier",
      date: daysBeforeLabel(anchor, 8),
      type: "Purchase",
      description: "Supplier payment — bullion trade creditor",
      account: "Trade Payables",
      amountAED: Math.round(totalOutstandingAP() * 0.15),
      direction: "debit",
    },
    {
      id: "je-revaluation",
      date: daysBeforeLabel(anchor, 9),
      type: "Revaluation",
      description: "Gold price mark-to-market on consigned stock",
      account: "Inventory — Metal Revaluation Reserve",
      amountAED: Math.round(Math.abs(revaluation)),
      direction: revaluation >= 0 ? "credit" : "debit",
    },
  ];
}
