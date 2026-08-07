#!/usr/bin/env python3
"""
Split the collected source copy into batches for the offload.

One brand's worth of English product text runs to tens of thousands of
tokens, and the model has to return a row for every product it was given.
Batches of eight keep each job small enough that a dropped row is obvious
and a rerun is cheap.

    python3 scripts/make_copy_input.py            # 全部
    python3 scripts/make_copy_input.py Purito
"""
import json
import os
import re
import sys

COPY = "/tmp/skin/copy.json"
OUT = "/tmp/skin/copy_in"
PER_BATCH = 8


def main():
    only = sys.argv[1] if len(sys.argv) > 1 else None
    copy = json.load(open(COPY))
    os.makedirs(OUT, exist_ok=True)

    by_brand = {}
    for barcode, c in copy.items():
        if only and c["brand"] != only:
            continue
        by_brand.setdefault(c["brand"], []).append((barcode, c))

    files = 0
    for brand, items in sorted(by_brand.items()):
        items.sort(key=lambda x: x[0])
        slug = re.sub(r"\W+", "-", brand.lower()).strip("-")
        for n in range(0, len(items), PER_BATCH):
            chunk = items[n:n + PER_BATCH]
            lines = [f"# 品牌：{brand}", ""]
            for barcode, c in chunk:
                lines += [f"## barcode={barcode}",
                          f"官方名：{c['source']}", "官方原文：", c["text"], ""]
            path = os.path.join(OUT, f"{slug}-{n // PER_BATCH + 1:02d}.txt")
            with open(path, "w") as f:
                f.write("\n".join(lines))
            files += 1
        print(f"{brand:<20} {len(items):>3} 件 → "
              f"{(len(items) + PER_BATCH - 1) // PER_BATCH} 個檔")
    print(f"\n合共 {files} 個檔 → {OUT}")


if __name__ == "__main__":
    main()
