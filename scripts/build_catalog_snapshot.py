#!/usr/bin/env python3
"""砌 data/catalog.json —— 前台第一屏用嘅目錄快照。

**點解要有呢個檔**

首頁（同分類頁）要成個目錄先計得到件數、排到序、揀到封面。目錄有 899 件，
Storefront API 一頁最多 250 件，而且係游標分頁 —— 即係四個 request 一個接
一個行，唔並行得。實測首頁要等到 1.0 秒先攞齊，之前呢一秒係白畫面：
header 出咗，下面乜都冇。

呢個檔就係嗰四個 request 嘅結果，事先抽好、擺喺 Vercel 邊緣。前台一個
request 就攞齊，之後先喺背景同 API 對數（見 shopify.js `getAllProducts`）。

**幾時要重跑**

上咗新貨、落咗架、改咗價就要重跑，唔係就會出舊價。每晚備份之後跑就啱：

    python3 scripts/build_catalog_snapshot.py

**格式**

同 `sessionStorage` 嗰份一模一樣：`{"at": <毫秒>, "v": [{"node": {...}}]}`，
欄位同 `shopify.js` 個 GetProducts query 逐個對齊。改個 query 就要改埋呢度，
否則前台會攞到一份少咗欄位嘅目錄（例如冇 totalInventory 就成店變「有貨」）。
"""

import json
import os
import sys
import time
import urllib.request

API = "https://5rerjn-mt.myshopify.com/api/2025-07/graphql.json"
TOKEN = "795e2f7cb13da1d3776449eba5802377"  # 公開 storefront token，本來就喺前端
OUT = os.path.join(os.path.dirname(__file__), "..", "data", "catalog.json")

QUERY = """
query GetProducts($first: Int!, $after: String) {
  products(first: $first, after: $after) {
    pageInfo { hasNextPage endCursor }
    edges {
      node {
        id handle title vendor productType tags createdAt
        priceRange { minVariantPrice { amount currencyCode } }
        compareAtPriceRange { minVariantPrice { amount currencyCode } }
        images(first: 2) { edges { node { url altText } } }
        totalInventory
        variants(first: 2) { edges { node { id availableForSale quantityAvailable } } }
      }
    }
  }
}
"""


def fetch(after=None):
    body = json.dumps({"query": QUERY, "variables": {"first": 250, "after": after}})
    req = urllib.request.Request(
        API,
        data=body.encode(),
        headers={
            "Content-Type": "application/json",
            "X-Shopify-Storefront-Access-Token": TOKEN,
        },
    )
    with urllib.request.urlopen(req, timeout=90) as r:
        payload = json.load(r)
    if payload.get("errors"):
        raise SystemExit(f"Storefront API 報錯：{payload['errors']}")
    return payload["data"]["products"]


def main():
    edges, after, pages = [], None, 0
    while True:
        page = fetch(after)
        edges.extend(page["edges"])
        pages += 1
        if not page["pageInfo"]["hasNextPage"]:
            break
        after = page["pageInfo"]["endCursor"]

    if len(edges) < 100:
        # 一係 API 出事，一係 token 冧咗。寧願唔寫，都好過寫一份得幾件貨
        # 嘅快照上去 —— 客會見到成間鋪得十件貨。
        raise SystemExit(f"只攞到 {len(edges)} 件，唔似係全店，唔寫檔。")

    snapshot = {"at": int(time.time() * 1000), "v": edges}
    path = os.path.abspath(OUT)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(snapshot, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, path)

    size = os.path.getsize(path) / 1024
    print(f"寫好 {path}：{len(edges)} 件、{pages} 頁、{size:.0f} KB")


if __name__ == "__main__":
    sys.exit(main())
