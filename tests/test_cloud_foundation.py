"""Optional cloud assets remain isolated from anonymous workflows and private setup files."""
from pathlib import Path
import os
import re
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from stage_site import stage_site, find_missing_local_references


class CloudFoundationTests(unittest.TestCase):
    def test_executable_sync_contracts(self):
        node = os.environ.get('NODE_BINARY') or shutil.which('node')
        self.assertTrue(node)
        result = subprocess.run([node, '--test', 'tests/cloud-sync.test.cjs'], cwd=ROOT, capture_output=True, text=True, encoding='utf-8')
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_disabled_config_no_secrets_and_no_transient_source_sync(self):
        self.assertIn('enabled: false', (ROOT / 'cloud-config.js').read_text())
        for name in ['cloud-config.js', 'cloud-sync.js', 'cloud-adapter.js', 'cloud-ui.js']:
            text = (ROOT / name).read_text(encoding='utf-8')
            self.assertNotRegex(text, r'sb_secret_[A-Za-z0-9_-]{12,}|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|postgres(?:ql)?://[^\s]+')
            self.assertNotIn('console.', text)
            self.assertNotIn('NTMEvents', text)
        sync = (ROOT / 'cloud-sync.js').read_text()
        self.assertNotIn('data/stocks/', sync)
        self.assertNotIn('data/weekly-events', sync)
        adapter = (ROOT / 'cloud-adapter.js').read_text()
        self.assertNotIn('localStorage', adapter)
        self.assertNotIn('sessionStorage', adapter)

    def test_public_staging_excludes_backend_tests_and_internal_material(self):
        with tempfile.TemporaryDirectory(prefix='ntm-cloud-stage-') as target:
            stage_site(target)
            for path in ['supabase', 'tests', 'docs', 'scripts', '.env', 'private-founder']:
                self.assertFalse((Path(target) / path).exists())
            self.assertEqual(find_missing_local_references(target), [])
            public = '\n'.join(p.read_text(encoding='utf-8') for p in Path(target).glob('*.js'))
            self.assertNotIn('TEST-SESSION-', public)
            self.assertNotIn('ntm-browser-fixture', public)
            knowledge = (Path(target) / 'knowledge-catalog.js').read_text(encoding='utf-8')
            self.assertNotIn('internalEditorialNotes', knowledge)
            self.assertNotIn('Editorial seed; source definitions', knowledge)
            self.assertTrue((Path(target) / 'fragor-svar-pe-tal.html').exists())

    def test_schema_ownership_and_function_grant_boundaries(self):
        sql = (ROOT / 'supabase/migrations/202609140001_cloud_foundation.sql').read_text()
        self.assertIn('force row level security', sql)
        self.assertIn('primary key(owner_id,kind,scope,id)', sql)
        self.assertIn('foreign key(owner_id,parent_kind,parent_scope,parent_id)', sql)
        self.assertIn('references auth.users(id) on delete cascade', sql)
        self.assertIn('for select to authenticated', sql)
        self.assertIn('for insert to authenticated', sql)
        self.assertNotRegex(sql, r'grant\s+(?:all|update|delete)\b')
        self.assertEqual(sql.count('security definer'), 1)
        self.assertIn('delete from auth.users where id=uid', sql)
        for function in ['ntm_put_records(jsonb)', 'ntm_export_records()', 'ntm_delete_account()']:
            self.assertIn(f'revoke all on function public.{function} from public,anon', sql)

    @unittest.skipUnless(os.environ.get('PGLITE_MODULE'), 'Optional local PostgreSQL engine: set PGLITE_MODULE; no hosted credentials needed')
    def test_real_postgresql_rls_when_available(self):
        node = os.environ.get('NODE_BINARY') or shutil.which('node')
        result = subprocess.run([node, 'scripts/test_cloud_rls.cjs'], cwd=ROOT, capture_output=True, text=True, encoding='utf-8', timeout=60)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


if __name__ == '__main__':
    unittest.main()
