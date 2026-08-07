#!/usr/bin/env python3
"""
Write the real product copy onto the skincare range.

Everything went up with copy written from its category: every toner got
the same paragraph about what toner is for. Nothing said what was in the
bottle, what it claims to do, or how to use it — so two toners from the
same brand read identically.

This replaces that with 產品介紹 / 優點 / 用法 / 主要成分, translated from
what the maker actually published. Nothing is invented: where the source
never says how to use the product, the 用法 section is left out rather
than guessed.

    python3 scripts/attach_skincare_copy.py --dry-run
    python3 scripts/attach_skincare_copy.py Purito

The spec list and the 長圖 block already on the product are kept — only
the written copy above them is rewritten. Re-running is safe.
"""
import argparse
import html
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from shopify_admin import gql, update_product  # noqa: E402

DONE = os.path.expanduser("~/Downloads/offload-staging/skin-copy")
IMAGES = re.compile(r'<div class="product-detail-images">.*?</div>', re.S)

PRODUCTS = """
query($after: String) {
  products(first: 100, after: $after, query: "tag:護膚") {
    pageInfo { hasNextPage endCursor }
    edges { node { id handle title vendor descriptionHtml
      variants(first: 1) { edges { node { barcode } } } } }
  }
}
"""


def written():
    """Every {barcode: copy} the offload produced, across all batches."""
    out = {}
    for name in sorted(os.listdir(DONE)):
        if not name.endswith(".md"):
            continue
        text = open(os.path.join(DONE, name)).read().strip()
        text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.S).strip()
        try:
            rows = json.loads(text)
        except ValueError:
            print(f"  ⚠️  {name} 唔係合法 JSON，跳過")
            continue
        for r in rows:
            if isinstance(r, dict) and r.get("barcode"):
                out[str(r["barcode"]).strip()] = r
    return out


def esc(s):
    return html.escape(str(s or "").strip())


def body_html(c, vendor, size, keep_images):
    parts = []
    if c.get("intro"):
        parts.append(f"<p>{esc(c['intro'])}</p>")
    good = [b for b in (c.get("benefits") or []) if str(b).strip()]
    if good:
        parts.append("<h3>優點</h3><ul>"
                     + "".join(f"<li>{esc(b)}</li>" for b in good) + "</ul>")
    # No 用法 section when the source never described one. A guessed
    # instruction is worse than a missing one — someone follows it.
    if c.get("howto"):
        parts.append(f"<h3>用法</h3><p>{esc(c['howto'])}</p>")
    ing = [i for i in (c.get("ingredients") or []) if str(i).strip()]
    if ing:
        parts.append("<h3>主要成分</h3><ul>"
                     + "".join(f"<li>{esc(i)}</li>" for i in ing) + "</ul>")
    spec = []
    if size:
        spec.append(f"<li>容量／規格：{esc(size)}</li>")
    spec.append(f"<li>品牌：{esc(vendor)}</li>")
    parts.append(f"<ul>{''.join(spec)}</ul>")
    return "".join(parts) + keep_images


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("brand", nargs="?")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    copy = written()
    print(f"offload 出咗 {len(copy)} 件產品嘅文案\n")

    sizes = {}
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from skincare_data import load  # noqa: E402
    for r in load():
        sizes[r["barcode"]] = r["size"]

    after, done, skipped = None, 0, 0
    while True:
        page = gql(PRODUCTS, {"after": after})["products"]
        for e in page["edges"]:
            p = e["node"]
            if args.brand and p["vendor"] != args.brand:
                continue
            barcode = (p["variants"]["edges"][0]["node"]["barcode"] or "").strip()
            c = copy.get(barcode)
            if not c:
                skipped += 1
                continue
            keep = "".join(IMAGES.findall(p["descriptionHtml"] or ""))
            new = body_html(c, p["vendor"], sizes.get(barcode, ""), keep)
            if new == (p["descriptionHtml"] or ""):
                continue
            print(f'  {p["vendor"]:<16} {p["title"][:44]}')
            done += 1
            if not args.dry_run:
                update_product(p["id"], descriptionHtml=new)
        if not page["pageInfo"]["hasNextPage"]:
            break
        after = page["pageInfo"]["endCursor"]

    print(f"\n寫咗 {done} 件、{skipped} 件冇文案"
          + ("（dry run）" if args.dry_run else ""))


if __name__ == "__main__":
    main()
