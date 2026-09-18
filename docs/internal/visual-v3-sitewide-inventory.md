# Site-wide V3 migration map

Inventory before implementation: 122 root HTML routes; 121 styled product pages and one redirect. Machine-readable route, stylesheet and class inventory: `docs/qa/visual-v3/sitewide/inventory.json`.

| Batch | Existing owner / route family | Findings and migration |
|---|---|---|
| A shell/primitives | style.css, premium.css, visual-v3-tokens.css; every styled route | V2 palette and action overrides, sans headings, 7–18px radii, green legacy literals. Promote approved production tokens to shared ownership; preserve navigation and account behavior. |
| B homepage | index.html, ntm-today / product-intro | Nested panel surfaces, competing feature buttons, boxed market context. Open editorial introduction and ruled data sections; preserve event priority/count logic and widgets. |
| C calculators/directory | 30 general templates, calculator-card/results/depth-panel | Shared formula UI already has progressive depth. Use open input/result composition, serif financial hierarchy, unified controls. Keep assumptions and calculator-specific chart/table layouts. |
| D personal workspace | min-ntm.html | Repeated account-style card shells. Give attention/continuation sections visual priority and secondary infrastructure quiet separators. |
| E learning | 59 academy.css templates; build_academy.cjs | Rounded roadmap, progress and exercise cards compete equally. Editorial lesson width and serif lead; quiet XP, distinct active learning, ruled exercises. Preserve completion logic. |
| F knowledge | 27 knowledge.css templates; build_knowledge.cjs | Search and retrieval already deterministic; short answer boxed and mixed input geometry. Promote question/search and immediate answer; retain collapsed categories and sources. |
| G social | konto/profil/upptack, social.css | Healthy account already simplified; rounded fields/dialogs and card shells remain. Shared canonical controls, report-oriented list titles, quiet profile metadata. |
| H data | makro/rapporter and generated week/archive content | Multiple nested data panels and legacy colored treatments. Open calendar rows and restrained status; preserve verification and incomplete-coverage language. |
| I editorial/trust | om-metod, posts, resources, community | Article cards, creator panels, inconsistent reading widths. Editorial reading and source hierarchy, independent resource entities retained. |
| J cleanup/QA | generators, shared CSS, browser suites | Update generator output, remove superseded palette ownership, verify all routes and representative states in both themes and mobile. |

The approved Research/Thesis/Public Analysis route-specific CSS and renderer are reference owners, not rewrite targets. No product logic, copy truth, formulas, database, data or publication changes planned. Current IA remains unchanged. Existing cards are retained for independent selectable resources, warnings and dialogs; ordinary article/form sections use rules and space.
