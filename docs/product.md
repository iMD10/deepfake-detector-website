# product.md

## Why this exists

Synthetic image generators have passed the point where looking at a picture tells you whether it is one. The people who most need to know — journalists, fact-checkers, moderators — are the least able to tell unaided.

The standard answer is a classifier that emits a probability. A score of 0.83 is useful and opaque at the same time: it tells an editor nothing about what was wrong, so it gives them nothing to check, cite, or appeal.

This model answers with prose instead. It names what it saw. The verdict is a sentence inside an argument.

## One job

Convince a KAUST Academy demo-day judge, in five minutes, that this team built something real and understood what they built.

## One action

Upload a photograph and read what the two models wrote about it.

Everything on the page either serves that or gets cut.

## Audience

KAUST demo-day judges and faculty. Technically literate, short on time, and highly sensitive to overclaiming. One invented metric costs the credibility of every real one.

Secondary, and only secondary: the paper's readers, and future employers looking at the team.

## The two models, side by side

The comparison is the demonstration. Same photograph, two models, two arguments:

- **Our fine-tune** — LoRA adapters on the released checkpoint, 4-bit, greedy decoding, reproducible, 9.9s warm.
- **Original (PRIS-CV)** — the published checkpoint at FP16, sampled at temperature 0.2, different wording every run, 15.6s warm.

Showing both, and being straight about the lineage, is the point. The team's contribution is 0.799% of the model; the site says so.

## Page states

1. **Landing** — one locked viewport over a looping video. Header, trust row, headline, subhead, upload action, four measured statistics.
2. **Waiting** — 60 to 150 seconds on a cold start. Names the real stages with a real clock. The signature element.
3. **Result** — a light document panel over the video. Image on a neutral mat, two columns of prose, two verdicts, the decoding behaviour of each model, and the caveat that a fake verdict is stronger evidence than a real one.

## What the site never does

- Show a confidence score, a certainty percentage, a gauge, or a meter.
- Show a heatmap, an attention overlay, or a bounding box.
- Use the words "real-time" or "instant".
- Claim customers, partners, or enterprise adoption.
- Display a metric that is not in `CLAUDE.md`.
- Present the official model's prose as a fixed or canonical answer.
- Hide that fake recall is 51.7%.

## Non-goals for v1

No framework or build step. No analytics, cookie banner, contact form, newsletter, carousel, blog, testimonials, or pricing. No login. No second language. No theme toggle. No batch upload, no URL-paste, no history of past runs, no user accounts.

## Open decisions

- **The fine-tune's public name.** The team's call, not the site's. Until confirmed, the columns read "Our fine-tune" and "Original (PRIS-CV)". Whatever is chosen must not read as replacing PRIS-CV's name.
- **The domain.** Not registered yet.
- **The background video.** Currently hotlinked from a CloudFront bucket. Needs to be replaced with an asset the team owns, and checked against the 1.5 MB hero budget.
