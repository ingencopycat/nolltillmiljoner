"""Run the weekly publication regression suite in Python/CI validation too."""
import os
import shutil
import subprocess
import unittest
from pathlib import Path

class WeeklyEventsTests(unittest.TestCase):
    def test_weekly_publication_contracts(self):
        node = os.environ.get('NODE_BINARY') or shutil.which('node')
        self.assertIsNotNone(node, 'Node is required for weekly validation')
        subprocess.run([node, '--test', 'tests/weekly-events.test.cjs'], cwd=Path(__file__).resolve().parents[1], check=True)
