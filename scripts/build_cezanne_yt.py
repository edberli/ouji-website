#!/usr/bin/env python3
"""Build the verified in-stock CEZANNE range from the Ouji YT POS export.

Only a POS product family with a still-accessible official CEZANNE thumbnail is
published.  This deliberately leaves discontinued/unmatched stock out instead
of putting the wrong photograph on the storefront.

    python3 scripts/build_cezanne_yt.py --dry-run
    python3 scripts/build_cezanne_yt.py
"""
import argparse
import csv
import html
import re
import sys
import urllib.request
from urllib.parse import urljoin
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from publish import publish  # noqa: E402

POS = Path("/Volumes/core/ouji-pos/raw/Ouji_YT_cezanne_ouji_yt.csv")
OFFICIAL_MEDIA = "https://www.cezanne.co.jp/uploads/lineup/{barcode}/thum.png"
OFFICIAL_PAGE = "https://www.cezanne.co.jp/lineup/{barcode}/"

# Online-only prices: keep enough room for the launch 12% discount and the
# shipping subsidy.  The source POS remains untouched.
WEB_PRICE_OVERRIDES = {
    "4939553042860": 98,   # Face Glow Color 02
    "4939553041573": 65,   # Multiproof Eyebrow 03
    "4939553042433": 75,   # Watery Tint Lip M2; align with M1
    "4939553041467": 148,  # foundation shade 2; crosses free-pickup threshold
}


def family_key(name):
    value = name.lower().replace("（", "(").replace("）", ")")
    value = re.sub(r"^\s*\(c\)\s*", "", value)
    value = re.sub(r"^\s*cezanne\s*[-–—:]?\s*", "", value)
    value = re.sub(r"\([^)]*\)", " ", value)
    value = re.sub(r"[〈\[].*?[〉\]]", " ", value)
    value = value.split("#", 1)[0]
    value = re.sub(r"\b(?:p|pk|ex|w|n|c)?\d+[a-z]?\b.*$", "", value)
    value = re.sub(r"[-–—]\s*(?:黑|棕|白|粉|清爽|保濕|自然).*$", "", value)
    return re.sub(r"[^a-z\u3400-\u9fff]+", "", value)


def official_image(barcode):
    url = OFFICIAL_MEDIA.format(barcode=barcode)
    try:
        req = urllib.request.Request(url, method="HEAD")
        res = urllib.request.urlopen(req, timeout=15)
        if res.geturl() == url and res.headers.get_content_type() == "image/png":
            return url
    except Exception:
        pass
    return None


def official_shade_images(barcode):
    """Return official colour-code -> product image without guessing colours."""
    try:
        req = urllib.request.Request(
            OFFICIAL_PAGE.format(barcode=barcode),
            headers={"User-Agent": "Mozilla/5.0 OUJI catalogue updater"},
        )
        body = urllib.request.urlopen(req, timeout=20).read().decode("utf-8", "replace")
    except Exception:
        return {}

    found = {}
    for tag in re.findall(r"<img\b[^>]*>", body, flags=re.I):
        src_match = re.search(r'\bsrc=["\']([^"\']*?/img1_([^/"\']+)\.png)["\']', tag, flags=re.I)
        alt_match = re.search(r'\balt=["\']([^"\']*)["\']', tag, flags=re.I)
        if not src_match or not alt_match:
            continue
        alt = html.unescape(alt_match.group(1)).replace("　", " ")
        # Official shade alts consistently contain a standalone code such as
        # 01, 10, P1, PK1, M2 or EX2.  Match only that code, never colour names.
        codes = re.findall(r"(?<![A-Za-z0-9])((?:PK|EX|P|W|N|C|M)?\d+[A-Za-z]?)(?![A-Za-z0-9])", alt, flags=re.I)
        if not codes:
            continue
        code = codes[-1].upper()
        found.setdefault(code, urljoin(OFFICIAL_PAGE.format(barcode=barcode), src_match.group(1)))
    return found


def shade_code(value):
    value = value.translate(str.maketrans("０１２３４５６７８９", "0123456789"))
    match = re.search(r"(?<![A-Za-z0-9])((?:PK|EX|P|W|N|C|M)?\d+[A-Za-z]?)(?![A-Za-z0-9])", value, flags=re.I)
    return match.group(1).upper() if match else None


