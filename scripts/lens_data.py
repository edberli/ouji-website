#!/usr/bin/env python3
"""
The contact-lens sheet, cleaned, and the full power ladder each colour
should be offered in.

Lenses do not work like the rest of the shop. A shopper does not pick a
product, they pick a power — and if their power is not on the page they
assume the shop cannot serve them and leave. Almost every one of these
can be ordered in, so every step from 0.00 to -6.00 is listed, whether or
not a box is on the shelf; what changes is whether it says 現貨 or 預訂.

The sheet needs cleaning before any of that is safe:

  * "Somkey Gray*4" is missing its minus sign — as written it reads +4.00
  * "SAKURA PETAL *-250" is -2.50 with the decimal point dropped
  * "Crem Beige", "Somk Beige", "Somkey Gray" are misspellings that split
    a colour across two listings
  * one row carries negative stock, which is a count that cannot be true

    python3 scripts/lens_data.py            # 睇清理後嘅結果
"""
import os
import re

SHEET = os.path.expanduser(
    "~/.claude/uploads/27cab4f2-789b-4790-89d3-7ceac9089d4a/"
    "6a0a8d2a-SweetyMagic____20260807_1754.xlsx")

# Every 0.25 step the supplier demonstrably carries. Not extended past
# -6.00: deeper powers exist for these brands in Japan, but listing a
# power we have never actually ordered would take a customer's money for
# something we cannot promise.
LADDER = [round(-n * 0.25, 2) for n in range(0, 25)]

# Misspellings that split one colour into two listings.
RENAME = {
    "Lilmoon 1 day #Crem Beige": "Lilmoon 1 day #Cream Beige",
    "Lilmoon 1 day #Somk Beige": "Lilmoon 1 day #Smoke Beige",
    "Lilmoon 1 day #Somkey Gray": "Lilmoon 1 day #Smokey Gray",
    "Molak 1Day #SAKURA PETAL": "Molak 1 Day #Sakura Petal",
    "Molak1 Day #Sakura Petal": "Molak 1 Day #Sakura Petal",
}

BRANDS = ["Feliamo", "Lilmoon", "Molak", "N's Collection", "TOPARDS"]


def power_of(title):
    """The dioptre at the end of the title, as a number."""
    m = re.search(r"\*\s*(-?[\d.]+)\s*$", title)
    if not m:
        return None
    v = float(m.group(1))
    if v == -250:            # decimal point dropped
        v = -2.50
    if v > 0:                # minus sign dropped; there are no plus powers here
        v = -v
    return round(v, 2)


def colour_of(title):
    base = re.sub(r"\s*\*\s*-?[\d.]+\s*$", "", title).strip()
    base = re.sub(r"Molak1 Day", "Molak 1 Day", base)
    base = re.sub(r"\s+", " ", base)
    return RENAME.get(base, base)


def brand_of(colour):
    for b in BRANDS:
        if colour.lower().startswith(b.lower()):
            return b
    return colour.split()[0]


def shade_of(colour):
    m = re.search(r"#\s*(.+)$", colour)
    return m.group(1).strip() if m else colour


def load():
    """{colour: {"brand", "shade", "cost", "price", "stock": {power: qty},
                 "barcode": {power: code}}}"""
    import openpyxl
    ws = openpyxl.load_workbook(SHEET, data_only=True).worksheets[0]
    out = {}
    for row in ws.iter_rows(min_row=2, values_only=True):
        if not row or not row[1]:
            continue
        title, barcode, qty, cost, price = row[1], row[2], row[3], row[4], row[5]
        colour = colour_of(title)
        power = power_of(title)
        if power is None:
            continue
        rec = out.setdefault(colour, {
            "brand": brand_of(colour), "shade": shade_of(colour),
            "cost": None, "price": None, "stock": {}, "barcode": {},
        })
        # A negative count is a bookkeeping error, not stock. Treated as
        # none rather than carried into the shop as a number.
        n = int(qty or 0)
        rec["stock"][power] = max(0, n)
        if barcode:
            rec["barcode"][power] = str(barcode).strip()
        if cost is not None:
            rec["cost"] = float(cost)
        if price is not None:
            rec["price"] = float(price)
    return out


def main():
    data = load()
    total_in = total_pre = 0
    print(f'{"色":<44}{"現貨":>5}{"預訂":>5}{"成本":>7}{"售價":>6}')
    for colour, r in sorted(data.items()):
        have = sum(1 for p in LADDER if r["stock"].get(p, 0) > 0)
        pre = len(LADDER) - have
        total_in += have
        total_pre += pre
        print(f'{colour:<44}{have:>5}{pre:>5}{r["cost"] or 0:>7.2f}{r["price"] or 0:>6.0f}')
    print(f'\n{len(data)} 個色 × {len(LADDER)} 個度數 = {len(data) * len(LADDER)} 個選項')
    print(f'  現貨 {total_in}、預訂 {total_pre}')


if __name__ == "__main__":
    main()
