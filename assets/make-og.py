"""assets/og.png -- the 1200x630 social card.

Site palette only (#000000, #ffffff, #8e8e8e, #28282a) and the site's own
faces: DotGothic16 for the headline, Inter for everything else. Sized so the
headline still reads at the ~300px width a timeline thumbnail gets.

PIL cannot read woff2, so this needs the TTF originals, which are not worth
committing. Point OG_FONT_DIR at a directory holding both:

  curl -sSLO https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/dotgothic16/DotGothic16-Regular.ttf
  curl -sSL "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/inter/Inter%5Bopsz%2Cwght%5D.ttf" -o Inter-var.ttf

  OG_FONT_DIR=/path/to/ttfs python assets/make-og.py
"""
import os
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.dirname(os.path.abspath(__file__))
FONTS = os.environ.get("OG_FONT_DIR", os.path.join(OUT, "..", "..", "fonts-src"))

BG, INK, MUTED, RULE = (0, 0, 0), (255, 255, 255), (142, 142, 142), (40, 40, 42)
W, H, M = 1200, 630, 72

display = ImageFont.truetype(os.path.join(FONTS, "DotGothic16-Regular.ttf"), 96)
inter_m = ImageFont.truetype(os.path.join(FONTS, "Inter-var.ttf"), 22)
inter_r = ImageFont.truetype(os.path.join(FONTS, "Inter-var.ttf"), 26)
try:
    inter_m.set_variation_by_name("Medium")
    inter_r.set_variation_by_name("Regular")
except Exception:
    pass

img = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(img)


def tracked(xy, text, font, fill, em):
    """Draw text with letter-spacing, which PIL has no notion of."""
    x, y = xy
    step = em * font.size
    for ch in text:
        d.text((x, y), ch, font=font, fill=fill)
        x += font.getlength(ch) + step
    return x


# --- mark, same two rings as the favicon -----------------------------------
r, sw, cy = 21, 5, M + 22
for cx in (M + 22, M + 44):
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=INK, width=sw)
tracked((M + 92, M + 10), "KAUST ACADEMY", inter_m, MUTED, 0.14)

# --- headline ---------------------------------------------------------------
# letter-spacing -0.04em, matching .headline at desktop size
tracked((M, 196), "Not a score.", display, INK, -0.04)
tracked((M, 312), "An argument.", display, INK, -0.04)

# --- rule and subline -------------------------------------------------------
d.rectangle([M, 474, W - M, 475], fill=RULE)
d.text((M, 506), "Two vision-language models each write what they found in your photograph.",
       font=inter_r, fill=MUTED)

img.save(os.path.join(OUT, "og.png"), "PNG", optimize=True)
print("og.png %dx%d  %.1f KB" % (img.size + (os.path.getsize(os.path.join(OUT, "og.png")) / 1024.0,)))
