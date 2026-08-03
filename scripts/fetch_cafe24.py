#!/usr/bin/env python3
"""
Mirror product imagery from a Cafe24 brand storefront.

Most of the Korean brands we carry (Coralhaze, Heart Percent, Glint,
BRAYE, …) run on Cafe24, so the page shape is identical: a gallery under
/web/product/{big,extra/big}/ and a stack of tall "detail" strips inside
#prdDetail. This pulls both, at full size, in the order the brand chose.

    python3 scripts/fetch_cafe24.py coralhaze
    python3 scripts/fetch_cafe24.py heartpercent --only heart-percent-lip-pencil

Images land in brands/<brand>/{gallery,detail}/<slug>-NN.<ext>. Run
optimise_brand_images.py afterwards — the raw files include 6-9 MB
animated GIFs.

Add a brand by giving it a host and a slug -> product_no map. Product
numbers come from the SEO URLs on a category page:
    curl -s '<host>/product/list.html?cate_no=N' | grep -o '/product/[^/]*/[0-9]*/'
"""
import argparse
import os
import re
import urllib.parse
import urllib.request

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

# storefront furniture that shows up inside #prdDetail but isn't product art
SKIP = ("event/delivery", "event/2304benefit", "/common/", "/img/pc/",
        "/img/mobile/", "OrderOption", "icon_", "btn_", "banner")

BRANDS = {
    "coralhaze": {
        "host": "https://coralhaze.co.kr",
        "products": {
            "coralhaze-volumizing-lip-fondue": 48,
            "coralhaze-glow-lock-jelly-tint": 82,
            "coralhaze-soft-blur-cheek": 21,
            "coralhaze-idol-aegyosal-maker": 63,
        },
    },
    "heartpercent": {
        "host": "https://heartpercent.co.kr",
        "products": {
            "heart-percent-one-way-glowy-tint": 341,
            "heart-percent-over-melting-gloss": 412,
            "heart-percent-lip-pencil": 193,
            "heart-percent-lip-pencil-slim": 228,
            "heart-percent-lineproof-lip-pencil": 403,
            "heart-percent-gel-eyeliner-pencil": 244,
            "heart-percent-dote-on-mood-eye-palette": 165,
        },
    },
}


def get(url, referer):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Referer": referer})
    return urllib.request.urlopen(req, timeout=60).read()


def absolute(u, host):
    if u.startswith("//"):
        return "https:" + u
    if u.startswith("/"):
        return host + u
    return u


def scrape(host, product_no):
    html = get(f"{host}/product/detail.html?product_no={product_no}", host).decode("utf-8", "ignore")
    gallery = [f"/web/product/big/{a}" for a in
               dict.fromkeys(re.findall(r"/web/product/big/(\d+/[0-9a-f]+\.(?:jpg|png))", html, re.I))]
    gallery += [f"/web/product/extra/big/{a}" for a in
                dict.fromkeys(re.findall(r"/web/product/extra/big/(\d+/[0-9a-f]+\.(?:jpg|png))", html, re.I))]
    body = re.search(r'id="prdDetail"(.*?)(?:id="prdReview"|</body>)', html, re.S)
    detail = []
    if body:
        for u in re.findall(r'src="([^"]+\.(?:jpg|jpeg|png|gif))"', body.group(1), re.I):
            if any(s in u for s in SKIP) or u in detail:
                continue
            detail.append(u)
    return gallery, detail


def save(url, host, dest):
    data = get(urllib.parse.quote(absolute(url, host), safe=":/?&=%"), host)
    with open(dest, "wb") as f:
        f.write(data)
    return len(data)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("brand", choices=sorted(BRANDS))
    ap.add_argument("--only", action="append", help="limit to these slugs")
    ap.add_argument("--skip-gallery", action="store_true",
                    help="detail strips only (the gallery is already on Shopify)")
    args = ap.parse_args()

    cfg = BRANDS[args.brand]
    host = cfg["host"]
    products = {k: v for k, v in cfg["products"].items()
                if not args.only or k in args.only}
    total = 0
    for slug, no in products.items():
        gallery, detail = scrape(host, no)
        if args.skip_gallery:
            gallery = []
        print(f"\n{slug}  gallery={len(gallery)} detail={len(detail)}")
        for group, urls in (("gallery", gallery), ("detail", detail)):
            if not urls:
                continue
            outdir = os.path.join("brands", args.brand, group)
            os.makedirs(outdir, exist_ok=True)
            for i, u in enumerate(urls, 1):
                ext = os.path.splitext(urllib.parse.urlparse(u).path)[1] or ".jpg"
                dest = os.path.join(outdir, f"{slug}-{i:02d}{ext}")
                try:
                    n = save(u, host, dest)
                    total += n
                    print(f"  {n/1024:8.0f}KB  {group}/{os.path.basename(dest)}")
                except Exception as e:
                    print(f"  FAIL          {group}/{os.path.basename(dest)}  {e}")
    print(f"\n合共 {total/1024/1024:.1f} MB")


if __name__ == "__main__":
    main()
