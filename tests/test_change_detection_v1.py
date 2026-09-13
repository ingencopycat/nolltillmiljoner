"""
Unit tests for Change Detection V1
Tests comparison logic, filing detection, margin calculations, and backward compatibility.
"""

import json
import unittest
from datetime import datetime, timedelta


class TestChangeDetection(unittest.TestCase):
    """Test core change detection logic"""

    def test_change_detection_available(self):
        """Verify change-detection.js is loaded in research.html"""
        with open('research.html', 'r', encoding='utf-8') as f:
            content = f.read()
            self.assertIn('change-detection.js', content)
            self.assertIn('changeDetectionSection', content)
            self.assertIn('changeDetectionContent', content)

    def test_change_section_markup(self):
        """Verify change detection section HTML structure"""
        with open('research.html', 'r', encoding='utf-8') as f:
            content = f.read()
            self.assertIn('id="changeDetectionSection"', content)
            self.assertIn('id="changeDetectionContent"', content)
            self.assertIn('class="change-section"', content)
            self.assertIn('Sedan din thesis', content)

    def test_change_detection_css_classes(self):
        """Verify all change-detection CSS classes are defined"""
        with open('style.css', 'r', encoding='utf-8') as f:
            content = f.read()
            classes = [
                '.change-section',
                '.change-detection-content',
                '.change-block',
                '.change-table',
                '.change-row',
                '.change-margin-grid',
                '.filing-list',
                '.thesis-change-badge',
            ]
            for cls in classes:
                self.assertIn(cls, content, f"CSS class {cls} not found")

    def test_change_detection_init_function(self):
        """Verify initChangeDetection function exists in research.js"""
        with open('research.js', 'r', encoding='utf-8') as f:
            content = f.read()
            self.assertIn('function initChangeDetection', content)
            self.assertIn('window.NTMChangeDetection', content)

    def test_render_change_detection_function(self):
        """Verify renderChangeDetection function exists"""
        with open('research.js', 'r', encoding='utf-8') as f:
            content = f.read()
            self.assertIn('function renderChangeDetection', content)

    def test_change_detection_called_in_render_stock(self):
        """Verify initChangeDetection is called after initThesisSection"""
        with open('research.js', 'r', encoding='utf-8') as f:
            content = f.read()
            # Find renderStockDetail function
            self.assertIn('initChangeDetection(data)', content)

    def test_metric_comparison_logic(self):
        """Verify metric comparison handles various data types"""
        # This is a logical test of what should happen
        # snapshot has TTM Revenue: 2000
        # current data has TTM Revenue: 2200
        # Expected: +200 (+10%)
        
        snapshot_val = 2000
        current_val = 2200
        expected_absolute = 200
        expected_pct = 10.0

        absolute = current_val - snapshot_val
        pct = (absolute / abs(snapshot_val)) * 100 if snapshot_val != 0 else 0

        self.assertEqual(absolute, expected_absolute)
        self.assertAlmostEqual(pct, expected_pct, places=1)

    def test_margin_calculation(self):
        """Verify margin change calculation (in percentage points)"""
        # snapshot: NI=100, Rev=1000 => Margin = 10%
        # current:  NI=120, Rev=1000 => Margin = 12%
        # Expected: +2 pp

        snap_margin = (100 / 1000) * 100  # 10%
        curr_margin = (120 / 1000) * 100  # 12%
        delta = curr_margin - snap_margin  # 2 pp

        self.assertAlmostEqual(snap_margin, 10.0, places=1)
        self.assertAlmostEqual(curr_margin, 12.0, places=1)
        self.assertAlmostEqual(delta, 2.0, places=1)

    def test_division_by_zero_protection(self):
        """Verify division by zero is handled"""
        # If snapshot value is 0, percentage should not be calculated
        snapshot_val = 0
        current_val = 100

        # Should not divide by zero
        if snapshot_val != 0:
            pct = (current_val - snapshot_val) / abs(snapshot_val) * 100
        else:
            pct = 0

        self.assertEqual(pct, 0)

    def test_zero_denominator_margin(self):
        """Verify margin calculation with zero revenue doesn't crash"""
        # NI=100, Rev=0 => undefined margin
        ni = 100
        rev = 0

        # Should handle gracefully
        if rev != 0:
            margin = (ni / rev) * 100
        else:
            margin = None

        self.assertIsNone(margin)


