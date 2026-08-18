"""Favicon, Apple touch icon and vector mark, from the same two-ring geometry
as logo.webp. White rings on the brand black so the mark holds in both a light
and a dark browser chrome; Apple's tile must be opaque, and iOS applies its own
corner radius, so that one is a full-bleed square.
"""
import os
from PIL import Image, ImageDraw

OUT = os.path.dirname(os.path.abspath(__file__))
BLACK, WHITE = (0, 0, 0), (255, 255, 255)


def mark(size, pad_ratio, radius_ratio, bg, ring, supersample=8):
    """Two overlapping rings centred in a rounded square."""
    S = size * supersample
    img = Image.new("RGB", (S, S), bg)
    d = ImageDraw.Draw(img)
    if radius_ratio:
        m = Image.new("L", (S, S), 0)
        ImageDraw.Draw(m).rounded_rectangle([0, 0, S - 1, S - 1],
                                            radius=int(S * radius_ratio), fill=255)
        img.putalpha(m)
        d = ImageDraw.Draw(img)

    inner = S * (1 - 2 * pad_ratio)          # drawable box
    r = inner * 0.34                          # ring radius
    dx = inner * 0.195                        # half the gap between centres
    w = max(supersample, int(inner * 0.085))  # stroke
    cy = S / 2
    for cx in (S / 2 - dx, S / 2 + dx):
        d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=ring, width=w)
    return img.resize((size, size), Image.LANCZOS)


# 32px favicon: rounded square, white rings on black.
mark(32, 0.10, 0.22, BLACK, WHITE).save(os.path.join(OUT, "favicon-32.png"))

# 180px Apple touch icon: opaque, square, no corner radius of our own.
mark(180, 0.16, 0, BLACK, WHITE).convert("RGB").save(os.path.join(OUT, "apple-touch-icon.png"))

# Vector mark, same geometry, for rel="icon" type="image/svg+xml".
SVG = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 104 104" role="img" aria-label="Two readings of one photograph">
  <rect width="104" height="104" rx="23" fill="#000000"/>
  <g fill="none" stroke="#ffffff" stroke-width="7">
    <circle cx="38" cy="52" r="28"/>
    <circle cx="66" cy="52" r="28"/>
  </g>
</svg>
'''
with open(os.path.join(OUT, "mark.svg"), "w", encoding="utf-8", newline="\n") as f:
    f.write(SVG)

for n in ("favicon-32.png", "apple-touch-icon.png", "mark.svg"):
    p = os.path.join(OUT, n)
    print("%-22s %5d bytes" % (n, os.path.getsize(p)))
