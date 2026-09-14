"""Executable local decision lifecycle contracts."""
from pathlib import Path
import os
import shutil
import subprocess
import unittest

class LifecycleTests(unittest.TestCase):
    def test_lifecycle_contracts(self):
        root = Path(__file__).resolve().parents[1]
        node = os.environ.get('NODE_BINARY') or shutil.which('node')
        self.assertIsNotNone(node, 'Node is required')
        result = subprocess.run([node, '--test', 'tests/lifecycle.test.cjs'], cwd=root,
                                capture_output=True, text=True, encoding='utf-8')
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
