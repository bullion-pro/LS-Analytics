# Aurify CRM — Reference Analysis for LS Analytics

> **Purpose of this doc**: a from-scratch, deep analysis of the `CRM/` reference codebase
> (the "Aurify" CRM/ERP that runs Luxury Shoppe's operations), written so any future session
> working on LS Analytics can understand the business domain and data model without
> re-reading the CRM source. CRM is **read-only reference** — see root `CLAUDE.md` for the
> working agreement. This doc should be treated as living documentation: update it if CRM's
> schema changes in ways that affect analytics assumptions.
>
> Last generated: 2026-09-23, by deep-reading `apps/server/prisma/schema/*.prisma` (~25
> files), all backend modules, all frontend features, the reports/dashboard modules
> specifically, auth/RBAC, and multi-currency handling.

---

## 1. What Aurify CRM is

A multi-tenant CRM/ERP for **Luxury Shoppe**, a luxury jewelry retail & wholesale business.
Stack: Node/Express + Prisma (PostgreSQL) backend in `apps/server`, React 19 + Vite + Chakra
UI frontend in `apps/client`, monorepo-shared `packages/schemas` (Zod) and
`packages/constants`.

Backend modules follow a clean/hexagonal layout per module:
`domain/interfaces` (repo contracts) → `infrastructure/repositories` (Prisma impls) →
`application/services` (business logic) → `presentation/controllers|routes`.

**Two Prisma client exports** (`apps/server/src/lib/prisma.ts`) — worth knowing before any
LS Analytics service queries this same database or a replica of it:
- `prisma` (default) — **globally omits `User.password`**, and auto-injects
  `where: { isDeleted: false }` on find/count/aggregate, but **only for `User`, `Contact`,
  `CrmAccount`, `Opportunity`**. Every other soft-deletable model (Supplier, Customer,
  Product, PurchaseOrder, etc.) is **not** auto-filtered by this extension.
- `prismaWithPassword` — auth-only, includes password.

**Implication for LS Analytics**: soft delete is not enforced by Postgres itself. Any raw
SQL / BI queries against this data must explicitly filter `isDeleted = false` (or
`deletedAt IS NULL`, field name varies by model) per model, or risk counting deleted rows.

---

## 2. Multi-tenancy & auth model

**Hierarchy**: `OrganizationMaster` (SaaS tenant/company) → `Branch` (physical store
location — the actual operative scope for most data) → `User` (assigned to branches via
`UserBranch` many-to-many).

- Nearly every transactional/master table carries both `organizationId` and `branchId`.
  **Rule of thumb for LS Analytics: always filter by `organizationId` at minimum, and by
  `branchId` wherever the model has it as a required (non-null) field.** A few tables (e.g.
  stone sub-masters) treat `branchId` as optional/tracking-only since they're shared
  org-level masters.
- `OrganizationConfiguration` (1:1 per org) holds tenant-wide settings: module toggles
  (`crmEnabled`, `kycEnabled`, `refineryEnabled`), `baseCurrencyId`, `financialYearStartMonth`,
  `goldOzConversionRateAED` (jewelry-specific).
- `BranchConfiguration` (1:1 per branch) holds branch-level trading settings: `margin`,
  `bidSpread`/`askSpread` (bullion/FX-style pricing spreads), `defaultPurchase`/`defaultSale`
  (`FIX`/`UNFIX` — gold-rate-linked pricing mode), `allowNegativeStock`, `enableVAT`, etc.

**Auth**: JWT access token (short-lived) carries
`{id, email, name, systemRole, organizationId, role, branchId}`; refresh token (7 days,
HTTP-only cookie) with rotation via the `Session` model (server-side revocation, since JWTs
alone can't be revoked). **Two-step login**: sign in → user picks a branch from their
assigned `UserBranch` list → server re-issues an access token with `branchId` populated.
Every request after that is scoped by `(organizationId, branchId)` straight from the JWT.

**RBAC** (module + action based, confirmed via `middlewares/requirePermission.ts`):
- `requirePermission(module: string, action: "view"|"add"|"edit"|"delete"|"approve")`, e.g.
  `requirePermission("REPORTS_PROFIT_AND_LOSS", "view")`.
- Bypassed entirely by `systemRole === "SUPER_ADMIN"` (platform dev) or `role === "ADMIN"`
  (org owner).
- Otherwise resolved from **`RolePermission`** — keyed by `(organizationId, role, module)`
  where `role` is a `CustomRole` id — holding a `permissions` Json blob
  `{view, add, edit, delete, approve}`.
- **`UserPermission`** allows a per-user override on top of the role's `RolePermission`.
- **For LS Analytics**: plan its own module-key strings (e.g. `ANALYTICS_DASHBOARD`,
  `ANALYTICS_SALES`) and either read these same `RolePermission`/`UserPermission` tables
  directly, or call CRM's `/permissions` API, to stay consistent with each org's existing
  role setup rather than inventing a parallel permission system.
- Note: `apps/server/src/AUTHENTICATION.md` describes an older, simpler role model
  (`ADMIN|MANAGER|MODERATOR|SALES_MAN` enum) that appears superseded — treat
  `docs/prathyu/authentication-complete-guide.md` and
  `docs/prathyu/rbac-implementation-guide.md` as the current, authoritative references.

---

## 3. Data model — by domain

This is the backbone LS Analytics will query. Grouped by business domain, not by file, since
that's more useful for report-building. Field lists focus on FKs, enums, money/quantity
fields, and anything with reporting significance — not exhaustive column-by-column.

### 3.1 Core financial ledger (the accounting backbone)

Everything financial ultimately posts here — **this is the source of truth for P&L, Balance
Sheet, Trial Balance, and General Ledger.**

- **`AccountGroup`** — chart-of-accounts tree, `accountType` enum
  `ASSET | EXPENSE | INCOME | LIABILITY | EQUITY`, self-referential parent/children.
- **`Account`** — leaf ledger account, FK to `AccountGroup`, optionally auto-linked to a
  `Supplier` or `Customer` (their AP/AR sub-ledger account).
- **`AccountingConfig`** — one row per org; holds the org's default GL-group mapping (which
  group new bank/cash/inventory-asset/AR/AP/income/expense postings land in) — read by every
  module's auto-journal-posting code.
- **`AccountTransaction`** — voucher header: `voucherNumber`, `voucherDate`, polymorphic
  `referenceType`/`referenceId` (e.g. `"PURCHASE_INVOICE"` + its id), `totalAmount`.
- **`AccountTransactionEntry`** — **the canonical GL line table**: one row per debit/credit,
  FK `accountId`, `debit`/`credit` Decimal(15,2). Every P&L/Balance Sheet/Trial
  Balance/General Ledger report is built by aggregating this table.
- Every transactional module posts here via its own service
  (`postSalesJournal`, `postInvoiceJournal`, `postSupplierPaymentJournal`,
  `expenseEntryJournal`) — so `AccountTransactionEntry` is always in sync with
  Sales/Purchase/Payment/Expense activity.
- **`ExpenseEntry`** / **`ExpenseEntryItem`** — manual expense vouchers (cash/transfer/cheque),
  1:1 linked to their posted `AccountTransaction`.
- **`VatMaster`** — `rate` Decimal(5,2), `isDefault` (one per org), FK to input/output
  `Account` for VAT journal posting. **VAT rate is snapshotted** onto
  `SalesInvoice.vatRate`/`SalesInvoiceItem.vatRate` at sale time — historical invoices stay
  correct even if the org's rate changes later.

### 3.2 Sales (POS billing)

- **`SalesInvoice`** — `invoiceNumber` per org, `status` (`DRAFT`/`COMPLETED`, plus reserved
  `CANCELLED`/`RETURNED`). **Customer is a denormalized snapshot**
  (`customerId`/`customerName`/`customerCode`, no FK relation). `salesmanId` is also loose
  (no FK). Money fields: `grossAmount` (Σ unitPrice×qty pre-discount, ex-VAT),
  `totalDiscount`, `vatRate`/`totalVat`, `netAmount` (VAT-inclusive customer payable),
  `paidAmount`/`balanceAmount`, `paymentStatus` (`UNPAID`/`PARTIAL`/`PAID`).
  - **Gotcha**: header `discountType`/`discountValue` are captured but **not applied** to
    totals — discount is line-level only.
  - **Gotcha (currency)**: `SalesInvoice` has **no** `exchangeRate` or
    `...InBaseCurrency` fields (unlike Purchase-side docs — see §3.4). It only has a plain
    `itemCurrency` string. **Treat all SalesInvoice amounts as already in the branch's
    operating/base currency** — there is no multi-currency retail checkout modeled today.
- **`SalesInvoiceItem`** — per-line product snapshot, `originalUnitPrice` vs `unitPrice`
  (staff-applied discount, floored at `product.minPrice`), `lineTotal` (ex-VAT, post-discount
  — **this is the realized-sale-value figure reports should sum**), `vatAmount`.
- **`SalesInvoicePayment`** — split-tender rows (`CASH`/`CARD`/`BANK`/`CHEQUE`).
- **`SalesInvoiceSequence`** — per-org-per-year atomic invoice-number counter.
- **On `COMPLETED`**: decrements `Product.quantity`, writes a `StockLedger` OUT entry, posts a
  `CustomerFinancialEntry` (SALE debit, + PAYMENT credit if paid at checkout), posts the
  journal.

### 3.3 Customers (CRM used by Sales — "Luxury Shoppy" customer master)

Distinct from the legacy `Contact`/`CrmAccount` system in §3.7 — **this is the model
`SalesInvoice` snapshots from**.

- **`Customer`** — `customerCode`, `customerType` (`INDIVIDUAL`/`CORPORATE`/`VIP`/`VVIP`),
  `status` (`ACTIVE`/`INACTIVE`/`BLACKLISTED`), `outstandingAmount` (denormalized receivables
  rollup, kept in sync from `CustomerFinancialEntry`), `salesmanId` (loose FK), demographics.
- **`CustomerPreferences`** (1:1) — jewelry-specific taste profile: preferred jewellery
  type/metal/stone/budget/brand, favorite collections.
- **`CustomerFinancialEntry`** — **the customer AR ledger**: `entryType` enum
  `SALE | PAYMENT | RETURN | ADJUSTMENT | ADVANCE | CREDIT_NOTE`, `debit`/`credit`/
  `runningBalance`. **Primary source for customer-level AR / aging analytics.**
- `Customer.accounts` → auto-created receivable sub-ledger `Account` rows.

### 3.4 Supply chain (procurement)

Purchase Order → GRN → Purchase Invoice → Supplier Payment, each with its own status
lifecycle and, notably, **dual-currency amounts** (unlike Sales — see §3.2 gotcha and §5).

- **`PurchaseOrder`** — `poNumber`, real FK to `Supplier`, `supplierCurrency`+`exchangeRate`
  snapshot, documented status lifecycle: `DRAFT → PENDING_APPROVAL → APPROVED →
  SENT_TO_SUPPLIER → PARTIALLY_RECEIVED → FULLY_RECEIVED → CLOSED/CANCELLED`. Totals stored
  in **both** supplier currency and base-currency-equivalent.
  - **`PurchaseOrderItem`** — hard FK to `Product` — creating a PO actually creates/validates
    `Product` master rows.
  - **`PurchaseOrderApproval`** — multi-step approval workflow (`MANAGER`/`PURCHASE_HEAD`).
  - **`PurchaseOrderStatusHistory`** — append-only status-transition audit, useful for
    procurement cycle-time analytics.
- **`GoodsReceiptNote` (GRN)** — `purchaseOrderId` is **unique** (exactly 1 GRN per PO).
  Rollups: ordered vs received quantity/weight/totals. **Important: GRN does NOT touch
  `Product.quantity` or `StockLedger`** — stock only moves when the downstream
  `PurchaseInvoice` is posted.
- **`PurchaseInvoice`** — `grnId` **unique** (1:1 from GRN, so exactly 1 invoice per GRN),
  supplier is a **denormalized snapshot** (no FK, matching the GRN pattern),
  `exchangeRate` Decimal(12,6) snapshotted at creation. **Dual-currency rollups**: supplier-
  currency totals (`totalAmount`, `totalVat`, `netAmount`, `paidAmount`, `balanceDue`, …)
  **and** base-currency equivalents (`totalAmountInBaseCurrency`, `netAmountInBaseCurrency`,
  `paidAmountInBaseCurrency`, `balanceDueInBaseCurrency`, …). **This is the pattern LS
  Analytics should mirror for any FX-correct financial reporting.**
  - **On POSTED**: creates `StockLedger` IN entries, increments `Product.quantity`, posts the
    purchase journal.
- **`SupplierPayment`** — `paymentAmount` + `paymentAmountInBaseCurrency`.
  **`SupplierPaymentAllocation`** — many-to-many between a payment and the invoice(s) it
  settles, each with its own base-currency-equivalent — models split/partial payments across
  multiple invoices.

### 3.5 Suppliers

Rich "supplier 360" model, structurally parallel to Customer:

- **`Supplier`** (table `erp_supplier`) — `supplierCode`, `status`
  (`ACTIVE`/`INACTIVE`/`BLACKLISTED`), `preferredCurrency`, `paymentTerms`, `creditLimit`,
  denormalized `supplierRating`/`outstandingAmount`/`lastPurchaseAt`.
- Notable children: `SupplierJewelleryProfile` (metal types/purities, diamond cert agency,
  making-charges structure), `SupplierCompliance` (Kimberley Process etc.), `SupplierRating`
  (weighted quality/delivery/cost/communication/compliance scores), `SupplierProduct`
  (last purchase price / running average cost per product), **`SupplierFinancialEntry`** (the
  AP ledger — mirrors `CustomerFinancialEntry`, **primary source for supplier AP aging**),
  `SupplierQualityRecord` (GRN inspection results: accepted/rejected items, defect %,
  on-time delivery rate), `SupplierConsignmentReceipt` (consignment stock tracking).

### 3.6 Product & inventory

- Master lookups (org-scoped): `ProductDivision` (Jewellery/Bags/Perfume/Watches),
  `ProductCategory` (self-referencing tree, up to 5 levels), `ProductType`, `Brand`,
  `MetalMaster` (`metalType`, `purity`), `ChargeType`
  (`applicableTo`: PURCHASE/SALE/BOTH), `Certification`, `Unit`, `ProductStatus`.
- **`Product`** — the core inventory item. `sku`, `status`
  (`DRAFT`/`IN_STOCK`/`SOLD`/`ARCHIVED`), `creationSource` (`MANUAL`/`PO`), pricing
  (`sellingPrice`/`costPrice`/`minPrice`/`maxPrice`/`wholesalePrice`/`retailPrice`),
  **`quantity`** (the live stock counter — incremented on PurchaseInvoice POSTED, decremented
  on SalesInvoice COMPLETED), aggregated weights (`totalMetalWeight`/`totalStoneWeight`/
  `totalGrossWeight`). Required `branchId` — one product exists at exactly one branch.
- **`ProductComponent`** — BOM-style line, discriminated by `componentType`
  (`METAL`/`STONE`/`CHARGES`): METAL carries `metalMasterId`/`pureWeight`/`purity`
  (snapshotted)/`rate`/`makingCharges`; STONE carries `stoneId`/`quantity`; CHARGES carries
  `chargeTypeId`.
- **`Stone`** — large gemstone/loose-stone record (`stoneType`:
  `LOOSE_STONE`/`JEWELLERY_COMPONENT`, optional `linkedProductId`), spanning classification,
  origin, weight, cut, color, clarity, fluorescence, treatments, certification, pearl-specific
  fields, and pricing/inventory fields. FKs into **26 near-identical lookup tables** (
  `StoneSection`, `StoneTypeMaster`, `StoneShape`, `StoneGrade`, `StoneColorGrade`,
  `StoneClarityGrade`, `StoneLab`, `StoneStockStatus`, etc.) — useful as dimension tables for
  jewelry-specific analytics (e.g. sales by stone type/clarity/lab).

### 3.7 Legacy/parallel CRM (contacts, accounts, pipeline)

A **separate system from `Customer`** (explicitly noted in the schema as not linked to the
newer Customer model) — covers relationship management and sales pipeline, not billing.

- **`Contact`** — person record. `contactTier` (`VIP`/`PREMIUM`/`STANDARD`), **`status`**
  enum `CrmStatus` — a 10-stage lifecycle funnel from `NEW_INQUIRER` through to
  `VIC`/`V_VIC`/`DISENGAGED`/`DORMANT` (analytics-relevant: funnel-stage distribution,
  time-in-stage). `leadSource` enum (`WALK_IN`/`REFERRAL`/`INSTAGRAM`/`FACEBOOK`/`WHATSAPP`/
  `WEBSITE`/`EXHIBITION`/`COLD_CALL`), `isLead`/`leadConvertedAt`.
- **`CrmAccount`** — company/account record, `crmAccountType`
  (`STRATEGIC_PARTNER`/`WHOLESALE_DEALER`/`RETAIL_CUSTOMER`/`SUPPLIER`/
  `FAMILY_OFFICE_TRUST`), `crmAccountTier` (`TIER_1`/`2`/`3`), same `CrmStatus` funnel.
- **`Opportunity`** — sales pipeline deal, `value`, `status`
  (`OPEN`/`WON`/`LOST`), `stage` enum
  (`INITIAL`/`PROPOSAL`/`NEGOTIATION`/`ON_HOLD`/`CLOSED_WON`/`CLOSED_LOST`),
  `expectedCloseDate`/`closedAt`. **A pipeline/funnel analytics goldmine** — deal value by
  stage, win rate, sales-cycle length — entirely separate from the transactional
  `SalesInvoice`.
- **`OpportunityHistory`** — append-only stage/status transition audit (funnel/conversion-time
  analytics). **`OpportunityCommunication`** — activity timeline with sentiment tagging.
- **`SpecialDate`** — birthdays/anniversaries (polymorphic owner Contact|CrmAccount) — useful
  for engagement-campaign timing analytics.

### 3.8 WhatsApp / social (marketing & engagement)

- **`WhatsappContact` → `WhatsappConversation` → `WhatsappMessage`** — full WhatsApp Cloud API
  integration, including Meta per-message pricing fields (`pricingCategory`/`billable`).
- **`WaBroadcast`/`WaBroadcastRecipient`** — campaign broadcasts with denormalized progress
  counters (`sentCount`/`deliveredCount`/`readCount`/`failedCount`).
- **`WaChatFlow`** and friends — visual chatbot flow builder + execution logs.
- **`SocialAccount`/`FacebookPage`/`InstagramBusinessAccount`/`SocialPost`** — Meta OAuth +
  synced post metrics (likes/comments/shares).
- Relevant to LS Analytics only for **marketing/engagement KPIs** (message volume, delivery
  rates, broadcast performance) — not financial.

### 3.9 Inventory movement ledger

- **`StockLedger`** (voucher header) / **`StockLedgerDetail`** (per-product movement,
  `inStock`/`outStock` — one is always 0) — **the canonical inventory movement ledger**.
  Indexed on `[organizationId, voucherDate]` specifically to serve point-in-time stock
  reporting. Any "stock as of date X" report is built by replaying this table.

### 3.10 Currency

- **`Currency`** — org-scoped, one currency per org flagged as base
  (`OrganizationConfiguration.baseCurrencyId`).
- **`CurrencyRate`** — **append-only** history (a new row per rate change, never an
  update-in-place), `conversionRate`/`minRate`/`maxRate`/`effectiveDate`. "Current rate" =
  the row with the latest `effectiveDate` for that currency.
- **Bootstrap rule**: the first currency created for an org must have `conversionRate = 1.00`
  and becomes the base currency; every subsequent currency must supply its own rate and is
  forbidden from using `1.00`.
- See §5 for how this plays out across Sales vs Purchase documents.

### 3.11 Misc supporting tables

- **`AuditLog`** — single append-only table shared by every module
  (`module` enum spans ACCOUNTING/AUTH/CRM/CUSTOMER/GRN/INVENTORY/ORGANIZATION/PRODUCT/
  PURCHASE_ORDER/PURCHASE_INVOICE/SALES_INVOICE/SALESMAN/SUPPLIER), indexed by
  org/module/entity/performer/branch — a ready-made source for "who did what when"
  activity-feed style analytics.
- **`Salesman`** — optionally linked to a `User`. Referenced loosely (no FK) from
  `Customer.salesmanId` and `SalesInvoice.salesmanId` — the key dimension for
  salesperson-level sales analytics.
- **`*CodeCounter`** tables (`UserCodeCounter`, `ProductCodeCounter`,
  `ExpenseEntryCodeCounter`, `JournalEntryCodeCounter`, etc.) — atomic per-org counters
  backing human-readable document codes. Not analytics-relevant, just explains the ID scheme.
- **`ImportUpload`/`ImportJob`/`ImportMutation`** — bulk import engine with per-row
  before/after snapshots and revert support. Explains data provenance for import-heavy
  tenants; not itself an analytics source.

---

## 4. What CRM already reports today (the gap LS Analytics fills)

### 4.1 Dashboard (`modules/dashboard`) — the *only* dashboard today

One endpoint, `GET /dashboard/summary`, computing a **current-ISO-week vs last-ISO-week**
comparison (Mon–Sun, UTC), scoped by `(organizationId, branchId)`, `status = COMPLETED`,
`isDeleted = false`:

1. **Stat cards**: total sales count, total revenue (Σ `SalesInvoiceItem.lineTotal`), total
   distinct customers, total in-stock products — each vs. last week.
2. **Category chart**: this week's revenue by product category (raw SQL join
   `sales_invoice_items → sales_invoices → products → product_categories`).
