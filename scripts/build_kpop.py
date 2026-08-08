#!/usr/bin/env python3
"""
Publish the K-pop merchandise that is actually in stock.

Unlike the skincare and lens ranges, a sold-out row here is not waiting
for stock. A K-pop album is a pressing: when it is gone the label does
not make more, so five of the thirty rows are skipped outright rather
than listed as pre-order. Nothing about this range is orderable-in.

Which also means the stock number is the whole inventory. These are
tracked and policy DENY — the opposite of the lenses — because promising
a fourteenth copy of an album that had thirteen is a promise nobody can
keep.

    python3 scripts/build_kpop.py --dry-run
    python3 scripts/build_kpop.py
"""
import argparse
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kpop_data import load  # noqa: E402
from publish import channels, existing_id  # noqa: E402
from shopify_admin import gql, user_errors  # noqa: E402

MATCHED = "/tmp/kpop/matched.json"
LOCATION = "gid://shopify/Location/86449356958"

PRODUCT_SET = """
mutation($input: ProductSetInput!) {
  productSet(synchronous: true, input: $input) {
    product { id handle
      variants(first: 5) { edges { node { id inventoryItem { id } } } } }
    userErrors { field message code }
  }
}
"""
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

# What the thing is, from its own title.
KIND = [
    ("寫真書", r"photobook|photo book|寫真"),
    ("周邊", r"light ?stick|keyring|photocard|poster|slogan|doll|badge|tumbler"),
    ("專輯", r"album|ep\b|single|mini|repackage|hiptape|mixtape"),
]


def kind_of(title):
    for name, rx in KIND:
        if re.search(rx, title, re.I):
            return name
    return "專輯"


def handle_of(item):
    s = re.sub(r"[^a-z0-9]+", "-", item["title"].lower()).strip("-")[:60]
    return f"kpop-{s}-{item['barcode'][-4:]}"


def body(item, version_match=True):
    versions = re.search(r"\((\d+)\s*Versions?\)", item["title"], re.I)
    note = ("<li>版本：隨機出貨（共 %s 款），恕不指定</li>" % versions.group(1)
            if versions else "")
    # The retailers we source imagery from do not carry every version we
    # hold, so some listings show a different pressing of the same album.
    # Said plainly, at the top, where it is read before the picture is
    # trusted — not buried in the small print.
    caveat = ("" if version_match else
              '<p><strong>圖片僅供參考，實際版本以標題為準。</strong><br>'
              '相片係同一張專輯嘅另一個版本，封面設計會有分別；'
              '你收到嘅係標題寫嗰個版本。</p>')
    return (
        f'<p><strong>{item["artist"]}</strong></p>'
        f'<p>{item["title"]}</p>'
        f'{caveat}'
        f'<ul>'
        f'<li>韓國原裝正版，附官方贈品（小卡等隨機內容以實物為準）</li>'
        f'{note}'
        f'<li>庫存：{item["qty"]} 件</li>'
        f'</ul>'
        f'<p><strong>要留意</strong><br>'
        f'專輯係一次過壓製發行，賣完唔會補貨。'
        f'小卡、海報等隨機內容由唱片公司包裝，唔可以指定，亦唔設換卡。</p>'
    )


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    matched = json.load(open(MATCHED)) if os.path.exists(MATCHED) else {}
    live = draft = 0
    for item in load():
        m = matched.get(item["barcode"]) or {}
        pics = m.get("imgs") or []
        kind = kind_of(item["title"])

        prod = {
            "handle": handle_of(item),
            "title": item["title"],
            "descriptionHtml": body(item, m.get("version_match", True)),
            "vendor": item["artist"],
            "productType": kind,
            "tags": ["K-pop", "kpop", "周邊", kind, item["artist"]],
            "status": "ACTIVE" if pics else "DRAFT",
            "productOptions": [{"name": "版本", "values": [{"name": "標準版"}]}],
            "variants": [{
                "optionValues": [{"optionName": "版本", "name": "標準版"}],
                "price": str(item["price"]),
                "barcode": item["barcode"],
                "sku": item["barcode"],
                "inventoryItem": {"tracked": True},
                "inventoryQuantities": [{"locationId": LOCATION, "name": "available",
                                         "quantity": item["qty"]}],
                # A pressing cannot be reordered, so the count is the limit.
                "inventoryPolicy": "DENY",
            }],
            "files": [{"originalSource": u, "contentType": "IMAGE",
                       "alt": item["title"]} for u in pics[:8]],
        }

        flag = "" if pics else "   ← 冇圖，出 draft"
        print(f'{item["qty"]:>3} 件  {len(pics)} 圖  {kind:<4}{item["title"][:46]}{flag}')
        live += bool(pics)
        draft += not pics
        if args.dry_run:
            continue

        pid = existing_id(prod["handle"])
        if pid:
            prod["id"] = pid
        out = gql(PRODUCT_SET, {"input": prod})
        user_errors(out, "productSet")
        p = out["productSet"]["product"]
        gql(PUBLISH, {"id": p["id"],
                      "input": [{"publicationId": c} for c in channels()]})
        if item["cost"]:
            iid = p["variants"]["edges"][0]["node"]["inventoryItem"]["id"]
            user_errors(gql(SET_COST, {"id": iid,
                                       "input": {"cost": f'{item["cost"]:.2f}'}}),
                        "inventoryItemUpdate")

    print(f'\nK-pop：{live} 件上架、{draft} 件 draft'
          + ("（dry run）" if args.dry_run else ""))


if __name__ == "__main__":
    main()