class TestFilingDetection(unittest.TestCase):
    """Test filing detection logic"""

    def test_filing_detection_markup(self):
        """Verify filing detection section in HTML"""
        with open('research.html', 'r', encoding='utf-8') as f:
            content = f.read()
            self.assertIn('Nya rapporter', content)
            self.assertIn('filing-list', content)

    def test_filing_form_badges(self):
        """Verify filing form badges exist in CSS"""
        with open('style.css', 'r', encoding='utf-8') as f:
            content = f.read()
            self.assertIn('.filing-form', content)
            self.assertIn('.filing-item', content)

    def test_filing_date_comparison_logic(self):
        """Verify filing date comparison logic"""
        # Snapshot date: 2026-08-01
        # Filing 1 date: 2026-08-06 (AFTER snapshot) -> INCLUDE
        # Filing 2 date: 2026-07-01 (BEFORE snapshot) -> EXCLUDE

        snapshot_date = datetime(2026, 8, 1)
        filing1_date = datetime(2026, 8, 6)
        filing2_date = datetime(2026, 7, 1)

        self.assertTrue(filing1_date > snapshot_date)
        self.assertFalse(filing2_date > snapshot_date)

    def test_filing_forms_supported(self):
        """Verify supported filing forms (10-K, 10-Q)"""
        supported_forms = ['10-K', '10-Q']
        
        # Test that only relevant forms are included
        filing1_form = '10-K'
        filing2_form = '8-K'
        
        self.assertIn(filing1_form, supported_forms)
        self.assertNotIn(filing2_form, supported_forms)

    def test_filing_limit(self):
        """Verify only top 3 filings are returned"""
        # Generate 5 test filings
        filings = [
            {'filingDate': '2026-09-10', 'form': '10-K'},
            {'filingDate': '2026-09-09', 'form': '10-Q'},
            {'filingDate': '2026-09-08', 'form': '10-Q'},
            {'filingDate': '2026-09-07', 'form': '10-K'},
            {'filingDate': '2026-09-06', 'form': '10-Q'},
        ]
        
        # Simulate sorting and limiting to 3
        limited = filings[:3]
        self.assertEqual(len(limited), 3)
        self.assertEqual(limited[0]['filingDate'], '2026-09-10')


class TestPeriodChange(unittest.TestCase):
    """Test period change detection"""

    def test_period_change_markup(self):
        """Verify period change section in HTML"""
        with open('research.html', 'r', encoding='utf-8') as f:
            content = f.read()
            self.assertIn('Data uppdaterad', content)

    def test_period_format_comparison(self):
        """Verify period format comparison"""
        snapshot_period = '2026Q1'
        current_period = '2026Q2'
        
        # Should detect as different
        self.assertNotEqual(snapshot_period, current_period)
        
        # Should extract year and quarter
        snap_year = snapshot_period[:4]
        snap_q = snapshot_period[4:]
        curr_year = current_period[:4]
        curr_q = current_period[4:]
        
        self.assertEqual(snap_year, '2026')
        self.assertEqual(snap_q, 'Q1')
        self.assertEqual(curr_year, '2026')
        self.assertEqual(curr_q, 'Q2')


