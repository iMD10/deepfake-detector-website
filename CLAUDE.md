# CLAUDE.md

Project memory. Read this before touching anything. Every number here is measured, not estimated.

## What this is

A site where a visitor uploads a photograph and a vision-language model writes, in prose, what it found in it. Built for KAUST Academy demo day, August 2026.

Five pages. `index.html` is the landing: one locked viewport, the upload, the stage clock and the result panel that opens over it. `method.html`, `results.html`, `team.html` and `paper.html` are the reading document — one section each, on the light paper surface, sharing the header, the mobile sheet and the whole `.sec` type scale. They used to be a single scroll under the landing.

Team: Muhannad Alfwazan, Abdulqader Alfawzan, Ahmed Sayegh, Ziyad Alghamdi, Marwan Alayed.

The thesis, in the team's own words: *most detectors output a score; this one outputs an argument.* Every design decision serves that sentence.

## Stack

Static HTML + `styles.css` + two scripts. No framework, no build step, no bundler, no package.json. Do not add one. Do not convert this to React, Next, Vite, or Tailwind. The document pages are plain files, hand-edited like any other; there is no generator to re-run.

```
index.html          landing: upload, stages, result panel
method.html         \
results.html         |  the reading document, one section each
team.html            |
paper.html          /
404.html
styles.css          every page
main.js             index.html only
nav.js              burger + mobile sheet, the document pages
assets/logo.webp
assets/poster.webp
fonts/DotGothic16-latin.woff2
```

Links between pages are `/method.html`, not `/method`. The `.html` keeps `python -m http.server` working, which is the documented way to review this.

Backend is a separate repo: two live Modal apps, `fakereasoning-inference` and `fakereasoning-api`. This site talks to it over HTTP. Set `API` at the top of `main.js`. With `API = ""` the page runs in demo mode and replays a real recorded run — keep that path working, it is how the site is reviewed without spending GPU time.

## Hard constraints from the code, not from taste

These are settled. Do not design around them, do not offer to add them, do not leave a placeholder for them.

1. **No heatmap, no bounding box, no per-region overlay.** The response contains nothing spatial. Producing one would require attention rollout through a LoRA-wrapped LLaVA with a dual CLIP + DINOv2 encoder in 4-bit. Out of scope.
2. **No confidence score, meter, gauge, percentage, or progress-style certainty bar.** One was built from a logit pass and deliberately deleted for being fragile and unfaithful. `README.md:305` in the backend repo still describes it; that section is stale.
3. **`prediction` is only ever `"real"` or `"fake"`.** No third value, no "uncertain" UI state. If the parse fails the backend raises.
4. **The verdict arrives twice** — once as `prediction`, once as the model's closing sentence. `main.js` strips the closing sentence with a regex and lets the verdict element carry it. Do not remove that strip; do not print both.
5. **The two models write different shapes.** The official model emits `From low-level perspective: … From high-level perspective: …`. The fine-tune emits flat prose. `renderProse()` styles those labels when present and falls back to one paragraph when absent. Any template that assumes the labelled structure breaks the fine-tune.
6. **The official model is non-deterministic.** `temperature=0.2` with sampling on, the authors' published config, not overridden. The same photograph produces different prose on every run. The UI says so. Never present its output as canonical or screenshot it as a fixed example.
7. **Never use the words "real-time" or "instant."** See timings below.

## The response contract

```json
{
  "prediction": "fake",
  "reasoning": "...",
  "inference_ms": 15558.7,
  "truncated": false,
  "model_repo": "AnnaGao/FakeReasoning",
  "model_revision": "official+fp16",
  "image": { "width": 1536, "height": 1024, "format": "PNG" }
}
```

`model_revision` is `"official+fp16"` or `"finetuned:fakereasoning-finetuned"`.

Answers run 45–62 words, 289–397 characters. The cap is 512 tokens, about 2000 characters. When `truncated` is `true` the model stopped mid-sentence and the UI must say so plainly rather than presenting a half-written note as finished.

The model omits the space after some periods (`"direction.The textures"`). `cleanReasoning()` repairs this. Keep it.

## Timings — measured 2026-08-17

| | Warm inference | Cold load on top | Worst case |
|---|---|---|---|
| Fine-tune (4-bit, A10G) | 9.9s | ~63s | ~73s |
| Official (FP16, A100-40GB) | 15.6s | 42.6s | ~58s |

Both classes scale to zero after 300s idle (`FR_IDLE_TIMEOUT=300`), so the backend timeout is 300s. On a low-traffic demo most visitors pay the cold path. The honest phrase is "takes up to a minute."

The waiting state must hold for two minutes without looking broken. It names the real stages — container start, 26.8 GB of weights resident, towers reading the image, decoder writing — with a real elapsed clock. This is the site's signature element. Do not replace it with a spinner or a fake percentage.

## What the upload accepts

The type the browser reports is not trusted. A camera or a phone in depth mode writes `.mpo`, and the browser calls it `image/mpo` on one platform and `""` on the next, so a MIME test rejected those photographs before they reached the backend. `main.js` reads the magic number instead — JPEG, PNG or WebP — and rejects anything else with a message that says the bytes, not the name, were wrong.

