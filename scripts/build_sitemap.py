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
import subprocess
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
    # /bodycare、/lifestyle 係 2026-08-29 改名之後嘅轉址頁（noindex），唔入 sitemap；
    # 2026-10-15 補返之前一直漏咗嘅分類頁。
    ("/bath", "weekly", "0.7"),
    ("/tools", "weekly", "0.6"),
    ("/seasonal", "weekly", "0.7"),
    ("/health", "weekly", "0.6"),
    ("/toys", "weekly", "0.6"),
    ("/supports", "weekly", "0.5"),
    ("/fragrance", "weekly", "0.6"),
    ("/short-dated", "daily", "0.6"),
    ("/threads", "weekly", "0.6"),
    ("/brands", "weekly", "0.8"),
    ("/awards", "weekly", "0.7"),
    ("/match", "monthly", "0.6"),
    ("/column", "weekly", "0.7"),
    ("/about", "monthly", "0.5"),
    ("/story", "monthly", "0.4"),
    ("/faq", "monthly", "0.5"),
    ("/shipping", "monthly", "0.5"),
    ("/contact", "monthly", "0.5"),
    ("/stores", "monthly", "0.6"),
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


def article_pages():
    """靈感專欄文章（articles/*.html）。2026-10-15 之前 25 篇全部冇入 sitemap。"""
    folder = os.path.join(ROOT, "articles")
    out = []
    for name in sorted(os.listdir(folder)):
        if not name.endswith(".html"):
            continue
        # lastmod 用最後一次 commit 嘅日子：排程 clone 每日 reset，檔案 mtime 唔可信。
        try:
            lastmod = subprocess.run(
                ["git", "log", "-1", "--format=%cs", "--", f"articles/{name}"],
                cwd=ROOT, capture_output=True, text=True, timeout=30).stdout.strip() or None
        except (OSError, subprocess.SubprocessError):
            lastmod = None
        out.append((f"/articles/{name[:-5]}", lastmod))
    return out


def listing_pages():
    """子分類同品牌頁（/makeup?cat=lip、/shop?brand=CLIO）。

    呢啲網址冇獨立 HTML，canonical 由 catalog.js 即場寫；邊件貨屬邊格要行
    shopify.js 嘅規則，所以交畀 scripts/listing_urls.js（Node）計。
    出錯就照出冇呢部分嘅 sitemap —— 產品頁先係大頭，唔可以陪葬。"""
    script = os.path.join(ROOT, "scripts", "listing_urls.js")
    try:
        out = subprocess.run(["node", script], capture_output=True, text=True,
                             timeout=120, check=True).stdout
        rows = json.loads(out)
    except (OSError, subprocess.SubprocessError, ValueError) as exc:
        print(f"⚠️ 分類／品牌頁網址計唔到，今次 sitemap 唔包：{exc}")
        return []
    return [r["loc"] for r in rows if r.get("loc", "").startswith(SITE + "/")]


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
    articles = article_pages()
    for p, lastmod in articles:
        rows.append(url_entry(SITE + p, lastmod, "monthly", "0.6"))
    listings = listing_pages()
    for loc in listings:
        rows.append(url_entry(loc, today, "daily", "0.7"))
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

Sitemap: {SITE}/sitemap.xml
"""
    with open(os.path.join(ROOT, "robots.txt"), "w") as f:
        f.write(robots)

    print(f"sitemap.xml —— {len(PAGES)} 版靜態頁 + {len(articles)} 篇文章 + "
          f"{len(listings)} 版分類／品牌頁 + {len(products)} 件產品 = {len(rows)} 條網址")
    print("robots.txt —— 已寫")


if __name__ == "__main__":
    main()
