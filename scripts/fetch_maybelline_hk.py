#!/usr/bin/env python3
"""
Mirror imagery from Maybelline's Hong Kong site.

A fifth source shape. The page is Vue-rendered, so no <img> tag survives
in the served HTML — but the component props are there as HTML-escaped
JSON, and unescaping them exposes the media paths. Filenames carry the
barcode, which is how images map back to our SKUs.

Supplier titles are already Traditional Chinese, so the site is wanted
for imagery only.

    python3 scripts/fetch_maybelline_hk.py
"""
import html
import os
import re
import urllib.request

SITE = "https://www.maybelline.com.hk"
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
MEDIA = re.compile(
    r"/-/media/project/loreal/brand-sites/mny/apac/hk/products/[^\"' ,)]{10,160}"
    r"\.(?:jpg|jpeg|png|webp)", re.I)

# our slug -> the site's product path
PRODUCTS = {
    "maybelline-fit-me-concealer": "face-makeup/concealer/fit-me-concealer",
    "maybelline-superstay-concealer": "face-makeup/concealer/superstay-concealer",
    "maybelline-instant-age-rewind-concealer":
        "face-makeup/concealer/instant-age-rewind-concealer",
    "maybelline-fit-me-matte-poreless-foundation":
        "face-makeup/foundation/fit-me-matte-poreless-foundation",
    "maybelline-superstay-lumi-matte-foundation":
        "face-makeup/foundation/superstay-lumi-matte-foundation",
    "maybelline-superstay-creampact-foundation":
        "face-makeup/creampact-foundation/superstay-creampact-foundation",
    "maybelline-super-stay-double-fixer-spray":
        "face-makeup/setting-spray/super-stay-double-fixer-spray",
    "maybelline-define-blend-brow-pencil": "eye-makeup/brow/define-blend-brow-pencil",
    "maybelline-hyper-sharp-extreme-liner": "eye-makeup/eyeliner/hyper-sharp-extreme-liner",
    "maybelline-sky-high-mascara": "eye-makeup/mascara/sky-high-lengthening-waterproof-mascara",
    "maybelline-sky-high-set":
        "eye-makeup/mascara/sky-high-lengthening-waterproof-mascara-plus-mascara-remover-set",
    "maybelline-hypercurl-mascara": "eye-makeup/mascara/volum-express-the-hypercurl-mascara",
    "maybelline-colossal-waterproof-mascara":
        "eye-makeup/mascara/maybelline-the-colossal-waterproof-mascara",
    "maybelline-superstay-vinyl-ink": "lip-makeup/lip-color/superstay-vinyl-ink",
    "maybelline-lifter-plump": "lip-makeup/lip-gloss/lifter-plump-plumping-lip-gloss",
}


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Referer": SITE + "/"})
    return urllib.request.urlopen(req, timeout=60).read()


def images(path):
    page = html.unescape(get(f"{SITE}/zh-hk/all-products/{path}").decode("utf-8", "ignore"))
    urls = list(dict.fromkeys(MEDIA.findall(page)))
    # packshots end -a..-g; the rest is rich content, i.e. the detail strips
    packs = [u for u in urls if re.search(r"-[a-g]\.(?:jpg|png)$", u, re.I)]
    rich = [u for u in urls if u not in packs]
    return packs, rich


def main():
    total = 0
    for slug, path in PRODUCTS.items():
        try:
            packs, rich = images(path)
        except Exception as e:
            print(f"\n{slug}: FAIL {e}")
            continue
        print(f"\n{slug}  packshot={len(packs)} rich={len(rich)}")
        for group, batch in (("gallery", packs or rich[:1]), ("detail", rich)):
            if not batch:
                continue
            outdir = os.path.join("brands", "maybelline", group)
            os.makedirs(outdir, exist_ok=True)
            for i, u in enumerate(batch, 1):
                ext = os.path.splitext(u.split("?")[0])[1] or ".jpg"
                dest = os.path.join(outdir, f"{slug}-{i:02d}{ext}")
                try:
                    data = get(SITE + u)
                    with open(dest, "wb") as f:
                        f.write(data)
                    total += len(data)
                    print(f"  {len(data)/1024:7.0f}KB  {group}/{os.path.basename(dest)}")
                except Exception as e:
                    print(f"  FAIL         {os.path.basename(dest)}  {e}")
    print(f"\n合共 {total/1024/1024:.1f} MB")


if __name__ == "__main__":
    main()
