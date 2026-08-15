#!/usr/bin/env python3
"""
Load the 14-brand stock list (2026-08-14) into the shape the rest of the
pipeline already speaks.

This is an adapter, not a second loader. `skincare_data.py` reads a sheet
with the columns (品牌, 條碼, 產品名稱, 庫存, 成本價, 售價, …) in that
order; this workbook is a different export — 序號 first, 條碼 in column 4,
a 狀態 column at the end — so the only job here is to re-shape it and to
reuse `clean_title` / `size_of` unchanged.

Two things this sheet needs that the older one did not:

  * a couple of supplier tails the older NOISE list never saw
    ("/wechat //知魚//abwTai")
  * the same `?` mojibake `fix_title_mojibake.py` already documents —
    穀胱甘肽, 胜肽, 啫喱 — repaired *before* publish this time rather than
    after, so no customer ever reads a question mark

狀態 `斷貨` is carried through as `oos`; the caller decides what to do with
it (we still create the product, at stock 0).

    python3 scripts/brands14_data.py
    python3 scripts/brands14_data.py --brand SOLEP
"""
import argparse
import os
import re
import sys
from collections import defaultdict

import openpyxl

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from skincare_data import clean_title as _base_clean  # noqa: E402
from skincare_data import size_of as _base_size  # noqa: E402

XLSX = "/Volumes/core/下載/14品牌全列表_20260814.xlsx"
SHEET = "FullList"

# supplier scribbles this workbook carries that the older one did not
EXTRA_NOISE = [
    r"\s*/\s*wechat\b.*$",          # "…保濕/wechat //知魚//abwTai"
    r"\s*//\s*(?:知魚|abwTai|博思BOSS|Boss)\s*",
    r"\s*//\s*$",
]

# the same `?` holes fix_title_mojibake.py repairs on the live store —
# applied here so these 114 never reach a customer broken
MOJIBAKE = [
    ("穀胱甘?", "穀胱甘肽"), ("谷胱甘?", "谷胱甘肽"),
    ("胜?", "胜肽"), ("?喱", "啫喱"), ("潔?哩", "潔啫喱"),
    ("煙?胺", "煙酰胺"), ("人?深層", "人蔘深層"),
]

# 【25ml × 2】/ 【…】 — this sheet uses full-width brackets the older SIZE
# regex never met, and "15ml＋20ml" is a two-bottle kit, not one size.
SIZE_EXTRA = re.compile(
    r"【([^】]{1,28})】"
    r"|(\d+(?:\.\d+)?\s*ml\s*[＋+]\s*\d+(?:\.\d+)?\s*ml)"
    r"|(\d+\s*包)\b"
)


def clean_title(t):
    t = str(t or "").strip()
    for bad, good in MOJIBAKE:
        t = t.replace(bad, good)
    for rx in EXTRA_NOISE:
        t = re.sub(rx, "", t).strip()
    t = _base_clean(t)
    t = t.replace("((", "(")               # "((黑泥-…" — a stray keystroke
    return re.sub(r"\s{2,}", " ", t).strip(" -|")


def size_of(title):
    # The extra shapes are tried first on purpose: 「【25ml × 2】」 and
    # 「15ml＋20ml」 both contain a plain "25ml"/"15ml" that the base regex
    # would happily return, throwing away the half that says it is a pair.
    m = SIZE_EXTRA.search(title)
    if m:
        return next((g for g in m.groups() if g), "").strip()
    return _base_size(title)


def load(brand=None):
    wb = openpyxl.load_workbook(XLSX, data_only=True, read_only=True)
    ws = wb[SHEET]
    merged = {}
    for r in ws.iter_rows(min_row=3, values_only=True):
        if not r[1] or not r[3]:
            continue
        vendor = str(r[1]).strip()
        if brand and vendor.lower() != brand.lower():
            continue
        bar = str(r[3]).strip()
        title = clean_title(r[2])
        status = str(r[13] or "").strip()
        row = {
            "vendor": vendor, "barcode": bar, "title": title,
            "size": size_of(title),
            "unit": str(r[4] or "").strip(),
            "qty": int(r[5] or 0),
            "cost": round(float(r[6]), 2) if r[6] not in (None, "") else None,
            "price": round(float(r[7]), 2) if r[7] not in (None, "") else None,
            "status": status,
            "oos": status == "斷貨",
        }
        # 斷貨 rows sometimes still carry a stale count; the sheet's own
        # status is the truth about whether we can ship it.
        if row["oos"]:
            row["qty"] = 0
        prev = merged.get(bar)
        if not prev:
            merged[bar] = row
            continue
        prev["qty"] += row["qty"]
    return list(merged.values())


def by_vendor(rows):
    out = defaultdict(list)
    for r in rows:
        out[r["vendor"]].append(r)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--brand")
    args = ap.parse_args()
    rows = load(args.brand)
    groups = by_vendor(rows)

    if args.brand:
        for r in sorted(groups[args.brand], key=lambda x: x["title"]):
            print(f'{r["barcode"]}  庫{r["qty"]:>3}  售{r["price"]:>6}'
                  f'  {r["status"]:<4}{r["size"]:<14}{r["title"][:60]}')
        return

    print(f'{len(rows)} 個 SKU / {len(groups)} 個品牌\n')
    for v, rs in sorted(groups.items(), key=lambda x: -len(x[1])):
        sized = sum(1 for r in rs if r["size"])
        print(f'{v:<18}{len(rs):>4} SKU  {sum(r["qty"] for r in rs):>4} 件庫存'
              f'  抽到規格 {sized}/{len(rs)}')
    print(f'\n有 ? 未修好嘅標題：'
          f'{[r["title"] for r in rows if "?" in r["title"]] or "冇"}')


if __name__ == "__main__":
    main()
