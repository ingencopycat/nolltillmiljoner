"""Independent field provenance; never inherit actual's authority for forecasts."""


def set_field(event, field, value, fetched_at, *, kind='provider_derived', source=None, source_url=None):
    event[field] = value
    event.setdefault('fieldProvenance', {})[field] = {
        'kind': kind, 'source': source or event.get('source'),
        'sourceUrl': source_url or event.get('sourceUrl'), 'fetchedAt': fetched_at,
        'methodVersion': 'ntm-macro/1', 'status': 'available',
    }


def complete_fields(event):
    provenance = event.setdefault('fieldProvenance', {})
    for field in ('actual', 'previous', 'forecast'):
        if event.get(field) in (None, ''):
            provenance[field] = {'kind': 'unavailable', 'status': 'unavailable'}
        elif field not in provenance:
            # Legacy values have no verified field-level source; do not invent one.
            provenance[field] = {'kind': 'unknown', 'status': 'available'}
    event['provenanceVersion'] = 1


def status_meta(sources, now, previous):
    states = list(sources.values())
    ok = bool(states) and all(s == 'current' for s in states)
    return {'schemaVersion': 2, 'lastFetchAttempt': now,
            'lastSuccessfulUpdate': now if ok else previous.get('lastSuccessfulUpdate'),
            'lastCompleteFetch': now if ok else previous.get('lastCompleteFetch') if previous.get('schemaVersion') == 2 else None,
            'status': 'ok' if ok else 'partial' if 'current' in states else 'fetch_error',
            'sources': sources}
