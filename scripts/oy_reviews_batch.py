#!/usr/bin/env python3
"""Clean the bulk review dumps and pick which reviews each product shows.

Same filters as `oy_reviews.py` — spam, duplicates, anything about price
— applied across the whole pull, plus the part that only matters in bulk:
choosing eight reviews out of forty.

Picking the eight is not "take the top eight". Olive Young sorts by
BEST, which means the first eight are eight five-star reviews, and a
wall of five stars is the thing shoppers have learned to scroll past. So
the selection deliberately reserves room for the lowest-scored review
that has something substantive to say, then fills the rest by length —
"LOVEEE the color" is true but it tells nobody anything.

    python3 scripts/oy_reviews_batch.py
"""
import html
import json
import os
import re
import sys
from difflib import SequenceMatcher

SRC = "/Volumes/core/ouji-oy"
PER_PRODUCT = 8

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from oy_reviews import ATTR_ZH, PRICE, SPAM, clean, spammy  # noqa: E402


def dedupe(rows):
    kept = []
    for r in rows:
        if any(r["who"] == k["who"]
               and SequenceMatcher(None, r["text"][:160], k["text"][:160]).ratio() > 0.8
               for k in kept):
            continue
        kept.append(r)
    return kept


def pick(rows):
    """八則：最少一則低分（如果有），其餘揀寫得長嘅。"""
    if len(rows) <= PER_PRODUCT:
        return rows
    low = [r for r in rows if r["star"] <= 3]
    chosen = []
    if low:
        chosen.append(max(low, key=lambda r: len(r["text"])))
    rest = [r for r in rows if r not in chosen]
    rest.sort(key=lambda r: -len(r["text"]))
    chosen += rest[:PER_PRODUCT - len(chosen)]
    chosen.sort(key=lambda r: r["date"], reverse=True)
    return chosen


def main():
    # 分兩批拉 —— 先做評價最多嗰一百件，之後補返其餘。兩份夾埋當一份。
    raw = {}
    for name in ("reviews-raw.json", "reviews-rest.json"):
        f = f"{SRC}/{name}"
        if os.path.exists(f):
            raw.update(json.load(open(f)))
    ratings = json.load(open(f"{SRC}/ratings.json"))
    top = [{"h": h, "no": v["prdtNo"]} for h, v in ratings.items()]

    by_no = {}
    stats = {"原始": 0, "spam": 0, "講價錢": 0, "太短": 0, "重覆": 0, "留低": 0}

    for no, d in raw.items():
        rows = []
        for r in d.get("reviews", []):
            stats["原始"] += 1
            t = clean(r["text"])
            if len(t) < 12:
                stats["太短"] += 1
                continue
            if spammy(t):
                stats["spam"] += 1
                continue
            if PRICE.search(t):
                stats["講價錢"] += 1
                continue
            dt = r["date"]
            rows.append({
                "star": r["star"],
                "date": f"{dt[:4]}-{dt[4:6]}-{dt[6:]}",
                "who": r["who"],
                "shade": clean(r["shade"]),
                "text": t,
                "attrs": [{"name": ATTR_ZH.get(a["n"], a["n"]), "score": a["s"]}
                          for a in r.get("attrs", [])],
            })
        before = len(rows)
        rows = dedupe(rows)
        stats["重覆"] += before - len(rows)
        rows = pick(rows)
        stats["留低"] += len(rows)

        dist = []
        total = sum(x["count"] for x in d.get("scores", [])) or 1
        for i in range(5, 0, -1):
            n = sum(x["count"] for x in d.get("scores", []) if x["star"] == i)
            dist.append({"star": i, "count": n, "pct": round(n / total * 100)})

        by_no[no] = {
            "source": "Olive Young Global",
            "sourceRef": no,
            "star": round(float(d["star"]), 1),
            "count": int(d["count"]),
            "dist": dist,
            "attrs": [{"name": ATTR_ZH.get(a["name"], a["name"]), "avg": a["avg"]}
                      for a in d.get("evlt", []) if a.get("avg")],
            "reviews": rows,
        }

    # 一件 OY 產品可以對到我哋幾個容量規格 —— 大家共用同一批評價。
    out = {}
    for row in top:
        d = by_no.get(row["no"])
        if not d or not d["reviews"]:
            continue
        rec = json.loads(json.dumps(d))
        r = ratings.get(row["h"])
        if r:                       # 目錄嗰邊嘅數係權威，覆蓋返
            rec["star"], rec["count"] = r["star"], r["count"]
        out[row["h"]] = rec

    json.dump(out, open(f"{SRC}/reviews-clean.json", "w"),
              ensure_ascii=False, indent=1)
    print("── 清洗 ──")
    for k, v in stats.items():
        print(f"  {k:<6}{v}")
    print(f"\n{len(out)} 個 handle 有評價原文（{len(by_no)} 件 OY 產品）")
    print(f"寫咗 {SRC}/reviews-clean.json")


if __name__ == "__main__":
    main()
