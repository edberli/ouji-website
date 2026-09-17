#!/usr/bin/env python3
"""Export every non-product Shopify resource needed for disaster recovery.

Writes JSON/text exports next to the product backup so the nightly snapshot
copies them too. Every resource is exported independently: one failure is
recorded in coverage.json and makes the run exit non-zero instead of passing
silently with missing data.

    python3 scripts/backup_full.py                     # 去 /Volumes/core/ouji-backup/full
    python3 scripts/backup_full.py --out DIR
    python3 scripts/backup_full.py --max-pages 1       # 快速測試
'"""
import argparse
import base64
import datetime
import json
import os
import sys
import urllib.request
from zoneinfo import ZoneInfo

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from shopify_admin import API, SHOP, gql, token  # noqa: E402

DEFAULT_OUT = "/Volumes/core/ouji-backup/full"

PAGE_INFO = "pageInfo { hasNextPage endCursor }"


def get_path(data, path):
    for part in path.split("."):
        data = data[part]
    return data


def page_nodes(query, root, variables=None, max_pages=None):
    """Yield nodes from a cursor-paginated connection (dotted root path)."""
    cursor, pages = None, 0
    while True:
        v = dict(variables or {})
        v["cursor"] = cursor
        d = get_path(gql(query, v), root)
        for edge in d["edges"]:
            yield edge["node"]
        pages += 1
        if not d["pageInfo"]["hasNextPage"] or (max_pages and pages >= max_pages):
            return
        cursor = d["pageInfo"]["endCursor"]


def write_json(path, data, private=False):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    if private:
        os.chmod(path, 0o600)


# ---------------------------------------------------------------- resources

ORDERS_Q = f"""query($cursor: String) {{
  orders(first: 25, after: $cursor, sortKey: CREATED_AT) {{
    {PAGE_INFO}
    edges {{ node {{
      id name createdAt updatedAt cancelledAt closedAt
      currencyCode displayFinancialStatus displayFulfillmentStatus
      totalPriceSet {{ shopMoney {{ amount currencyCode }} }}
      subtotalPriceSet {{ shopMoney {{ amount }} }}
      totalTaxSet {{ shopMoney {{ amount }} }}
      totalDiscountsSet {{ shopMoney {{ amount }} }}
      totalShippingPriceSet {{ shopMoney {{ amount }} }}
      customer {{ id email }}
      email phone tags note
      shippingAddress {{ name address1 address2 city province country zip phone }}
      billingAddress {{ name address1 address2 city province country zip phone }}
      lineItems(first: 50) {{ edges {{ node {{
        id title sku quantity
        variant {{ id }}
        originalUnitPriceSet {{ shopMoney {{ amount }} }}
        discountedUnitPriceSet {{ shopMoney {{ amount }} }}
      }} }} }}
      fulfillments(first: 5) {{ id status createdAt trackingInfo {{ number url company }} }}
      refunds {{ id createdAt totalRefundedSet {{ shopMoney {{ amount }} }} }}
      transactions(first: 10) {{ id kind status processedAt amountSet {{ shopMoney {{ amount }} }} }}
    }} }}
  }}
}}"""

CUSTOMERS_Q = f"""query($cursor: String) {{
  customers(first: 25, after: $cursor, sortKey: CREATED_AT) {{
    {PAGE_INFO}
    edges {{ node {{
      id email phone firstName lastName displayName
      createdAt updatedAt note tags state
      amountSpent {{ amount currencyCode }}
      numberOfOrders
      defaultAddress {{ name address1 address2 city province country zip phone }}
      addresses(first: 10) {{ name address1 address2 city province country zip phone }}
      emailMarketingConsent {{ marketingState consentUpdatedAt }}
      smsMarketingConsent {{ marketingState consentUpdatedAt }}
    }} }}
  }}
}}"""

PAGES_Q = f"""query($cursor: String) {{
  pages(first: 50, after: $cursor) {{
    {PAGE_INFO}
    edges {{ node {{ id title handle body createdAt updatedAt }} }}
  }}
}}"""

BLOGS_Q = f"""query($cursor: String) {{
  blogs(first: 10, after: $cursor) {{
    {PAGE_INFO}
    edges {{ node {{ id title handle createdAt updatedAt }} }}
  }}
}}"""

ARTICLES_Q = f"""query($cursor: String, $blogId: ID!) {{
  blog(id: $blogId) {{
    articles(first: 50, after: $cursor) {{
      {PAGE_INFO}
      edges {{ node {{
        id title handle body summary tags createdAt updatedAt
        author {{ name }} image {{ url }}
      }} }}
    }}
  }}
}}"""

