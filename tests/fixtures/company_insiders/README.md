# SEC ownership fixtures

Downloaded from official SEC EDGAR on 2026-09-22. XML content is retained as retrieved (UTF-8, LF fixture line endings; SHA-256 covers the decoded UTF-8 source text); production normalization omits reporting-owner addresses. The trimmed submissions indexes preserve the selected entries and one older guard entry used to detect coverage gaps. No network access is used by tests.

Coverage starts 2026-09-01. Older examples are selective, not a continuous backfill: SOFI Noto purchase (2026-06-16), NVIDIA Shoquist original (2023-11-28) and footnote-only amendment (2023-12-01). CRWD has no older examples.

P/S codes alone do not establish an exchange venue. None of the selected XML footnotes explicitly confirms an open-market venue; those labels are tested using clearly synthetic in-memory footnotes. The actual filings prove reported purchases/sales, not a more specific venue.

## Source manifest

| Issuer | Accession | Filed | Original XML | SHA-256 |
| --- | --- | --- | --- | --- |
| NVDA | 0001696841-26-000012 | 2026-09-18 | [SEC XML](https://www.sec.gov/Archives/edgar/data/1045810/000169684126000012/wk-form4_1789766007.xml) | `7f70894a4cf331995cf3a1fa40388d6db78b7c19836a834fae28b909d1ceb80c` |
| NVDA | 0001588670-26-000014 | 2026-09-18 | [SEC XML](https://www.sec.gov/Archives/edgar/data/1045810/000158867026000014/wk-form4_1789765959.xml) | `1f019bc438b269561e5c054aec78c42956daa558e4d6bc89a0900c9f532c3afd` |
| NVDA | 0001283854-26-000010 | 2026-09-18 | [SEC XML](https://www.sec.gov/Archives/edgar/data/1045810/000128385426000010/wk-form4_1789766082.xml) | `9030fa885d369e1b4d9d5f1247dd18205e9f233667a710a68f905c623fecfde7` |
| NVDA | 0001243821-26-000007 | 2026-09-18 | [SEC XML](https://www.sec.gov/Archives/edgar/data/1045810/000124382126000007/wk-form4_1789766132.xml) | `3b434b21cb3b6e0d166dfd360fc1fabb67a4b804797be0b6042f08a515d40c23` |
| NVDA | 0001197649-26-000012 | 2026-09-18 | [SEC XML](https://www.sec.gov/Archives/edgar/data/1045810/000119764926000012/wk-form4_1789765856.xml) | `822eaaac11fc1cd84bead616a51b338fc8b5511b763a5ad0ac1e694272cecfab` |
| NVDA | 0002152188-26-000005 | 2026-09-11 | [SEC XML](https://www.sec.gov/Archives/edgar/data/1045810/000215218826000005/wk-form4_1789160684.xml) | `21657169ed85656c099bdd3126f26de59d91b02c9f198d290a966af0ba29a7bc` |
| NVDA | 0001199039-26-000014 | 2026-09-08 | [SEC XML](https://www.sec.gov/Archives/edgar/data/1045810/000119903926000014/wk-form4_1788901755.xml) | `e902c5ae660d258a2606ad30dc7b756adc0f76271d83e319cc0ddabc50a7e5e6` |
| NVDA | 0001197647-26-000009 | 2026-09-04 | [SEC XML](https://www.sec.gov/Archives/edgar/data/1045810/000119764726000009/wk-form4_1788555631.xml) | `2d3af938f865688553a60efb056ef6c5c607712c17112cad294006dd5a4c112f` |
| NVDA | 0001696841-26-000010 | 2026-09-02 | [SEC XML](https://www.sec.gov/Archives/edgar/data/1045810/000169684126000010/wk-form4_1788386836.xml) | `86679077ccf5f0c83f960b34407f5af9d2c8df44f1ff885ffe9368527b4264d7` |
| NVDA | 0001199039-26-000012 | 2026-09-02 | [SEC XML](https://www.sec.gov/Archives/edgar/data/1045810/000119903926000012/wk-form4_1788387031.xml) | `d22cd5d85d32dbf39d62d7d6e599089411c4c11191642ab3618ab8c2dbcb7d33` |
| NVDA | 0001045810-23-000242 | 2023-12-01 | [SEC XML](https://www.sec.gov/Archives/edgar/data/1045810/000104581023000242/wk-form4a_1701480208.xml) | `0c1f0d4f2e657f84d60022f357c6c9e91596b193a151ae6667d808116e3ee25b` |
| NVDA | 0001045810-23-000233 | 2023-11-28 | [SEC XML](https://www.sec.gov/Archives/edgar/data/1045810/000104581023000233/wk-form4_1701218204.xml) | `3188c70ce547007696edd3379615c9df28aeb15e4bfec2d49c12eae852418b61` |
| SOFI | 0002034857-26-000014 | 2026-09-16 | [SEC XML](https://www.sec.gov/Archives/edgar/data/1818874/000203485726000014/wk-form4_1789602153.xml) | `a39e0595f77a8aff4a072dabc87b2e49e8e52ee04d3bf1b2dc63cb2158b04ff3` |
| SOFI | 0002032458-26-000026 | 2026-09-16 | [SEC XML](https://www.sec.gov/Archives/edgar/data/1818874/000203245826000026/wk-form4_1789602326.xml) | `0c05abecf116553c0eb1f2632cccf6cd823f1909d5a302131c63a7d149a777f2` |
| SOFI | 0002012135-26-000023 | 2026-09-16 | [SEC XML](https://www.sec.gov/Archives/edgar/data/1818874/000201213526000023/wk-form4_1789602201.xml) | `7a20b6003a47139f366a1a75990849f293f7473cc5288e9dc9c4d837dc6cb274` |
| SOFI | 0001934200-26-000009 | 2026-09-16 | [SEC XML](https://www.sec.gov/Archives/edgar/data/1818874/000193420026000009/wk-form4_1789602178.xml) | `0754862158f6373dc05c38ebaf8ec75e3f2242c1f0e571f9dc3a98fb27f4dabe` |
| SOFI | 0001864508-26-000008 | 2026-09-16 | [SEC XML](https://www.sec.gov/Archives/edgar/data/1818874/000186450826000008/wk-form4_1789602297.xml) | `229a4651c62c9e8c6023f9364207a32cf922100de6949680d3959d8ad00a0383` |
| SOFI | 0001613438-26-000022 | 2026-09-16 | [SEC XML](https://www.sec.gov/Archives/edgar/data/1818874/000161343826000022/wk-form4_1789602225.xml) | `0287e64b792b23b7a69423a2cd825a7c02373a827f2532c10a44f80c5a1c67af` |
| SOFI | 0001351119-26-000019 | 2026-09-16 | [SEC XML](https://www.sec.gov/Archives/edgar/data/1818874/000135111926000019/wk-form4_1789602272.xml) | `5f9c5ae930d9bf427394aef341c2ba234ff409cae8d0d49dfbeefcd50336548f` |
| SOFI | 0001613438-26-000016 | 2026-06-16 | [SEC XML](https://www.sec.gov/Archives/edgar/data/1818874/000161343826000016/wk-form4_1781640941.xml) | `5fc48ce23c9769d73a2544d2d3856682594745cfd12e64bb8cc16c7157449538` |
| CRWD | 0001872303-26-000008 | 2026-09-21 | [SEC XML](https://www.sec.gov/Archives/edgar/data/1535527/000187230326000008/form4-09212026_080909.xml) | `9112b76ebf69ac68be6a0d691e70873b7675addfb8e190b0944f26f936dc8254` |
| CRWD | 0001778564-26-000165 | 2026-09-21 | [SEC XML](https://www.sec.gov/Archives/edgar/data/1535527/000177856426000165/form4-09212026_080901.xml) | `49c782f8098bdc496d13fa7c89ba7444508a3cb6fa4c1fb9c7413559062da447` |
| CRWD | 0001445832-26-000013 | 2026-09-21 | [SEC XML](https://www.sec.gov/Archives/edgar/data/1535527/000144583226000013/form4-09212026_080903.xml) | `f54e60bc77ff086019c07dcd0b15d50efcb958b6a82ebb8eead2089ef7c5b579` |
| CRWD | 0001319245-26-000014 | 2026-09-21 | [SEC XML](https://www.sec.gov/Archives/edgar/data/1535527/000131924526000014/form4-09212026_080911.xml) | `916bbb9007f7af401f1e306c449adea07ee2e78017fab8ed1d9376f03d14ffec` |
| CRWD | 0001253512-26-000015 | 2026-09-21 | [SEC XML](https://www.sec.gov/Archives/edgar/data/1535527/000125351226000015/form4-09212026_080907.xml) | `1071848d1fc2b7b6431dab1094a340a10dce98421466c66096ab4277e2660438` |
| CRWD | 0001220632-26-000006 | 2026-09-21 | [SEC XML](https://www.sec.gov/Archives/edgar/data/1535527/000122063226000006/form4-09212026_080901.xml) | `b763d8c7e0fe9ca87f95c511f1d02334582a8668f99ef9051a08364d92c35ecf` |
| CRWD | 0001201326-26-000023 | 2026-09-21 | [SEC XML](https://www.sec.gov/Archives/edgar/data/1535527/000120132626000023/form4-09212026_080905.xml) | `19ad6112386cd151aa4818abb60c8d596b5aeaeb6e8c7cc730de6cb93441128c` |
| CRWD | 0001778564-26-000163 | 2026-09-17 | [SEC XML](https://www.sec.gov/Archives/edgar/data/1535527/000177856426000163/form4-09172026_080901.xml) | `d3542a638f2310f5405cb53dd490cfd5f5f9de635b6968119de72d86e5b3c961` |
| CRWD | 0001445832-26-000011 | 2026-09-17 | [SEC XML](https://www.sec.gov/Archives/edgar/data/1535527/000144583226000011/form4-09172026_080903.xml) | `aa99f4eceffe982561dc12fe552e22848418a429fcaaa9136d953489f2173cd4` |
| CRWD | 0001778564-26-000161 | 2026-09-15 | [SEC XML](https://www.sec.gov/Archives/edgar/data/1535527/000177856426000161/form4-09152026_080901.xml) | `c28d679beea4cf7220b66f165d5bbf7e0256dc1d252c73da47b3ad9391082801` |
| CRWD | 0001061632-26-000008 | 2026-09-15 | [SEC XML](https://www.sec.gov/Archives/edgar/data/1535527/000106163226000008/form4-09152026_080904.xml) | `78fb04e471bfdf91dc65ce45210b2013040232661f71b9e7c4cfe8ac8539e687` |
| CRWD | 0001778564-26-000159 | 2026-09-11 | [SEC XML](https://www.sec.gov/Archives/edgar/data/1535527/000177856426000159/form4-09112026_080901.xml) | `9315c0c5091c725e73509028d4b0bf97f328024cb7999814618b9b6859755a63` |
| CRWD | 0001778564-26-000157 | 2026-09-09 | [SEC XML](https://www.sec.gov/Archives/edgar/data/1535527/000177856426000157/form4-09092026_080901.xml) | `63f736a61144e9bee5dba0b158a6799e6fc2c3faee8fee5d07d2a22d88990d2f` |
| CRWD | 0001778564-26-000155 | 2026-09-04 | [SEC XML](https://www.sec.gov/Archives/edgar/data/1535527/000177856426000155/form4-09042026_080901.xml) | `80989b3476ef8842b3a24b82a9c4b78a2a9ca7ca457a9430d47984ba5f6125d0` |
| CRWD | 0001778564-26-000153 | 2026-09-02 | [SEC XML](https://www.sec.gov/Archives/edgar/data/1535527/000177856426000153/form4-09022026_080901.xml) | `159c79deebc7b87064097a2896f02ce1af822eb4bcf072d3c552693b08f13900` |
| CRWD | 0001201326-26-000021 | 2026-09-02 | [SEC XML](https://www.sec.gov/Archives/edgar/data/1535527/000120132626000021/form4-09022026_080903.xml) | `b562b80c309c3379fc0e63e162a1727a63ad8d7d0c7d1c92e55e926c04a9a740` |
