# Knowledge Bank V1

The public area is **Frågor & svar**, at `fragor-svar.html` under **Lär dig**. It gives a direct answer to one question; Academy remains the structured learning journey. The 26 initial entries are editorial seed questions, never represented as real user submissions.

## Authoring contract

`docs/internal/knowledge/catalog.cjs` is the canonical editorial source. Add one `entry(...)` call, following an existing entry, and reference shared sources by ID. It supplies stable `id`, `slug`, `question`, `shortAnswer`, `fullAnswer`, optional `example`, `caveats`, category, concepts, aliases, related entity/lesson IDs, sources, review/publication dates, difficulty and status. The helper's initial defaults apply to the reviewed seed batch; a new draft must explicitly override status and dates until it is reviewed. Keep `id` and `slug` stable after publication.

Use the public structure: direct short answer; plain explanation; a useful worked example; important limitations; Academy and tool links; sources/method. These are short original answers, not copies of full lessons. Questions should describe a broadly useful concept rather than a private portfolio or a request for a personal buy/sell recommendation. Use “Kärnfrågor” for editorial selections; do not claim popularity without evidence.

Source records carry title, HTTPS URL and review date. Use the underlying issuer/standard setter, regulator, public authority or first-party product definition. Distinguish a universal definition from one provider's convention: the Fidelity glossary, for example, documents a particular PEG/forward metric convention. Mathematical examples are independently checked NTM illustrations, not figures attributed to real issuers. The guidance source is an example of an issuer's own outlook; its reported numbers are not copied into the synthetic exercise.

## Editorial states

| State | Public catalog/search/pages | Search indexing |
| --- | --- | --- |
| `draft` | Excluded | Excluded |
| `reviewed` | Included after content/source validation | `noindex, follow`; no sitemap entry |
| `published` | Included after content/source validation | Indexable canonical page and sitemap entry |
| `needs-update` | Excluded | Excluded |

Changing a status is an editorial action; no browser action can publish content. The CLI build materializes the chosen state when deliberately run. `--check` is read-only. Review dates must be real dates, not future dates; published entries need a publication date no later than the latest review date. The quality gate checks minimum useful answer structure, unique IDs/slugs, classification, source metadata and lesson references. Connected Experience validates entity/concept/destination integrity. These checks do not replace an editor's substantive review.

When moving a previously public entry to a hidden state or changing its slug, explicitly retire its old generated HTML file as part of the edit. The generator rejects orphan answer files rather than allowing a stale page to remain silently publishable. Review inbound links and run staging/SEO validation before release. Do not simply hand-edit a generated page.

`internalEditorialNotes` stays in the editorial source. `knowledge-core.js` projects an allowlist of public fields and strips source-level notes as well. `knowledge-catalog.js` is generated from that projection. Production staging excludes `docs/`, `scripts/` and tests, so drafts/private notes are neither linked nor included in public JavaScript. The earlier empty `docs/internal/academy/knowledge-bank.json` is a legacy V2 review fixture, not a second public Q&A catalog. Add new public answers only to the canonical catalog above; do not duplicate entries into the old fixture.

## Review workflow

For a future real question: the owner receives it privately, removes identifying or financial details that are unnecessary, and may send the generalized question to ChatGPT to draft an answer. The owner/reviewer then checks definitions, arithmetic, assumptions, source support and current rules; writes or corrects the catalog entry; marks it reviewed; and makes a separate publication decision. Update an Academy explanation or add a canonical relation if the question reveals a useful learning gap.

The seed batch received source and arithmetic review during implementation by Codex; there is no claim that an independent human already reviewed it. Dates record that implementation review. Future owner reviews should update the actual date and note the reviewer/checks internally, never invent a reviewer identity.

For each review, verify the short answer directly answers the question, examples reconcile, units/periods match, caveats prevent likely misreadings, source links support the intended claims, and destinations remain useful. A date change is not a substitute for reviewing content. Stable definitions can receive periodic review; changed standards or known errors should trigger immediate review. Tax/rule topics require their registry's more specific deadline.

ISK uses `ruleId: 'isk'`. The answer contains no copied tax allowance or annual rate. The generated notice takes effective year, source, verification date and next-review date from `data/rule-registry.json` and links to the existing calculator. Missing/unverified/overdue rules fail generation. Maintain that registry through the existing rule-review process.

## Building and testing

Run `node scripts/build_seo.cjs` to build the sanitized catalog, landing, answer pages, Academy FAQ links, navigation and metadata. `scripts/build_knowledge.cjs` renders the shared layout; `scripts/knowledge_quality.cjs` validates editorial data; `scripts/knowledge_source.cjs` gives Node consumers the same public projection without exposing internal notes. No many-page manual edits are needed.

`ntm-relations.js` owns question → lesson/tool and lesson → question relations, using `knowledge-<id>` entity IDs and the existing `learn` type. Academy's “Vanliga frågor” selects up to four relevant questions through the same relation query. Q&A pages use canonical destinations for “Lär dig mer” and “Relaterat i NTM”. Knowledge Bank browsing does not grant Academy XP or change progress/backup data.

Search is client-side. It matches normalized question text, aliases, concepts and category, ignoring case and Swedish diacritics and normalizing P/E. Multiple search terms must all match. Alias matches are ranked by the catalog API; the public list retains its accessible category grouping while hiding nonmatches. Category links also work as section anchors without JavaScript. Clear returns focus to search; no-result text and counts are announced through a status region.

Search text is not put in URLs, storage or analytics. Events are name-only `knowledge_search`, `knowledge_answer_opened`, and `knowledge_related_cta_clicked`, through the existing bounded memory-only event module. No question ID or answer content is sent with them. There is no question submission form, network search, AI request or paid API.

Validate with `python -B scripts/validate_release.py`, `python -B scripts/browser_smoke.py`, and `python -B scripts/quality_browser.py --output <report.json>`. Use `NODE_BINARY` if Node is not on PATH and `NTM_BROWSER_CHANNEL=msedge` for the installed browser. Focused contracts are in `tests/knowledge.test.cjs`.

## Future reuse and moderation

Stable IDs, separated answer sections, concepts, source URLs and review dates support future retrieval chunks, FAQ fallback and evaluation fixtures. Retrieve only the public reviewed projection; never index internal notes or draft text. Carry the source/review metadata with retrieved content, and define separate evaluation prompts/expected outcomes when needed. No runtime retrieval service, AI tutor or automated publication exists in V1.

A future “Ställ en fråga” flow should accept a question into a private moderated queue, filter spam and personal information, generalize broadly useful questions, draft an answer, review it, and deliberately publish. Define retention/deletion and moderation responsibilities before collecting submissions. User text must never turn directly into HTML, a public entry or an AI prompt with secrets. This is documentation for a future capability, not a public V1 flow.
