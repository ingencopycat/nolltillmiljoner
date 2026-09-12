#!/usr/bin/env python3
"""Stage the public static site and fail when a required file is missing."""

import os
import re
import shutil
import sys


WORKSPACE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REQUIRED_FILES = [
    'index.html', 'makro.html', 'rapporter.html', 'verktyg.html', 'inlagg.html',
    'post.html', 'resurser.html', 'community.html', 'min-ntm.html', 'calculator.html',
    'investeringar.html', 'ranta-pa-ranta.html',
    'fire-kalkylator.html', 'sparmalskalkylator.html', 'avgifter.html',
    'havstang.html', 'aterhamtning.html', 'bolanekalkylator.html',
    'isk-skattkalkylator.html', 'aktievarderingskalkylator.html',
    'avkastningskalkylator.html', 'aktiekopskalkylator.html',
    'valutajusterad-avkastning.html',
    'script.js', 'style.css', 'posts.js', 'week-pages.js', 'CNAME'
]
REQUIRED_DIRECTORIES = ['data', 'images']
OPTIONAL_FILES = ['robots.txt', 'sitemap.xml']
PRODUCTION_ROOT_EXTENSIONS = ('.html', '.css', '.js')


def find_missing_local_references(site_root):
    """Return local HTML/CSS/JS references that are absent from a staged site."""
    missing = set()
    for root, _, files in os.walk(site_root):
        for filename in files:
            if not filename.endswith(PRODUCTION_ROOT_EXTENSIONS):
                continue
            source_path = os.path.join(root, filename)
            with open(source_path, 'r', encoding='utf-8') as source_file:
                content = source_file.read()
            if filename.endswith('.html'):
                references = re.findall(r'''(?:src|href)=["']([^"']+)["']''', content, re.IGNORECASE)
                reference_root = os.path.dirname(source_path)
            elif filename.endswith('.css'):
                references = re.findall(r'''url\(\s*["']?([^"')]+)''', content, re.IGNORECASE)
                reference_root = os.path.dirname(source_path)
            else:
                references = re.findall(r'''["'](\.?/?(?:images|data)/[^"'` )}]+)["']''', content, re.IGNORECASE)
                reference_root = site_root

            for reference in references:
                clean_reference = reference.split('?', 1)[0].split('#', 1)[0]
                if (not clean_reference or any(token in clean_reference for token in ('$', '{', '}', '(', ')'))
                        or clean_reference.startswith(('#', '/', '//'))
                        or re.match(r'^[a-z][a-z0-9+.-]*:', clean_reference, re.IGNORECASE)):
                    continue
                referenced_path = os.path.normpath(os.path.join(reference_root, clean_reference))
                if not os.path.isfile(referenced_path):
                    missing.add(os.path.relpath(referenced_path, site_root))
    return sorted(missing)


def stage_site(destination):
    missing_files = [
        name for name in REQUIRED_FILES
        if not os.path.isfile(os.path.join(WORKSPACE_DIR, name))
    ]
    missing_directories = [
        name for name in REQUIRED_DIRECTORIES
        if not os.path.isdir(os.path.join(WORKSPACE_DIR, name))
    ]
    missing = missing_files + missing_directories
    if missing:
        raise FileNotFoundError(
            'Missing mandatory site artifacts: ' + ', '.join(missing)
        )

    os.makedirs(destination, exist_ok=True)
    for name in os.listdir(destination):
        path = os.path.join(destination, name)
        if os.path.isdir(path) and not os.path.islink(path):
            shutil.rmtree(path)
        else:
            os.remove(path)

    root_files = [
        name for name in os.listdir(WORKSPACE_DIR)
        if os.path.isfile(os.path.join(WORKSPACE_DIR, name))
        and name.endswith(PRODUCTION_ROOT_EXTENSIONS)
    ]
    for name in sorted(set(root_files + OPTIONAL_FILES + ['CNAME'])):
        source = os.path.join(WORKSPACE_DIR, name)
        if os.path.isfile(source):
            shutil.copy2(source, os.path.join(destination, name))

    for name in REQUIRED_DIRECTORIES:
        shutil.copytree(
            os.path.join(WORKSPACE_DIR, name),
            os.path.join(destination, name),
            ignore=shutil.ignore_patterns('bls-schedule.ics')
        )


if __name__ == '__main__':
    target = sys.argv[1] if len(sys.argv) > 1 else os.path.join(WORKSPACE_DIR, '_site')
    stage_site(os.path.abspath(target))