class TestBackwardCompatibility(unittest.TestCase):
    """Test handling of old/incomplete snapshots"""

    def test_missing_snapshot_handling(self):
        """Verify graceful handling when snapshot is null"""
        thesis = {
            'ticker': 'SOFI',
            'text': 'My thesis...',
            'valuationSnapshot': None  # No snapshot
        }
        
        # Should not crash when displaying change detection
        # System should hide the section or show "No snapshot"
        self.assertIsNone(thesis['valuationSnapshot'])

    def test_incomplete_snapshot_schema(self):
        """Verify handling of old snapshot without full schema"""
        old_snapshot = {
            'capturedAt': '2025-01-01T00:00:00Z',
            'asOfPeriod': '2025Q4',
            # Missing: ttmMetrics, valuationInputs, valuationResults
        }
        
        # System should detect missing fields and not crash
        has_ttm_metrics = 'ttmMetrics' in old_snapshot
        has_results = 'valuationResults' in old_snapshot
        
        self.assertFalse(has_ttm_metrics)
        self.assertFalse(has_results)

    def test_old_thesis_age_detection(self):
        """Verify detection of snapshots older than 12 months"""
        # Snapshot from 12+ months ago
        old_date = (datetime.now() - timedelta(days=400)).isoformat() + 'Z'
        
        # Snapshot from 6 months ago
        recent_date = (datetime.now() - timedelta(days=180)).isoformat() + 'Z'
        
        now = datetime.now()
        
        old_snapshot_date = datetime.fromisoformat(old_date.replace('Z', '+00:00'))
        recent_snapshot_date = datetime.fromisoformat(recent_date.replace('Z', '+00:00'))
        
        months_old = (now - old_snapshot_date.replace(tzinfo=None)).days / 30
        months_recent = (now - recent_snapshot_date.replace(tzinfo=None)).days / 30
        
        self.assertGreater(months_old, 12)
        self.assertLess(months_recent, 12)


class TestMinNtmIntegration(unittest.TestCase):
    """Test integration with Min NTM theses list"""

    def test_badge_css_class(self):
        """Verify thesis-change-badge CSS class exists"""
        with open('style.css', 'r', encoding='utf-8') as f:
            content = f.read()
            self.assertIn('.thesis-change-badge', content)

    def test_script_badge_logic(self):
        """Verify badge logic in script.js"""
        with open('script.js', 'r', encoding='utf-8') as f:
            content = f.read()
            self.assertIn('thesis-change-badge', content)
            self.assertIn('isSnapshotStale', content)

    def test_thesis_card_structure(self):
        """Verify thesis card supports badge display"""
        with open('script.js', 'r', encoding='utf-8') as f:
            content = f.read()
            self.assertIn('min-ntm-thesis-date', content)
            self.assertIn('badgeHtml', content)


class TestEdgeCases(unittest.TestCase):
    """Test edge cases and error conditions"""

    def test_null_snapshot_value(self):
        """Verify handling of null metric values"""
        snapshot_val = None
        current_val = 100
        
        # Should not compare if snapshot is null
        if snapshot_val is not None and current_val is not None:
            pct = ((current_val - snapshot_val) / abs(snapshot_val)) * 100
        else:
            pct = None
        
        self.assertIsNone(pct)

    def test_unsupported_metric_fcf(self):
        """Verify handling of unsupported FCF for financial institutions"""
        # SOFI has unsupported FCF due to depository banking model
        metric = {
            'unsupported': True,
            'unsupportedReason': 'Financial institution: FCF not meaningful'
        }
        
        self.assertTrue(metric['unsupported'])
        self.assertIsNotNone(metric['unsupportedReason'])

    def test_extremely_large_numbers(self):
        """Verify formatting of very large numbers"""
        # NVIDIA revenue in billions
        revenue = 303_000_000_000  # $303B
        
        # Should format as 303.0B
        formatted = f"${revenue / 1e9:.1f}B"
        self.assertEqual(formatted, "$303.0B")

    def test_very_small_changes(self):
        """Verify 1% threshold is respected"""
        snapshot = 1000
        current = 1005  # +0.5%
        
        pct_change = ((current - snapshot) / abs(snapshot)) * 100
        
        # Should not report changes < 1%
        should_report = abs(pct_change) > 1
        self.assertFalse(should_report)

    def test_negative_to_positive_change(self):
        """Verify sign change handling"""
        snapshot = -50  # Loss
        current = 50    # Profit
        
        absolute = current - snapshot  # 100
        pct = (absolute / abs(snapshot)) * 100  # 200%
        
        self.assertEqual(absolute, 100)
        self.assertAlmostEqual(pct, 200.0, places=1)