3. **Revenue chart**: this week vs last week, by day-of-week.
4. **Recent sales**: last 5 completed invoices.

**No monthly/yearly/custom-range option. No purchase-side KPIs. No AR/AP aging. No stock
valuation. No salesman leaderboard. No multi-branch/multi-org rollup.** This is a thin,
sales-only, week-scoped snapshot — everything beyond it is open ground for LS Analytics.

### 4.2 Reports module (`modules/reports`) — 8 formal reports

Each is `GET /api/reports/<name>` (+ PDF export, and Excel for two of them), gated by
`requirePermission("REPORTS_<NAME>", "view")`:

1. **Profit and Loss** — INCOME/EXPENSE rollup from `AccountTransactionEntry` via
   `AccountGroup.accountType`.
2. **Balance Sheet** — ASSET/LIABILITY/EQUITY rollup, as-of date.
3. **Transaction Detail** — line-level GL transaction listing.
4. **Trial Balance** — debit/credit balance per account.
5. **General Ledger** — per-account transaction history with running balance.
6. **Stock Balance** (+ Excel export) — **3 modes**: `live` (current `Product.quantity`),
   `asOf` (historical, reconstructed by replaying `StockLedgerDetail` before a cutoff date),
   `range` (opening balance + movements over a date range). Filterable by branch/category/
   search, paginated. **This ledger-replay pattern is directly reusable** for any LS
   Analytics point-in-time inventory valuation feature.
