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
    # Survival Colorcara is not on the official site any more — it needs an
    # Olive Young fallback or it ships as a draft.
    "lilybyred": {
        "host": "https://lilybyred.co.kr",
        "products": {
            "lilybyred-infinite-mascara": 21,
            "lilybyred-survival-penliner": 17,
            "lilybyred-bloody-liar-coating-tint": 336,
            "lilybyred-dewy-fit-palette": 384,
            "lilybyred-luv-beam-blur-cheek": 169,
            "lilybyred-luv-beam-cheek-mousse": 395,
            "lilybyred-luv-beam-glow-veil": 179,
            "lilybyred-luv-beam-sherbet-cheek": 401,
            "lilybyred-milky-blur-fondue-bar": 339,
            "lilybyred-mood-it-palette": 343,
            "lilybyred-skinny-mes-brow-pencil": 25,
            "lilybyred-smiley-lip-blending-stick": 183,
            "lilybyred-starry-eyes-gel-eyeliner": 18,
            "lilybyred-sugar-wrapping-tint-gloss": 406,
        },
    },
    "unleashia": {
        "host": "https://unleashiacosmetics.com",
        "products": {
            "unleashia-glitterpedia-eye-palette": 141,
            "unleashia-sunset-dazzle-gloss-balm": 260,
            "unleashia-oh-happy-day-lip-pencil": 248,
            "unleashia-cotton-candy-face-palette": 263,
            "unleashia-babe-skin-baby-blue-cushion": 252,
            "unleashia-satin-wear-healthy-green-cushion": 224,
            "unleashia-tap-me-palette-duo": 118,
            "unleashia-moonlight-liquid-glitter": 262,
            "unleashia-mood-shower-face-palette": 251,
        },
    },
    # romand.co.kr is thick with editions and bundles, so these are the
    # canonical pages rather than the first name match. Juicy Roll Cheek,
    # Twinkle Pen Liner and the Better Than Cheek base are not on the
    # official mall any more and still need a source.
    "romand": {
        "host": "https://romand.co.kr",
        "products": {
            "romand-juicy-lasting-tint": 958,
            "romand-better-than-palette": 802,
            "romand-lip-mate-pencil": 769,
            "romand-han-all-brow-cara": 671,
            "romand-blur-fudge-tint": 608,
            "romand-slide-in-single": 957,
            "romand-better-than-eyes": 175,
            "romand-better-than-eyes-music": 299,
            "romand-glasting-color-gloss": 847,
        },
    },
    # Bulky Matte Lipstick and Maxi Glayer Tint are not on laka.co.kr.
    "laka": {
        "host": "https://laka.co.kr",
        "products": {
            "laka-fruity-glam-tint": 180,
            "laka-fruity-glam-tint-mini-duo": 181,
            "laka-popping-balloon-tint": 162,
            "laka-jelling-nude-gloss": 170,
            "laka-mono-eyeshadow": 164,
            "laka-forever-6-eye-palette": 174,
            "laka-love-silk-blush": 168,
            "laka-fixi-brow-cara": 163,
            "laka-dreambeam-highlighter": 167,
        },
    },
    # 唇線筆 has no page on amusemakeup.com.
    "amuse": {
        "host": "https://amusemakeup.com",
        "products": {
            "amuse-dew-tint": 486,
            "amuse-jelfit-tint": 359,
            "amuse-bebe-tint": 436,
            "amuse-powder-velvet-tint": 599,
            "amuse-powder-lip-cheek": 614,
            "amuse-lip-cheek-healthy-balm": 397,
            "amuse-cheek-tok-tok": 551,
            "amuse-vegan-hand-cream": 1041,
            "amuse-ceramic-skin-cushion": 456,
            "amuse-dew-jelly-cushion": 541,
            "amuse-dew-power-cushion": 315,
            "amuse-sanrio-cushion": 835,
            "amuse-sanrio-powder-velvet-tint": 840,
        },
    },
    "2an": {
        "host": "https://2an.co.kr",
        "products": {
            "2an-better-me-eye-palette": 450,
            "2an-gleaming-tension-pact": 11,
            "2an-dual-cheek": 449,
            "2an-pocket-cotton-blurring-stick": 441,
            "2an-pure-glash-highlighter": 448,
            "2an-glaze-bouncing-tint": 442,
            "2an-color-play-dual-liner": 457,
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
    full = absolute(url, host)
    # Some storefronts (rom&nd) serve detail strips from cafe24.poxo.com
    # under base64-ish paths whose '+' is significant — percent-encoding
    # those turns every fetch into a 404. Only escape what has to be.
    if any(ord(c) > 127 or c == " " for c in full):
        full = urllib.parse.quote(full, safe=":/?&=%+")
    data = get(full, host)
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
