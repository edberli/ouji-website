#!/usr/bin/env python3
"""
Swap a black studio backdrop for white.

Several brands — UNLEASHIA above all — shoot every packshot on flat
black. The product is visible, so the frame is not wrong, but a black
tile in a grid of white ones reads as a hole in the page. Their own
detail strips have no lighter alternative, so the backdrop is replaced
rather than the image.

Only the region connected to the border is touched, so black *product*
(a mascara barrel, a palette lid) keeps its colour.

    python3 scripts/whiten_black_bg.py in.jpg out.jpg
"""
import sys
from collections import deque

from PIL import Image

THRESHOLD = 70    # luminance below this counts as backdrop
FEATHER = 26      # blend band above the threshold, to avoid a hard halo


def whiten(im):
    im = im.convert("RGB")
    w, h = im.size
    px = im.load()
    lum = [[(px[x, y][0] * 299 + px[x, y][1] * 587 + px[x, y][2] * 114) // 1000
            for y in range(h)] for x in range(w)]

    seen = bytearray(w * h)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if lum[x][y] < THRESHOLD + FEATHER:
                q.append((x, y)); seen[y * w + x] = 1
    for y in range(h):
        for x in (0, w - 1):
            if lum[x][y] < THRESHOLD + FEATHER and not seen[y * w + x]:
                q.append((x, y)); seen[y * w + x] = 1

    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx] \
                    and lum[nx][ny] < THRESHOLD + FEATHER:
                seen[ny * w + nx] = 1
                q.append((nx, ny))

    for y in range(h):
        for x in range(w):
            if not seen[y * w + x]:
                continue
            v = lum[x][y]
            if v <= THRESHOLD:
                px[x, y] = (255, 255, 255)
            else:                       # feather band: fade product edge to white
                t = (v - THRESHOLD) / FEATHER
                r, g, b = px[x, y]
                px[x, y] = (int(255 - (255 - r) * t),
                            int(255 - (255 - g) * t),
                            int(255 - (255 - b) * t))
    return im


if __name__ == "__main__":
    whiten(Image.open(sys.argv[1])).save(sys.argv[2], quality=92)