7. **Sales Analysis** (+ Excel export) — same 3-mode period logic (`range`/`asOf`/`all`),
   product-level sales performance.
8. **Journal Report** — listing of posted vouchers across modules.

### 4.3 Purchase Report — lives outside the reports module

`modules/product/application/services/purchase-report.service.ts` — a dedicated procurement
analytics report implemented *inside the product module* rather than the central reports
module. Worth reviewing directly if LS Analytics needs procurement KPIs, since CRM's own team
already identified this need but solved it locally rather than centrally.

### 4.4 What this means for LS Analytics scope

Clear whitespace the CRM does **not** cover today, which LS Analytics should own:
- Cross-branch and cross-organization rollups
- AR aging (from `CustomerFinancialEntry`) and AP aging (from `SupplierFinancialEntry`)
- Margin/profitability analysis by category, division, metal, or stone attribute
- Gold/stone price-sensitivity analysis (leveraging `goldOzConversionRateAED`,
  `bidSpread`/`askSpread`, metal purity data)
- Supplier performance dashboards (from `SupplierRating`/`SupplierQualityRecord`)
- CRM pipeline/funnel analytics (from `Opportunity`/`OpportunityHistory`/`CrmStatus`)
- Salesman leaderboards (`Salesman` × `SalesInvoice`)
- WhatsApp/social engagement analytics
- Any time horizon beyond "this week vs last week"

