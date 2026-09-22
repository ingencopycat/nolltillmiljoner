# Official disclosure fixtures

These twelve inert HTML files contain minimal, normalized visible-text excerpts from the SEC earnings exhibits identified in `scripts/source_reviews/company_observations.json`. Retrieved from the verified existing filing-event relationships on 2026-09-22 through the shared SEC client. The wrappers are fixture markup, not original exhibit layout; no active content is included.

The registry records exact official URL, accession, exhibit, original normalized document hash, reviewed passage hash, supporting contexts and extraction recipe. Source text was whitespace-normalized using `company_evidence.Structure`; punctuation and numeric disclosure text are retained. Tests require extracted observations to match the published feed. Fixture publication is explicitly offline and never promoted to live data.

Scope: NVIDIA four releases November 2025–August 2026; SoFi October 2025–July 2026; CrowdStrike December 2025–August 2026. See the internal report for ambiguities deliberately excluded and definition/split breaks.
