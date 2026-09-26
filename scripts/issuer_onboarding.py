"""Offline candidate composition and rollback-safe activation of reviewed issuer packages.

Capture/review precedes this module. It never guesses a mapping or fetches a source.
"""
import json
import subprocess
import sys
from pathlib import Path
from company_evidence import refresh, validate_evidence
from company_insiders import refresh as insiders
from company_ownership import refresh as ownership
from company_material_events import refresh as material
from reviewed_company_evidence import build
from evidence_sources import source, accession_from_url
from issuer_registry import load, identities


def read(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))


def compose(root, ticker):
    """Use only prepared, reviewed, reproducible inputs in this candidate checkout."""
    root=Path(root); fixtures=root/'tests/fixtures'; reviews=root/'scripts/source_reviews'
    cik=identities(load(root))[ticker]
    fetch=lambda folder,url:source(fixtures,folder,accession_from_url(url),'.xml' if url.endswith('.xml') else '.html')
    index=read(fixtures/'company_evidence'/f'{ticker}.json')
    feed=refresh(index,ticker,cik,lambda url:fetch('company_evidence',url))
    # Source fragments reproduce the relationship, while the manifest pins the full source hash.
    manifest=read(fixtures/'company_evidence/manifest.json')['fixtures']
    for event in feed['events']:
        if event['documents']:
            entry=next(x for x in manifest if x['file']==event['accessionNumber']+'.html')
            event['documents'][0]['sourceSha256']=entry['sourceSha256']
    feed['reviewedEvidence']=build(feed,lambda url:fetch('company_observations',url),read(reviews/'company_observations.json'))
    for folder,key,parser in [('company_insiders','insiderEvidence',insiders),('company_ownership','ownershipEvidence',ownership),('company_material_events','materialEvents',material)]:
        feed[key]=parser(read(fixtures/folder/f'{ticker}.json'),ticker,cik,lambda url,folder=folder:fetch(folder,url),policy=read(reviews/(folder+'.json')))
    decision=read(reviews/'issuer_coverage.json')['issuers'][ticker]
    if set(decision['layers'])!={'reporting','guidance','kpi','businessMix','capital','insiders','ownership','events'}:
        raise ValueError('Incomplete coverage decision')
    allowed={'verified','checked_bounded_absence','not_applicable','partial','review_required','engineering_gap'}
    if any(r['state'] not in allowed or not r['scope'] for r in decision['layers'].values()):
        raise ValueError('Invalid coverage disposition')
    feed.update(status='verified',verifiedAt=decision['checkedAt'],coverageDecision=decision)
    validate_evidence(feed,ticker,cik)
    return feed


def activate(candidate, destination, relative_paths):
    """Validate combined candidate, reject concurrent edits, restore all writes on failure.

    This is local rollback, not a filesystem transaction. Release still validates and
    publishes one Git revision; activation itself never commits or deploys.
    """
    candidate,destination=Path(candidate).resolve(),Path(destination).resolve()
    paths=tuple(Path(p) for p in relative_paths)
    if len(paths)!=len(set(paths)) or any(p.is_absolute() or '..' in p.parts for p in paths):
        raise ValueError('Invalid package path')
    subprocess.run([sys.executable,'-B','scripts/issuer_registry.py','--check'],cwd=candidate,check=True)
    subprocess.run([sys.executable,'-B','scripts/evidence_sources.py'],cwd=candidate,check=True)
    before={p:(destination/p).read_bytes() if (destination/p).exists() else None for p in paths}
    payload={p:(candidate/p).read_bytes() for p in paths}
    written=[]
    try:
        for p,content in payload.items():
            target=destination/p
            if (target.read_bytes() if target.exists() else None)!=before[p]:
                raise ValueError('Destination changed during activation')
            target.parent.mkdir(parents=True,exist_ok=True)
            written.append(p)
            target.write_bytes(content)
    except Exception:
        for p in reversed(written):
            content=before[p]
            if content is None:(destination/p).unlink(missing_ok=True)
            else:(destination/p).write_bytes(content)
        raise