Reusable **design precedents** worth following for consistency with the CRM's own
conventions: the `live`/`asOf`/`range` period-resolution pattern, the dual-currency
(foreign + `...InBaseCurrency`) storage pattern, and snapshot-at-transaction-time for
VAT rate and exchange rate.

---

## 5. Currency handling — read this before building any financial report

- One currency per org is base (`OrganizationConfiguration.baseCurrencyId`); `CurrencyRate`
  is append-only history, so "current rate" = latest `effectiveDate` row per currency.
- **Purchase-side documents** (`PurchaseOrder`, `PurchaseInvoice`, `SupplierPayment`/
  `SupplierPaymentAllocation`) snapshot `exchangeRate` at creation and store **both** the
  foreign-currency amount and a computed `...InBaseCurrency` amount.
  **Use the stored `...InBaseCurrency` fields directly — don't re-derive them from
  `exchangeRate × amount`,** since the stored fields are the audited, as-computed values.
- **Sales-side documents** (`SalesInvoice`) have **no** exchange rate or base-currency-
  equivalent fields — only a plain `itemCurrency` string. **Treat SalesInvoice amounts as
  already in the branch's operating currency.**
- VAT rate is snapshotted the same way (not FX, but same "capture at transaction time"
  principle) onto `SalesInvoice.vatRate`/`SalesInvoiceItem.vatRate`.