An MPO is two or more complete JPEG images written end to end: the full-size primary first, then the parallax or preview frames. `prepare()` walks the JPEG marker structure to the primary image's EOI, drops the APP2 `MPF\0` index that pointed at the frames now gone, and sends what is left. No pixel is decoded or re-encoded, EXIF in APP1 survives, and a plain JPEG comes through byte-identical. The exhibit says so under the file name when it happens.

Do not replace the marker walk with a search for `FFD9`. That byte pair also ends the EXIF thumbnail inside APP1, and a search cuts the photograph off there — on a measured fixture, 8,301 bytes instead of 221,497.

The size cap is on what gets sent, not on what was picked: an MPO on disk is larger than the image inside it.

## Attribution — required, not optional

The site credits PRIS-CV and the base checkpoint `AnnaGao/FakeReasoning`. The team's contribution is LoRA adapters on those weights, 62.6M parameters, 0.799% of the model — not a model trained from scratch. This appears in the footer of every page including the 404.

The fine-tune's public name is not decided yet. Until the team confirms it, the two options are labelled **"Our fine-tune"** and **"Original (PRIS-CV)"**. Do not invent a product name.

## Numbers that may appear on the site

Only these. Do not add, round, or extrapolate.

Superseded 2026-08-20 by the updated evaluation in `assets/kasp_project_report.pdf` (Tables 4 and 5). The n=50 run that produced 64.0/72.0, +0.274/+0.520 and fake recall 51.7% is no longer the reported result.

- 92.5% accuracy across ten unseen generators, unchanged by fine-tuning
- +0.699 class separation, up from +0.400
- 0.799% of the model retrained
- 9.9s / 15.6s warm inference
- In-distribution accuracy 70.0% → 85.0%, on n=20 (10 real, 10 fake), 14/20 → 17/20
- Real recall 70.0% → 100.0%; fake recall unchanged at 70.0%
- Out-of-distribution explanation diversity 100%, largest duplicate cluster 1

That last pair is a real weakness and it stays on the page. Fine-tuning bought nothing on the fake class; the whole gain was correcting real photographs. A fake verdict is therefore stronger evidence than a real one, and the site says so next to the verdict.

The paper's Conclusion (§8) still describes the superseded run — "13.8 points of fake recall", "38.1 points of real recall", 14 points of diversity. Those are 65.5→51.7, 61.9→100.0 and 94→80 from the n=50 evaluation, and they contradict Table 4. Use the tables.

## Definition of done

- Renders correctly at 375px, 768px, and 1440px.
- One `h1`. Semantic landmarks. Headings in order. Skip link to main.
- Visible focus ring on every interactive element. Tab order matches visual order. Tap targets ≥44px.
- Body text contrast ≥4.5:1, large text ≥3:1, checked against the real palette.
- `prefers-reduced-motion` honoured: animations off, video falls back to the poster, no autoplay.
- Lighthouse mobile 95+, accessibility 100.
- Page weight under 1.5 MB excluding the hero video. Hero video capped separately at 1.5 MB with a poster frame that looks complete on its own.
- No layout shift after first paint. Every image and video has explicit dimensions or an aspect ratio.
- Custom 404 using the same layout, nav, tokens and type, returning a real 404 status, with a way home and no auto-redirect.
- Every page: one `h1`, headings in order with no skipped level, the nav marking the current page with `aria-current`, and the attribution in the footer.
- Demo mode still works with `API = ""`.

## Two open items to fix before public launch

- The display font is loaded from `db.onlinewebfonts.com`. That is not a licence, and Bubbledot ICG is a commercial typeface. Replace it with an OFL face before the site is public. The fallback stack already handles the swap.
- Font Awesome 6.5.2 `all.min.css` is loaded for three brand icons. Replace with three inline SVGs and drop the CDN.

## Working agreement

- One concern per turn. Do not bundle unrelated changes.
- Commit after each working step with a descriptive message. Branch before anything large.
- Do not refactor, rename, or reformat anything you were not asked to touch.
- Do not add analytics, cookie banners, a contact form, a carousel, a blog, a testimonials section, or a newsletter box.
- Do not invent metrics, customers, logos, or quotes. If a number is not in this file, it does not go on the site.
- Do not offer to deploy, buy a domain, or edit DNS. Those need the team's own accounts.
- If the design and this file disagree, this file wins. Say so rather than silently choosing.

## Commands

Backend, from the backend repo:

```bash
modal deploy -m modal_app.app
modal deploy backend/modal_deploy.py
modal run -m modal_app.app --image-path ./some-photo.jpg --model both
```

On Windows, `modal run` crashes instantly with `'charmap' codec can't encode character '✓'` — the CLI prints a checkmark to a cp1252 console. Set both of these first:

```powershell
$env:PYTHONIOENCODING="utf-8"; $env:PYTHONUTF8="1"
```

Frontend: no build. Serve the folder.

```bash
python -m http.server 5173
```
