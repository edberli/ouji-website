#!/usr/bin/env python3
"""
Thin Shopify Admin GraphQL client for the OUJI store.

Everything product-side now goes through here instead of the CSV import
dialog: the importer refuses to overwrite an existing handle, so any
correction meant deleting and re-importing by hand, and each pass cost a
dozen browser round-trips.

Reads SHOPIFY_ADMIN_TOKEN from .env (gitignored).
"""
import json
import socket
import ssl
import os
import time
import urllib.error
import urllib.request

SHOP = "5rerjn-mt.myshopify.com"
API = "2025-07"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def token():
    t = os.environ.get("SHOPIFY_ADMIN_TOKEN")
    if t:
        return t
    with open(os.path.join(ROOT, ".env")) as f:
        for line in f:
            if line.startswith("SHOPIFY_ADMIN_TOKEN="):
                return line.split("=", 1)[1].strip()
    raise SystemExit("no SHOPIFY_ADMIN_TOKEN — run scripts/shopify_oauth.py")


def gql(query, variables=None, retries=4):
    body = json.dumps({"query": query, "variables": variables or {}}).encode()
    req = urllib.request.Request(
        f"https://{SHOP}/admin/api/{API}/graphql.json",
        data=body,
        headers={"Content-Type": "application/json",
                 "X-Shopify-Access-Token": token()},
    )
    for attempt in range(retries):
        try:
            data = json.load(urllib.request.urlopen(req, timeout=90))
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < retries - 1:
                time.sleep(2 ** attempt)
                continue
            raise
        except (urllib.error.URLError, socket.timeout, ssl.SSLError, OSError) as e:
            # 上載一個牌子成廿分鐘，中途 TLS 斷一次成個 run 就死。
            # 呢啲係網絡問題唔係 API 問題，等陣重試就得。
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
                continue
            raise
        if data.get("errors"):
            # THROTTLED comes back 200 with an errors array
            if any(x.get("extensions", {}).get("code") == "THROTTLED"
                   for x in data["errors"]) and attempt < retries - 1:
                time.sleep(2 ** attempt)
                continue
            raise RuntimeError(json.dumps(data["errors"], ensure_ascii=False))
        return data["data"]
    raise RuntimeError("gave up after retries")


def user_errors(payload, *keys):
    """Raise on any userErrors nested under payload[key]."""
    for k in keys:
        errs = (payload.get(k) or {}).get("userErrors") or []
        if errs:
            raise RuntimeError(json.dumps(errs, ensure_ascii=False))


PRODUCTS_QUERY = """
query($cursor: String) {
  products(first: 50, after: $cursor) {
    pageInfo { hasNextPage endCursor }
    edges { node {
      id handle title vendor productType status descriptionHtml
      media(first: 1) { edges { node { ... on MediaImage { id } } } }
    } }
  }
}
"""


def all_products():
    out, cursor = [], None
    while True:
        page = gql(PRODUCTS_QUERY, {"cursor": cursor})["products"]
        out += [e["node"] for e in page["edges"]]
        if not page["pageInfo"]["hasNextPage"]:
            return out
        cursor = page["pageInfo"]["endCursor"]


UPDATE = """
mutation($product: ProductUpdateInput!) {
  productUpdate(product: $product) {
    product { id handle }
    userErrors { field message }
  }
}
"""


def update_product(product_id, **fields):
    data = gql(UPDATE, {"product": {"id": product_id, **fields}})
    user_errors(data, "productUpdate")
    return data["productUpdate"]["product"]


if __name__ == "__main__":
    for p in all_products():
        print(f"{p['status']:<8} {p['vendor']:<14} {p['handle']}")
