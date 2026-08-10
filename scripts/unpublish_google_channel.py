#!/usr/bin/env python3
"""Take every product off the Shopify「Google & YouTube」sales channel.

Why: Merchant Center 而家用緊我哋自己嗰個 feed
（`oujikbeauty.com/google-feed.xml`），所有連結指返 oujikbeauty.com。
Shopify 個 Google app 會同時將同一批貨推上去，但佢啲連結用「線上商店
主要網域」，即係 `shop.oujikbeauty.com` —— 而 Merchant Center 認領咗嘅
係 oujikbeauty.com，唔同網域嘅產品一律拒批。兩個來源並存 = 一堆被拒
產品，長遠會影響帳戶評分。

本來應該入 Shopify → Google & YouTube → 設定 熄咗產品同步，但嗰個
app 畫面喺瀏覽器度一直渲染唔到（成日白畫面）。落架係同一個效果：
個 app 只會同步「有掛喺佢個渠道」嘅產品，一件都冇就冇嘢好推。

    python3 scripts/unpublish_google_channel.py --dry-run
    python3 scripts/unpublish_google_channel.py

⚠️ 呢個唔會解除安裝個 app，亦都唔會影響 Meta pixel、其他渠道、
或者我哋自己個 feed。要復原就喺 Shopify 度將產品重新掛返上去。
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from shopify_admin import gql  # noqa: E402

PUB = "gid://shopify/Publication/224807747742"   # Google & YouTube

FIND = """
query($cursor: String) {
  products(first: 100, after: $cursor) {
    pageInfo { hasNextPage endCursor }
    edges { node { id handle publishedOnPublication(publicationId: "%s") } }
  }
}""" % PUB

UNPUBLISH = """
mutation($id: ID!, $pub: ID!) {
  publishableUnpublish(id: $id, input: { publicationId: $pub }) {
    userErrors { field message }
  }
}"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    published, cursor = [], None
    while True:
        d = gql(FIND, {"cursor": cursor})["products"]
        published += [e["node"] for e in d["edges"]
                      if e["node"]["publishedOnPublication"]]
        if not d["pageInfo"]["hasNextPage"]:
            break
        cursor = d["pageInfo"]["endCursor"]

    print(f"掛喺 Google & YouTube 渠道：{len(published)} 件")
    if args.dry_run:
        for p in published[:5]:
            print("  ", p["handle"])
        print("（dry run，冇改過任何嘢）")
        return

    ok, bad = 0, []
    for p in published:
        errs = gql(UNPUBLISH, {"id": p["id"], "pub": PUB})[
            "publishableUnpublish"]["userErrors"]
        if errs:
            bad.append((p["handle"], errs))
        else:
            ok += 1
    print(f"落架 {ok} 件")
    if bad:
        print(f"⚠️ {len(bad)} 件失敗：")
        for h, e in bad[:10]:
            print("  ", h, e)


if __name__ == "__main__":
    main()
