# Fråga NTM — FINAL A owner review

Open **http://127.0.0.1:8765/docs/design-exploration/knowledge-ux100/**.

The server is running for this review. To restart from `C:\Users\Mirne\Desktop\investment-site`:

```powershell
python -B -m http.server 8765 --bind 127.0.0.1
```

Direction A is selected. The hub now opens **FINAL A**, the resolved isolated prototype. This is a refinement review, not another A/B/C decision.

1. Ask a question with Enter or the compact upward-arrow button. Ask again after the answer; the composer retains its electric treatment.
2. Inspect **Använd det**, now before **Fortsätt utforska**. Open a real product link separately and return to the unchanged answer tab.
3. Select **Sök · tomt**, then **Sök · PE**. Blank Search has no inventory; queried Search has relevant, bounded results without paging. **Utforska** retains browsing.
4. Switch **Vy** to 360, 390 and 430, and both themes. The shorter placeholder keeps the same comfortable size as entered text.
5. **Öppna separat** gives FINAL A its own tab for browser Back/Forward. **Visa tidigare A bredvid** is available only for historical comparison; B/C remain in the version selector as history.
6. Review the final resolution for acceptance. Production Knowledge UX has not been changed.

[FINAL A screenshots](final-a-gallery.html) · [Final resolution and implementation implications](FINAL-A.md) · [Current validation](final-a-validation.json)

[Historical A/B/C report](REPORT.md) · [Historical gallery](gallery.html)

To rebuild public fixture projections and the local static answer page:

```powershell
& 'C:/Users/Mirne/AppData/Local/Programs/Python/Python314/Lib/site-packages/playwright/driver/node.exe' docs/design-exploration/knowledge-ux100/build.cjs
```

To rerun local checks with the server running (Playwright 1.62.0 and bundled Chromium):

```powershell
python -B docs/design-exploration/knowledge-ux100/final_a_measure.py
python -B docs/design-exploration/knowledge-ux100/final_a_validate.py
git diff --check
```

`capture_pass1.py`, `validate.py`, `review_checks.py`, the existing `pass1-*.png` files and the original validation outputs belong to the historical exploration. Use the FINAL A commands above for the selected resolution; do not overwrite historical captures with FINAL A.

All artifacts stay in this directory. No production implementation, analytics integration, content editing, commit, push or deployment is included.
