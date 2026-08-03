#!/usr/bin/env python3
"""
Mirror coralhaze.co.kr product imagery into brands/coralhaze/.

Coralhaze's Cafe24 storefront blocks Shopify's image fetcher, so unlike
Heart Percent we cannot hand Shopify the official URLs directly — the
images have to be self-hosted the same way Glint's were.

    python3 scripts/fetch_coralhaze.py
"""
import os
import re
import urllib.parse
import urllib.request

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
SITE = "https://coralhaze.co.kr"

# slug -> Cafe24 product_no
PRODUCTS = {
    "coralhaze-volumizing-lip-fondue": 48,
    "coralhaze-glow-lock-jelly-tint": 82,
    "coralhaze-soft-blur-cheek": 21,
    "coralhaze-idol-aegyosal-maker": 63,
}

# shop-furniture banners that are not product detail imagery
SKIP = ("event/delivery", "event/2304benefit", "/common/", "icon_", "btn_")


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Referer": SITE})
    return urllib.request.urlopen(req, timeout=60).read()


def absolute(u):
    if u.startswith("//"):
        return "https:" + u
    if u.startswith("/"):
        return SITE + u
    return u


def scrape(no):
    html = get(f"{SITE}/product/detail.html?product_no={no}").decode("utf-8", "ignore")
    gallery = [f"/web/product/big/{a}" for a in
               dict.fromkeys(re.findall(r"/web/product/big/(\d+/[0-9a-f]+\.(?:jpg|png))", html, re.I))]
    gallery += [f"/web/product/extra/big/{a}" for a in
                dict.fromkeys(re.findall(r"/web/product/extra/big/(\d+/[0-9a-f]+\.(?:jpg|png))", html, re.I))]
    body = re.search(r'id="prdDetail"(.*?)(?:id="prdReview"|</body>)', html, re.S)
    detail = []
    if body:
        for u in re.findall(r'src="([^"]+\.(?:jpg|jpeg|png|gif))"', body.group(1), re.I):
            if any(s in u for s in SKIP):
                continue
            if u not in detail:
                detail.append(u)
    return gallery, detail


def save(url, dest):
    data = get(urllib.parse.quote(absolute(url), safe=":/?&=%"))
    with open(dest, "wb") as f:
        f.write(data)
    return len(data)


def main():
    total = 0
    for slug, no in PRODUCTS.items():
        gallery, detail = scrape(no)
        print(f"\n{slug}  gallery={len(gallery)} detail={len(detail)}")
        for group, urls in (("gallery", gallery), ("detail", detail)):
            outdir = os.path.join("brands", "coralhaze", group)
            os.makedirs(outdir, exist_ok=True)
            for i, u in enumerate(urls, 1):
                ext = os.path.splitext(urllib.parse.urlparse(u).path)[1] or ".jpg"
                dest = os.path.join(outdir, f"{slug}-{i:02d}{ext}")
                try:
                    n = save(u, dest)
                    total += n
                    print(f"  {n/1024:8.0f}KB  {group}/{os.path.basename(dest)}")
                except Exception as e:
                    print(f"  FAIL          {group}/{os.path.basename(dest)}  {e}")
    print(f"\n合共 {total/1024/1024:.1f} MB")


if __name__ == "__main__":
    main()