def clean_title(name):
    value = name.replace("（", "(").replace("）", ")")
    value = re.sub(r"^\s*\(c\)\s*", "", value, flags=re.I)
    value = re.sub(r"^\s*cezanne\s*[-–—:]?\s*", "", value, flags=re.I)
    value = re.sub(r"\?", "", value)
    value = re.split(r"#", value, maxsplit=1)[0]
    value = re.sub(r"\s*(?:P|PK|EX|W|N|C)?[0-9０-９]+[A-Za-z]?\s*$", "", value, flags=re.I)
    value = re.sub(r"\((?:\d+|[^)]*(?:brown|rose|pink|beige|clear|black)[^)]*)\)\s*$", "", value, flags=re.I)
    value = re.sub(r"[-–—]\s*(?:黑|棕|白|粉|清爽|保濕|自然).*$", "", value)
    value = re.sub(r"\s+", " ", value).strip(" -–—")
    return "CEZANNE " + value


def shade_name(name, barcode):
    value = name.replace("（", "(").replace("）", ")")
    if "#" in value:
        shade = value.split("#", 1)[1].strip()
    else:
        m = re.search(r"\(([^()]*)\)\s*$", value)
        if m:
            shade = m.group(1).strip()
        else:
            m = re.search(r"(?:\s|-)?((?:PK|EX|P|W|N|C|M)?\d+[A-Za-z]?(?:\s+[^-]+)?)\s*$", value, re.I)
            shade = m.group(1).strip() if m else "標準裝"
    return shade or barcode


def official_variant_image(barcode, code):
    """Check the official predictable shade asset even when an old page is gone."""
    if not code:
        return None
    url = f"https://www.cezanne.co.jp/uploads/lineup/{barcode}/img1_{code.upper()}.png"
    try:
        req = urllib.request.Request(url, method="HEAD")
        res = urllib.request.urlopen(req, timeout=15)
        if res.geturl() == url and res.headers.get_content_type() == "image/png":
            return url
    except Exception:
        pass
    return None


def classify(title):
    t = title.lower()
    rules = [
        (("lip", "唇"), "唇妝", "唇妝, lip"),
        (("eyebrow", "眉"), "眉妝", "眼妝, 眉妝, eyebrow"),
        (("eyeliner", "liner", "眼線"), "眼線", "眼妝, 眼線, eyeliner"),
        (("mascara", "睫毛"), "睫毛膏", "眼妝, 睫毛膏, mascara"),
        (("eye shadow", "eyeshadow", "眼影", "眼彩"), "眼影", "眼妝, 眼影, eyeshadow"),
        (("cheek", "blush", "腮紅"), "胭脂", "彩妝, 修容, 胭脂, blush"),
        (("shading", "highlight", "高光", "修容", "鼻影"), "修容", "彩妝, 修容"),
        (("foundation", "粉底", "bb cream", "bb霜", "粉霜", "pact"), "粉底", "彩妝, 底妝, foundation"),
        (("powder", "蜜粉", "定妝"), "蜜粉", "彩妝, 底妝, powder"),
        (("concealer", "遮瑕"), "遮瑕", "彩妝, 底妝, concealer"),
        (("base", "隔離", "防曬"), "妝前底霜", "彩妝, 底妝, base"),
        (("skin", "cream", "精華", "護膚"), "護膚", "護膚, skincare"),
        (("hair", "髮"), "頭髮護理", "頭髮護理, hair"),
        (("puf", "puff", "工具"), "美妝工具", "美妝工具, tool"),
    ]
    for needles, ptype, tags in rules:
        if any(x in t for x in needles):
            return ptype, tags
    return "彩妝", "彩妝, makeup"


def slugify(key):
    ascii_key = re.sub(r"[^a-z0-9]+", "-", key.lower()).strip("-")
    if ascii_key:
        return "cezanne-" + ascii_key
    return "cezanne-" + "-".join(f"{ord(c):x}" for c in key)


