# Data-viz language — premium form catalog

Companion to the root `CLAUDE.md` design-bar rule on chart-form variety. The
dataviz skill governs *how* to build any single chart correctly (color,
marks, interaction, accessibility). This doc is about a level up: *which
form* to reach for so a page of several cards doesn't read as the same
widget copy-pasted with different data.

The trigger for writing this: the first build of `FinancePage.tsx` shipped
with three cards rendering `CompositionBar` and two rendering `TrendLine`
back to back. Each one was individually correct, but the page read as
repetitive rather than premium. The fix wasn't new colors or animation —
it was picking a different, more specific form per section.

## Rule of thumb

Before adding a card, check what forms are already on the page. If the new
card's data could honestly be shown in a form not yet used on this page,
prefer that — as long as it's still the *right* form for the data (never
force a mismatched form for variety's sake; `choosing-a-form.md` in the
dataviz skill still wins on correctness).

## Forms in the shared component library (`src/components/charts/`)

Established, keep reaching for these first:

| Component | Job |
|---|---|
| `TrendLine` | one or two series over time, one axis |
| `CompositionBar` | part-to-whole, many/long-named categories, one snapshot |
| `SeverityCompositionBar` | part-to-whole, fixed ordinal severity (aging buckets) |
| `ContributionWaterfall` | bridge between two totals through named drivers |
| `RankedBar` | magnitude leaderboard, one leader emphasized |
| `Heatmap` | two dimensions crossed (category × time, branch × month) |
| `TargetMeter` | one value against one target, linear |
| `LeaderboardRows` | ranked list carrying secondary/tertiary signal per row |

## Newer forms added for the Finance page — reach for these when they fit

- **`RadialGauge`** — single value against its own ceiling (utilization,
  coverage, attainment as a ring instead of a bar). Only for **one** ratio.
  Never for multi-category part-to-whole — that's still `CompositionBar`'s
  job (see its own "never a donut" comment). Used for: bullion financing
  facility utilization.
- **`BalanceSheetMirror`** — two stacked columns, equal height because the
  totals are equal by construction (assets = liabilities + equity). This is
  the balance sheet's own canonical visual form in real finance tooling, not
  an invented one. Reach for it whenever two totals are definitionally equal
  and the story is "how the two sides break down," not just "here's one
  total's composition."
- **`CashFlowBars`** — a flow (bars, signed by sign) and a level (line) that
  share one axis and one unit. Use whenever there's a "change this period"
  + "running balance" pair (cash flow now; could fit stock movement, headcount
  change, etc. later). Never split these into two separate charts — the
  relationship between the swing and where it leaves the balance *is* the
  point.
- **Gradient "fintech card" tile** — not a chart component, a container
  treatment: `rounded-2xl` + the warm gradient background already used once
  on `SupplierPage.tsx` (`linear-gradient(135deg, #f3e6c9 0%, #eee2cd 35%,
  #e9ddd8 70%, #ded6e0 100%)`), holding a `RadialGauge` plus a couple of
  labeled figures. Reserve real obsidian-dark panels for the hero band only
  (see `index.css`'s "the one deliberate dark panel" comment) — this gradient
  tile is the *other* premium, non-white surface in the vocabulary, for a
  single facility/limit/allowance-style widget that deserves to stand out
  from a plain white `Card`.
- **`JournalActivityFeed`** (in `src/components/ui/`, not `charts/` — it's a
  list, not a chart) — a handful of named, dated, realistic entries. Use
  where "recent activity" or "the detail behind the aggregate" would
  otherwise only be representable as more numbers. Debit/credit direction is
  shown by icon + neutral ink, **not** by reusing the good/critical status
  colors — direction isn't a state judgment, and those colors are reserved
  (see the dataviz skill's non-negotiables).

## The glass material — already established, reuse it

The user asked for the `Heatmap` and `HeroBand` to read as genuinely
glassy, not just tinted. Both are now the reference implementation for
"glass" in this app — reuse their recipe rather than re-deriving it:

- **`Heatmap`** cells: continuous `color-mix(in oklab, <seq-700> <share>%,
  white)` fill (not a 6-step bucket — smooth gradation reads more premium
  and is honestly closer to what a sequential ramp means), a diagonal
  glossy highlight (`linear-gradient(135deg, rgba(255,255,255,0.6) …)`),
  layered inset shadows for a raised-glass edge, a colored ambient drop
  shadow that intensifies with the cell's value, a hover lift
  (`translateY(-2px) scale(1.03)`), and a faint graph-paper grid
  (`linear-gradient` hairlines at `22px 22px`) behind the tiles so they
  read as floating objects, not a flat table. Still the dataviz skill's
  validated sequential ramp underneath — only the tile *material* changed.
- **`StatTile`**'s `dark` tone (used inside `HeroBand` only) and `HeroBand`
  itself: `backdrop-blur` + low-alpha white fill (so it actually blurs the
  obsidian panel's own gradients behind it — this only works because
  there's real content behind the tile to blur), a radial highlight near
  the top-left corner plus a diagonal sheen streak (faking a light catching
  the glass edge), and layered inset shadows (`inset 0 1.5px 0
  rgba(255,255,255,0.3)` top edge, `inset 0 -1px 0 rgba(0,0,0,0.25)` bottom
  edge) for real depth instead of a flat semi-transparent box.

Reach for this same recipe (color-mix fill + diagonal sheen + layered inset
shadows + colored ambient shadow) whenever a new surface is meant to read
as glass, instead of just lowering an element's opacity and calling it
done — low opacity alone reads as "faded," not "glass."

## Where inspiration can come from

The user has referenced consumer/fintech dashboard screenshots (rounded pill
bars, glowing bar+line combos, credit-card-style balance widgets, glass-morphism
heatmap grids, circular score gauges) as a style *mood*, not a palette to
copy. When drawing on a reference like that:

1. Take the **form** (radial gauge, mirrored columns, flow+level combo,
   card-style facility widget) — never the literal color scheme (e.g. neon
   green, arbitrary red/orange gradients).
2. Reimplement it in the app's own tokens: antique-gold accent
   (`--color-accent` family), warm bone canvas, obsidian only in the hero.
   Run any new categorical/sequential color through the dataviz skill's
   validator before shipping it.
3. Reuse the existing primitives (`TooltipCard`, `ChartLegend`, `chartColors`)
   so the new form still matches every other chart's interaction and type
   conventions — a new *shape* should never mean a new *design system*.

## Mock-data authenticity

Even though every number on this page is illustrative, prefer figures that
are actually derived from the business's real constraints over generic
placeholders:

- UAE VAT (5%) and federal corporate tax (9%, with the AED 375k/yr small
  business relief threshold) — both real, current law for the business's
  jurisdiction.
- Bullion/metal-loan financing as a real balance-sheet and P&L line — jewelry
  retailers commonly finance stock this way rather than owning it outright.
- Branch rent variance (a prime mall unit vs. a traditional souq lease)
  driving genuinely different branch margins, not just different revenue.
- Named, dated journal-voucher-style entries rather than only aggregate
  charts — see `recentJournalActivity()` in `src/mock/finance.ts`.

This is what "feels original despite being mock data" cashes out to in
practice: every figure should be traceable to a real business mechanic, not
just a plausible-looking random number.
