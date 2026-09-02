# Not a score. An argument.

A site where you upload a photograph and a vision-language model writes, in
prose, what it found in it.

Most detectors output a score. This one outputs an argument.

Built by KAUST Academy students for demo day, August 2026.

**Live:** https://deepfake-detector-website.vercel.app

## What it is

The landing takes an upload and shows one reading of it, headed *Prediction*
with no checkpoint named. Two checkpoints exist and are compared throughout
`results.html`:

- **Original (PRIS-CV)** — the published `AnnaGao/FakeReasoning` checkpoint, FP16
- **Our fine-tune** — LoRA adapters on those same weights

Either returns a verdict of `real` or `fake` plus a short written explanation of
what in the image led there. There is no heatmap and no confidence percentage,
by design: the response contains nothing spatial, and a confidence meter was
built and then deleted for being fragile and unfaithful to the model.

## Results

- 92.5% accuracy across ten unseen generators, unchanged by fine-tuning
- Class separation +0.699, up from +0.400
- In-distribution accuracy 70.0% → 85.0% (n=20, balanced; 14/20 → 17/20 correct)
- Out-of-distribution explanation diversity 100%, largest duplicate cluster 1
- 0.799% of the model retrained (62.6M LoRA parameters)
- Warm inference 9.9s (fine-tune) and 15.6s (original)

Both models scale to zero when idle, so a cold request takes up to a minute.
The site says so rather than claiming to be instant.

### The known weakness, stated plainly

Fine-tuning bought nothing on the fake class: fake recall is 70.0% before and
70.0% after, so the model still misses about three fakes in every ten. The
entire gain came from correcting genuine photographs, where recall went from
70.0% to 100.0%. A *fake* verdict from the fine-tune is therefore stronger
evidence than a *real* one. `results.html` says so, and so does this README.

These are small samples. At n=20 one image is five percentage points, the
+15-point gain is three additional correct predictions, and the fine-tuned
checkpoint comes from a single training run with no seed variance.

## Running it

Static HTML, CSS and JavaScript. No framework, no build step, no bundler, no
package manager. `index.html` is the landing; `method.html`, `results.html`,
`team.html` and `paper.html` are the reading document, one section each. Serve
the folder:

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