MENUS_Q = """{ menus(first: 20) { edges { node {
  id handle title
  items { id title type url resourceId
    items { id title type url resourceId
      items { id title type url resourceId }
    }
  }
} } } }"""

DISCOUNTS_Q = f"""query($cursor: String) {{
  discountNodes(first: 25, after: $cursor) {{
    {PAGE_INFO}
    edges {{ node {{
      id
      discount {{
        __typename
        ... on DiscountCodeBasic {{ title status startsAt endsAt
          codes(first: 50) {{ edges {{ node {{ code }} }} }} }}
        ... on DiscountCodeBxgy {{ title status startsAt endsAt }}
        ... on DiscountAutomaticBasic {{ title status startsAt endsAt }}
        ... on DiscountAutomaticBxgy {{ title status startsAt endsAt }}
      }}
    }} }}
  }}
}}"""

SHIPPING_Q = """{ deliveryProfiles(first: 10) { edges { node {
  id name default
  profileLocationGroups {
    locationGroupZones(first: 10) { edges { node {
      zone { id name countries { code { countryCode restOfWorld } } }
      methodDefinitions(first: 20) { edges { node {
        id name description active
        rateProvider { ... on DeliveryRateDefinition { price { amount currencyCode } } }
      } } }
    } } }
  }
} } } }"""

MARKETS_Q = """{ markets(first: 10) { edges { node {
  id name handle enabled
  regions(first: 20) { edges { node { id name } } }
} } } }"""

SHOP_Q = """{ shop { name email contactEmail myshopifyDomain description
  primaryDomain { host url } currencyCode weightUnit
  billingAddress { address1 address2 city province country zip phone company }
}
shopLocales { locale primary published } }"""

METAOBJ_DEFS_Q = f"""query($cursor: String) {{
  metaobjectDefinitions(first: 25, after: $cursor) {{
    {PAGE_INFO}
    edges {{ node {{ id name type fieldDefinitions {{ key name type {{ name }} }} }} }}
  }}
}}"""

METAOBJ_Q = f"""query($cursor: String, $type: String!) {{
  metaobjects(first: 50, after: $cursor, type: $type) {{
    {PAGE_INFO}
    edges {{ node {{ id handle type fields {{ key value }} }} }}
  }}
}}"""

THEMES_Q = """{ themes(first: 20) { edges { node { id name role updatedAt } } } }"""

THEME_FILES_Q = f"""query($cursor: String, $themeId: ID!) {{
  theme(id: $themeId) {{
    files(first: 50, after: $cursor) {{
      {PAGE_INFO}
      edges {{ node {{
        filename size updatedAt
        body {{
          ... on OnlineStoreThemeFileBodyText {{ content }}
          ... on OnlineStoreThemeFileBodyBase64 {{ contentBase64 }}
        }}
      }} }}
    }}
  }}
}}"""

FILES_Q = f"""query($cursor: String) {{
  files(first: 50, after: $cursor) {{
    {PAGE_INFO}
    edges {{ node {{
      id alt fileStatus createdAt
      ... on MediaImage {{ image {{ url width height }} }}
      ... on GenericFile {{ url }}
    }} }}
  }}
}}"""


def rest_policies():
    req = urllib.request.Request(
        f"https://{SHOP}/admin/api/{API}/policies.json",
        headers={"X-Shopify-Access-Token": token()},
    )
    return json.load(urllib.request.urlopen(req, timeout=60))


# ---------------------------------------------------------------- exporters

def export_orders(out, max_pages):
    nodes = list(page_nodes(ORDERS_Q, "orders", max_pages=max_pages))
    write_json(os.path.join(out, "orders.json"), nodes, private=True)
    return len(nodes)


def export_customers(out, max_pages):
    nodes = list(page_nodes(CUSTOMERS_Q, "customers", max_pages=max_pages))
    write_json(os.path.join(out, "customers.json"), nodes, private=True)
    return len(nodes)


def export_pages(out, max_pages):
    nodes = list(page_nodes(PAGES_Q, "pages", max_pages=max_pages))
    write_json(os.path.join(out, "pages.json"), nodes)
    return len(nodes)


def export_blogs(out, max_pages):
    blogs = list(page_nodes(BLOGS_Q, "blogs", max_pages=max_pages))
    full = []
    for blog in blogs:
        articles = list(page_nodes(ARTICLES_Q, "blog.articles", {"blogId": blog["id"]},
                                   max_pages=max_pages))
        blog = dict(blog)
        blog["articles"] = articles
        full.append(blog)
    write_json(os.path.join(out, "blogs.json"), full)
    return sum(len(b["articles"]) for b in full)


