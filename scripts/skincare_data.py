#!/usr/bin/env python3
"""
Load and clean the skincare inventory.

The sheet is a stock list, not a catalogue: titles carry the supplier's
own prefixes, the size is embedded in the name in four different
notations, and a few barcodes appear twice because the same product came
in on two invoices at different cost.

What this fixes, and nothing more:

  * duplicate barcodes merge — stock adds up, cost takes the most recent
    invoice, since that is what the next sale actually costs us
  * supplier noise comes off the title ("//博思BOSS", a leading "(c)")
  * the size is pulled out of the title into its own field, so a line
    sold in two sizes can become one product with two variants

Deliberately not fixed here: the Chinese titles themselves. They are the
merchant's own wording and the naming rule for this shop is that our
titles win over the brand's.

    python3 scripts/skincare_data.py            # summary
    python3 scripts/skincare_data.py --brand Anua
"""
import argparse
import os
import re
from collections import defaultdict

import openpyxl

XLSX = "/Volumes/core/下載/KBeauty_Brands_Inventory.xlsx"

# supplier scribbles that are not part of the product name
NOISE = [
    r"//\s*博思BOSS\s*$", r"^\s*\((?:O|o|c|C)\)\s*", r"\s*//\s*$",
]

SIZE = re.compile(
    r"(?:\[([^\]]{1,28})\]"                       # [150毫升]
    r"|(\d+(?:\.\d+)?\s*(?:ml|ML|毫升|g|G|克|片|pads?|매))"   # 150ml / 10片
    r"|\((\d+\s*片[^)]{0,10})\))"
)


def clean_title(t):
    t = str(t or "").strip()
    for rx in NOISE:
        t = re.sub(rx, "", t).strip()
    return re.sub(r"\s{2,}", " ", t)


def size_of(title):
    """The pack size as the sheet writes it, or '' when it says nothing."""
    m = SIZE.search(title)
    if not m:
        return ""
    return next(g for g in m.groups() if g).strip()


def load(brand=None):
    wb = openpyxl.load_workbook(XLSX, data_only=True)
    ws = wb["K-Beauty Brands"]
    merged = {}
    for r in ws.iter_rows(min_row=2, values_only=True):
        if not r[0] or not r[1]:
            continue
        vendor = str(r[0]).strip()
        if brand and vendor.lower() != brand.lower():
            continue
        bar = str(r[1]).strip()
        title = clean_title(r[2])
        row = {
            "vendor": vendor, "barcode": bar, "title": title,
            "size": size_of(title),
            "qty": int(r[3] or 0),
            "cost": round(float(r[4]), 2) if r[4] not in (None, "") else None,
            "price": round(float(r[5]), 2) if r[5] not in (None, "") else None,
            "unit": r[7] or "", "updated": r[8],
        }
        prev = merged.get(bar)
        if not prev:
            merged[bar] = row
            continue
        # Same barcode twice: stock adds, and cost follows the newer
        # invoice because that is what restocking it costs today.
        prev["qty"] += row["qty"]
        newer = row["updated"] and prev["updated"] and row["updated"] > prev["updated"]
        if newer or prev["cost"] is None:
            prev["cost"] = row["cost"]
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
            gm = (1 - r["cost"] / r["price"]) * 100 if r["cost"] and r["price"] else 0
            print(f'{r["barcode"]}  庫{r["qty"]:>3}  本{r["cost"]:>7}  售{r["price"]:>6}'
                  f'  毛利{gm:5.1f}%  {r["size"]:<12}{r["title"][:52]}')
        return

    print(f'{len(rows)} 個 SKU / {len(groups)} 個品牌\n')
    print(f'{"品牌":<20}{"SKU":>5}{"有貨":>6}{"庫存":>7}{"毛利%":>8}')
    for v, rs in sorted(groups.items(), key=lambda x: -len(x[1])):
        live = [r for r in rs if r["qty"] > 0]
        gms = [(1 - r["cost"] / r["price"]) * 100
               for r in rs if r["cost"] and r["price"]]
        print(f'{v:<20}{len(rs):>5}{len(live):>6}{sum(r["qty"] for r in rs):>7}'
              f'{(sum(gms)/len(gms) if gms else 0):>8.1f}')
    sized = [r for r in rows if r["size"]]
    print(f'\n抽到容量／片數：{len(sized)} / {len(rows)}')


if __name__ == "__main__":
    main()
