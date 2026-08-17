"""Placeholder assets: assets/logo.webp and assets/poster.webp.

Both are stand-ins for artwork the team supplies. Palette is taken from
docs/brand.md only: black, white, #8e8e8e. No gradient beyond a flat
vignette, no colour, no decoration.
"""
import os
from PIL import Image, ImageDraw

OUT = r"C:\dev\Deepfake-detector-website\assets"
os.makedirs(OUT, exist_ok=True)

# ---------------------------------------------------------------- logo
# Two overlapping rings: one photograph, two readings. Drawn at 8x and
# downsampled so the strokes stay clean at the 40-46px it renders at.
S, F = 104, 8
img = Image.new("RGBA", (S * F, S * F), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

r = 30 * F          # ring radius
w = 7 * F           # stroke
cy = S * F // 2
dx = 17 * F         # half the distance between centres

for cx in (cy - dx, cy + dx):
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(0, 0, 0, 255), width=w)

img = img.resize((S, S), Image.LANCZOS)
img.save(os.path.join(OUT, "logo.webp"), "WEBP", lossless=True, method=6)

# -------------------------------------------------------------- poster
# First frame stand-in for the hero video. Flat --bg: identical to the page
# background, so a reduced-motion or failed-load visitor sees the intended
# black landing rather than a hole. A gradient here banded; flat does not.
W, H = 1920, 1080
p = Image.new("RGB", (W, H), (0, 0, 0))
p.save(os.path.join(OUT, "poster.webp"), "WEBP", lossless=True, method=6)

for f in ("logo.webp", "poster.webp"):
    path = os.path.join(OUT, f)
    print(f, Image.open(path).size, str(os.path.getsize(path) // 1024) + " KB")