def export_menus(out, max_pages):
    d = gql(MENUS_Q)
    menus = [e["node"] for e in d["menus"]["edges"]]
    write_json(os.path.join(out, "menus.json"), menus)
    return len(menus)


def export_discounts(out, max_pages):
    nodes = list(page_nodes(DISCOUNTS_Q, "discountNodes", max_pages=max_pages))
    write_json(os.path.join(out, "discounts.json"), nodes)
    return len(nodes)


def export_shipping(out, max_pages):
    d = gql(SHIPPING_Q)
    profiles = [e["node"] for e in d["deliveryProfiles"]["edges"]]
    write_json(os.path.join(out, "shipping.json"), profiles)
    return len(profiles)


def export_markets(out, max_pages):
    d = gql(MARKETS_Q)
    markets = [e["node"] for e in d["markets"]["edges"]]
    write_json(os.path.join(out, "markets.json"), markets)
    return len(markets)


def export_shop(out, max_pages):
    d = gql(SHOP_Q)
    write_json(os.path.join(out, "shop.json"), d)
    return 1


def export_policies(out, max_pages):
    data = rest_policies()
    write_json(os.path.join(out, "policies.json"), data)
    return len(data.get("policies") or [])


def export_metaobjects(out, max_pages):
    defs = list(page_nodes(METAOBJ_DEFS_Q, "metaobjectDefinitions", max_pages=max_pages))
    result = []
    total = 0
    for d in defs:
        items = list(page_nodes(METAOBJ_Q, "metaobjects", {"type": d["type"]},
                                max_pages=max_pages))
        result.append({"definition": d, "entries": items})
        total += len(items)
    write_json(os.path.join(out, "metaobjects.json"), result)
    return total


def export_themes(out, max_pages):
    d = gql(THEMES_Q)
    themes = [e["node"] for e in d["themes"]["edges"]]
    written = 0
    for theme in themes:
        safe = f"{theme['role'].lower()}-{theme['name']}".replace("/", "-")
        base = os.path.join(out, "themes", safe)
        for f in page_nodes(THEME_FILES_Q, "theme.files", {"themeId": theme["id"]},
                            max_pages=max_pages):
            rel = os.path.normpath(f["filename"]).lstrip("/")
            if rel.startswith(".."):
                continue
            dest = os.path.join(base, rel)
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            body = f.get("body") or {}
            if body.get("content") is not None:
                with open(dest, "w") as fh:
                    fh.write(body["content"])
            elif body.get("contentBase64"):
                with open(dest, "wb") as fh:
                    fh.write(base64.b64decode(body["contentBase64"]))
            written += 1
        theme = dict(theme)
        theme.pop("files", None)
        write_json(os.path.join(base, "_theme.json"), theme)
    write_json(os.path.join(out, "themes.json"), themes)
    return written


def export_files(out, max_pages):
    nodes = list(page_nodes(FILES_Q, "files", max_pages=max_pages))
    write_json(os.path.join(out, "files.json"), nodes)
    return len(nodes)


RESOURCES = [
    ("orders", export_orders),
    ("customers", export_customers),
    ("pages", export_pages),
    ("blogs", export_blogs),
    ("menus", export_menus),
    ("discounts", export_discounts),
    ("shipping", export_shipping),
    ("markets", export_markets),
    ("shop", export_shop),
    ("policies", export_policies),
    ("metaobjects", export_metaobjects),
    ("themes", export_themes),
    ("files", export_files),
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=DEFAULT_OUT)
    ap.add_argument("--max-pages", type=int)
    args = ap.parse_args()

    base = os.path.dirname(args.out.rstrip("/"))
    if not os.path.isdir(base):
        raise SystemExit(f"{base} 唔存在 —— /Volumes/core 掛咗未？")
    os.makedirs(args.out, exist_ok=True)

    coverage = {
        "exported_at": datetime.datetime.now(ZoneInfo("Asia/Hong_Kong")).isoformat(timespec="seconds"),
        "store": SHOP,
        "api_version": API,
        "resources": {},
    }
    failed = []
    for name, fn in RESOURCES:
        try:
            count = fn(args.out, args.max_pages)
            coverage["resources"][name] = {"status": "ok", "count": count}
            print(f"  ✓ {name}: {count}")
        except Exception as exc:  # keep going; report rather than hide
            coverage["resources"][name] = {"status": "failed", "error": str(exc)[:300]}
            failed.append(name)
            print(f"  ✗ {name}: {str(exc)[:160]}", file=sys.stderr)
    coverage["failed"] = failed
    write_json(os.path.join(args.out, "coverage.json"), coverage)
    print(f"匯出完成：{args.out}" + (f"（失敗：{', '.join(failed)}）" if failed else ""))
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
