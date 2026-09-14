"""Founder model arithmetic, source inventory and public/private boundaries."""
import json
from pathlib import Path
import re
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from business_model import calculate, run, DEFAULTS
from stage_site import stage_site, find_missing_local_references


class BusinessModelTests(unittest.TestCase):
    def setUp(self):
        self.c = json.loads(DEFAULTS.read_text())

    def test_vat_contribution_and_break_even_matches_operating_surplus(self):
        c = self.c
        c.update(subscriptionPriceIncludingVat=125, payingUsers=10)
        c['paymentFees'].update(percentOfSubscriptionGross=2, perMonthlyPayment=1)
        c['variableCostsExVat']['support']['perPayingUser'] = 6.5
        c['variableCostsExVat']['bandwidth']['perActiveUser'] = .1
        c['variableCostsExVat']['dataApi']['monthlyBase'] = 100
        c['fixedCostsExVat'].update(domainAnnual=1200, accounting=700)
        c['secondaryRevenueExVat']['sponsorship'] = 100
        r = calculate(c)
        self.assertEqual(r['revenueMonthIncludingVat'], 1375)
        self.assertEqual(r['revenueExVat'], 1100)
        self.assertEqual(r['variableCost'], 300)
        self.assertEqual(r['grossContribution'], 800)
        self.assertEqual(r['fixedCost'], 800)
        self.assertEqual(r['operatingSurplusBeforeSalaryTax'], 0)
        self.assertEqual(r['breakEvenPayingUsers'], 10)
        c['payingUsers'] = 9
        self.assertLess(calculate(c)['operatingSurplusBeforeSalaryTax'], 0)

    def test_unreachable_break_even_and_negative_marginal(self):
        self.c['fixedCostsExVat']['hosting'] = 100
        self.c['variableCostsExVat']['support']['perPayingUser'] = 200
        self.assertIsNone(calculate(self.c)['breakEvenPayingUsers'])
        self.c['secondaryRevenueExVat']['ads'] = 200
        self.assertEqual(calculate(self.c)['breakEvenPayingUsers'], 0)
        self.c['payingUsers'] = 10
        self.assertLess(calculate(self.c)['operatingSurplusBeforeSalaryTax'], 0)
        self.c['variableCostsExVat']['support']['perPayingUser'] = 0
        self.c['secondaryRevenueExVat']['ads'] = 0
        self.c['fixedCostsExVat']['hosting'] = 1_000_000
        self.assertFalse(calculate(self.c)['breakEvenWithinActiveUsers'])

    def test_all_scenarios_use_editable_conversion_not_base_override(self):
        self.c.update(payingUsers=9, conversionPercent=2)
        r = run(self.c)
        self.assertEqual(r['base']['payingUsers'], 9)
        self.assertEqual([s['activeUsers'] for s in r['scenarios']], [1000, 10000, 25000, 50000, 100000])
        self.assertEqual([s['payingUsers'] for s in r['scenarios']], [20, 200, 500, 1000, 2000])
        self.c.update(activeUsers=0, payingUsers=0, subscriptionPriceIncludingVat=0)
        self.assertEqual(calculate(self.c)['revenueExVat'], 0)

    def test_invalid_inputs_and_overflow_fail(self):
        for key, value in [('activeUsers', -1), ('payingUsers', 1001), ('payingUsers', 1.5),
                           ('subscriptionPriceIncludingVat', float('inf')), ('subscriptionVatPercent', 101),
                           ('activeUsers', True), ('conversionPercent', '2')]:
            c = dict(self.c, **{key: value})
            with self.subTest(key=key, value=value), self.assertRaises(ValueError):
                calculate(c)
        self.c['variableCostsExVat']['aiApi']['perActiveUser'] = 1e308
        with self.assertRaises(ValueError):
            calculate(self.c)


class ReadinessBoundaryTests(unittest.TestCase):
    def test_licenses_cover_current_calendar_publishers_and_evidence_paths(self):
        registry = json.loads((DEFAULTS.parent / 'data-licenses.json').read_text(encoding='utf-8'))['sources']
        required = {'provider', 'dataset', 'currentUse', 'classification', 'publicDisplay', 'caching',
                    'redistribution', 'derivedData', 'aiUse', 'attribution', 'geographicMarketRestrictions',
                    'rateLimits', 'pricingModel', 'commercialUseStatus', 'contractRequired', 'owner',
                    'reviewDate', 'nextReview', 'notesRisk', 'repositoryEvidence', 'termsEvidence'}
        self.assertEqual(len({s['id'] for s in registry}), len(registry))
        for source in registry:
            self.assertTrue(required <= source.keys(), source['id'])
            for path in source['repositoryEvidence']:
                self.assertTrue((ROOT / path).exists(), path)
        publishers = set(re.findall(r'"source": "([^"]+)"', (ROOT / 'data/weekly-events.js').read_text(encoding='utf-8')))
        names = {s['provider'] for s in registry}
        self.assertTrue(all(p in names or p.startswith('Earnings Whispers') for p in publishers))
        self.assertEqual(next(s for s in registry if s['id'] == 'fred')['redistribution'], 'Needs verification')

    def test_internal_assets_not_staged_or_linked_from_public_pages(self):
        with tempfile.TemporaryDirectory(prefix='ntm-growth-stage-') as target:
            stage_site(target)
            staged = Path(target)
            for name in ['docs', 'scripts', 'tests', 'private-founder', 'economics-assumptions.json']:
                self.assertFalse((staged / name).exists())
            self.assertEqual(find_missing_local_references(target), [])
            for html in staged.glob('*.html'):
                text = html.read_text(encoding='utf-8')
                self.assertNotRegex(text, r'(?:href|src)=[\"\'][^\"\']*(?:docs/internal|private-founder|business_model)')
        template = json.loads((DEFAULTS.parent / 'pilot-tracker.template.json').read_text())
        self.assertTrue(template['templateOnly'])
        self.assertEqual(template['participants'], [])

    def test_company_seo_keeps_existing_hub_and_three_static_entries(self):
        html = (ROOT / 'research.html').read_text(encoding='utf-8')
        self.assertIn('<link rel="canonical" href="https://nolltillmiljoner.se/research.html"', html)
        for ticker in ['NVDA', 'SOFI', 'CRWD']:
            self.assertIn('research.html?ticker=' + ticker, html)
        self.assertIn('https://nolltillmiljoner.se/research.html', (ROOT / 'sitemap.xml').read_text())

    def test_reminders_have_no_notification_or_analytics_transports(self):
        source = (ROOT / 'min-review.js').read_text(encoding='utf-8')
        for forbidden in ['NTMEvents', 'sendBeacon', 'Notification(', 'serviceWorker', 'XMLHttpRequest',
                          'localStorage.setItem', 'https://', 'webhook', 'apiKey']:
            self.assertNotIn(forbidden, source)
        community = (ROOT / 'community.html').read_text(encoding='utf-8')
        self.assertIn('https://discord.gg/wvvDZ6CeCY', community)
        self.assertNotIn('discord.com/api/webhooks', community)


if __name__ == '__main__':
    unittest.main()
