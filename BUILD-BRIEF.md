# Build brief

Paste this as your first message in Claude Code, in the repo root, with `CLAUDE.md`, `docs/product.md`, `docs/brand.md` and `docs/model-contract.md` already committed.

---

## PROJECT

A one-page site for a deepfake and AI-generated image detector, built by a five-person KAUST Academy team for demo day, August 2026.

Audience: KAUST demo-day judges and faculty. They have five minutes, they are technically literate, and they will discount the whole project over one invented number.

Register: forensic instrument. Evidence first, claims last, nothing decorative.

The one action a visitor takes: upload a photograph and read what two models wrote about it.

## STATE OF THE REPO

`index.html`, `styles.css` and `main.js` already exist and are approved. They are the design, not a draft. Read them before proposing anything.

Do not redesign them. Do not restructure the CSS. Do not convert to a framework. Do not "modernise" the JS. If you believe something in them is wrong, say so and wait.

Your job is the work listed under TASKS, nothing else.

## WHAT THE SITE DOES

Three states, all in the existing files:

1. **Landing.** Locked single viewport over a looping background video. Header, trust row, headline, subhead, CTA, four real statistics.
2. **Waiting.** 60–150 seconds. Names the real stages with a real elapsed clock. This is the signature element — a judge watching "26.8 GB of weights resident on A100 · 44s" is being shown the engineering. Never a bare spinner.
3. **Result.** A light document panel opens over the video. The submitted image on a neutral mat, then two columns: our fine-tune and the original PRIS-CV model, each with its prose, its verdict, its decoding behaviour, and its caveat.

Black to arrive, white to read. The landing is cinematic; the part faculty actually read is a document.

## CONTENT

All copy is final and written by the team. Do not rewrite it, do not add sections, do not generate filler.

Headline: `Not a score.` / `An argument.`

Subhead: "A score of 0.83 tells you nothing to check, cite, or appeal. Upload a photograph and two models each write what they found in it."

Statistics — these four, exactly, no others: 92.5% accuracy on ten unseen generators · +0.520 class separation, from +0.274 · 0.799% share of the model retrained · 16s warm inference per image.

The model text shown in the result panel is verbatim output from the 2026-08-17 run. It is quoted, not authored. See `docs/model-contract.md`.

## DESIGN TOKENS (locked, do not substitute)

Landing: `--bg #000000` · `--text #ffffff` · `--muted #8e8e8e` · `--nav-text #2e2e2e` · `--pill-dark #28282a` · `--sign-in-text #c8c8c8` · `--trust-bg #28282a` · `--trust-border rgba(255,255,255,.4)` · `--trust-text #c4c2c3` · shadow `0 4px 14px rgba(0,0,0,.16)`

Document: `--doc-paper #F7F8F8` · `--doc-card #FFFFFF` · `--doc-mat #E9EAEA` · `--doc-ink #16191C` · `--doc-body #3D4348` · `--doc-muted #6E767C` · `--doc-line #DDE0E2` · `--doc-accent #00679E` · `--doc-flag #B77800` on `#FFF8E8`

Type: Inter 400/500/600 for everything except the headline and the four stat glyphs, which use the dot-matrix display face. Serif for the model's own words in the result panel, so a reader can see at a glance which text was generated.

Signature element: the waiting state.

## TASKS

One per turn, in this order. Stop after each and show me the diff.

1. Read the three files and `CLAUDE.md`. Tell me anything in them that contradicts this brief before you change anything.
2. Replace the Font Awesome CDN with three inline SVG icons in the trust row. Delete the `<link>`.
3. Replace the `db.onlinewebfonts.com` display font with an OFL alternative, self-hosted in `fonts/`, preloaded, with the existing fallback stack intact. Propose two candidates and let me pick.
4. Add the head metadata block: title under 60 characters, description about 155, canonical URL, `lang`, theme colour, favicon at 32px, Apple touch icon at 180px, SVG mark, Open Graph and Twitter `summary_large_image` with absolute image URLs.
5. Build the OG image at 1200×630, under 1 MB, legible as a thumbnail, using the site's own palette and display face.
6. Add JSON-LD. `Organization` for the team plus `ScholarlyArticle` for the paper, with `sameAs` to the repo.
7. Add `robots.txt`, `sitemap.xml`, `llms.txt`.
8. Build `404.html` reusing the landing layout, nav and tokens. Plain language, one way home plus the upload action, real 404 status, no auto-redirect.
9. Wire the real backend: read `API` from a single config constant, handle non-200, handle timeout at 300s, keep demo mode working when `API` is empty.
10. Check the video against the budget. If the CloudFront MP4 is over 1.5 MB, propose a replacement and skip loading it entirely on `prefers-reduced-motion` and on narrow viewports, falling back to the poster.
11. Run the definition-of-done checklist in `CLAUDE.md` and report each line as pass or fail with evidence.

## QUALITY FLOOR

Renders at 375px. One `h1`, semantic landmarks, skip link. Visible focus ring, tab order matching visual order, tap targets ≥44px. Contrast 4.5:1 body and 3:1 large, checked against the tokens above. `prefers-reduced-motion` honoured and the video not autoplayed under it. Lighthouse mobile 95+, accessibility 100. Under 1.5 MB excluding hero video; hero video capped separately at 1.5 MB with a poster. No layout shift after first paint. Custom 404 returning a real 404.

## NON-GOALS

No framework, no build step, no package manager. No analytics, no cookie banner, no contact form, no newsletter, no carousel, no blog, no testimonials, no pricing. No login — the dark pill says "Read the paper". No heatmap, no confidence meter, no percentage of certainty. No second language in v1. No dark/light theme toggle: the landing is black and the document is white by design.

## HOW TO WORK WITH ME

One concern per turn. Commit after each working step with a descriptive message, on a branch. Do not touch anything outside the task you were given, and say what you are about to touch before you touch it. Diagnose from real output — if something breaks, ask me for the actual error text rather than guessing. Do not offer to deploy, register a domain, or edit DNS; those need our accounts. Do not add a number, a logo, a customer, or a quotation that is not already in `CLAUDE.md`.