---

## 6. Backend module → purpose (quick reference)

| Module | Purpose |
|---|---|
| `accounting` | Chart of Accounts, Bank/BankAccount masters, AccountingConfig, ExpenseEntry, manual Journal Vouchers, voucher→GL drill-down (audit trail controllers) |
| `auth` | signin/signout/refresh/select-branch/permissions — see §2 |
| `currency` | Currency + CurrencyRate CRUD, base-currency bootstrap |
| `custom-fields` | Generic EAV (currently PRODUCT entity type only) |
| `customer` | Customer master CRUD (the Sales-facing customer model) |
| `dashboard` | The one home-dashboard endpoint — see §4.1 |
| `flow-engine` | Domain-agnostic graph engine for WhatsApp chat flows (not analytics-relevant) |
| `grn` | GRN CRUD/posting against a PO |
| `organization` | Org profile, Branch CRUD, Department/Designation, CustomRole + RolePermission, user management — the biggest module |
| `product` | Product CRUD + all master lookups + Stone + BOM (ProductComponent) + Purchase Report + barcode lookup |
| `purchase-invoice` | PurchaseInvoice CRUD/posting (stock-in + journal + PDF) |
| `purchase-order` | PurchaseOrder CRUD + approval workflow + status history + Excel/packing-list import |
| `receipt-settings` | Per-branch printed receipt header/footer overrides |
| `reports` | The 8 formal reports — see §4.2 |
| `sales` | SalesInvoice CRUD/completion (stock-out + AR posting + journal) |
| `salesman` | Salesman master CRUD |
| `supplier` | Supplier 360 CRUD (all sub-entities) + SupplierTemplate |
| `supplier-payment` | SupplierPayment CRUD + allocation to invoices + journal |
| `vat` | VatMaster CRUD, default-rate management |

## 7. Frontend feature → purpose (quick reference)

Mirrors backend modules closely (1:1 naming in most cases). Notable ones:

| Feature dir | Purpose |
|---|---|
| `crm-module` | Legacy CRM UI: accounts, contacts, opportunities (kanban `StageDrawer`), communications, tasks, bulk data-import wizard, visual flow-builder, WhatsApp broadcasts/templates |
| `dashboard` | Home dashboard — `StatCards`, `RevenueInsightsChart`, `SalesByCategoryChart`, `RecentSalesTable`, plus a `DashboardDock`/`DashboardNavbar` (possibly a customizable widget dock — worth checking if it supports user-added widgets) |
| `reports` | Mirrors the 8 backend reports 1:1: `account-reports/{balance-sheet,general-ledger,journal-report,profit-and-loss,transaction-detail,trial-balance}` + `sales-analysis/` + `stock-balance/`, plus a `shared/` folder for common report chrome |
| `product-module` | All product masters + `purchase-report` (frontend for §4.3) + stone config/master |
| `account-module` | Full accounting UI: chart-of-accounts, journal-voucher, expense-entry, bank masters |
| `supplier`, `supplier-payment`, `customer` | Entity 360 + payment/allocation UI |

---

## 8. Key CRM internal docs worth pointing future sessions to

These already exist under `CRM/docs/prathyu/` — don't duplicate their content here, just
know they exist:

