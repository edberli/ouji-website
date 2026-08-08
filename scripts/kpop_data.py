#!/usr/bin/env python3
"""
The K-pop restock sheet, and a shortlist of candidate listings per album.

Only what is on the shelf goes up. A K-pop album is not restocked — a
pressing sells out and that is the end of it — so a sold-out row is not
a product waiting for stock, it is a product that no longer exists.
Five of the thirty rows are in that state and are skipped.

Matching is by title, because no retailer publishes barcodes in its open
catalogue. That makes the version the dangerous part: SEVENTEEN's
HAPPY BURSTDAY exists in several versions with different covers, and a
shortlist that ignores "(White Ver.)" will happily return the wrong one.
So the shortlist is scored on the version words too, and the final pick
is made by a model that is told the version must match.

    python3 scripts/kpop_data.py            # 睇清單同候選
"""
import glob
import json
import os
import re

SHEET = "/Volumes/core/下載/kpopw_Restock.xlsx"
POOL = "/tmp/kpop"

STOP = {"the", "a", "an", "of", "and", "ver", "version", "versions", "album",
        "mini", "full", "ep", "single", "set", "st", "nd", "rd", "th"}


def load():
    """In-stock rows only: {barcode, title, artist, qty, cost, price}."""
    import openpyxl
    ws = openpyxl.load_workbook(SHEET, data_only=True).worksheets[0]
    out = []
    for row in ws.iter_rows(min_row=4, values_only=True):
        if not row or not row[1]:
            continue
        qty = int(row[4] or 0)
        if qty <= 0:
            continue                      # sold out and not coming back
        title = str(row[1]).strip()
        out.append({
            "barcode": str(row[2]).strip(),
            "title": title,
            # "YUQI ((G)I-DLE)" is a YUQI record; the parenthetical says
            # which group she is from, and matching on the whole string
            # finds nothing. But "(G)I-DLE" *starts* with a bracket —
            # stripping from the first one leaves an empty artist, and
            # Shopify then fills the vendor in with the shop's own name.
            "artist": (re.sub(r"\s+\(.*", "", title.split(" - ")[0]).strip()
                       or title.split(" - ")[0].strip()),
            "qty": qty,
            "cost": float(row[5] or 0),
            "price": float(row[6] or 0),
        })
    return out


def tokens(s):
    s = re.sub(r"[^\w\s]", " ", s.lower())
    return {w for w in s.split() if w not in STOP and len(w) > 1}


# Our own working files live in the same directory; only the retailer
# caches are catalogues.
# Our own working files live beside the caches. Matching them by name
# was a losing game — every new pass added another — so a catalogue is
# recognised by shape instead: a list of products.
OURS = ()


def pool():
    out = []
    for f in glob.glob(os.path.join(POOL, "*.json")):
        src = os.path.basename(f)[:-5]

        data = json.load(open(f))
        if not isinstance(data, list) or not data or not isinstance(data[0], dict) \
                or "title" not in data[0]:
            continue                      # not a retailer catalogue
        for p in data:
            # Most stores give images as objects with a src; a couple
            # give plain URL strings. Take whichever shape arrives.
            imgs = []
            for i in p.get("images", []):
                u = i.get("src") if isinstance(i, dict) else i
                if isinstance(u, str) and u.startswith("http"):
                    imgs.append(u)
            if imgs:
                out.append({"src": src, "title": p["title"],
                            "handle": p["handle"], "imgs": imgs})
    return out


def shortlist(item, items, n=20):
    """Candidates ranked by how much of our title they account for.

    The artist has to be present — without that gate, "IVE" matches every
    listing containing the word "five" or "live", which is a thousand
    rows of noise for the model to wade through.
    """
    artist = re.sub(r"[^a-z0-9]", "", item["artist"].lower())
    want = tokens(item["title"])
    scored = []
    for p in items:
        flat = re.sub(r"[^a-z0-9]", "", p["title"].lower())
        if artist and artist not in flat:
            continue
        have = tokens(p["title"])
        overlap = len(want & have)
        if overlap < 2:
            continue
        scored.append((overlap / max(1, len(want)), overlap, p))
    scored.sort(key=lambda x: (-x[0], -x[1]))
    return [p for _, _, p in scored[:n]]


def main():
    items = load()
    p = pool()
    print(f"有貨 {len(items)} 件，候選目錄 {len(p)} 件\n")
    for it in items:
        c = shortlist(it, p)
        print(f'{len(c):>3} 個候選  {it["qty"]:>2} 件  {it["title"][:56]}')


if __name__ == "__main__":
    main()
