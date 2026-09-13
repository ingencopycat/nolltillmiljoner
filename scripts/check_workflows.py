"""Run pinned actionlint in a temporary directory, with verified release hashes."""
import hashlib
import io
import os
from pathlib import Path
import platform
import subprocess
import tarfile
import tempfile
import urllib.request
import zipfile

VERSION = '1.7.7'
PACKAGES = {
    'Windows': ('windows_amd64.zip', '7f12f1801bca3d480d67aaf7774f4c2a6359a3ca8eebe382c95c10c9704aa731'),
    'Linux': ('linux_amd64.tar.gz', '023070a287cd8cccd71515fedc843f1985bf96c436b7effaecce67290e7e0757'),
}

def main():
    if platform.machine().lower() not in ('amd64','x86_64') or platform.system() not in PACKAGES:
        raise SystemExit('Install actionlint 1.7.7 for this platform and run actionlint -shellcheck="" -pyflakes="" manually.')
    package, digest = PACKAGES[platform.system()]
    url = f'https://github.com/rhysd/actionlint/releases/download/v{VERSION}/actionlint_{VERSION}_{package}'
    data = urllib.request.urlopen(url, timeout=30).read()
    if hashlib.sha256(data).hexdigest() != digest:
        raise SystemExit('actionlint release checksum mismatch')
    name = 'actionlint.exe' if platform.system() == 'Windows' else 'actionlint'
    with tempfile.TemporaryDirectory(prefix='ntm-actionlint-') as directory:
        binary = Path(directory)/name
        if package.endswith('.zip'):
            with zipfile.ZipFile(io.BytesIO(data)) as archive:
                binary.write_bytes(archive.read(name))
        else:
            with tarfile.open(fileobj=io.BytesIO(data),mode='r:gz') as archive:
                binary.write_bytes(archive.extractfile(name).read())
        os.chmod(binary, 0o700)
        subprocess.run([str(binary), '-shellcheck=', '-pyflakes='],
                       cwd=Path(__file__).resolve().parents[1], check=True)
    print('PASS: actionlint ' + VERSION + ' workflow syntax and expressions')

if __name__ == '__main__':
    main()