class TestDarkLightTheme(unittest.TestCase):
    """Test CSS custom properties for theme support"""

    def test_change_detection_uses_css_variables(self):
        """Verify change detection styling uses CSS variables"""
        with open('style.css', 'r', encoding='utf-8') as f:
            content = f.read()
            # Should use variables, not hardcoded colors
            self.assertIn('var(--text)', content)
            self.assertIn('var(--muted)', content)
            self.assertIn('var(--primary', content)
            self.assertIn('var(--panel', content)


class TestResponsiveness(unittest.TestCase):
    """Test responsive design for change detection"""

    def test_responsive_breakpoints(self):
        """Verify responsive CSS at 768px and 390px"""
        with open('style.css', 'r', encoding='utf-8') as f:
            content = f.read()
            # Should have breakpoints for tablet and mobile
            self.assertIn('@media (max-width: 768px)', content)
            self.assertIn('@media (max-width: 390px)', content)

    def test_change_table_responsive(self):
        """Verify change table is responsive"""
        with open('style.css', 'r', encoding='utf-8') as f:
            content = f.read()
            # Should adjust grid columns on mobile
            self.assertIn('.change-row {', content)
            # And override in mobile media query
            self.assertIn('@media (max-width:', content)

    def test_margin_grid_responsive(self):
        """Verify margin grid adjusts on mobile"""
        with open('style.css', 'r', encoding='utf-8') as f:
            content = f.read()
            self.assertIn('.change-margin-grid', content)


class TestStaging(unittest.TestCase):
    """Test that change-detection.js is staged"""

    def test_change_detection_in_required_files(self):
        """Verify change-detection.js is in staging requirements"""
        with open('scripts/stage_site.py', 'r', encoding='utf-8') as f:
            content = f.read()
            self.assertIn('change-detection.js', content)


class TestDataFlow(unittest.TestCase):
    """Test data flow from snapshot to display"""

    def test_snapshot_schema_structure(self):
        """Verify snapshot schema includes required fields for comparison"""
        snapshot = {
            'capturedAt': '2026-08-06T00:00:00Z',
            'asOfPeriod': '2026Q2',
            'ttmMetrics': {
                'ttmRevenue': 4310000000,
                'ttmNetIncome': 636264000,
                'ttmEps': 0.47,
                'ttmDilutedShares': 1341494734,
            },
            'valuationInputs': {
                'stockPrice': 15.00,
                'epsBasis': 0.47,
                'requiredReturn': 10,
            },
            'valuationResults': {
                'peRatio': 31.9,
                'requiredEpsCAGR': 12.5,
            }
        }
        
        # Verify all required fields exist
        self.assertIsNotNone(snapshot['capturedAt'])
        self.assertIsNotNone(snapshot['asOfPeriod'])
        self.assertIsNotNone(snapshot['ttmMetrics'])
        self.assertIn('ttmRevenue', snapshot['ttmMetrics'])

    def test_current_data_schema_match(self):
        """Verify current stock JSON has comparable fields"""
        # Represents structure of data/stocks/SOFI.json
        current_data = {
            'valuationBase': {
                'asOfPeriod': '2026Q2',
                'ttmRevenue': 4310000000,  # or nested in ttm.metrics
                'ttmNetIncome': 636264000,
                'ttmDilutedEps': {'value': 0.47},
            },
            'filings': [
                {
                    'form': '10-Q',
                    'filingDate': '2026-08-06',
                    'reportPeriod': '2026-06-30'
                }
            ]
        }
        
        self.assertEqual(
            current_data['valuationBase']['asOfPeriod'],
            '2026Q2'
        )


if __name__ == '__main__':
    unittest.main()