| Doc | Covers |
|---|---|
| `GRN_Module_Documentation.md` | Canonical GRN lifecycle/data-model/API reference |
| `Product_Module_Documentation.md` | End-to-end Product module design (masters, BOM, Stone integration) |
| `Journal Entry.md` | Journal Voucher vs Expense Entry conceptual explainer, worked example |
| `product-category-master.md` | ProductCategory self-referencing tree design |
| `code-generation-counter-table-approach.md` | Why the `*CodeCounter` pattern exists |
| `authentication-complete-guide.md` | Current, authoritative auth flow (supersedes `AUTHENTICATION.md`) |
| `rbac-implementation-guide.md` | Authoritative, code-level RBAC guide (1294 lines) |
| `backend-performance-optimization-guide.md` | DB indexing / API perf practices — relevant if LS Analytics queries the same Postgres instance |
| `s3-guide.md` | File-upload architecture (temp-path → BullMQ move-to-permanent pattern) |
| `ssession-handling.md` | Single-session-enforcement design on top of the `Session` model |

---

## 9. Visual / design reference (from live UAT screenshots)

> Source: `uat.lux-shop.ai` (UAT env), screenshots shared by the user in-conversation, not
> from repo source. This section is a **living log** — append to it as more pages are
> reviewed, don't replace it. Goal: give any future session enough visual vocabulary to judge
> "does this look like the CRM's quality floor" without needing the screenshots themselves.
> Per root `CLAUDE.md`, LS Analytics must read as a **tier above** this, not a reskin of it.

### 9.1 Pages reviewed so far

1. Main ERP dashboard (`/dashboard`) — home/sales snapshot
2. CRM module dashboard, "Organisation" tab (`/crm-module`)
3. CRM module dashboard, "Lead" tab (`/crm-module`)
4. Reports → General Ledger (`/reports/account/general-ledger`)
5. Masters → Account Group / Chart of Accounts tree
6. Masters → Products → Product Configuration (Division tab, Product Type tab)
7. Sales → Estimation (empty) + Sales nav flyout
8. Purchase → Purchase Invoices list (populated, 2 rows) + Purchase nav flyout
9. Purchase → Consignment Dashboard (populated w/ zero-value stats) + Consignment nav flyout
10. Purchase → Consignment Order (empty, illustrated empty state)
11. CRM-module → Customers list (empty) + Products nav flyout (shown mid-transition)
12. CRM-module → Opportunities (empty, kanban/table view toggle visible)
13. CRM-module → Communication (empty)
14. CRM-module Reports → Sales Pipeline (empty, date-range report)
15. Social Media Dashboard — **unbuilt placeholder**
16. Social Media Management nav flyout (Dashboard / Social Feeds / WhatsApp)

### 9.2 Cross-cutting design language (consistent across pages)

- **Single accent color, used deliberately**: teal (`#00A08F`-range, matches CLAUDE.md's
  documented brand color) is reserved for: active nav/tab state, primary CTA buttons
  ("Export PDF", "Add Account Group"), the active side of segmented toggles
  ("Local Currency" selected), entity-name links inside tables, chart "current period"
  legend dots, and gauge/progress fill. Everything else stays black/white/gray. This
  restraint is a big part of why it reads premium — worth holding to strictly.
- **Page headers get a brand-tinted treatment**: report/master page titles ("General
  Ledger", "Account Group") render in a bold dark teal-navy, not plain black — a subtle
  brand touch that plain dashboard greetings ("Hi, Head Office...") don't use. Inconsistent
  today, but the tinted-header idea itself is worth adopting deliberately and consistently.
- **Buttons**: solid teal pill for primary/create actions, outline gray pill for secondary
  (Filter, Expand All/Collapse All, icon-only refresh). Fully rounded (pill), not
  rounded-rect.
- **Table pattern — two-line entity cell**: primary entity name in teal (implies
  drill-down/clickability) with a gray caption line underneath (code + type/category) —
  seen identically in both General Ledger (`Import Supplier` / `AP002 · LIABILITY`) and
  Account Group (`Current Asset` / row grouped under `ASSET`). This is a strong, reusable
  pattern for any LS Analytics table showing GL accounts, products, or similar coded
  entities.
- **Filter bars**: consistently a single horizontal row combining (in order) a date-range
  picker, an entity/branch dropdown, an optional segmented toggle (e.g.
  Local/Foreign Currency), a search input, and a catch-all "Filter" button. Dense but never
  cramped — generous input height and spacing keep it from feeling like a form.
  Report-export actions (Export PDF, refresh) live top-right of the page header, separate
  from the filter row.
  - Hierarchical/tree tables (Account Group) add `Expand All`/`Collapse All` controls next
    to search, and a `>` chevron on rows that have children with indentation for depth.
- **Empty states are considered, not blank**: "No sales this week", "No leads lost this
  month", "0 leads entered the funnel" — always a specific sentence, never just an empty
  chart with nothing else.
- **Sidebar**: `LS` wordmark logo fixed top-left; icon-only rail (no text labels); a
  support/help bubble and a module-switcher bubble (e.g. "CRM") pinned at the very bottom;
  build/version tag (`v1.1.0 · UAT`) beneath that. The rail's exact treatment (dark filled
  circle for the active section vs. plain outline icons) varies slightly by module — see
  inconsistency note below.

### 9.3 Component patterns worth reusing conceptually

- **Segmented pill nav for module sub-sections** (CRM dashboard's
  Organisation/Lead/Opportunity/Task/Executive VIP/Sale Orders/Brand Orders row) — solid
  black active pill, plain gray text for inactive, refresh icon in its own teal-outlined
  square at the row's end. Confident, clear current-section indicator.
- **Funnel-as-stacked-rows** (Lead Funnel panel): each stage is a row with an icon, label,
  right-aligned count + "% of Leads", a full-width progress-bar track showing fill %, and a
  caption line below it — `"X% advanced · Y dropped off"` (dropped-off count in red). This
  inline attrition callout is a genuinely good pattern for any conversion-funnel widget LS
  Analytics builds (e.g. Opportunity stage funnel, import success funnel).
  Header caption gives dated scope: `"0 leads entered the funnel · Sep 2026"`.
  Also: the "Unassigned Leads" stat card gets a distinct teal border outline vs. the other
  six plain cards in the same row — a lightweight way to flag one metric as needing
  attention/action without breaking the grid.
