#!/usr/bin/env python3
"""Create (or remove) a HK$10 product so the owner can run a real payment through.

The shop has never taken an online order, so nobody has ever watched money
actually move — card form, 3-D Secure, order confirmation email, the
Purchase pixel. A cheap throwaway item is the cheapest way to see the whole
chain work end to end before real customers arrive.

Deliberate choices:

- **Published only to「ouji Headless」.** That is the channel
  oujikbeauty.com reads through the Storefront API. Keeping it off the
  Online Store channel means the Shopify theme never lists it.
- **Tagged `__test`.** `api/google-feed.js` drops anything with that tag,
  so the test item can never reach Google Shopping.
- **Shipping required.** The owner can still pick 觀塘門市自取 (free) and
  pay exactly the item price, but the shipping step gets exercised too —
  that step has been wrong before (a rate was priced in CNY).
- **Inventory not tracked.** One less thing that can block the test.

    python3 scripts/make_test_product.py          # 建立
    python3 scripts/make_test_product.py --remove  # 用完刪走
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from shopify_admin import gql  # noqa: E402

HANDLE = "test-payment-hkd1"   # handle 保持唔變，價錢已改做 HK$10
HEADLESS_PUB = "gid://shopify/Publication/202340466846"   # ouji Headless

FIND = """
query($h: String!) { productByHandle(handle: $h) { id title handle } }
"""

CREATE = """
mutation($input: ProductCreateInput!, $media: [CreateMediaInput!]) {
  productCreate(product: $input, media: $media) {
    product {
      id handle title
      variants(first: 1) { edges { node { id } } }
    }
    userErrors { field message }
  }
}
"""

SET_VARIANT = """
mutation($pid: ID!, $vars: [ProductVariantsBulkInput!]!) {
  productVariantsBulkUpdate(productId: $pid, variants: $vars) {
    productVariants { id price inventoryPolicy }
    userErrors { field message }
  }
}
"""

PUBLISH = """
mutation($id: ID!, $pub: ID!) {
  publishablePublish(id: $id, input: { publicationId: $pub }) {
    userErrors { field message }
  }
}
"""

DELETE = """
mutation($input: ProductDeleteInput!) {
  productDelete(input: $input) { deletedProductId userErrors { field message } }
}
"""

DESCRIPTION = """<p><strong>呢件唔係真貨。</strong>係用嚟試一次完整付款流程嘅
測試商品 —— 落單、俾錢、收確認電郵、追蹤有冇記錄到。</p>
<p>試完會即刻刪走。如果你係客人而見到呢一版，唔好落單，
有咩需要請 WhatsApp +852 9019 5092。</p>
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--remove", action="store_true")
    args = ap.parse_args()

    existing = gql(FIND, {"h": HANDLE})["productByHandle"]

    if args.remove:
        if not existing:
            print("冇呢件測試商品，唔使刪")
            return
        errs = gql(DELETE, {"input": {"id": existing["id"]}})[
            "productDelete"]["userErrors"]
        print("刪走咗" if not errs else f"刪唔到：{errs}")
        return

    if existing:
        print(f"已經有：{existing['title']}")
        print(f"https://oujikbeauty.com/products/{existing['handle']}")
        return

    out = gql(CREATE, {
        "input": {
            "title": "【測試】付款測試商品 HK$10",
            "handle": HANDLE,
            "descriptionHtml": DESCRIPTION,
            "vendor": "OUJI",
            "productType": "測試",
            "tags": ["__test"],
            "status": "ACTIVE",
        },
        "media": [{
            "originalSource": "https://oujikbeauty.com/og-image.jpg",
            "mediaContentType": "IMAGE",
            "alt": "付款測試商品",
        }],
    })["productCreate"]
    if out["userErrors"]:
        print("建立失敗：", out["userErrors"])
        return

    p = out["product"]
    vid = p["variants"]["edges"][0]["node"]["id"]

    errs = gql(SET_VARIANT, {
        "pid": p["id"],
        "vars": [{
            "id": vid,
            "price": "10.00",
            "inventoryItem": {"tracked": False, "requiresShipping": True},
        }],
    })["productVariantsBulkUpdate"]["userErrors"]
    if errs:
        print("改價失敗：", errs)
        return

    errs = gql(PUBLISH, {"id": p["id"], "pub": HEADLESS_PUB})[
        "publishablePublish"]["userErrors"]
    if errs:
        print("上架失敗：", errs)
        return

    print("建立好咗：", p["title"])
    print(f"https://oujikbeauty.com/products/{p['handle']}")


if __name__ == "__main__":
    main()
