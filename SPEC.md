# FarmForecast — Cursor Build Prompt
 
> **How to use this document (read this first, don't paste it into Cursor):**
> 1. Clone your existing GitHub repo locally and open it in Cursor.
> 2. Save this whole file in the project root as `SPEC.md` and commit it.
> 3. Work **phase by phase** (Section 11). For each phase, tell Cursor: *"Read SPEC.md. Implement Phase N exactly as specified. Do not start other phases."*
> 4. After each phase, run the app and the tests before moving on. Commit and push to GitHub after every working phase — Replit pulls from this repo.
> 5. If Cursor's output disagrees with SPEC.md, tell it: *"SPEC.md is the source of truth — fix to match."*
> 6. Deployment is on Replit (already set up). Create the database in Replit (built-in PostgreSQL), copy its `DATABASE_URL` into Replit Secrets, and never commit `.env` to the repo.
>
> Everything below this line is the prompt for Cursor.
 
---
 
## 1. Project overview
 
Build **FarmForecast**, a web app for a blueberry farmer in Zimbabwe to build 5-year financial forecasts and present them to banks and financers.
 
The app replaces an Excel operating model. The user enters farm assumptions through guided forms; the app computes a 60-month financial model (production, revenue, operating costs, an automatically-sized working-capital loan, cashflow) and displays it as an interactive dashboard with clear charts and plain-language explanations suitable for showing to a bank.
 
Core concepts:
 
- A **Project** is one farm plan (e.g. "20 ha Blueberry Project — Centenary").
- A Project has many **Scenarios**. A Scenario is a full set of input assumptions plus computed results. The user duplicates a scenario, changes one or two assumptions (price, yield, interest rate…), and compares outcomes side by side.
- The financial engine is **deterministic**: same inputs → same outputs, matching the reference Excel model to within 0.1% (acceptance tests in Section 10).
Target user is non-technical. Every screen must use plain language, show units, and prefer sensible defaults over blank fields.
 
## 2. Tech stack (do not deviate)
 
- **Next.js 14+ (App Router) with TypeScript** — single repo, frontend + backend API routes together.
- **Tailwind CSS + shadcn/ui** for UI components.
- **Prisma ORM with PostgreSQL**. Production DB is Replit's built-in PostgreSQL; local dev uses the same `DATABASE_URL` pattern (a local Postgres or the Replit dev DB). Read the connection string from `process.env.DATABASE_URL` only — never hard-code it. Do not use SQLite: Replit deployments have an ephemeral filesystem, so a SQLite file would be wiped on redeploy.
- **Recharts** for all charts.
- **Zod** for input validation (shared schemas between forms and API).
- **Vitest** for unit tests of the calculation engine.
- Auth: **none in v1**. Single-user app. Structure the DB with a `userId` column left nullable so auth can be added later without migration pain.
- Money values: store and compute as **floating-point USD** (this mirrors the Excel model); format for display as `$1,234,567` (0 decimals) unless stated otherwise. Never round inside the engine — round only at display time.
## 3. Architecture rules
 
1. The calculation engine lives in `src/engine/` as **pure TypeScript functions with zero imports from Next.js, Prisma, or React**. Input: a plain `ScenarioInput` object. Output: a plain `ScenarioResult` object. This module must be unit-testable in isolation.
2. The engine runs **on demand in the browser** (it is fast — 60 months × ~20 cost lines). Persist inputs only; recompute results when a scenario is opened or edited. Do not store computed results in the DB.
3. All engine formulas are specified exactly in Section 6. Implement them as written; do not "improve" the financial logic.
4. Charts and tables read only from `ScenarioResult` — no financial math in components.
## 4. Data model (Prisma)
 
```prisma
model Project {
  id        String     @id @default(cuid())
  userId    String?    // nullable, for future auth
  name      String
  location  String?
  currency  String     @default("USD")
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
  scenarios Scenario[]
}
 
model Scenario {
  id        String   @id @default(cuid())
  projectId String
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  name      String   // e.g. "Base case", "Price drops to $4/kg"
  isBase    Boolean  @default(false)
  input     Json     // the full ScenarioInput object (validated by Zod)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```
 
The `ScenarioInput` JSON shape (also the Zod schema):
 
```ts
interface ScenarioInput {
  modelStart: string;          // ISO date, first day of month, e.g. "2026-07-01"
  modelMonths: number;         // default 60
  sellingPricePerKg: number;   // USD, default 5
  annualCostInflation: number; // decimal, default 0 (e.g. 0.05 = 5%)
  openingCashBalance: number;  // default 0
 
  blocks: Array<{              // planting blocks (v1 UI supports exactly 2)
    name: string;              // "Block 1"
    areaHa: number;            // default 10
    plantingDate: string;      // ISO, first of month, e.g. "2026-07-01"
  }>;
 
  yieldCurve: {                // tonnes per hectare by plant age at harvest
    year1: number;             // default 8
    year2: number;             // default 14
    year3plus: number;         // default 17
  };
 
  harvestWindow: { startMonth: number; endMonth: number }; // 4..10 (April..October)
  firstHarvestYear: number;    // e.g. 2027 — no production before Apr of this year
  harvestCurve: number[];      // 12 numbers, Jan..Dec, fractions summing to 1
                               // default [0,0,0,0.05,0.10,0.20,0.25,0.25,0.12,0.03,0,0]
 
  costBase: {                  // seasonal monthly operating cost profile
    categories: string[];      // ~20 category names
    monthlyBase: Record<string, Record<string, number>>; // month "Jan".."Dec" -> category -> USD (12 ha basis)
    // scaling factor per category for each area configuration:
    factorsPhase1: Record<string, number>; // used while only Block 1 is planted
    factorsPhase2: Record<string, number>; // used once Block 2 is planted
  };
 
  loan: {
    interestRatePA: number;    // decimal, default 0.13
    repaymentStartMonth: number; // model month number, default 13 (i.e. 12-month holiday)
  };
 
  rental: {
    percentOfHarvestGross: number; // decimal, default 0.10
    paymentMonth: number;          // calendar month, default 10 (October)
  };
}
```
 
## 5. Domain background (so the engine makes sense)
 
The model is derived from a real Zimbabwe blueberry operation:
 
- Costs were recorded monthly for 18 months on a 12 ha farm across ~20 categories. From these actuals, a **seasonal 12-month cost profile** was built (the `monthlyBase` table — values are on a 12 ha basis).
- Each category scales differently with farm size: fixed costs (certification, manager bonus, workshop) have factor 1.0 regardless of area; fully area-variable costs (packaging, fertiliser, chemicals, nursery, field structures) scale by `plantedHa / 12`; semi-variable costs (wages, fuel, vehicles) use judgment factors like 0.9 (10 ha) or 1.4–1.5 (20 ha).
- **Rent is special**: it is excluded from the cost table (factor 0) and instead charged as 10% of each harvest year's gross revenue, paid once, in October of that harvest year.
- Blueberry plants ramp up: 8 t/ha in their first harvest year, 14 in the second, 17 from the third onward. Two 10 ha blocks are planted a year apart, so the farm passes 10 ha → 20 ha and total yield ramps over 4 years.
- Each calendar year's harvest is spread April–October by the harvest curve.
- Operations run at a cash loss until harvests mature, so a **working-capital (OPEX) loan** auto-draws exactly enough each month to keep cash at zero, then is repaid by cash sweep once revenue exceeds costs.
- CAPEX, tax and depreciation are deliberately excluded from v1.
## 6. Calculation engine — exact formulas
 
Compute month by month, `m = 1..modelMonths`. Let `date(m)` be the calendar month (modelStart plus m−1 months), `calMonth(m)` its calendar month 1–12, `calYear(m)` its calendar year, and `projectYear(m) = floor((m-1)/12) + 1`.
 
### 6.1 Area phase
 
- `plantedHa(m)` = sum of `areaHa` for blocks with `plantingDate <= date(m)`.
- Use `factorsPhase1` while only Block 1 is planted; `factorsPhase2` from the month Block 2's planting date is reached.
### 6.2 Production and revenue
 
For each block `b` and month `m`:
 
- `harvestYear(m)` = `calYear(m)` if `date(m) >= firstHarvestYear-04-01` AND `harvestWindow.startMonth <= calMonth(m) <= harvestWindow.endMonth`; otherwise 0 (no harvest).
- Block age in a harvest year `Y`: `age = Y - year(plantingDate) `... specifically the block participates in harvest year Y only if `Y > year(plantingDate)` is not required — use: `age = Y - year(plantingDate)`; if `age < 1` the block produces nothing that year. (Block planted Jul 2026 has age 1 in harvest year 2027.)
- `yieldTPerHa(age)` = `yieldCurve.year1` if age = 1, `year2` if age = 2, `year3plus` if age ≥ 3, else 0.
- `blockProductionKg(b, m) = yieldTPerHa(age) * areaHa(b) * 1000 * harvestCurve[calMonth(m) - 1]`
- `productionKg(m)` = sum over blocks. `revenue(m) = productionKg(m) * sellingPricePerKg`.
Also compute per **harvest year** `Y`: `harvestGross(Y)` = full April–October gross revenue of that calendar year's harvest **even if part of it falls outside the model window** (i.e. `sum over blocks of yieldT(age in Y) * areaHa * 1000 * price`). This is the rental basis.
 
### 6.3 Operating costs (OPEX)
 
For each cost category `c` (excluding Rent, which has factor 0):
 
```
cost(c, m) = monthlyBase[monthName(calMonth(m))][c]
           * factor(c, phase(m))
           * (1 + annualCostInflation) ^ (projectYear(m) - 1)
```
 
Rental charge: in month `m` where `calMonth(m) == rental.paymentMonth` and `calYear(m)` is a harvest year with production:
 
```
rentalCharge(m) = harvestGross(calYear(m)) * rental.percentOfHarvestGross
```
 
(One lump sum per harvest year, e.g. October 2027 rent = 10% × $400,000 = $40,000. If the payment month for the final harvest year falls after the model ends, it is simply not paid inside the model.)
 
`opex(m)` = sum of `cost(c, m)` over categories + `rentalCharge(m)`.
 
### 6.4 OPEX loan (auto-drawdown + cash sweep) — implement exactly
 
Let `r = loan.interestRatePA`. Track `cash(m)` and loan balance `N(m)` (opening) / `O(m)` (closing). `cash(0) = openingCashBalance`, `N(1) = 0`.
 
For each month m:
 
```
opCF(m)   = revenue(m) - opex(m)                       // operating cash before finance
 
draw(m)   = max(0, -( cash(m-1) + opCF(m) - N(m) * r/12 ) / (1 - r/24))
// Draws exactly enough to end the month at zero cash, accounting for the
// interest charged on the draw itself (half-month convention below).
 
interest(m) = ( N(m) + draw(m)/2 ) * r/12
// Monthly interest on opening balance plus half the current month's draw.
 
repay(m)  = 0                                    if m < loan.repaymentStartMonth
          = min( N(m) + draw(m),
                 max(0, cash(m-1) + opCF(m) - interest(m)) )   otherwise
// Cash sweep: every dollar available after operations and interest goes to
// the loan until it is fully repaid.
 
netCF(m)  = opCF(m) + draw(m) - interest(m) - repay(m)
cash(m)   = cash(m-1) + netCF(m)
O(m)      = max(0, N(m) + draw(m) - repay(m))
N(m+1)    = O(m)
 
debtService(m) = interest(m) + repay(m)
DSCR(m)   = debtService(m) > 0 ? max(0, opCF(m)) / debtService(m) : null
```
 
Note: in surplus months `draw` is 0 and repayments only begin at `repaymentStartMonth`, so cash accumulates during the holiday if `opCF > 0`.
 
### 6.5 Aggregations (`ScenarioResult`)
 
- **Monthly series** (60 rows): date, projectYear, plantedHa, productionKg, revenue, opex (and per-category breakdown), opCF, draw, interest, repay, netCF, cash, openingLoan, closingLoan, debtService, DSCR.
- **Annual summary** (project years 1–5, Jul–Jun): area (max), production t, revenue, OPEX, EBITDA = revenue − OPEX, interest, drawdowns, repayments, net cash movement, closing loan balance.
- **KPIs**: total production (t) in model, 5-yr revenue, 5-yr OPEX, 5-yr EBITDA, total interest, peak loan balance, month loan fully repaid (or "not repaid"), closing cash.
- **Rental schedule**: per harvest year — gross income, rental %, rental $, payment date, whether inside model window.
## 7. Seed data — "Zimbabwe Blueberry Base Case"
 
On first run, seed one Project ("Blueberry Project — Zimbabwe") with one base Scenario using exactly these inputs. Defaults for new scenarios also come from here.
 
- modelStart `2026-07-01`, 60 months, price $5/kg, inflation 0, opening cash 0.
- Blocks: Block 1 — 10 ha, planted `2026-07-01`; Block 2 — 10 ha, planted `2027-07-01`.
- Yield curve: 8 / 14 / 17 t/ha. Harvest window Apr–Oct, firstHarvestYear 2027.
- Harvest curve (Jan–Dec): `[0, 0, 0, 0.05, 0.10, 0.20, 0.25, 0.25, 0.12, 0.03, 0, 0]`.
- Loan: 13% p.a., repayment starts month 13. Rental: 10%, paid October.
- Cost factors — **use exact fractions where shown**:
| Category | Phase 1 (10 ha) | Phase 2 (20 ha) |
|---|---|---|
| Global Gap | 1 | 1 |
| Protective Clothing | 0.9 | 1.4 |
| Packaging | 10/12 | 20/12 |
| Fertiliser | 10/12 | 20/12 |
| Chemicals | 10/12 | 20/12 |
| nursery | 10/12 | 20/12 |
| managers bonus | 1 | 1 |
| Wages | 0.9 | 1.5 |
| Sundries & Misc | 0.9 | 1.4 |
| Fuel & Lubes | 0.9 | 1.4 |
| Tolls | 1 | 1 |
| Structure & In Field | 10/12 | 20/12 |
| Irrigation | 0.85 | 1.55 |
| Packshed | 0.85 | 1.55 |
| Trac. | 0.9 | 1.4 |
| Trailr/ Implements / Irrigation | 0.9 | 1.4 |
| Lorry/vehicle | 0.9 | 1.4 |
| Tractor costs | 0.9 | 1.4 |
| Workshop | 1 | 1.1 |
| Rent | 0 | 0 |
 
- Monthly cost base (12 ha basis, USD). Store this as `src/engine/seed/blueberryZimbabwe.ts`:
```json
{
 "Jan": {"Global Gap": 890, "Protective Clothing": 49.36, "Packaging": 0, "Fertiliser": 6517.61, "Chemicals": 3122.5, "nursery": 0, "managers bonus": 0, "Wages": 8065.91, "Sundries & Misc": 2243.7, "Fuel & Lubes": 1601.77, "Tolls": 0, "Structure & In Field": 209.84, "Irrigation": 2975.52, "Packshed": 0, "Trac.": 462.88, "Trailr/ Implements / Irrigation": 35.44, "Lorry/vehicle": 680.94, "Tractor costs": 0, "Workshop": 148.74, "Rent": 0},
 "Feb": {"Global Gap": 579.46, "Protective Clothing": 0, "Packaging": 0, "Fertiliser": 6677.68, "Chemicals": 2084.5, "nursery": 0, "managers bonus": 0, "Wages": 7859.48, "Sundries & Misc": 2667.71, "Fuel & Lubes": 1214.46, "Tolls": 0, "Structure & In Field": 213.7, "Irrigation": 408.57, "Packshed": 51, "Trac.": 817.2, "Trailr/ Implements / Irrigation": 2062.2, "Lorry/vehicle": 1464.4, "Tractor costs": 0, "Workshop": 138.33, "Rent": 0},
 "Mar": {"Global Gap": 140, "Protective Clothing": 32, "Packaging": 0, "Fertiliser": 5538.46, "Chemicals": 6444.58, "nursery": 0, "managers bonus": 0, "Wages": 7232.11, "Sundries & Misc": 3737.64, "Fuel & Lubes": 1825.92, "Tolls": 513.59, "Structure & In Field": 758.97, "Irrigation": 1438.76, "Packshed": 398.6, "Trac.": 121.6, "Trailr/ Implements / Irrigation": 368.9, "Lorry/vehicle": 2169.2, "Tractor costs": 891.27, "Workshop": 40.2, "Rent": 0},
 "Apr": {"Global Gap": 1158.71, "Protective Clothing": 27, "Packaging": 3463.69, "Fertiliser": 8192.75, "Chemicals": 3168.08, "nursery": 1891.1, "managers bonus": 0, "Wages": 10811.4, "Sundries & Misc": 2760.4, "Fuel & Lubes": 0, "Tolls": 0, "Structure & In Field": 493.2, "Irrigation": 0, "Packshed": 276.22, "Trac.": 250, "Trailr/ Implements / Irrigation": 673.41, "Lorry/vehicle": 1913.79, "Tractor costs": 0, "Workshop": 127.84, "Rent": 0},
 "May": {"Global Gap": 0, "Protective Clothing": 74, "Packaging": 309, "Fertiliser": 8056, "Chemicals": 1216.21, "nursery": 0, "managers bonus": 0, "Wages": 10043.89, "Sundries & Misc": 3615.71, "Fuel & Lubes": 1561.68, "Tolls": 0, "Structure & In Field": 132.06, "Irrigation": 998.26, "Packshed": 516.28, "Trac.": 32.4, "Trailr/ Implements / Irrigation": 28.8, "Lorry/vehicle": 837.2, "Tractor costs": 10, "Workshop": 311.08, "Rent": 0},
 "Jun": {"Global Gap": 0, "Protective Clothing": 0, "Packaging": 250, "Fertiliser": 5611.25, "Chemicals": 2261.21, "nursery": 0, "managers bonus": 0, "Wages": 9532.33, "Sundries & Misc": 5970.26, "Fuel & Lubes": 2014.16, "Tolls": 0, "Structure & In Field": 652.65, "Irrigation": 23.12, "Packshed": 20.45, "Trac.": 20, "Trailr/ Implements / Irrigation": 62, "Lorry/vehicle": 308, "Tractor costs": 48, "Workshop": 46.39, "Rent": 0},
 "Jul": {"Global Gap": 128.3, "Protective Clothing": 37.69, "Packaging": 10728.77, "Fertiliser": 5398.47, "Chemicals": 1600.98, "nursery": 0, "managers bonus": 0, "Wages": 12430.04, "Sundries & Misc": 15248.71, "Fuel & Lubes": 2825.66, "Tolls": 0, "Structure & In Field": 440, "Irrigation": 19.16, "Packshed": 37.4, "Trac.": 174, "Trailr/ Implements / Irrigation": 400, "Lorry/vehicle": 278.86, "Tractor costs": 620.06, "Workshop": 106.98, "Rent": 0},
 "Aug": {"Global Gap": 0, "Protective Clothing": 0, "Packaging": 7639.09, "Fertiliser": 5141.47, "Chemicals": 1011.38, "nursery": 0, "managers bonus": 0, "Wages": 15482.75, "Sundries & Misc": 4066.77, "Fuel & Lubes": 2010.1, "Tolls": 16, "Structure & In Field": 1377.63, "Irrigation": 3933, "Packshed": 0, "Trac.": 0, "Trailr/ Implements / Irrigation": 24.6, "Lorry/vehicle": 515.12, "Tractor costs": 0, "Workshop": 38, "Rent": 0},
 "Sep": {"Global Gap": 12.15, "Protective Clothing": 13.51, "Packaging": 11303.52, "Fertiliser": 6242.89, "Chemicals": 521.65, "nursery": 0, "managers bonus": 0, "Wages": 27782.19, "Sundries & Misc": 7524.84, "Fuel & Lubes": 3851.54, "Tolls": 0, "Structure & In Field": 1886.53, "Irrigation": 826, "Packshed": 318.15, "Trac.": 10.38, "Trailr/ Implements / Irrigation": 34.8, "Lorry/vehicle": 3939.21, "Tractor costs": 0, "Workshop": 272.02, "Rent": 0},
 "Oct": {"Global Gap": 0, "Protective Clothing": 0, "Packaging": 3492.62, "Fertiliser": 0, "Chemicals": 564.5, "nursery": 0, "managers bonus": 0, "Wages": 35596.34, "Sundries & Misc": 7929.11, "Fuel & Lubes": 6787.46, "Tolls": 0, "Structure & In Field": 1698.27, "Irrigation": 683.45, "Packshed": 1136.07, "Trac.": 466.79, "Trailr/ Implements / Irrigation": 1169.43, "Lorry/vehicle": 1674.59, "Tractor costs": 1207.28, "Workshop": 148.2, "Rent": 0},
 "Nov": {"Global Gap": 545, "Protective Clothing": 0, "Packaging": 57138.96, "Fertiliser": 764.26, "Chemicals": 0, "nursery": 0, "managers bonus": 20000, "Wages": 6360.85, "Sundries & Misc": 8998.08, "Fuel & Lubes": 0, "Tolls": 348, "Structure & In Field": 3346.24, "Irrigation": 554.3, "Packshed": 76.32, "Trac.": 535.4, "Trailr/ Implements / Irrigation": 440.08, "Lorry/vehicle": 0, "Tractor costs": 0, "Workshop": 0, "Rent": 0},
 "Dec": {"Global Gap": 293.14, "Protective Clothing": 180.32, "Packaging": 1492.45, "Fertiliser": 3903.68, "Chemicals": 733.51, "nursery": 0, "managers bonus": 0, "Wages": 8338.66, "Sundries & Misc": 1518.51, "Fuel & Lubes": 1247.44, "Tolls": 33, "Structure & In Field": 135, "Irrigation": 31.84, "Packshed": 0, "Trac.": 0, "Trailr/ Implements / Irrigation": 1630.73, "Lorry/vehicle": 393.2, "Tractor costs": 0, "Workshop": 38.89, "Rent": 0}
}
```
 
## 8. Screens
 
1. **Projects list** (`/`) — cards with project name, location, scenario count. Create/rename/delete.
2. **Project page** (`/projects/[id]`) — scenario list with KPI mini-summary per scenario (5-yr revenue, EBITDA, peak loan). Buttons: open, duplicate, delete, "set as base".
3. **Scenario editor** (`/projects/[id]/scenarios/[sid]/edit`) — a tabbed form (Zod-validated):
   - *Basics*: name, model start, months, price/kg, inflation, opening cash.
   - *Planting*: the two blocks (area, planting date), yield curve, first harvest year, harvest window.
   - *Harvest curve*: 12 monthly % inputs with a live bar preview and a running total that must equal 100%.
   - *Costs*: editable grid of monthly cost base (12 months × categories) with per-category scaling factors for phase 1 / phase 2. Show computed monthly totals live. Allow add/rename/remove category.
   - *Finance*: loan rate, repayment start month, rental % and payment month.
   - Save = persist input JSON; results recompute on view.
4. **Scenario dashboard** (`/projects/[id]/scenarios/[sid]`) — the bank-facing view (Section 9).
5. **Compare view** (`/projects/[id]/compare?a=...&b=...`) — two scenarios side by side: KPI table with deltas, overlaid revenue/EBITDA and loan-balance charts.
## 9. Dashboard (the heart of the app)
 
Top: KPI cards — 5-yr Revenue, 5-yr OPEX, 5-yr EBITDA, Peak loan balance, Total interest, Loan repaid (month/year or "not repaid"), Closing cash. Each card gets a one-line plain-language caption (e.g. Peak loan: "The most working capital the project ever needs — the size of facility to ask the bank for").
 
Charts (Recharts, all with tooltips and a monthly/annual toggle where noted):
 
1. **Cashflow waterfall over time** — monthly bars: revenue (green) vs OPEX (red), with net operating cashflow line. Monthly/annual toggle.
2. **Loan lifecycle** — area chart of closing loan balance across 60 months; annotate peak and payoff month; overlay monthly draws and repayments as bars.
3. **Production ramp** — stacked bars per harvest year by block, in tonnes, showing the 80 → 220 → 310 → 340 t ramp.
4. **Cumulative cash position** — closing cash line across 60 months (the "when do we turn the corner" chart).
5. **Cost breakdown** — donut of 5-yr OPEX by category + a monthly stacked-area for the top 6 categories with the rest as "Other".
6. **Annual summary table** — the 5 project years: area, production, revenue, OPEX, EBITDA, interest, drawdowns, repayments, closing loan. Include DSCR where debt service exists.
7. **Rental schedule table** — per harvest year.
Design: clean, generous whitespace, green/earth-tone palette, and readable by a loan officer with zero context. Every chart gets a title and one explanatory sentence underneath.
 
## 10. Acceptance tests (Vitest) — the engine MUST reproduce these
 
Running the engine on the seed scenario (Section 7) must produce these values within **±0.1%** (these come from the reference Excel model):
 
| Metric | Expected |
|---|---|
| Total production in 60-month model | 1,069,000 kg |
| 5-year revenue | $5,345,000 |
| 5-year OPEX (incl. rental) | $4,033,880 |
| 5-year EBITDA before interest | $1,311,120 |
| Total interest paid | $184,082 |
| Peak loan balance | $824,908 |
| Closing loan balance (month 60) | $0 |
| Loan fully repaid in | July 2029 (month 37) |
| Closing cash (month 60) | $1,127,038 |
| Year 1 (Jul 26–Jun 27) revenue / OPEX | $140,000 / $450,260 |
| Year 2 revenue / OPEX | $645,000 / $817,155 |
| Year 3 revenue / OPEX | $1,257,500 / $887,155 |
| Rental Oct 2027 / 2028 / 2029 / 2030 | $40,000 / $110,000 / $155,000 / $170,000 |
| Month 1 (Jul 2026): OPEX / draw / interest | $44,237.06 / $44,477.98 / $240.92 |
| Harvest-year production ramp | 80 / 220 / 310 / 340 / 340 t (only 119 t of year 5 falls inside the model) |
 
Also test: harvest curve validation (must sum to 1), no production before April of firstHarvestYear, phase switch to factorsPhase2 in the month Block 2 is planted, cash never goes below −$0.01, loan balance never negative, DSCR null when no debt service.
 
## 11. Build phases (implement strictly in order)
 
- **Phase 1 — Engine + tests.** `src/engine/` types, seed data file, full calculation engine, all Section 10 Vitest tests passing. No UI yet beyond `npx vitest` green.
- **Phase 2 — Persistence + project/scenario CRUD.** Prisma schema, seed script, projects list, project page, create/duplicate/delete scenarios, Zod validation, API routes.
- **Phase 3 — Scenario editor.** All five tabs, live validation, harvest-curve preview, cost grid editing.
- **Phase 4 — Dashboard.** All KPI cards, charts 1–7, monthly/annual toggles, plain-language captions.
- **Phase 5 — Compare view + polish.** Side-by-side comparison, responsive layout pass, empty states, number formatting, print-friendly dashboard stylesheet (`@media print`).
- **Phase 6 — Replit deployment readiness.**
  - The server must bind to `0.0.0.0` and read the port from `process.env.PORT` (fall back to 3000 locally).
  - Use Prisma **migrations** (`prisma migrate dev` locally, committed to the repo); production start runs `npx prisma migrate deploy && next start`.
  - Seeding must be **idempotent** (`upsert` by fixed IDs) so it can safely run on every deploy.
  - All secrets (`DATABASE_URL`) come from environment variables — provided by Replit Secrets in production, `.env` locally. `.env` is git-ignored; commit a `.env.example` instead.
  - Add a `README.md` section: local setup, running tests, and how the Replit deploy works (build `next build`, run command above).
- **Phase 7 — Drivers page + sensitivity view.** A per-scenario "Drivers" page with guardrailed sliders, a live impact readout, a plain-English model explainer, and a tornado sensitivity chart. Specified fully in Section 14.
## 12. Non-goals for v1 (do not build)
 
- CAPEX, tax, depreciation, multi-currency.
- Excel/CSV import (planned v2 — keep the cost grid data shape import-friendly).
- PDF export (v2 — the print stylesheet is the interim answer).
- Authentication, multi-user, sharing.
- Other crops (the engine is blueberry-shaped: age-based yield curve + Apr–Oct window; generalization is v2).
## 13. Quality bar
 
- TypeScript strict mode; no `any` in the engine.
- Engine functions documented with JSDoc explaining each formula in plain English.
- Every form field has a label, unit, and sensible default; errors in plain language.
- The app must run with `npm install && npx prisma migrate dev && npm run seed && npm run dev` on a fresh machine with a valid `DATABASE_URL`, and deploy on Replit with `npm run build` then `npx prisma migrate deploy && npm start`.

## 14. Phase 7 — Drivers page & sensitivity view

A per-scenario page at `/projects/[id]/scenarios/[sid]/drivers`, linked prominently from both the scenario dashboard and the scenario editor. It presents the model's key drivers as cards a non-technical farmer can understand and safely experiment with, explains the model in plain English, and shows which assumptions matter most.

### 14.1 Drivers page

Eight drivers, each shown as a card:

| Driver | Input field | Guardrails | Unit |
|---|---|---|---|
| Selling price | `sellingPricePerKg` | $2–$10 | $/kg |
| Year 1 yield | `yieldCurve.year1` | 2–12 | t/ha |
| Year 2 yield | `yieldCurve.year2` | 6–20 | t/ha |
| Year 3+ yield | `yieldCurve.year3plus` | 8–30 | t/ha |
| Loan interest rate | `loan.interestRatePA` | 5–25 | % p.a. |
| Repayment start | `loan.repaymentStartMonth` | 6–24 | model month |
| Rental share | `rental.percentOfHarvestGross` | 0–20 | % of harvest gross |
| Cost inflation | `annualCostInflation` | 0–15 | % per year |

Each driver card has:

- A plain-language name and a one-sentence explanation of what it means on the farm (e.g. "Selling price — what you get paid per kg at the farm gate, after grading").
- The current saved value with its unit.
- A slider constrained to the guardrails above, plus a numeric input (also clamped to the guardrails).
- A per-card "Reset" that returns the driver to its saved value.

Live impact readout: as the user moves any slider, the engine re-runs in the browser with the trial values (debounced) and shows **5-yr EBITDA**, **peak loan balance**, and **loan-repaid month**, each with a delta vs the saved scenario (green when the change helps, red when it hurts).

Changes are exploratory by default. A global "Reset all" returns every driver to its saved value. A clearly separated "Save these values to scenario" button persists the trial values via the existing scenario PATCH route (`PATCH /api/projects/[id]/scenarios/[sid]`), passing the full input through the existing Zod validation.

### 14.2 "How the model works" explainer

A collapsible section on the same page explaining each calculation in plain English — no formulas. Short paragraphs with small inline examples using the scenario's own numbers, covering:

- How revenue comes from yield × area × harvest spread × price.
- How monthly costs come from the seasonal cost base with per-category scaling and annual inflation.
- How rent is a share of harvest-year gross (default 10%) paid once in October.
- How the loan auto-draws to cover shortfalls, charges monthly interest, and repays by cash sweep from the repayment start month.
- What DSCR means.

### 14.3 Sensitivity view — "What matters most"

On the same page (as a tab or section): a **tornado chart**. For each driver in 14.1, run the engine at −10% and +10% of its saved value (clamped to the guardrails) and plot the resulting change in the chosen metric as horizontal bars, sorted by impact, with the baseline in the middle (zero line). A toggle switches the metric between **5-yr EBITDA** and **peak loan balance**. Caption in plain language: "The longest bars are the assumptions that matter most — small changes there move the result the most." All computed client-side with the existing engine.

### 14.4 Rules

- **No changes to any formula in `src/engine/`.** A pure helper for "run the engine with overridden inputs" may be added (it must remain free of Next.js/Prisma/React imports, like the rest of the engine).
- No DB schema changes; nothing new is persisted except via the existing scenario PATCH route.
- The existing 21 engine acceptance tests must still pass; component-level tests only if trivial.
- Reuse the design system components and the chart-card pattern; every element gets the same plain-language caption treatment as the dashboard.
- Use pnpm for all commands.