#!/usr/bin/env python3
"""
Shared build/publish loop for the Cafe24-sourced brands.

build_lilybyred.py grew this shape first; every brand after it repeats
the same steps — read a copy table, upload the mirrored imagery straight
to Shopify, assemble the description, publish. Only the copy differs, so
that is all a per-brand module now holds.

A brand module defines VENDOR and P (slug -> copy dict) and calls
run(__name__, VENDOR, P, brand_dir).
"""
import argparse
import json
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from publish import publish  # noqa: E402
from upload_files import host, upload_all  # noqa: E402

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VARIANT_IMAGE_OVERRIDES = os.path.join(
    PROJECT_ROOT, "data", "variant_image_overrides.json"
)


def paths(brand_dir, group, slug):
    """Split strips land as 01.jpg / 01s2.jpg, which sort in reading order."""
    d = os.path.join("brands", brand_dir, group)
    if not os.path.isdir(d):
        return []
    return [os.path.join(d, n) for n in sorted(os.listdir(d))
            if re.fullmatch(re.escape(slug) + r"-\d+(s\d+)?\.jpg", n)]


def load_variant_image_overrides(path=VARIANT_IMAGE_OVERRIDES):
    """Load exact barcode-to-image overrides used by the affected 2aN build."""
    try:
        with open(path, encoding="utf-8") as f:
            raw = json.load(f)
    except FileNotFoundError:
        return {}
    if not isinstance(raw, dict):
        raise ValueError("variant image overrides must be a JSON object")
    overrides = {}
    for barcode, url in raw.items():
        barcode = str(barcode).strip()
        url = str(url).strip()
        if barcode and url:
            overrides[barcode] = url
    return overrides


def shade_records(shades, overrides):
    """Add an image only when a source shade barcode has an exact override."""
    records = []
    for name, barcode, qty in shades:
        record = {"name": name, "barcode": barcode, "qty": qty}
        image = overrides.get(str(barcode).strip())
        if image:
            record["image"] = image
        records.append(record)
    return records


def gallery_with_variant_images(gallery, shades):
    """Keep the gallery and append variant images required by publish.build_input."""
    return list(dict.fromkeys([
        *gallery,
        *(shade["image"] for shade in shades if shade.get("image")),
    ]))


def description(brand_dir, slug, d):
    h = [f'<p><strong>{d["hook"]}</strong></p>', f'<p>{d["lede"]}</p>', "<ul>"]
    h += [f"<li><strong>{t}</strong>——{x}</li>" for t, x in d["bullets"]]
    h.append("</ul>")
    h.append(f'<p><strong>用法</strong><br>{d["how"]}</p>')
    h.append("<ul>" + "".join(f"<li>{s}</li>" for s in
                              d.get("specs", ["產地：韓國 Made in Korea"])) + "</ul>")
    strips = [u for u in host(paths(brand_dir, "detail", slug), d["title"]) if u]
    if strips:
        h.append('<div class="product-detail-images">'
                 + "".join(f'<img src="{u}" alt="{d["title"]} 產品介紹" loading="lazy">'
                           for u in strips)
                 + "</div>")
    return "".join(h)


def run(name, vendor, products, brand_dir, mirror_brand=None):
    if name != "__main__":
        return
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["mirror", "publish"])
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if args.cmd == "mirror":
        subprocess.run([sys.executable, "scripts/fetch_cafe24.py",
                        mirror_brand or brand_dir], check=True)
        subprocess.run([sys.executable, "scripts/optimise_brand_images.py",
                        f"brands/{brand_dir}"], check=True)
        return

    # Overrides are keyed by barcode, so they are safe across every brand.
    # Restricting this to 2aN silently discarded verified shade images when
    # any other brand was rebuilt.
    overrides = load_variant_image_overrides()
    for slug, d in products.items():
        gp = paths(brand_dir, "gallery", slug)
        gallery = gp if args.dry_run else upload_all(gp)
        shades = shade_records(d["shades"], overrides)
        gallery = gallery_with_variant_images(gallery, shades)
        draft = not gp
        item = {
            "handle": slug,
            "title": d["title"],
            "descriptionHtml": "" if args.dry_run else description(brand_dir, slug, d),
            "vendor": vendor,
            "productType": d["type"],
            "tags": [t.strip() for t in d["tags"].split(",")],
            "status": "DRAFT" if draft else "ACTIVE",
            "option_name": "色號",
            "price": d["price"],
            "images": gallery,
            "shades": shades,
        }
        flag = "  [草稿：冇圖]" if draft else ""
        print(f'{len(d["shades"]):>2} 色  {len(gp):>2} 圖  '
              f'{len(paths(brand_dir, "detail", slug)):>2} 長圖  {d["title"]}{flag}')
        if not args.dry_run:
            r = publish(item)
            print(f"        -> {r['handle']}  {r['variants']} variants, "
                  f"{r['media']} media, {r['channels']} channels")
