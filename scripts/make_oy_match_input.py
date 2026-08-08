#!/usr/bin/env python3
"""Build the per-brand match jobs for MiniMax.

Our titles are Chinese; Olive Young's are English. Token overlap gets us
nowhere — "Anua 魚腥草溫和保濕防曬霜" and "Anua Heartleaf Silky Moisture
Sun Cream" share exactly one Latin token, the brand. So the matching is a
translation problem, and it goes out to M3 one brand at a time.

One file per brand keeps each prompt self-contained and small enough that
the model is choosing from a dozen candidates, not a thousand — which is
also what makes the result cheap to check afterwards.

    python3 scripts/make_oy_match_input.py
"""
import collections
import json
import os
import re

SRC = "/Volumes/core/ouji-oy"
OUT = os.path.join(SRC, "match-in")

ALIAS = {"purito": "puritoseoul", "花知曉flowerknows": "flowerknows"}


def flat(s):
    return re.sub(r"[^a-z0-9]", "", (s or "").lower())


def main():
    oy = json.load(open(f"{SRC}/oy-catalog.json"))
    mine = json.load(open(f"{SRC}/our-products.json"))
    os.makedirs(OUT, exist_ok=True)

    by_brand = collections.defaultdict(list)
    for p in oy:
        by_brand[flat(p["b"])].append(p)

    def pool_for(vendor):
        k = flat(vendor)
        for cand in (k, ALIAS.get(k, ""), flat(ALIAS.get(k, ""))):
            if cand and cand in by_brand:
                return by_brand[cand]
        for bk, v in by_brand.items():          # 前綴當同一個牌子
            if bk.startswith(k) or k.startswith(bk):
                return v
        return []

    ours = collections.defaultdict(list)
    for p in mine:
        ours[p["v"]].append(p)

    made = skipped = 0
    for vendor, items in sorted(ours.items()):
        pool = pool_for(vendor)
        if not pool:
            skipped += len(items)
            continue
        job = {
            "brand": vendor,
            "ours": [{"handle": p["h"], "title": p["t"], "type": p["ty"] or ""}
                     for p in items],
            "oliveyoung": [{"i": i, "name": c["n"]} for i, c in enumerate(pool)],
        }
        name = re.sub(r"[^A-Za-z0-9]+", "-", vendor).strip("-").lower()
        with open(os.path.join(OUT, f"{name}.json"), "w") as f:
            json.dump(job, f, ensure_ascii=False, indent=1)
        made += 1

    print(f"出咗 {made} 個品牌檔 → {OUT}")
    print(f"{skipped} 件產品嘅品牌 OY 冇賣，唔使派")


if __name__ == "__main__":
    main()
