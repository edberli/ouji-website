#!/usr/bin/env python3
"""
Publish a skincare brand from the inventory sheet.

Skincare is a different shape from the makeup range: almost every SKU is
its own product rather than a shade of one, and the sheet's titles are
Chinese while the brands' own stores are English. So the join is by name,
done once and cached in /tmp/skin/matched.json, not by barcode.

What each product gets:

  * our title, our price, our cost, our stock — from the sheet
  * imagery from the brand's own store, matched line by line
  * copy written from what the product actually is, not adjectives

Cost goes in as `InventoryItem.cost` at publish time, so the store has
margin data from the first day rather than being backfilled later the way
the makeup range had to be.

    python3 scripts/build_skincare.py COSRX --dry-run
    python3 scripts/build_skincare.py COSRX
"""
import argparse
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from publish import existing_id, publish  # noqa: E402
from shopify_admin import gql, user_errors  # noqa: E402
from skincare_data import by_vendor, load  # noqa: E402

MATCHED = "/tmp/skin/matched.json"
STORES = "/tmp/skin/stores.json"

SET_COST = """
mutation($id: ID!, $input: InventoryItemInput!) {
  inventoryItemUpdate(id: $id, input: $input) {
    inventoryItem { id } userErrors { field message }
  }
}
"""

VARIANTS_OF = """
query($id: ID!) {
  product(id: $id) {
    variants(first: 60) { edges { node { barcode inventoryItem { id } } } }
  }
}
"""

# what a product is -> our product type and the tags that drive the site's
# category pages. Order matters: the first hit wins.
KIND = [
    ("防曬", r"防曬|sun ?(?:screen|cream|serum|stick)|spf"),
    ("面膜", r"面膜|mask(?! ?fit)|sheet"),
    ("棉片", r"棉片|化妝棉|pad"),
    ("潔面", r"潔面|洗面|卸妝|清潔|cleans|foam|balm"),
    ("爽膚水", r"爽膚水|化妝水|toner"),
    ("精華", r"精華|安瓶|serum|ampoule|essence|booster"),
    ("眼霜", r"眼霜|eye cream"),
    ("面霜", r"面霜|乳霜|cream|gel(?! cleans)"),
    ("乳液", r"乳液|lotion|emulsion"),
    ("唇部護理", r"唇膜|潤唇|lip"),
    ("身體護理", r"身體|沐浴|body|hand"),
]

TAGS_BY_KIND = {
    "防曬": "sunscreen, 防曬", "面膜": "mask, 面膜", "棉片": "pad, 棉片",
    "潔面": "cleanser, 潔面", "爽膚水": "toner, 爽膚水",
    "精華": "serum, 精華", "眼霜": "eye cream, 眼部護理",
    "面霜": "moisturizer, 面霜", "乳液": "moisturizer, 乳液",
    "唇部護理": "lip, 唇部護理", "身體護理": "body, 身體護理",
}


def kind_of(title):
    for name, rx in KIND:
        if re.search(rx, title, re.I):
            return name
    return "護膚"


def handle_of(vendor, title, barcode):
    base = re.sub(r"[^a-z0-9]+", "-", f"{vendor} {title}".lower()).strip("-")[:60]
    return f"{base}-{barcode[-4:]}" if base else f"sku-{barcode}"


