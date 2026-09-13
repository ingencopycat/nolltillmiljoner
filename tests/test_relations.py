"""Keep the connected foundation in the ordinary CI Python entry point."""
import os
from pathlib import Path
import shutil
import subprocess
import unittest


class ConnectedFoundationTests(unittest.TestCase):
    def test_relation_contracts(self):
        node = os.environ.get('NODE_BINARY') or shutil.which('node')
        self.assertTrue(node, 'Node.js is required; set NODE_BINARY or PATH.')
        result = subprocess.run([node, '--test', 'tests/relations.test.cjs'],
                                cwd=Path(__file__).resolve().parents[1], capture_output=True,
                                text=True, encoding='utf-8', timeout=60)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
