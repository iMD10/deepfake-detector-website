# Not a score. An argument.

A one-page site where you upload a photograph and two vision-language models
each write, in prose, what they found in it.

Most detectors output a score. This one outputs an argument.

Built by KAUST Academy students for demo day, August 2026.

**Live:** https://deepfake-detector-website.vercel.app

## What it is

Two checkpoints answer the same photograph side by side:

- **Original (PRIS-CV)** — the published `AnnaGao/FakeReasoning` checkpoint, FP16
- **Our fine-tune** — LoRA adapters on those same weights

Each returns a verdict of `real` or `fake` plus a short written explanation of
what in the image led there. There is no heatmap and no confidence percentage,
by design: the response contains nothing spatial, and a confidence meter was
built and then deleted for being fragile and unfaithful to the model.

## Results

- 92.5% accuracy across ten unseen generators, unchanged by fine-tuning
- Class separation +0.520, up from +0.274
- In-distribution accuracy 64.0% → 72.0%
- 0.799% of the model retrained (62.6M LoRA parameters)
- Warm inference 9.9s (fine-tune) and 15.6s (original)

Both models scale to zero when idle, so a cold request takes up to a minute.
The site says so rather than claiming to be instant.

### The known weakness, stated plainly

Fake recall is 51.7% and real recall is 100.0%; the model answers "real" about
70% of the time. A *fake* verdict is therefore much stronger evidence than a
*real* one. The site says this next to the verdict, and so does this README.

## Running it

Static HTML, CSS and JavaScript. No framework, no build step, no bundler, no
package manager. Serve the folder:

```bash
python -m http.server 5173
```

`main.js` has an `API` constant at the top. Set it to `""` and the page runs in
demo mode, replaying a real recorded run instead of spending GPU time — that is
how the site is reviewed without a backend.

The backend is two Modal apps in a separate repository and is not included here.

## Attribution

This project does not train a model from scratch. It adds LoRA adapters —
62.6M parameters, 0.799% of the model — on top of the FakeReasoning checkpoint
published by **PRIS-CV**, `AnnaGao/FakeReasoning` on Hugging Face. All credit
for the base model and the underlying method belongs to its authors.

The self-hosted display face is DotGothic16, used under the SIL Open Font
License; the licence text ships in `fonts/OFL.txt`.
