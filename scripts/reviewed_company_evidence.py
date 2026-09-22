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
from inline_evidence import numeric_facts, select_fact

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
    if 'xbrl' in recipe:
        return {'kind': 'point', 'approximate': recipe.get('approximate', False), 'point': recipe['xbrl']['value']}
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
                number = raw.replace(',', '').replace(' ', '')
                if number.startswith('(') and number.endswith(')'): number = '-' + number[1:-1]
                value[key] = float(Decimal(number) * Decimal(str(recipe.get('scale', 1))))
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
        document = review['document']
        if event is not None:
            if document['documentType'] == 'periodic_filing':
                if event['primaryDocUrl'] != document['url'] or event['form'] not in ('10-Q','10-K'):
                    raise ValueError('Reviewed periodic filing relationship changed')
            elif not any(all(d.get(k)==document.get(k) for k in ('url','accessionNumber','exhibit','documentType','relationship','relationshipSource')) for d in event['documents']):
                raise ValueError('Reviewed exhibit relationship changed')
        html = fetch_html(document['url'])
        text = visible(html)
        facts = numeric_facts(html) if any('xbrl' in r for r in review['observations']) else []
        sources.append(dict(accessionNumber=review['accessionNumber'], url=document['url'],
                            documentSha256=digest(text), reviewDate=reviews['reviewDate']))
        for recipe in review['observations']:
            if 'xbrl' in recipe:
                fact = select_fact(facts, recipe['xbrl'], feed['cik'])
                if fact != recipe['xbrl'] or digest(json.dumps(fact,sort_keys=True)) != recipe['xbrlSha256']:
                    raise ValueError('Reviewed XBRL fact changed')
            item = {k: copy.deepcopy(recipe[k]) for k in ('kind','metricId','issuerLabel','label','unit','currency','period','basis','definitionVersion','definition','note')}
            item.update(id=f"{ticker}:{review['accessionNumber']}:{recipe['key']}", ticker=ticker,
                        cik=feed['cik'], publicationDate=review['publicationDate'], value=extract(recipe,text),
                        source=dict(url=document['url'], accessionNumber=review['accessionNumber'], exhibit=document['exhibit'],
                                    quote=recipe['quote'], quoteSha256=recipe['quoteSha256'], contexts=recipe['contexts']),
                        review=dict(status='reviewed', method='pinned-passage-deterministic', date=reviews['reviewDate']))
            if recipe['kind'] == 'business_mix':
                for key in ('category','group','recast'): item[key] = copy.deepcopy(recipe[key])
                item['source']['documentType'] = document['documentType']
            if recipe['kind'] == 'capital':
                item['capital'] = copy.deepcopy(recipe['capital'])
                item['source']['documentType'] = document['documentType']
                if 'xbrl' in recipe:
                    item['source']['xbrl'] = copy.deepcopy(recipe['xbrl'])
                    item['source']['xbrlSha256'] = recipe['xbrlSha256']
                    item['review']['method'] = 'pinned-inline-xbrl-deterministic'
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
            or any(o[k] != recipe[k] for k in ('kind','metricId','issuerLabel','label','unit','currency','period','basis','definitionVersion','definition','note'))
            or o['value'] != parse_value(recipe)):
            raise ValueError('Observation differs from reviewed extraction')
        if o['kind'] == 'business_mix':
            if (o['source'].get('documentType') != document['document']['documentType']
                or o['source']['exhibit'] != document['document']['exhibit']):
                raise ValueError('Changed business document provenance')
            if any(o.get(k) != recipe.get(k) for k in ('category','group','recast')):
                raise ValueError('Changed business category scope')
            if o['category']['role'] not in ('category','total','reconciliation') or o['group']['type'] not in ('reportable_segment','market_platform','revenue_category','geography'):
                raise ValueError('Invalid business classification')
            if o['value']['kind'] != 'point' or o['period']['type'] != 'quarter' or not o['period'].get('start'):
                raise ValueError('Unsupported business period/value')
        if o['kind'] == 'capital':
            if (o.get('capital') != recipe.get('capital') or o['source'].get('documentType') != document['document']['documentType']
                or o['source']['exhibit'] != document['document']['exhibit']
                or o['review']['method'] != ('pinned-inline-xbrl-deterministic' if 'xbrl' in recipe else 'pinned-passage-deterministic')):
                raise ValueError('Changed capital scope or provenance')
            if 'xbrl' in recipe and (o['source'].get('xbrl') != recipe['xbrl'] or o['source'].get('xbrlSha256') != recipe['xbrlSha256'] or digest(json.dumps(recipe['xbrl'],sort_keys=True)) != recipe['xbrlSha256']):
                raise ValueError('Changed structured fact provenance')
            if o['capital']['sectorBasis'] not in ('industrial','bank') or not o['capital']['scope'] or not o['capital']['shareBasis']:
                raise ValueError('Missing capital comparison basis')
            end=date.fromisoformat(o['period']['end'])
            if end>date.fromisoformat(o['publicationDate']):raise ValueError('Future capital period')
            start=o['period'].get('start')
            if o['period']['type']=='instant':
                if start is not None:raise ValueError('Instant fact has duration')
            elif not start or not (80 <= (end-date.fromisoformat(start)).days+1 <= (99 if o['period']['type']=='quarter' else 370)):
                raise ValueError('Invalid capital duration')
            if 'xbrl' in recipe:
                f=recipe['xbrl']
                if f['cik']!=cik or f['start']!=start or f['end']!=o['period']['end'] or f['unit']!=('shares' if o['unit']=='count' else o['unit']):
                    raise ValueError('Structured fact scope mismatch')
        if o['kind'] not in ('guidance','kpi','business_mix','capital') or o['review']['status']!='reviewed':
            raise ValueError('Unreviewed observation')
        date.fromisoformat(o['publicationDate'])
        if o['period']['end']: date.fromisoformat(o['period']['end'])
        if o['period']['type'] not in ('quarter','annual','instant','year_to_date') or not o['definitionVersion'] or not o['basis']:
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
    validate_business_groups(data['observations'])
    return data


