#!/usr/bin/env python3
"""
Move the early brands' detail strips from this repo to Shopify's CDN.

Coralhaze, Heart Percent and CLIO were built before staged uploads
existed, so their descriptions hotlink oujikbeauty.com/brands/... . That
kept ~300 MB of imagery in git for files the site never serves itself,
and made every deploy a ten-minute push. Re-hosting them on Shopify lets
the whole brands/ tree leave the repository.

Rewrites each description in place; unchanged if a strip cannot be
re-hosted, so it is safe to re-run.

    python3 scripts/migrate_strips_to_cdn.py --dry-run
    python3 scripts/migrate_strips_to_cdn.py
"""
import argparse
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from shopify_admin import ROOT, all_products, update_product  # noqa: E402
from upload_files import host  # noqa: E402

SITE_IMG = re.compile(r'https://oujikbeauty\.com/(brands/[^"\']+?\.(?:jpg|jpeg|png|gif))')


def local_path(rel):
    """The optimiser rewrote every mirror to .jpg, so descriptions written
    before it ran still point at .png/.jpeg twins — those links have been
    404ing on the live site ever since."""
    direct = os.path.join(ROOT, rel)
    if os.path.exists(direct):
        return direct
    swapped = os.path.splitext(direct)[0] + ".jpg"
    return swapped if os.path.exists(swapped) else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    touched = missing = 0
    for p in all_products():
        body = p["descriptionHtml"] or ""
        rels = list(dict.fromkeys(SITE_IMG.findall(body)))
        if not rels:
            continue
        pairs = [(rel, local_path(rel)) for rel in rels]
        absent = [rel for rel, path in pairs if not path]
        pairs = [(rel, path) for rel, path in pairs if path]
        missing += len(absent)
        note = f"  （{len(absent)} 張本機冇，會由描述移除）" if absent else ""
        print(f"  {len(pairs):>3} 張  {p['handle']}{note}")
        if args.dry_run:
            continue
        paths = [rel for rel, _ in pairs]
        hosted = host([path for _, path in pairs], p["title"])
        if any(u is None for u in hosted):
            print(f"  !! {p['handle']}: 上載失敗，唔改")
            continue
        new = body
        for rel, url in zip(paths, hosted):
            new = new.replace(f"https://oujikbeauty.com/{rel}", url)
        for rel in absent:
            new = re.sub(r'<img[^>]*' + re.escape(rel) + r'[^>]*>', "", new)
        update_product(p["id"], descriptionHtml=new)
        touched += 1

    print(f"\n{touched} 個產品改咗指向 Shopify CDN"
          + (f"，{missing} 張本機冇" if missing else ""))


if __name__ == "__main__":
    main()
