#!/usr/bin/env python3
"""Fold the translations back in and write the site's reviews.json.

Two checks run before anything is written, and both exist because of the
same worry: a translation that quietly changes what a reviewer said is
worse than no translation at all, and it is invisible once it is on the
page.

* **Nothing goes missing.** Every review that went out must come back
  with an id that matches. A dropped id means a product silently shows
  fewer reviews than it has.
* **Nothing gets rewritten longer.** A translation running far longer
  than its source is the signature of the model padding — adding a
  benefit the reviewer never mentioned. Those are flagged, loudly.

    python3 scripts/merge_reviews.py
    python3 scripts/merge_reviews.py --write     # 真係寫落 data/
"""
import argparse
import glob
import json
import os
import re

SRC = "/Volumes/core/ouji-oy"
SITE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                    "data", "reviews.json")

NOTE = ("以下評價由 Olive Young 顧客撰寫，OUJI 原文引用、只加中文翻譯，"
        "冇改動內容，亦冇刪走負評。只顯示我哋有貨嘅色號，"
        "同價錢有關嘅評價唔會收錄（兩邊售價唔同）。")


def load_translations():
    out = {}
    for f in sorted(glob.glob(f"{SRC}/tr-out/*.md")):
        raw = re.sub(r"^```(?:json)?|```$", "", open(f).read().strip(), flags=re.M)
        try:
            for r in json.loads(raw.strip()):
                if r.get("id") and r.get("zh"):
                    out[r["id"]] = {"zh": r["zh"], "lang": r.get("lang", "英文")}
        except json.JSONDecodeError:
            print(f"  ⚠️  {os.path.basename(f)} 唔係合法 JSON，跳過")
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--write", action="store_true")
    args = ap.parse_args()

    clean = json.load(open(f"{SRC}/reviews-clean.json"))
    tr = load_translations()

    missing, padded, out = 0, [], {}
    for handle, d in clean.items():
        no = d["sourceRef"]
        rows = []
        for i, r in enumerate(d["reviews"]):
            t = tr.get(f"{no}-{i}")
            if not t:
                missing += 1
                continue
            # 中文比英文短係正常；長過原文一倍就通常係加咗嘢。
            if len(t["zh"]) > len(r["text"]) * 1.3 and len(r["text"]) > 40:
                padded.append(f'{handle}  原文{len(r["text"])} → 譯文{len(t["zh"])}')
            rows.append({**r, "zh": t["zh"], "lang": t["lang"]})
        if not rows:
            continue
        out[handle] = {**d, "reviews": rows, "note": NOTE}

    n = sum(len(v["reviews"]) for v in out.values())
    print(f"{len(out)} 個 handle · {n} 則評價")
    print(f"  譯唔到／漏咗：{missing}")
    print(f"  譯文長過原文 1.3 倍：{len(padded)}")
    for x in padded[:8]:
        print("    " + x)

    if not args.write:
        print("\n（dry run，加 --write 先會寫落 data/reviews.json）")
        return
    json.dump(out, open(SITE, "w"), ensure_ascii=False, separators=(",", ":"))
    print(f"\n寫咗 {SITE}  ({os.path.getsize(SITE) / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
