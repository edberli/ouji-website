#!/usr/bin/env python3
"""Write robots.txt and sitemap.xml from the live catalogue.

The site had neither. That is not a small omission for a headless shop:
every product page is rendered by JavaScript from a handle in the URL, so
there is nothing for a crawler to follow — no product is linked from a
static page in a way Google can walk. Without a sitemap, 807 products are
invisible, and "why is there no traffic" answers itself.

Run after adding or removing products:

    python3 scripts/build_sitemap.py
"""
import json
import os
import sys
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from shopify_admin import gql  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://oujikbeauty.com"

# 靜態頁。priority 係相對嘅，Google 只當參考，但排返個主次冇壞。
PAGES = [
    ("/", "daily", "1.0"),
    ("/shop", "daily", "0.9"),
    ("/category", "daily", "0.9"),
    ("/makeup", "daily", "0.9"),
    ("/lens", "weekly", "0.8"),
    ("/kpop", "weekly", "0.8"),
    ("/bodycare", "weekly", "0.7"),
    ("/fragrance", "weekly", "0.6"),
    ("/lifestyle", "weekly", "0.6"),
    ("/brands", "weekly", "0.8"),
    ("/awards", "weekly", "0.7"),
    ("/match", "monthly", "0.6"),
    ("/column", "weekly", "0.7"),
    ("/about", "monthly", "0.5"),
    ("/story", "monthly", "0.4"),
    ("/faq", "monthly", "0.5"),
    ("/shipping", "monthly", "0.5"),
    ("/contact", "monthly", "0.5"),
    ("/terms", "yearly", "0.3"),
    ("/privacy", "yearly", "0.3"),
]

QUERY = """
query($cursor: String) {
  products(first: 100, after: $cursor, query: "status:active") {
    pageInfo { hasNextPage endCursor }
    edges { node { handle updatedAt onlineStoreUrl } }
  }
}
"""


def fetch_products():
    out, cursor = [], None
    while True:
        d = gql(QUERY, {"cursor": cursor})["products"]
        out += [e["node"] for e in d["edges"]]
        if not d["pageInfo"]["hasNextPage"]:
            break
        cursor = d["pageInfo"]["endCursor"]
    return out


def esc(s):
    return (s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))


def url_entry(loc, lastmod=None, freq=None, prio=None):
    bits = [f"    <loc>{esc(loc)}</loc>"]
    if lastmod:
        bits.append(f"    <lastmod>{lastmod}</lastmod>")
    if freq:
        bits.append(f"    <changefreq>{freq}</changefreq>")
    if prio:
        bits.append(f"    <priority>{prio}</priority>")
    return "  <url>\n" + "\n".join(bits) + "\n  </url>"


def main():
    today = date.today().isoformat()
    products = fetch_products()

    rows = [url_entry(SITE + p, today, f, pr) for p, f, pr in PAGES]
    for p in products:
        lastmod = (p.get("updatedAt") or "")[:10] or today
        rows.append(url_entry(f"{SITE}/products/{p['handle']}", lastmod,
                              "weekly", "0.8"))

    xml = ('<?xml version="1.0" encoding="UTF-8"?>\n'
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
           + "\n".join(rows) + "\n</urlset>\n")
    with open(os.path.join(ROOT, "sitemap.xml"), "w") as f:
        f.write(xml)

    # 結帳同帳戶頁唔應該畀爬蟲行 —— 冇 SEO 價值，而且會消耗爬取預算。
    robots = f"""User-agent: *
Allow: /
Disallow: /cart
Disallow: /account
Disallow: /wishlist
Disallow: /*?variant=

Sitemap: {SITE}/sitemap.xml
"""
    with open(os.path.join(ROOT, "robots.txt"), "w") as f:
        f.write(robots)

    print(f"sitemap.xml —— {len(PAGES)} 版靜態頁 + {len(products)} 件產品 "
          f"= {len(rows)} 條網址")
    print("robots.txt —— 已寫")


if __name__ == "__main__":
    main()