def validate_business_groups(observations):
    """A mix is publishable only as a complete, source-bound, reconciled group."""
    groups = {}
    for o in observations:
        if o['kind'] != 'business_mix': continue
        start = date.fromisoformat(o['period']['start']); end = date.fromisoformat(o['period']['end'])
        if not 80 <= (end-start).days+1 <= 99 or end > date.fromisoformat(o['publicationDate']):
            raise ValueError('Invalid business reporting period')
        key = (o['ticker'],o['group']['id'],o['period']['end'],o['source']['accessionNumber'])
        groups.setdefault(key, []).append(o)
    for records in groups.values():
        first = records[0]; group = first['group']; ids = [o['category']['id'] for o in records]
        expected = group['members'] + [group['totalId']]
        if len(ids) != len(set(ids)) or set(ids) != set(expected) or len(ids) != len(expected):
            raise ValueError('Missing or duplicate business category')
        if any(o['group'] != group or o['period'] != first['period'] or o['currency'] != first['currency'] or o['unit'] != first['unit'] or o['basis'] != first['basis'] for o in records):
            raise ValueError('Mixed business category scope')
        total = next(o for o in records if o['category']['id'] == group['totalId'])
        if total['category']['role'] != 'total' or total['value']['point'] <= 0:
            raise ValueError('Invalid business mix total')
        if any(o['value']['point'] < 0 for o in records if o['category']['role'] == 'category'):
            raise ValueError('Negative operating category revenue')
        summed = sum(o['value']['point'] for o in records if o['category']['role'] in ('category','reconciliation'))
        if abs(summed-total['value']['point']) > 1:
            raise ValueError('Business mix does not reconcile')
