#!/usr/bin/env python3
"""Regenerate public/og-image.png.

Keeps the existing share artwork (icon, GridSense title, tagline, intensity
pills) and redraws the eyebrow as plain Inter letters so "GB" matches
"CARBON INTENSITY" — no monogram.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'public' / 'og-image.png'
OUT = ROOT / 'public' / 'og-image.png'
FONT = Path(
  '/usr/share/fonts/truetype/sand-box/google/Inter/Inter-VariableFont_opsz,wght.ttf'
)
FALLBACK = Path('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf')
GREEN = (52, 211, 153)
TEXT = 'GB CARBON INTENSITY'


def load_font(size: int) -> ImageFont.FreeTypeFont:
  path = FONT if FONT.exists() else FALLBACK
  font = ImageFont.truetype(str(path), size)
  if hasattr(font, 'set_variation_by_name'):
    try:
      font.set_variation_by_name('Bold')
    except Exception:
      pass
  return font


def clear_eyebrow(src: Image.Image) -> Image.Image:
  """Paint out the old monogram + CARBON INTENSITY band."""
  w, h = src.size
  src_px = src.load()
  cover = src.copy()
  cpx = cover.load()
  for y in range(125, 195):
    t = (y - 125) / 70.0
    for x in range(400, 940):
      a = src_px[x, 118]
      b = src_px[x, 200]
      cpx[x, y] = tuple(int(a[i] * (1 - t) + b[i] * t) for i in range(3))

  mask = Image.new('L', (w, h), 0)
  ImageDraw.Draw(mask).rounded_rectangle([420, 132, 910, 188], radius=6, fill=255)
  mask = mask.filter(ImageFilter.GaussianBlur(1.5))
  return Image.composite(cover, src, mask)


def draw_eyebrow(img: Image.Image) -> Image.Image:
  draw = ImageDraw.Draw(img)
  font = load_font(26)
  spacing = 3.8
  x = 464
  y = 148
  for i, ch in enumerate(TEXT):
    draw.text((x, y), ch, font=font, fill=GREEN)
    bb = draw.textbbox((0, 0), ch, font=font)
    x += bb[2] - bb[0] + (6 if ch == ' ' else spacing)
  return img


def main() -> None:
  # Always start from the committed artwork so re-runs stay idempotent after
  # the first plain-GB rewrite. If the file already has plain GB, clearing the
  # band and redrawing yields the same result.
  src = Image.open(SRC).convert('RGB')
  out = draw_eyebrow(clear_eyebrow(src))
  out.save(OUT, optimize=True)
  print(f'wrote {OUT.relative_to(ROOT)} ({out.size[0]}x{out.size[1]})')


if __name__ == '__main__':
  main()