- **Target-vs-achieved bar** (Revenue Target, seen in earlier Organisation-tab dashboard):
  big achieved figure left / target figure right, a caption line ("69.9% of target"), an
  amber "remaining" callout, then a horizontal bar with a **marker flag dropped at the
  target point** (not just a plain fill) — clearer than a generic progress bar because you
  can see both current progress and exactly where the goal line sits.
- **Radial gauge for a count-based (not %) target** (Lead Generation Target): thick teal
  ring on a light teal track, centered "PROGRESS" label + raw number. Good alternative to
  the bar pattern when a single number matters more than a ratio.

### 9.4 Inconsistencies observed — do NOT inherit these, pick one grammar and hold it

CRM's stat cards alone have **at least three different grammars** across the pages seen:
1. Main dashboard: colored icon-chip + label + big number + "Last Week: X" (bottom-left) +
   %Δ pill (top-right).
2. Organisation tab: plain line icon + label (all-caps) + big number + "Last Month: X"
   (bottom-**right** this time) + %Δ pill.
3. Lead tab: **no icon at all**, plain label + number, no comparison baseline on the main 7
   cards — but the two smaller adjacent cards (Today's/This Week's Leads) *do* get a %Δ
   pill + "vs yesterday"/"vs last week" caption, closer to grammar #1's shape but still
   icon-less.

None of these agree on icon usage, comparison-caption placement, or which metrics get a
%Δ pill at all. For LS Analytics: **define one stat-card component (icon or no icon, where
the comparison caption sits, when a %Δ pill appears) and use it everywhere** — this
consistency will itself read as more premium than CRM, independent of any color/type work.

### 9.5 Navigation architecture (the strongest pattern in the product)

The icon-only left rail is not a flat nav — **each rail icon opens a hover/click flyout
panel** containing that module's sub-pages. Structure of a flyout:
- A **bold section header** naming the module (e.g. "Products", "Sales", "Purchase Orders",
  "Social Media Management").
- A vertical list of sub-page links beneath it.
- The **currently-open page is highlighted with a light mint/teal fill**; others are plain
  text on white.
- The panel is a white rounded card with a soft shadow and a small pointer/notch aimed back
  at its rail icon. The originating rail icon simultaneously switches to a **filled dark
  circle** active state.
- Flyouts can carry **more than one group**: the Consignment flyout splits into a
  `Purchase` group (Consignment, Consignment Orders, Consignment Receipt, Consignment
  Returns) and a `Sale` group (Consignment Delivery, Consignment Sale Return) under
  separate mini-headers in the same panel.

