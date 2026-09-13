import os
from pathlib import Path
import re
import shutil
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]

class ReleaseQualityTests(unittest.TestCase):
    def test_validation_permission_and_command_boundaries(self):
        for name in ('validation.yml', 'browser-smoke.yml'):
            text = (ROOT/'.github/workflows'/name).read_text()
            self.assertIn('permissions: {}', text)
            self.assertIn('pull_request:', text)
            self.assertIn('persist-credentials: false', text)
            self.assertNotRegex(text, r': write\b|secrets\.|pull_request_target|git push|deploy-pages|update_stocks|update_macro')
            self.assertEqual(re.findall(r'      ([\w-]+): (read|write)', text), [('contents','read')])
        text = (ROOT/'.github/workflows/validation.yml').read_text()
        for command in ('validate_release.py','browser_smoke.py','quality_browser.py','git diff --check'):
            self.assertIn(command,text)
        runner=(ROOT/'scripts/validate_release.py').read_text()
        for command in ('unittest','--test','build_seo.cjs','--check','check_calendar_coverage.cjs','check_rules.cjs','find_missing_local_references','TemporaryDirectory'):
            self.assertIn(command,runner)

    def test_executable_rule_and_security_contracts(self):
        node=os.environ.get('NODE_BINARY') or shutil.which('node')
        result=subprocess.run([node,'--test','tests/release-quality.test.cjs'],cwd=ROOT,capture_output=True,text=True,encoding='utf-8')
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)

    def test_maintained_decision_records(self):
        for file,terms in {
            'calculator-quality.md':['CalcState','rounding','zero','stress'],
            'product-decision.md':['user problem','maintenance','stop','Connected Experience'],
            'architecture-operations.md':['localStorage','SEC','secrets','backup','review queue'],
            'release-discipline.md':['branch protection','quality','screen reader','CSP']
        }.items():
            text=(ROOT/'docs'/file).read_text(encoding='utf-8')
            for term in terms:self.assertIn(term,text)
