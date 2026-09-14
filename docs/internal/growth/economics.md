# B57 — Offline unit economics

Run from the repository: `python -B scripts/business_model.py`. The JSON output
includes the base case and 1k, 10k, 25k, 50k and 100k active-user scenarios.
No dependency installation, network call, public founder page or spreadsheet
service is needed. Edit a private copy of `economics-assumptions.json`, then run
`python -B scripts/business_model.py --assumptions private-founder/economics.json`.
Output goes to the terminal; save privately if desired. This does not authorize
spending. The checked-in template is not an actual budget.

All amounts are SEK/month unless named `domainAnnual`, which is divided by 12.
The default 129 SEK and 25% VAT are editable test assumptions, not a price offer
or tax determination. Zero conversion is intentionally neutral, not a forecast;
zero expenses mean unfilled assumptions, not free real-world operations. Enter
actual domain/hosting/software bills, even if paid personally. No vendor prices,
fee rates, audience size or conversion rate are claimed as facts.

Base paying users = explicit `payingUsers`, or floor(active×conversionPercent/100)
when null. Five scenario rows always use the conversion hypothesis, not the base
override. Paying users cannot exceed active users; counts/rates/costs must be
finite nonnegative numbers. Negative contribution is allowed and useful.

## Formulas and scope

- Subscription gross = price including VAT × paying users.
- Subscription ex VAT = gross / (1 + subscriptionVatPercent/100).
- Secondary revenue inputs (sponsorship, affiliate, ads) are ex VAT; gross applies
  a separate editable `secondaryVatPercent`. If tracks have different tax treatment,
  use a reviewed blended rate for the aggregate or run separate cases. This model
  does not prepare invoices or tax returns.
- Revenue/month including modeled VAT = subscription gross + secondary gross.
  Revenue ex VAT = subscription ex VAT + secondary ex VAT. Modeled output VAT
  is the difference; it is not net VAT payable.
- Payment fees = gross subscription × fee percent + paying users × per-payment
  fee (assumes one successful monthly transaction per payer). Enter refunds,
  failed collections, international surcharges or sponsor collection fees in a
  separate conservative scenario/cost base; they are not modeled automatically.
- Each variable category = monthly base + active users × per-active rate + paying
  users × per-payer rate. Enter AI requests×cost, data access/overages, notification
  messages×cost, GB storage/bandwidth×cost, and support minutes/60×hourly opportunity
  cost in those effective rates. Both populations may have costs: a payer is also
  active, so do not double-count the same usage.
- Gross contribution = revenue ex VAT − variable costs. Fixed costs = annual
  domain/12 + monthly hosting + SaaS + accounting + legal + administration +
  owner-selected software. Do not duplicate a hosting allowance under bandwidth.
- Approximate operating surplus before salary/tax = contribution − fixed costs.
  Support is an economic time allowance even when no cash salary is paid; subtract
  only additional owner salary later to avoid counting that time twice.
- Contribution per additional payer = price ex VAT − percentage/flat payment
  fee − all per-paying-user variable rates. At fixed traffic and secondary revenue,
  break-even users = ceil((fixed + monthly variable bases + active costs − secondary
  revenue)/payer contribution). If numerator ≤0, zero payers already covers costs;
  if contribution ≤0 with a positive gap, output is null (no finite break-even).
  `breakEvenWithinActiveUsers` shows whether the required count is feasible at that
  traffic. If payer contribution is negative, more payers can worsen surplus even
  where secondary revenue initially covers costs; read that output too.

Use three private variants: zero secondary revenue downside, owner-estimated
base, and increased support/data-usage case. Change one assumption at a time;
compare 79/129/199 and realistic cost ceilings. No conversion scenario is evidence
until validated. Linear costs cannot represent tier jumps, minimum contracts,
enterprise exchange licensing or capacity limits; enter each tier as a separate
scenario and quote it before purchasing. This is operating contribution, not cash
flow, annual profit, investment advice or a tax/legal guarantee. VAT treatment,
input VAT recoverability, cross-border sales and salary/company taxes require
qualified review before a business/payment launch.
