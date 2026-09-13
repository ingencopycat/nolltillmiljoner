import os
from pathlib import Path
import shutil
import subprocess
import unittest


class LocalDataTests(unittest.TestCase):
    def test_backup_and_deletion_workflows(self):
        node = os.environ.get('NODE_BINARY') or shutil.which('node')
        self.assertTrue(node, 'Node.js is required')
        result = subprocess.run([node, '--test', 'tests/local-data.test.cjs'],
                                cwd=Path(__file__).resolve().parents[1],
                                capture_output=True, text=True, encoding='utf-8', timeout=60)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