Observed flyout contents (useful as a map of the product's actual surface area):

| Rail module | Sub-pages |
|---|---|
| Products | Products, Product Configuration, Stone, Metal, Label Printing, Bulk Image Upload |
| Sales | Estimation, Sales, Advance Payment, Credit Note |
| Purchase Orders | Purchase Orders, GRN, Purchase Invoices, Supplier Payments, Debit Note, Import Purchase, Import Purchase Return |
| Consignment | *Purchase:* Consignment, Consignment Orders, Consignment Receipt, Consignment Returns · *Sale:* Consignment Delivery, Consignment Sale Return |
| Social Media Management | Dashboard, Social Feeds, WhatsApp |

**Two further nav facts worth knowing:**
- **The rail is contextual, not global.** Switching between the ERP side and the CRM module
  swaps the entire icon set, not just the active highlight. The `LS` logo, support bubble,
  module-switcher bubble and version tag stay fixed.
- **The top bar changes per context too**: ERP shows `Dashboard / Masters / Configurations`;
  the CRM module shows `Dashboard / Configurations` plus an extra "add person" quick-action
  icon to the left of the branch switcher.

This icon-rail + grouped-flyout combination is the single most scalable thing in CRM's UI —
it exposes ~40 pages without a sprawling sidebar. **Worth adopting the concept for LS
Analytics**, since an analytics product will similarly accumulate many report surfaces.

### 9.6 List/table page anatomy (now confirmed across many pages)

Every list page follows the same skeleton: page title (left) + primary teal CTA
("+ Add Customer", "+ Add Purchase Invoice", "+ Add Consignment Order") top-right → a filter
row (search input left, "Filter" button right, sometimes a view toggle) → the table or its
empty state.

- **Two distinct status treatments — this distinction is deliberate and worth copying:**
  - *Master/reference data* → status as **plain colored text**, no chrome (Product
    Configuration shows a green `Active` with no pill around it).
  - *Transactional/workflow state* → status as a **filled pill badge** (Purchase Invoices
    shows a pink/red `Unpaid` pill and a green `Approved` pill, plus a neutral gray
    `From GRN` provenance tag).
- **Purchase Invoices column set** (a good reference for what a transactional table carries):
  Supplier Invoice No · Invoice Date · Due Date · Supplier · Payment Terms · Source ·
  Payment Status · Invoice Status · Actions. The Actions column holds a print icon plus a
  kebab (⋮) overflow menu.
- **In-page sub-navigation for master groups**: Product Configuration uses a *vertical left
  tab rail inside the page* (Division, Product Category, Sub Category, Product Type, Product
  Status, Brand, Unit, Charge, Certification) with the active tab as a solid dark pill, and
  a shared search + Filter + table area on the right. Neat way to collapse nine near-
  identical master tables into one page — LS Analytics could use the same idea to group
  related report variants.
- **View toggle** (Opportunities): a two-icon button group (kanban icon / table icon) sits
  immediately left of the Filter button, dark fill on the active view. Good placement
  convention to reuse for any chart-vs-table toggle in analytics.

### 9.7 Consignment Dashboard — the best-composed screen seen so far

A module-level sub-dashboard (distinct from the home dashboard), and structurally the most
interesting layout in the app:

- Header row: title left; a **period dropdown ("This Month")** plus a teal CTA
  ("Consignment In & Out →") right. Note the period selector lives in the *page header*
  here, not in a filter row.
- Four stat cards (Total Consignments, Consignments Stock, Stock Value, Products Sold) —
  *yet another* stat-card grammar: outline icon + label on one line, value below, **no**
  comparison caption and **no** %Δ pill at all. Some values carry a unit suffix rendered in
  small gray next to the number ("0 **Products**", "AED 0.00").
- **"Consignment Stock Status"** — donut/ring chart with a centered value + "Total Items"
  label, and a five-category dot legend below (Available / Sold / Delivered / Returned /
  Received). Most categories seen in one chart so far.
- **"Consignment In & Consignment Out"** — a **mirrored two-column comparison panel**: each
  side has a colored icon chip (salmon inbound-arrow / amber outbound-arrow), a title +
  descriptive caption ("Received from suppliers" / "Issued to customers & suppliers"), a
  large count, then an identical stack of metric rows (Items Received/Delivered, Items Sold,
  Items Returned, Available) each with a label, right-aligned number, and a thin progress
  track beneath. **This mirrored-comparison layout is directly reusable** for LS Analytics
  wherever two sides of a flow are compared — in/out, branch vs branch, period vs period,
  purchases vs sales.

### 9.8 Empty states — a genuine strength, catalogued

Empty states are consistently *designed*, not blank, and the copy is context-specific rather
than generic. Three tiers observed:

1. **Plain centered sentence** — "No estimations yet.", "No sales invoices found.",
   "No customers found." (used on simpler list pages).
2. **Illustration + headline + helper line** — Consignment Order uses a stacked-documents
   icon (gray papers with one teal accent block) over "No purchase orders found" +
   "Create one or clear your filters"; Opportunities and Communication use an inbox-tray
   icon over "No opportunities yet" / "Create your first opportunity to get started" and
   "No communications yet" / "Log your first communication to get started".
3. **Filter-aware copy** — Sales Pipeline shows "No rows" + "Try a different date range."
   when a date filter is active; the Consignment Order helper line likewise mentions
   clearing filters.

The illustration varies by context (documents for order-type pages, inbox tray for CRM
activity lists) rather than one reused generic graphic. **LS Analytics should match or beat
this** — for a BI product, "no data for this filter" states are very high-traffic and
deserve the same care, including the "try a different range" style nudge.

### 9.9 Report chrome variants (Sales Pipeline vs General Ledger)

Two different report chrome styles exist, worth unifying rather than inheriting:
- **General Ledger**: date pill shows a placeholder ("Date : Select Date Range"), branch
  dropdown, a Local/Foreign Currency segmented toggle, search, Filter button; actions are a
  separate icon-only refresh button + a solid teal "Export PDF".
- **Sales Pipeline** (CRM-side report): date pill shows the **resolved range inline**
  ("Date : 24-08-2026 - 23-09-2026") with an ✕ to clear; no branch/currency controls; and
  the export control is a single **"Export ⌄" dropdown** (implying a format menu) rather
  than a format-specific button.

The resolved-range-with-clear pill and the single Export-with-format-menu are the better of
the two patterns and are what LS Analytics should standardize on.

### 9.10 Known gap in CRM's own UI — social/WhatsApp analytics is unbuilt

`Social Media Management → Dashboard` renders literally: a page title and the line
*"Dashboard analytics and metrics coming soon…"* — no cards, no chart, no empty-state
illustration. So the WhatsApp/social engagement analytics scoped in root `CLAUDE.md` has
**no existing UI precedent in CRM at all**. That is greenfield for LS Analytics (and
arguably an easy early win, since the underlying `WhatsappMessage`/`WaBroadcast` data with
its delivery/read counters already exists — see §3.8).

### 9.11 To review next

Still outstanding:
- **A populated kanban board** — the Opportunities toggle proves the view exists, but UAT
  had no deals, so the actual card/column design is unseen.
- **A detail/drawer view** — single Customer or Product record, to see how dense
  jewelry-specific data (weights, stones, pricing, BOM) is organized.
- **A populated chart/table with real volume** — every screen so far is empty or near-empty
  (the only real data seen is 2 purchase-invoice rows and 5 GL accounts), so chart
  legibility and table scannability under load remain unjudged.
- Other reports: Stock Balance, Sales Analysis, P&L, Balance Sheet, Trial Balance.

Add findings as new subsections (9.12, 9.13, …) rather than overwriting this one.

---

## 10. Summary — what LS Analytics should build on

**Core financial fact tables:**
`AccountTransactionEntry` (GL — all money), `SalesInvoice`/`SalesInvoiceItem` (revenue),
`PurchaseInvoice`/`PurchaseInvoiceItem` (procurement spend, dual-currency),
`StockLedgerDetail` (inventory movement), `CustomerFinancialEntry` (AR),
`SupplierFinancialEntry` (AP), `SupplierPayment`/`SupplierPaymentAllocation` (cash out +
settlement).

**Key dimension tables:**
`Product` (+ Division/Category/Type/Brand/Metal/Unit masters), `Stone` (+ 26 gemological
sub-masters), `Customer`, `Supplier`, `Salesman`, `Branch`/`OrganizationMaster`, `VatMaster`,
`Currency`.

**Non-negotiable query discipline:**
1. Scope every query by `organizationId` (+ `branchId` where required).
2. Explicitly exclude soft-deleted rows (`isDeleted`/`deletedAt`) — not automatic in raw SQL.
3. Use stored `...InBaseCurrency` fields on purchase-side documents; treat sales-side amounts
   as already base-currency.
4. Resolve "current" FX/VAT rates as the latest-`effectiveDate` row, but prefer
   transaction-snapshotted values (`exchangeRate`, `vatRate` on the document itself) when
   reporting on historical transactions — don't re-apply today's rate to old data.
5. Respect the existing RBAC module/permission model rather than building a parallel one.
