#!/usr/bin/env python3
"""
Mirror imagery from wakemake's Hong Kong store (www.wakemake.hk).

A fourth source shape: SHOPLINE, not Shopify, so products.json returns
the storefront HTML rather than data, and the variant list is rendered
client-side. What the server does give us is the Traditional Chinese
product name and the full image set on img.shoplineapp.com — which is
all we need, since shades come from our own supplier list.

SHOPLINE has no gallery/detail split, so the first two images are taken
as the gallery and the rest as detail strips.

    python3 scripts/fetch_wakemake_hk.py
"""
import os
import re
import urllib.request

SITE = "https://www.wakemake.hk"
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
IMG = re.compile(r"https://img\.shoplineapp\.com/media/[^\"'  )]+?\.(?:jpg|jpeg|png|webp)", re.I)

# our slug -> the store's handle (matched in SOURCES.md)
PRODUCTS = {
    "wakemake-healthy-glow-balm-stick": "healthy-glow-balm-stick",
    "wakemake-soft-blurring-eye-palette": "soft-blurring-eye-palette-ad",
    "wakemake-real-defining-pencil-liner": "real-defining-pencil-liner",
    "wakemake-soft-drawing-slim-brow": "soft-drawing-slim-brow-n",
    "wakemake-over-blurring-pot": "over-blurring-pot",
    "wakemake-defining-cover-concealer": "defining-cover-concealer-spf30-pa",
    "wakemake-seamless-wear-foundation": "seamless-wear-foundation-spf30-pa",
    "wakemake-water-glow-coating-cushion": "water-glow-coating-cushion",
    "wakemake-real-defining-brush-liner": "real-defining-brush-liner",
    "wakemake-stay-fixer-multi-color-powder": "stay-fixer-multi-color-powder",
    "wakemake-defining-cover-conceal-fit-palette": "defining-cover-conceal-fit-palette",
    "wakemake-real-defining-lash-mascara": "real-defining-lash-mascara",
    "wakemake-vitamin-tone-up-lotion": "vitamin-watery-tok-glow-tone-up-lotion",
}


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Referer": SITE + "/"})
    return urllib.request.urlopen(req, timeout=60).read()


def images(handle):
    html = get(f"{SITE}/products/{handle}").decode("utf-8", "ignore")
    name = re.search(r"<h1[^>]*>(.*?)</h1>", html, re.S)
    urls = [u for u in dict.fromkeys(IMG.findall(html)) if "/original." in u or "/large." in u]
    return (re.sub(r"\s+", " ", name.group(1)).strip() if name else handle), urls


def main():
    total = 0
    for slug, handle in PRODUCTS.items():
        name, urls = images(handle)
        print(f"\n{slug}  ({name})  {len(urls)} 張")
        groups = (("gallery", urls[:2]), ("detail", urls[2:]))
        for group, batch in groups:
            if not batch:
                continue
            outdir = os.path.join("brands", "wakemake", group)
            os.makedirs(outdir, exist_ok=True)
            for i, u in enumerate(batch, 1):
                ext = os.path.splitext(u.split("?")[0])[1] or ".jpg"
                dest = os.path.join(outdir, f"{slug}-{i:02d}{ext}")
                try:
                    data = get(u)
                    with open(dest, "wb") as f:
                        f.write(data)
                    total += len(data)
                    print(f"  {len(data)/1024:7.0f}KB  {group}/{os.path.basename(dest)}")
                except Exception as e:
                    print(f"  FAIL         {os.path.basename(dest)}  {e}")
    print(f"\n合共 {total/1024/1024:.1f} MB")


if __name__ == "__main__":
    main()
