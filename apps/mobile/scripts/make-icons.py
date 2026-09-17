#!/usr/bin/env python3
"""
Draws the Mekteb app icons from the mark's own geometry.

The mark is a two-centred pointed arch — the mihrab niche — with its finial
above the apex, defined once in `MARK_*` below on the same 24-unit grid as the
web app's `MosqueIcon` (apps/web/src/components/icons.tsx) and the React Native
`MosqueMark` (apps/mobile/app/(auth)/sign-in.tsx). Keeping the generator in the
repo means a colour or a proportion changes in one place; keeping it on the
same grid means the raster icons and the vector ones cannot drift apart.

    python3 scripts/make-icons.py

Outputs (mobile paths are referenced from app.config.ts):
  assets/icon.png                   1024²  opaque — iOS masks the corners itself
  assets/adaptive-icon.png          1024²  transparent, art inside Android's safe zone
  assets/splash-icon.png             512²  transparent
  ../web/public/icon-192.png         192²  PWA manifest
  ../web/public/icon-512.png         512²  PWA manifest
  ../web/src/app/favicon.ico       16-48²  browser tab
"""

from __future__ import annotations

import math
import os
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.normpath(os.path.join(HERE, "..", "assets"))
WEB_PUBLIC = os.path.normpath(os.path.join(HERE, "..", "..", "web", "public"))
WEB_APP = os.path.normpath(os.path.join(HERE, "..", "..", "web", "src", "app"))

# The brand green — the same #15803d the README header uses, one shade deeper
# than the UI accent in src/theme/tokens.ts, because the accent is tuned to sit
# behind text and washes out as a full-bleed plate. The plate is flat: the mark
# is doing the work, and a gradient behind it only muddies the small sizes.
GREEN = (21, 128, 61)
WHITE = (255, 255, 255)

# Everything is drawn at 4× and downsampled — cheap antialiasing for the arcs.
SS = 4

# --- The mark, on the 24-unit grid the SVG versions use -----------------------
#
# Outer arch: springline y=13.8, radius 11, centres (16,13.8) and (8,13.8).
# Inner arch: the same centres, radius 8.4 — sharing centres is what gives the
# frame a constant wall thickness. Both stand on y=21.5.
SPRING = 13.8
FOOT = 21.5
R_OUT, R_IN = 11.0, 8.4
C_LEFT, C_RIGHT = 16.0, 8.0  # the left half swings about the right-hand centre
FINIAL = (12.0, 1.55, 1.15)  # cx, cy, r


def _arc(cx: float, cy: float, r: float, a0: float, a1: float, steps: int = 96):
    """Points along a circular arc, angles in degrees, y growing downward."""
    return [
        (
            cx + r * math.cos(math.radians(a := a0 + (a1 - a0) * i / steps)),
            cy + r * math.sin(math.radians(a)),
        )
        for i in range(steps + 1)
    ]


def _apex_angle(r: float, half_span: float) -> tuple[float, float]:
    """
    Where the two arcs of radius `r` meet, as (left-arc end, right-arc start).

    `half_span` is the horizontal distance from an arc's centre to the apex —
    the arch is symmetric, so the apex always sits at x=12.
    """
    a = math.degrees(math.atan2(-math.sqrt(r * r - half_span * half_span), -half_span))
    return a % 360, (180 - a) % 360


def mark_outline() -> list[tuple[float, float]]:
    """
    The mark's frame as one closed polygon, in 24-unit coordinates.

    Outer edge up the left leg, over the arch and down the right leg; then the
    inner edge back the other way, so a single fill leaves the niche open.
    """
    out_l, out_r = _apex_angle(R_OUT, 12.0 - C_RIGHT)
    in_l, in_r = _apex_angle(R_IN, 12.0 - C_RIGHT)

    pts: list[tuple[float, float]] = [(C_LEFT - R_OUT, FOOT)]
    pts += _arc(C_LEFT, SPRING, R_OUT, 180, out_l)
    pts += _arc(C_RIGHT, SPRING, R_OUT, out_r, 360)
    pts += [(C_RIGHT + R_OUT, FOOT), (C_RIGHT + R_IN, FOOT)]
    pts += _arc(C_RIGHT, SPRING, R_IN, 360, in_r)
    pts += _arc(C_LEFT, SPRING, R_IN, in_l, 180)
    pts += [(C_LEFT - R_IN, FOOT)]
    return pts


def paint_mark(canvas: int, colour: tuple[int, int, int], *, scale: float) -> Image.Image:
    """
    The mark on a transparent square, centred on its own bounding box.

    `scale` is the fraction of the canvas the mark's *height* fills, so callers
    can size it against a plate or Android's safe zone without re-deriving the
    geometry.
    """
    poly = mark_outline()
    top = FINIAL[1] - FINIAL[2]
    height = FOOT - top
    k = canvas * scale / height
    # Centre the drawn extent (x from 5 to 19, y from `top` to FOOT).
    dx = canvas / 2 - 12.0 * k
    dy = canvas / 2 - (top + height / 2) * k

    layer = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.polygon([(x * k + dx, y * k + dy) for x, y in poly], fill=colour + (255,))
    fcx, fcy, fr = FINIAL
    d.ellipse(
        [
            (fcx - fr) * k + dx,
            (fcy - fr) * k + dy,
            (fcx + fr) * k + dx,
            (fcy + fr) * k + dy,
        ],
        fill=colour + (255,),
    )
    return layer


def write(image: Image.Image, path: str, final: int) -> None:
    out = image.resize((final, final), Image.LANCZOS)
    out.save(path)
    print(f"  {os.path.relpath(path, HERE)}  {final}×{final}")


def main() -> None:
    os.makedirs(ASSETS, exist_ok=True)
    print("writing icons:")

    size = 1024 * SS

    # iOS / general icon: opaque square. iOS applies its own mask, and an icon
    # with its own rounded corners ends up double-rounded.
    icon = Image.new("RGBA", (size, size), GREEN + (255,))
    icon.alpha_composite(paint_mark(size, WHITE, scale=0.54))
    write(icon.convert("RGB"), os.path.join(ASSETS, "icon.png"), 1024)

    # Android adaptive foreground: transparent, and the art has to stay inside
    # the central 66% or the launcher's mask crops it.
    write(paint_mark(size, WHITE, scale=0.40), os.path.join(ASSETS, "adaptive-icon.png"), 1024)

    # Splash: the mark in green on whatever background the theme draws.
    write(paint_mark(size, GREEN, scale=0.62), os.path.join(ASSETS, "splash-icon.png"), 512)

    # Web: the PWA manifest icons are maskable-ish plates, same as iOS.
    web = Image.new("RGBA", (size, size), GREEN + (255,))
    web.alpha_composite(paint_mark(size, WHITE, scale=0.54))
    for px in (192, 512):
        write(web, os.path.join(WEB_PUBLIC, f"icon-{px}.png"), px)

    # Favicon: green on transparent, so it sits on either browser theme.
    glyph = paint_mark(size, GREEN, scale=0.86)
    frames = [glyph.resize((px, px), Image.LANCZOS) for px in (48, 32, 16)]
    frames[0].save(
        os.path.join(WEB_APP, "favicon.ico"),
        sizes=[(48, 48), (32, 32), (16, 16)],
        append_images=frames[1:],
    )
    print(f"  {os.path.relpath(os.path.join(WEB_APP, 'favicon.ico'), HERE)}  16/32/48")


if __name__ == "__main__":
    main()
