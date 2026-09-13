"""Read-only release checks; staging is isolated in a disposable directory."""
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
from stage_site import stage_site, find_missing_local_references

ROOT = Path(__file__).resolve().parents[1]

def main():
    node = os.environ.get('NODE_BINARY') or shutil.which('node')
    if not node:
        raise SystemExit('Node is required (or set NODE_BINARY).')
    commands = [
        [sys.executable, '-B', '-m', 'unittest', 'discover', '-s', 'tests', '-p', 'test_*.py'],
        [node, '--test', *[str(p.relative_to(ROOT)) for p in sorted((ROOT/'tests').glob('*.test.cjs'))]],
        [node, 'scripts/build_seo.cjs', '--check'],
        [node, 'scripts/check_calendar_coverage.cjs'],
        [node, 'scripts/check_rules.cjs'],
        ['git', '-c', 'core.safecrlf=false', 'diff', '--check'],
    ]
    for command in commands:
        print('RUN', ' '.join(command), flush=True)
        subprocess.run(command, cwd=ROOT, check=True)
    with tempfile.TemporaryDirectory(prefix='ntm-release-') as directory:
        stage_site(directory)
        missing = find_missing_local_references(directory)
        if missing:
            raise SystemExit(str(missing))
    print('PASS: release tests, generated artifacts, calendar/rules, staging and local references')

if __name__ == '__main__':
    main()
