#!/usr/bin/env python3
"""Wrap simulator/emulator screenshots in a generic device frame.

Usage: frame-screenshots.py IN.png OUT.png [--fold h|v:START:SIZE] [--scale 3] [--max 1100]
Fold START/SIZE are in points (as shown in the demo's Fold row); --scale is px per point.
"""
import argparse
from PIL import Image, ImageDraw, ImageFilter

BEZEL = (17, 17, 20, 255)
EDGE = (58, 58, 64, 255)
HINGE = (90, 90, 98, 255)


def rounded(size, radius):
    m = Image.new("L", size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius, fill=255)
    return m


def frame(src, fold, scale, max_side):
    shot = Image.open(src).convert("RGBA")
    w, h = shot.size
    short = min(w, h)
    bezel = round(short * 0.035)
    r_in = round(short * 0.07)
    r_out = r_in + bezel
    pad = round(short * 0.06)

    W, H = w + 2 * (bezel + pad), h + 2 * (bezel + pad)
    out = Image.new("RGBA", (W, H), (0, 0, 0, 0))

    body = (pad, pad, W - pad, H - pad)
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle(
        (body[0], body[1] + bezel // 2, body[2], body[3] + bezel // 2), r_out, fill=(0, 0, 0, 90)
    )
    out.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(pad // 2)))

    d = ImageDraw.Draw(out)
    d.rounded_rectangle(body, r_out, fill=EDGE)
    inset = max(2, bezel // 12)
    d.rounded_rectangle((body[0] + inset, body[1] + inset, body[2] - inset, body[3] - inset), r_out - inset, fill=BEZEL)

    if fold:
        axis, start, size = fold
        mid = round((start + size / 2) * scale)
        t = max(3, bezel // 6)
        if axis == "h":
            y = pad + bezel + mid
            for x0, x1 in ((body[0], body[0] + bezel), (body[2] - bezel, body[2])):
                d.rectangle((x0, y - t, x1, y + t), fill=HINGE)
        else:
            x = pad + bezel + mid
            for y0, y1 in ((body[1], body[1] + bezel), (body[3] - bezel, body[3])):
                d.rectangle((x - t, y0, x + t, y1), fill=HINGE)

    out.paste(shot, (pad + bezel, pad + bezel), Image.composite(shot.getchannel("A"), Image.new("L", shot.size, 0), rounded(shot.size, r_in)))

    k = max_side / max(W, H)
    if k < 1:
        out = out.resize((round(W * k), round(H * k)), Image.LANCZOS)
    return out


def parse_fold(v):
    axis, start, size = v.split(":")
    return axis, float(start), float(size)


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("src")
    p.add_argument("dst")
    p.add_argument("--fold", type=parse_fold)
    p.add_argument("--scale", type=float, default=3)
    p.add_argument("--max", type=int, default=1100)
    a = p.parse_args()
    frame(a.src, a.fold, a.scale, a.max).save(a.dst, optimize=True)
