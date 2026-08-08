#!/usr/bin/env python3
"""Turn a raw Olive Young review dump into the site's reviews.json.

The raw dump comes out of the OY product page's own Vue state (see
`docs/oy-review-scrape.md`); this script is only the cleaning half, so it
stays runnable offline and its judgement calls are reviewable.

Three things get thrown away, and it matters which:

* **Spam.** Marketplace sellers paste a wall of "fast shipping, great
  seller" filler to clear a minimum-character bonus. It says nothing
  about the product.
* **Duplicates.** The same reviewer posting near-identical text under two
  shades is one opinion, not two.
* **Nothing else.** In particular the low scores stay. A review block
  that is 100% five stars is the thing shoppers have learned to distrust,
  and the honest distribution is already good.

    python3 scripts/oy_reviews.py raw.json > reviews.json
"""
import html
import json
import re
import sys
from difflib import SequenceMatcher

# 「出貨速度快」「值得信賴的賣家」呢類蝦皮／淘寶湊字數範本。
SPAM = re.compile(
    r"複製貼上|通用評價|湊字數|滿\d+個字|值得信賴的賣家|出貨速度(非常)?快"
    r"|fast shipping|great seller|five stars? for the seller",
    re.I)

ATTR_ZH = {"Formulation": "質地", "Long-lasting": "持久度", "Color payoff": "顯色度",
           "Texture": "質地", "Sun protection": "防曬力", "Moisturising": "保濕度",
           "Absorption": "吸收度", "Irritation": "刺激度", "Scent": "香味"}


def clean(t):
    t = html.unescape(t or "")
    t = re.sub(r"[ \t]+", " ", t)
    t = re.sub(r"\r\n?", "\n", t)
    return re.sub(r"\n{3,}", "\n\n", t).strip()


def spammy(t):
    if SPAM.search(t):
        return True
    # 一段嘢重覆講十次都係湊字數。
    lines = [l.strip() for l in t.split("\n") if l.strip()]
    return len(lines) > 8 and len(set(lines)) / len(lines) < 0.8


def dedupe(rows):
    kept = []
    for r in rows:
        twin = any(r["who"] == k["who"]
                   and SequenceMatcher(None, r["text"][:160], k["text"][:160]).ratio() > 0.8
                   for k in kept)
        if not twin:
            kept.append(r)
    return kept


def main():
    raw = json.load(open(sys.argv[1]))
    rows = []
    for r in raw["reviews"]:
        t = clean(r["text"])
        if len(t) < 12 or spammy(t):
            continue
        d = r["date"]
        rows.append({
            "star": r["star"],
            "date": f"{d[:4]}-{d[4:6]}-{d[6:]}",
            "who": r["who"],
            "shade": clean(r["shade"]),
            "text": t,
            "attrs": [{"name": ATTR_ZH.get(a["n"], a["n"]), "score": a["s"]}
                      for a in r.get("attrs", [])],
        })
    rows = dedupe(rows)
    rows.sort(key=lambda r: r["date"], reverse=True)

    g, k = raw["global"], raw["korea"]
    total = g["count"] + k["count"]
    # 兩個地區嘅平均分要按評價數加權，唔可以兩個數字直接除二。
    star = round((g["star"] * g["count"] + k["star"] * k["count"]) / total, 1)
    dist = []
    for i in range(5, 0, -1):
        n = sum(d["count"] for d in (g["dist"] + k["dist"]) if d["star"] == i)
        dist.append({"star": i, "count": n, "pct": round(n / total * 100)})

    json.dump({
        "source": "Olive Young Global",
        "sourceUrl": raw["url"],
        "sourceTitle": raw["oyTitle"],
        "star": star,
        "count": total,
        "byRegion": {"韓國": k["count"], "全球": g["count"]},
        "dist": dist,
        "attrs": [{"name": ATTR_ZH.get(a["name"], a["name"]), "avg": a["avg"]}
                  for a in raw["attrs"]],
        "reviews": rows,
    }, sys.stdout, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
