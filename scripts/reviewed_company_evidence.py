"""Reviewed, deterministic passages attached to the existing SEC evidence feed.

Recipes are allowlisted reviews, never discovery rules. New documents require a
new review. Numbers are parsed from pinned official text, not entered estimates.
"""
import copy
import hashlib
import json
import math
import re
from decimal import Decimal
from datetime import date
from pathlib import Path
from company_evidence import Structure

SCHEMA = 'ntm-reviewed-observations/1'
REVIEWS = Path(__file__).parent / 'source_reviews/company_observations.json'


def digest(text):
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


def visible(html):
    if not isinstance(html, str) or not re.search(r'<(?:html|div|p|table)\b', html, re.I):
        raise ValueError('Malformed source')
    parser = Structure(); parser.feed(html)
    return ' '.join(' '.join(parser.text).split())


def extract(recipe, text):
    quote = recipe['quote']
    if text.count(quote) != 1 or digest(quote) != recipe['quoteSha256']:
        raise ValueError('Reviewed passage missing, changed or ambiguous')
    for context in recipe['contexts']:
        if context not in text:
            raise ValueError('Period or definition context changed')
    return parse_value(recipe)


def parse_value(recipe):
    quote = recipe['quote']
    value = {'kind': recipe['valueKind'], 'approximate': recipe.get('approximate', False)}
    if value['kind'] == 'qualitative':
        value['text'] = quote
    elif value['kind'] != 'withdrawn':
        matches = list(re.finditer(recipe['pattern'], quote))
        if len(matches) != 1:
            raise ValueError('Missing or ambiguous metric')
        for key, raw in matches[0].groupdict().items():
            if raw is not None:
                value[key] = float(Decimal(raw.replace(',', '')) * Decimal(str(recipe.get('scale', 1))))
        if 'tolerance' in value:
            tolerance = value.pop('tolerance') / recipe.get('scale', 1)
            delta = value['point'] * tolerance / 100 if recipe['toleranceKind'] == 'relative_percent' else tolerance / 100
            value.update(lower=round(value['point']-delta, 8), upper=round(value['point']+delta, 8))
    return value


def build(feed, fetch_html, reviews=None):
    reviews = reviews or json.loads(REVIEWS.read_text(encoding='utf-8'))
    ticker = feed['ticker']; observations = []; sources = []
    recipes = [r for r in reviews['documents'] if r['ticker'] == ticker]
    for review in recipes:
        # Historical reviewed documents remain in the bounded review registry even
        # after SEC's recent window rolls forward. Their original relationship is pinned.
        event = next((e for e in feed['events'] if e['accessionNumber'] == review['accessionNumber']), None)
        if event is not None and not any(all(d.get(k)==review['document'].get(k) for k in ('url','accessionNumber','exhibit','documentType','relationship','relationshipSource')) for d in event['documents']):
            raise ValueError('Reviewed exhibit relationship changed')
        document = review['document']
        text = visible(fetch_html(document['url']))
        sources.append(dict(accessionNumber=review['accessionNumber'], url=document['url'],
                            documentSha256=digest(text), reviewDate=reviews['reviewDate']))
        for recipe in review['observations']:
            item = {k: copy.deepcopy(recipe[k]) for k in ('kind','metricId','issuerLabel','label','unit','currency','period','basis','definitionVersion','definition','note')}
            item.update(id=f"{ticker}:{review['accessionNumber']}:{recipe['key']}", ticker=ticker,
                        cik=feed['cik'], publicationDate=review['publicationDate'], value=extract(recipe,text),
                        source=dict(url=document['url'], accessionNumber=review['accessionNumber'], exhibit=document['exhibit'],
                                    quote=recipe['quote'], quoteSha256=recipe['quoteSha256'], contexts=recipe['contexts']),
                        review=dict(status='reviewed', method='pinned-passage-deterministic', date=reviews['reviewDate']))
            observations.append(item)
    observations.sort(key=lambda o:(o['publicationDate'],o['id']))
    known={r['accessionNumber'] for r in recipes}
    pending=[e['accessionNumber'] for e in feed['events'] if e['classification']=='results_disclosure' and e['filingDate']>max(r['publicationDate'] for r in recipes) and e['accessionNumber'] not in known]
    result=dict(schema=SCHEMA, observations=observations, sources=sources, pendingReview=pending,
                coverage=reviews['coverage'][ticker], reviewRegistrySha256=digest(json.dumps(reviews,sort_keys=True)))
    validate(result,ticker,feed['cik'],reviews)
    return result


def validate(data,ticker,cik,reviews=None):
    if data.get('schema') != SCHEMA or not isinstance(data.get('observations'),list):
        raise ValueError('Invalid observation schema')
    reviews = reviews or json.loads(REVIEWS.read_text(encoding='utf-8'))
    approved = {f"{d['ticker']}:{d['accessionNumber']}:{r['key']}": (d,r)
                for d in reviews['documents'] for r in d['observations']}
    seen=set()
    for o in data['observations']:
        if o['id'] in seen or o['ticker']!=ticker or o['cik']!=cik:
            raise ValueError('Duplicate or wrong issuer')
        seen.add(o['id'])
        if o['id'] not in approved: raise ValueError('Unknown review identity')
        document, recipe = approved[o['id']]
        if (o['publicationDate'] != document['publicationDate'] or o['source']['url'] != document['document']['url']
            or o['source']['quote'] != recipe['quote'] or o['source']['contexts'] != recipe['contexts']
            or any(o[k] != recipe[k] for k in ('kind','metricId','unit','currency','period','basis','definitionVersion','definition'))
            or o['value'] != parse_value(recipe)):
            raise ValueError('Observation differs from reviewed extraction')
        if o['kind'] not in ('guidance','kpi') or o['review']['status']!='reviewed':
            raise ValueError('Unreviewed observation')
        date.fromisoformat(o['publicationDate'])
        if o['period']['end']: date.fromisoformat(o['period']['end'])
        if o['period']['type'] not in ('quarter','annual','instant') or not o['definitionVersion'] or not o['basis']:
            raise ValueError('Missing comparison basis')
        s=o['source'];acc=s['accessionNumber']
        base=f'https://www.sec.gov/Archives/edgar/data/{int(cik)}/{acc.replace("-", "")}/'
        if not re.fullmatch(r'\d{10}-\d{2}-\d{6}',acc) or not s['url'].startswith(base) or not re.fullmatch(r'[A-Za-z0-9_-]+\.html?',s['url'][len(base):]) or digest(s['quote'])!=s['quoteSha256']:
            raise ValueError('Invalid observation provenance')
        v=o['value'];kind=v['kind']
        if kind not in ('point','range','qualitative','withdrawn'):
            raise ValueError('Invalid value kind')
        required={'point':['point'],'range':['lower','upper'],'qualitative':['text'],'withdrawn':[]}[kind]
        if any(k not in v for k in required): raise ValueError('Missing value')
        if any(not isinstance(v[k],(int,float)) or isinstance(v[k],bool) or not math.isfinite(v[k]) for k in ('point','lower','upper') if k in v): raise ValueError('Invalid number')
        if kind=='range' and v['lower']>v['upper']: raise ValueError('Reversed range')
        if kind=='qualitative' and not v['text']: raise ValueError('Empty qualitative guidance')
    return data
