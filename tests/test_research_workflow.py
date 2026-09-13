"""Run real browser JavaScript with Node's built-in test runner; no npm dependencies."""
import os
from pathlib import Path
import shutil
import subprocess
import unittest


class TestResearchJavaScriptWorkflow(unittest.TestCase):
    def test_real_javascript_workflow(self):
        node = os.environ.get('NODE_BINARY') or shutil.which('node')
        self.assertTrue(node, 'Node.js 18+ is required. Add node to PATH or set NODE_BINARY to its executable.')
        root = Path(__file__).resolve().parents[1]
        result = subprocess.run(
            [node, '--test', 'tests/research-workflow.test.cjs'],
            cwd=root, capture_output=True, text=True, encoding='utf-8', timeout=60,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


if __name__ == '__main__':
    unittest.main()
