"""Offline founder planning in SEK/month. No network, payments or private storage reads."""
import argparse
import json
import math
from pathlib import Path

DEFAULTS = Path(__file__).resolve().parents[1] / 'docs/internal/growth/economics-assumptions.json'
CATEGORIES = ('aiApi', 'dataApi', 'emailNotifications', 'storage', 'bandwidth', 'support')
FIXED = ('domainAnnual', 'hosting', 'saas', 'accounting', 'legal', 'companyAdministration', 'ownerSoftware')
SECONDARY = ('sponsorship', 'affiliate', 'ads')


def number(value, label, maximum=None, integer=False):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value < 0:
        raise ValueError(f'{label}: expected a finite nonnegative number')
    if maximum is not None and value > maximum:
        raise ValueError(f'{label}: exceeds {maximum}')
    if integer and value != int(value):
        raise ValueError(f'{label}: expected a whole user count')
    return value


def calculate(config, active_users=None):
    """Break-even holds active traffic and secondary revenue constant; no growth forecast."""
    active = number(config['activeUsers'] if active_users is None else active_users, 'activeUsers', integer=True)
    price = number(config['subscriptionPriceIncludingVat'], 'subscriptionPriceIncludingVat')
    vat = number(config['subscriptionVatPercent'], 'subscriptionVatPercent', 100) / 100
    secondary_vat = number(config['secondaryVatPercent'], 'secondaryVatPercent', 100) / 100
    conversion = number(config['conversionPercent'], 'conversionPercent', 100) / 100
    explicit = config['payingUsers']
    paying = math.floor(active * conversion) if explicit is None else number(explicit, 'payingUsers', active, True)
    payment_rate = number(config['paymentFees']['percentOfSubscriptionGross'], 'payment fee percent', 100) / 100
    payment_flat = number(config['paymentFees']['perMonthlyPayment'], 'payment flat fee')
    secondary = {k: number(config['secondaryRevenueExVat'][k], k) for k in SECONDARY}
    fixed = {k: number(config['fixedCostsExVat'][k], k) for k in FIXED}
    fixed['domainMonthly'] = fixed.pop('domainAnnual') / 12
    costs = {}
    active_costs = 0
    per_payer = price * payment_rate + payment_flat
    for category in CATEGORIES:
        row = config['variableCostsExVat'][category]
        base = number(row['monthlyBase'], category + '.monthlyBase')
        per_active = number(row['perActiveUser'], category + '.perActiveUser')
        unit = number(row['perPayingUser'], category + '.perPayingUser')
        costs[category] = base + active * per_active + paying * unit
        active_costs += base + active * per_active
        per_payer += unit
    gross_subscription = paying * price
    costs['paymentFees'] = paying * (price * payment_rate + payment_flat)
    secondary_total = sum(secondary.values())
    ex_vat = gross_subscription / (1 + vat) + secondary_total
    gross = gross_subscription + secondary_total * (1 + secondary_vat)
    variable = sum(costs.values())
    fixed_total = sum(fixed.values())
    contribution = ex_vat - variable
    marginal = price / (1 + vat) - per_payer
    gap = fixed_total + active_costs - secondary_total
    if not all(math.isfinite(v) for v in (gap, marginal, gross, ex_vat, variable, fixed_total)):
        raise ValueError('Model overflow; reduce assumptions')
    if gap > 0 and marginal > 0 and not math.isfinite(gap / marginal):
        raise ValueError('Break-even overflow; reduce assumptions')
    # None means no finite paying-user count closes the gap at these assumptions.
    break_even = 0 if gap <= 0 else math.ceil(gap / marginal) if marginal > 0 else None
    result = dict(activeUsers=active, payingUsers=paying,
                  subscriptionRevenueIncludingVat=gross_subscription,
                  secondaryRevenueExVat=secondary_total, revenueMonthIncludingVat=gross,
                  revenueExVat=ex_vat, modeledOutputVat=gross - ex_vat,
                  variableCosts=costs, variableCost=variable, grossContribution=contribution,
                  fixedCosts=fixed, fixedCost=fixed_total,
                  operatingSurplusBeforeSalaryTax=contribution - fixed_total,
                  contributionPerAdditionalPayingUser=marginal,
                  breakEvenPayingUsers=break_even,
                  breakEvenWithinActiveUsers=break_even is not None and break_even <= active,
                  breakEvenNote='At fixed active traffic and secondary revenue; zero means already covered at zero payers, not that every payer count is profitable.')
    # Overflow must fail explicitly, never produce misleading Infinity JSON.
    def finite(value):
        if isinstance(value, dict):
            for nested in value.values():
                finite(nested)
        elif isinstance(value, (float, int)) and not math.isfinite(value):
            raise ValueError('Model overflow; reduce assumptions')
    finite(result)
    return result


def run(config):
    result = calculate(config)
    # Scenarios use the editable conversion hypothesis; the base alone uses payingUsers override.
    scenario_config = dict(config, payingUsers=None)
    return {'currency': 'SEK/month', 'assumptionsOnly': True, 'base': result,
            'scenarios': [calculate(scenario_config, n) for n in (1000, 10000, 25000, 50000, 100000)]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--assumptions', type=Path, default=DEFAULTS)
    args = parser.parse_args()
    try:
        print(json.dumps(run(json.loads(args.assumptions.read_text(encoding='utf-8'))), indent=2, allow_nan=False))
    except (ValueError, KeyError, TypeError, OverflowError, OSError) as error:
        parser.exit(2, f'Invalid assumptions: {error}\n')


if __name__ == '__main__':
    main()