def body(title, kind, size, vendor):
    """Copy from what it is. No invented claims — the sheet gives us a name,
    a size and a category, so the copy says what that category does and
    stops there."""
    what = {
        "防曬": ("擋 UV，唔會白唔會侷。", "防曬要日日搽先有用，所以質地比 SPF 數字更決定你搽唔搽。"),
        "面膜": ("敷完即刻補返水。", "急救用，出門前或者曬完太陽敷一片，比日常保養見效快。"),
        "棉片": ("擦一擦就搞掂爽膚同去角質。", "唔使倒唔使等，一片做齊清潔同上水兩件事。"),
        "潔面": ("洗得乾淨，唔會洗到繃緊。", "洗面最緊要係洗完唔覺乾。洗到繃緊代表洗過龍，皮膚跟住會出油補返。"),
        "爽膚水": ("洗完第一層水，之後啲嘢先入到去。", "爽膚水唔係用嚟「補水」，係打底 —— 皮膚濕住嘅時候，跟住搽嘅精華先吸收得到。"),
        "精華": ("濃度最高嗰一步。", "一套護膚入面真正做嘢嗰支。用量唔使多，但要日日用先睇到分別。"),
        "眼霜": ("眼周皮薄，要獨立一支。", "眼周皮膚厚度只有面部三分一，面霜太厚會壓到起脂肪粒。"),
        "面霜": ("鎖住前面搽落去嘅嘢。", "冇面霜嘅話，前面幾多支精華都會蒸發走。乾肌尤其唔可以省。"),
        "乳液": ("比面霜輕，油肌夏天啱用。", "同樣係鎖水，但質地薄，唔會焗住毛孔。"),
        "唇部護理": ("唇冇皮脂腺，乾就要外力補。", "唇部本身唔會分泌油脂，所以乾唇唔會自己好返。"),
        "身體護理": ("身體皮膚一樣會乾。", "沖完涼三分鐘內搽，鎖水效果最好。"),
    }.get(kind, ("韓國護膚。", "由品牌官方渠道入貨，逐件對條碼上架。"))
    specs = [f"容量／規格：{size}"] if size else []
    return (f'<p><strong>{what[0]}</strong></p><p>{what[1]}</p>'
            + (f'<ul>{"".join(f"<li>{s}</li>" for s in specs)}</ul>' if specs else '')
            + f'<p><strong>品牌</strong><br>{vendor}</p>')


def set_costs(handle, rows):
    """Cost belongs on the inventory item, not the variant, and only exists
    once the product has been created."""
    pid = existing_id(handle)
    if not pid:
        return
    got = gql(VARIANTS_OF, {"id": pid})["product"]["variants"]["edges"]
    cost = {r["barcode"]: r["cost"] for r in rows if r["cost"]}
    for e in got:
        c = cost.get((e["node"]["barcode"] or "").strip())
        if c is None:
            continue
        out = gql(SET_COST, {"id": e["node"]["inventoryItem"]["id"],
                             "input": {"cost": f"{c:.2f}"}})
        user_errors(out, "inventoryItemUpdate")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("brand")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    rows = by_vendor(load(args.brand)).get(args.brand, [])
    if not rows:
        raise SystemExit(f"{args.brand}: 個 sheet 入面搵唔到")
    matched = {str(m["barcode"]): m for m in
               json.load(open(MATCHED)).get(args.brand, [])}
    store = json.load(open(STORES)).get(args.brand, [])

    live = drafted = skipped = 0
    for r in sorted(rows, key=lambda x: -x["qty"]):
        # One Anua row carries no selling price. A product without a price
        # is not a product — it is a gap in the sheet, and guessing one
        # would be inventing a number the merchant has to honour.
        if not r["price"]:
            print(f'  ⚠️  冇售價，跳過：{r["barcode"]}  {r["title"][:40]}')
            skipped += 1
            continue
        m = matched.get(r["barcode"]) or {}
        src = store[m["index"]] if m.get("index") is not None else None
        imgs = (src or {}).get("imgs", [])
        kind = kind_of(r["title"])
        tags = ("護膚, skincare, K-Beauty, " + TAGS_BY_KIND.get(kind, "")
                + f", {args.brand}")
        item = {
            "handle": handle_of(args.brand, r["title"], r["barcode"]),
            "title": r["title"], "vendor": args.brand, "productType": kind,
            "descriptionHtml": body(r["title"], kind, r["size"], args.brand),
            "tags": [t.strip() for t in tags.split(",") if t.strip()],
            "status": "ACTIVE" if imgs else "DRAFT",
            "option_name": "規格", "price": r["price"],
            "images": imgs[:20],
            "shades": [{"name": r["size"] or "單一規格",
                        "barcode": r["barcode"], "qty": r["qty"]}],
        }
        flag = "" if imgs else "   ← 冇圖，出 draft"
        print(f'{r["qty"]:>3} 件  {len(imgs):>2} 圖  {kind:<5}{r["title"][:40]}{flag}')
        live += bool(imgs)
        drafted += not imgs
        if args.dry_run:
            continue
        publish(item)
        set_costs(item["handle"], [r])

    print(f'\n{args.brand}：{live} 件上架、{drafted} 件 draft'
          + (f'、{skipped} 件冇售價跳過' if skipped else '')
          + ("（dry run）" if args.dry_run else ""))


if __name__ == "__main__":
    main()
