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
# 英文快照保留英文顯示欄位，但分類一律使用同一個繁中標題來源。
# 跑法：python3 build_catalog_snapshot.py        → data/catalog.json（繁中）
#       python3 build_catalog_snapshot.py en     → data/catalog-en.json
DEFAULT_LANGUAGE = "zh"
OUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))

PRODUCT_QUERY = """
query GetProducts($first: Int!, $after: String) @inContext(language: LANGUAGE_PLACEHOLDER) {
  products(first: $first, after: $after) {
    pageInfo { hasNextPage endCursor }
    edges {
      node {
        id handle title vendor productType tags createdAt
        priceRange { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } }
        compareAtPriceRange { minVariantPrice { amount currencyCode } }
        images(first: 2) { edges { node { url altText } } }
        totalInventory
        variants(first: 2) { edges { node { id title availableForSale quantityAvailable price { amount currencyCode } compareAtPrice { amount currencyCode } } } }
        options { name optionValues { name } }
      }
    }
  }
}
"""


CANONICAL_TITLES_QUERY = """
query GetCanonicalTitles($first: Int!, $after: String) @inContext(language: ZH_TW) {
  products(first: $first, after: $after) {
    pageInfo { hasNextPage endCursor }
    edges { node { id title } }
  }
}
"""


class MissingCanonicalTitlesError(RuntimeError):
    """An English product has no current Traditional Chinese title by ID."""


def products_query(language):
    """Return the full display-data query in the requested Storefront locale."""
    storefront_language = "EN" if language == "en" else "ZH_TW"
    return PRODUCT_QUERY.replace("LANGUAGE_PLACEHOLDER", storefront_language)


def output_path(language):
    suffix = "-en" if language == "en" else ""
    return os.path.join(OUT_DIR, f"catalog{suffix}.json")


def fetch(query, after=None):
    body = json.dumps({"query": query, "variables": {"first": 250, "after": after}})
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


def fetch_all(query, fetch_page=fetch):
    """Fetch every page for one query, preserving the API's edge objects."""
    edges, after, pages = [], None, 0
    while True:
        page = fetch_page(query, after)
        edges.extend(page["edges"])
        pages += 1
        if not page["pageInfo"]["hasNextPage"]:
            break
        next_after = page["pageInfo"].get("endCursor")
        if not next_after or next_after == after:
            raise RuntimeError("Storefront API 分頁游標缺失或沒有前進，停止輸出快照。")
        after = next_after
    return edges, pages


def canonical_titles(fetch_page=fetch):
    """Read current zh-TW titles from Shopify; never use an existing snapshot."""
    edges, _ = fetch_all(CANONICAL_TITLES_QUERY, fetch_page=fetch_page)
    titles = {}
    for edge in edges:
        node = edge["node"]
        product_id, title = node.get("id"), node.get("title")
        if not product_id or not title:
            raise RuntimeError("繁中標題查詢回傳缺少產品 ID 或 title，停止輸出快照。")
        titles[product_id] = title
    return titles


def add_classification_titles(edges, language, fetch_page=fetch):
    """Add canonical zh-TW classification provenance without changing display fields."""
    if language == "en":
        titles_by_id = canonical_titles(fetch_page=fetch_page)
        missing = sorted(
            {
                edge["node"].get("id")
                for edge in edges
                if edge["node"].get("id") not in titles_by_id
            },
            key=lambda product_id: "" if product_id is None else str(product_id),
        )
        if missing:
            sample = ", ".join(
                "<missing product ID>" if product_id is None else str(product_id)
                for product_id in missing[:5]
            )
            more = f"（另有 {len(missing) - 5} 件）" if len(missing) > 5 else ""
            raise MissingCanonicalTitlesError(
                f"英文目錄有 {len(missing)} 件產品缺少目前繁中 canonical title：{sample}{more}；未寫入快照。"
            )
        for edge in edges:
            edge["node"]["classificationTitle"] = titles_by_id[edge["node"]["id"]]
        return

    for edge in edges:
        title = edge["node"].get("title")
        if not title:
            raise RuntimeError("繁中產品目錄有空白 title，停止輸出快照。")
        edge["node"]["classificationTitle"] = title


def build_snapshot(language=DEFAULT_LANGUAGE, path=None, fetch_page=fetch,
                   min_products=100, timestamp_ms=None):
    """Build a locale snapshot; canonical-title failures happen before any write."""
    language = "en" if language == "en" else "zh"
    edges, pages = fetch_all(products_query(language), fetch_page=fetch_page)

    if len(edges) < min_products:
        # 一係 API 出事，一係 token 冧咗。寧願唔寫，都好過寫一份得幾件貨
        # 嘅快照上去 —— 客會見到成間鋪得十件貨。
        raise SystemExit(f"只攞到 {len(edges)} 件，唔似係全店，唔寫檔。")

    add_classification_titles(edges, language, fetch_page=fetch_page)
    snapshot = {
        "at": int(time.time() * 1000) if timestamp_ms is None else timestamp_ms,
        "v": edges,
    }
    path = os.path.abspath(path or output_path(language))
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(snapshot, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, path)

    size = os.path.getsize(path) / 1024
    print(f"寫好 {path}：{len(edges)} 件、{pages} 頁、{size:.0f} KB")
    return snapshot


def main():
    language = sys.argv[1].lower() if len(sys.argv) > 1 else DEFAULT_LANGUAGE
    build_snapshot(language)


if __name__ == "__main__":
    sys.exit(main())