def load_products():
    if not POS.exists():
        raise SystemExit(f"POS export missing: {POS}")
    rows = list(csv.DictReader(POS.open(encoding="utf-8-sig")))
    groups = defaultdict(list)
    for row in rows:
        if int(float(row.get("stock_qty") or 0)) > 0:
            groups[family_key(row["name"])].append(row)

    image_by_barcode = {}
    with ThreadPoolExecutor(max_workers=12) as pool:
        urls = pool.map(official_image, [r["barcode"] for r in rows])
        image_by_barcode = {r["barcode"]: url for r, url in zip(rows, urls)}

    page_barcodes = sorted({
        next((r["barcode"] for r in shades if image_by_barcode.get(r["barcode"])), "")
        for shades in groups.values()
    } - {""})
    with ThreadPoolExecutor(max_workers=10) as pool:
        shade_images_by_barcode = dict(zip(page_barcodes, pool.map(official_shade_images, page_barcodes)))

    products = []
    skipped = []
    for key, shades in groups.items():
        image = None
        image_barcode = None
        for row in shades:
            image = image_by_barcode[row["barcode"]]
            if image:
                image_barcode = row["barcode"]
                break
        if not image:
            skipped.extend(shades)
            continue
        representative = next((r for r in shades if r["barcode"] == image_barcode), shades[0])
        title = clean_title(representative["name"])
        ptype, extra_tags = classify(title)
        variants = []
        product_images = [image]
        official_shades = shade_images_by_barcode.get(image_barcode, {})
        seen_names = set()
        for row in shades:
            shade = shade_name(row["name"], row["barcode"])
            if shade in seen_names:
                shade = f"{shade} · {row['barcode'][-4:]}"
            seen_names.add(shade)
            variant = {
                "name": shade,
                "barcode": row["barcode"],
                "qty": int(float(row["stock_qty"])),
                "price": str(WEB_PRICE_OVERRIDES.get(
                    row["barcode"], int(round(float(row["unit_price"]))))),
                "cost": f"{float(row['unit_cost']):.2f}",
            }
            code = shade_code(shade)
            shade_image = (
                official_shades.get(code)
                or official_variant_image(image_barcode, code)
                # Some discontinued official pages retain one thumbnail per
                # barcode but no longer expose the shade gallery HTML.
                or image_by_barcode.get(row["barcode"])
            )
            if shade_image:
                variant["image"] = shade_image
                if shade_image not in product_images:
                    product_images.append(shade_image)
            variants.append(variant)
        description = (
            f"<p>{html.escape(title)}，日本人氣開架彩妝品牌 CEZANNE。</p>"
            "<ul><li>日本品牌</li><li>油塘店現貨；網店訂單由 OUJI 統一安排出貨</li></ul>"
        )
        products.append({
            "handle": "cezanne-" + image_barcode,
            "title": title,
            "descriptionHtml": description,
            "vendor": "CEZANNE",
            "productType": ptype,
            "tags": ["CEZANNE", "日本美妝", "J-Beauty"] + [x.strip() for x in extra_tags.split(",")],
            "status": "ACTIVE",
            "option_name": "色號" if len(variants) > 1 else "款式",
            "images": product_images,
            "shades": variants,
        })
    return products, skipped


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--limit", type=int)
    ap.add_argument(
        "--allow-product-set",
        action="store_true",
        help="explicitly allow the destructive Shopify productSet rebuild path",
    )
    args = ap.parse_args()
    if not args.dry_run and not args.allow_product_set:
        raise SystemExit(
            "Safety stop: productSet can reset CEZANNE status/inventory. "
            "Use restore_cezanne_live.py for availability repair; only pass "
            "--allow-product-set for a deliberate full rebuild."
        )
    products, skipped = load_products()
    mapped = sum(bool(s.get("image")) for p in products for s in p["shades"])
    print(f"verified products={len(products)} variants={sum(len(p['shades']) for p in products)}")
    print(f"official shade images mapped={mapped}")
    print(f"held for image review={len(skipped)}")
    selected = products[:args.limit] if args.limit else products
    for product in selected:
        print(f"{len(product['shades']):>2} 色  {product['title']}  {product['handle']}")
        if not args.dry_run:
            print("   ->", publish(product))


if __name__ == "__main__":
    main()
