#!/usr/bin/env python3
"""
Publish the contact lenses: every colour, every power, stocked or not.

Lenses invert how the rest of the shop works. Elsewhere a product without
stock is hidden; here a power without stock is the whole point of the
page. A shopper comes with a number — -3.25 — and if that number is not
on the page they conclude the shop cannot serve them and leave, even
though we can have it in a fortnight.

So all 25 steps from 0.00 to -6.00 are listed for every colour, and the
only difference is what the option says:

    -3.25  現貨          on the shelf, ships today
    -3.50  預訂 · 14 日   ordered in, and the page says so before you pay

Every power stays buyable — inventoryPolicy CONTINUE throughout. The
stock count decides what the page says, not whether the sale is allowed:
someone ordering five of a power with one on the shelf is told
"1 件現貨，其餘 4 件預訂" at the basket rather than being refused.

    python3 scripts/build_lenses.py --dry-run
    python3 scripts/build_lenses.py "Feliamo 1Day #Espresso"
"""
import argparse
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lens_data import LADDER, brand_of, load, shade_of  # noqa: E402
from publish import channels, existing_id  # noqa: E402
from shopify_admin import gql, user_errors  # noqa: E402

IMAGES = "/tmp/lens_images.json"
LOCATION = "gid://shopify/Location/86449356958"
LEAD_DAYS = 14

PRODUCT_SET = """
mutation($input: ProductSetInput!) {
  productSet(synchronous: true, input: $input) {
    product { id handle
      variants(first: 60) { edges { node { id barcode inventoryItem { id } } } } }
    userErrors { field message code }
  }
}
"""

# publishablePublishToCurrentChannel publishes to whichever channel the
# app itself owns — not the headless one the storefront reads, so the
# products existed in admin and were invisible on the site.
PUBLISH = """
mutation($id: ID!, $input: [PublicationInput!]!) {
  publishablePublish(id: $id, input: $input) { userErrors { field message } }
}
"""

SET_COST = """
mutation($id: ID!, $input: InventoryItemInput!) {
  inventoryItemUpdate(id: $id, input: $input) {
    inventoryItem { id } userErrors { field message }
  }
}
"""


def label(power):
    """-3.25 reads as "-3.25"; 0.00 reads as "0.00 (平光)" because a
    shopper with no prescription is looking for the word, not the number."""
    if power == 0:
        return "0.00（平光）"
    return f"{power:.2f}"


def body(colour, brand, shade, in_stock, total):
    return (
        f'<p><strong>{brand} 一日即棄彩色隱形眼鏡 · {shade}</strong></p>'
        f'<p>日本製，一盒 10 片，單片獨立包裝。所有度數由 0.00 至 -6.00，'
        f'每 0.25 度一級 —— 現貨即日出，冇現貨嘅度數一樣落到單，'
        f'我哋會幫你叫貨。</p>'
        f'<ul>'
        f'<li>使用週期：一日即棄</li>'
        f'<li>每盒數量：10 片</li>'
        f'<li>度數範圍：0.00 至 -6.00（每 0.25 度）</li>'
        f'<li>現貨度數：{in_stock} / {total}</li>'
        f'<li>預訂度數：落單後約 {LEAD_DAYS} 日到貨</li>'
        f'</ul>'
        f'<p><strong>戴之前要知</strong><br>'
        f'隱形眼鏡係醫療器械。第一次配戴、或者換品牌之前，'
        f'請先由視光師驗配，度數同弧度啱先戴得舒服。'
        f'一日即棄唔可以重複使用。</p>'
    )


def handle_of(colour):
    s = re.sub(r"[^a-z0-9]+", "-", colour.lower()).strip("-")
    return f"lens-{s}"[:70]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("colour", nargs="?")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    data = load()
    imgs = json.load(open(IMAGES)) if os.path.exists(IMAGES) else {}

    done = skipped = 0
    for colour, r in sorted(data.items()):
        if args.colour and colour != args.colour:
            continue
        pics = imgs.get(colour) or []
        if not pics:
            print(f"  ⚠️  冇圖，出 draft：{colour}")
        brand, shade = r["brand"], r["shade"]
        in_stock = sum(1 for p in LADDER if r["stock"].get(p, 0) > 0)

        variants = []
        for p in LADDER:
            qty = r["stock"].get(p, 0)
            v = {
                "optionValues": [{"optionName": "度數", "name": label(p)}],
                "price": str(r["price"] or 158),
                "inventoryItem": {"tracked": True},
                "inventoryQuantities": [{"locationId": LOCATION,
                                         "name": "available",
                                         "quantity": int(qty)}],
                # Always CONTINUE. Blocking the order was the wrong end to
                # solve this at — someone who wants fifty boxes and can
                # have two on Friday still wants the fifty, and is owed a
                # sentence about it at the basket rather than a refusal.
                # The quantity above is what the page and basket read to
                # say 現貨 or 預訂; it no longer gates the sale.
                "inventoryPolicy": "CONTINUE",
            }
            code = r["barcode"].get(p)
            if code:
                v["barcode"] = code
                v["sku"] = code
            variants.append(v)

        item = {
            "handle": handle_of(colour),
            "title": f"{brand} 1 Day 日拋隱形眼鏡 #{shade}",
            "descriptionHtml": body(colour, brand, shade, in_stock, len(LADDER)),
            "vendor": brand,
            "productType": "隱形眼鏡",
            "tags": ["隱形眼鏡", "contact lens", "美瞳", "日拋", brand,
                     "一日即棄"],
            "status": "ACTIVE" if pics else "DRAFT",
            "productOptions": [{"name": "度數",
                                "values": [{"name": label(p)} for p in LADDER]}],
            "variants": variants,
            "files": [{"originalSource": u, "contentType": "IMAGE",
                       "alt": f"{brand} {shade}"} for u in pics[:10]],
        }

        print(f'{colour:<44}{in_stock:>3} 現貨 / {len(LADDER) - in_stock:>2} 預訂'
              f'  {len(pics)} 圖')
        if args.dry_run:
            done += 1
            continue

        # productSet keys off the id: given only a handle it tries to
        # create, and refuses because the handle is taken. Re-running has
        # to be safe here — the stock counts change every week.
        pid = existing_id(item["handle"])
        if pid:
            item["id"] = pid
        out = gql(PRODUCT_SET, {"input": item})
        user_errors(out, "productSet")
        prod = out["productSet"]["product"]
        gql(PUBLISH, {"id": prod["id"],
                      "input": [{"publicationId": c} for c in channels()]})

        # Cost sits on the inventory item and only exists once created.
        if r["cost"]:
            for e in prod["variants"]["edges"]:
                iid = e["node"]["inventoryItem"]["id"]
                user_errors(gql(SET_COST, {"id": iid,
                                           "input": {"cost": f'{r["cost"]:.2f}'}}),
                            "inventoryItemUpdate")
        done += 1

    print(f'\n{done} 個色處理咗' + ("（dry run）" if args.dry_run else ""))


if __name__ == "__main__":
    main()
