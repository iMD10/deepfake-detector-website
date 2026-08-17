# brand.md

## Story

This exists because a number is not an explanation. Detection tools hand people a score and leave them with nothing to check, cite, or appeal. This one hands them an argument they can read and disagree with.

It should feel like a laboratory instrument: precise, unhurried, willing to state its own error rate. It must never feel like a product launch.

## Register

Forensic. One word, and the build is held to it.

Evidence before claims. Numbers before adjectives. The image is the most important object on the screen at every moment.

## Voice

- Plain verbs, sentence case, no filler.
- State the limitation in the same breath as the result. "A fake verdict is the stronger of the two" is the house style.
- Never explain a design decision to the reader. If an ordering needs defending, change the ordering.
- Quote the model, never paraphrase it. Its words are set in a different typeface for exactly that reason.
- No exclamation marks, no rhetorical questions, no "imagine if", no "in today's world".

## Two surfaces, on purpose

**Black to arrive.** The landing is cinematic: full-bleed video, one locked viewport, white type. It earns five seconds of attention.

**White to read.** The result panel is a document. Faculty read it, so it is paper, not a dashboard. A neutral mat under the image, a serif for the model's prose, hairlines instead of shadows.

The transition between them is the only theatrical moment in the build.

## Colour

Landing: `#000000` background · `#ffffff` text · `#8e8e8e` muted · `#28282a` dark pills · `#2e2e2e` nav text on white · `#c4c2c3` and `#c8c8c8` pill text · borders `rgba(255,255,255,.4)` · shadow `0 4px 14px rgba(0,0,0,.16)` and nothing heavier.

Document: `#F7F8F8` paper · `#FFFFFF` card · `#E9EAEA` image mat · `#16191C` ink · `#3D4348` body · `#6E767C` muted · `#DDE0E2` rules · `#00679E` accent.

`#B77800` on `#FFF8E8` is the only warning colour and it has exactly one job: the `truncated` state. It is never decoration.

The image never sits directly on white. A white surround changes how a viewer perceives the photograph's own contrast, and the photograph is the thing being judged.

## Typography

- **Inter** 400 / 500 / 600 — all interface text.
- **Dot-matrix display face** — the two headline lines and the four stat glyphs only. Never prose, never a paragraph, never a label.
- **Serif** — the model's own words in the result panel, and nothing else. A reader must be able to tell generated text from the site's text at a glance.

Headline letter-spacing is `-0.04em`, tightening to `-0.08em` under 720px and `-0.09em` under 420px. The lines do not wrap; they are short for that reason.

## Motion

One shared easing, `cubic-bezier(.22,1,.36,1)`. Entrances stagger by an inline `--d`. Nothing loops, nothing bounces, nothing parallaxes.

`prefers-reduced-motion` turns all of it off and falls back to the video poster.

## The signature element

The waiting state. Sixty to a hundred and fifty seconds is the honest cost of a 13B dual-tower model on a cold GPU, and it is presented as engineering rather than apologised for: container start, 26.8 GB of weights resident, towers reading the image, decoder writing. Real stage names, real elapsed clock.

Everything else on the page stays quiet so this can be the thing people remember.

## Anti-patterns

The most useful section in this file. These are refusals, not preferences.

- **No purple gradient, no glass card, no floating icon, no mesh background.** The default AI startup page is the thing this project is explicitly not.
- **No invented metrics, customers, logos, testimonials, or quotations.** Every number traces to `docs/model-contract.md`.
- **No confidence meter, gauge, percentage, or certainty bar.** The model does not produce one.
- **No heatmap or attention overlay.** The response contains nothing spatial.
- **No accenting one word of the headline in a brand colour.** No gradient across one word, no underline swoosh, no highlighter block. A headline earns its weight from the sentence.
- **No three identical feature cards.** No `01 / 02 / 03` numbering unless the content is genuinely a sequence.
- **No "real-time", "instant", "powered by AI", "cutting-edge", "revolutionary", "seamless".**
- **No centring everything by default.** The document panel is left-aligned because it is read.
- **No decorative iconography.** Three icons exist in the trust row and each names a real part of the stack.
- **No shadow heavier than the one token.** Depth is not the personality.
- **No cloning a reference site.** If output starts resembling one, name what is being copied and stop.

## Approved references

Read for principles, never for layout:

- Laboratory and instrument interfaces, for the discipline of putting the measurement first.
- Print exhibit and case-file conventions, for the neutral mat under an image under examination.
- Academic paper typography, for the separation between quoted material and the author's own text.

## Prohibited references

Any AI product landing page from 2024 onward. Any detector tool that leads with a percentage. Any site whose hero is a dashboard screenshot.
