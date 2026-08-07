#!/usr/bin/env python3
"""
Compose a twin-pack cover from the official single-unit packshot.

Three Torriden listings are two of the same item sold together — a
bundle the shop makes itself, so no brand and no stockist has ever
photographed it. Nothing to source, and a single bottle standing in for a
listing that says 孖裝 is the kind of cover this shop has already had to
be cleaned of.

So build it: two of the brand's own packshot, on the same white, one
slightly behind the other. The picture then shows exactly what is in the
box — no invention, just arithmetic.

    python3 scripts/make_twin_pack.py --dry-run
    python3 scripts/make_twin_pack.py

Each pair is named below rather than guessed. A wrong pairing here would
put the wrong bottle on a live product, and there are only three.
"""
import argparse
import io
import os
import sys
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from shopify_admin import gql, user_errors  # noqa: E402
from upload_files import upload  # noqa: E402

WORK = "/Volumes/core/ouji-twin-pack"
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 Chrome/120 Safari/537.36"}

# bundle handle-ish title -> the single it is two of
PAIRS = [
    ("Torriden Dive-In 低分子透明質酸面霜 孖裝",
     "Torriden Dive-In 低分子透明質酸面霜 80ml"),
    ("韓國Torriden桃瑞丹潤唇膏2只裝",
     "Torriden Solid-In 神經醯胺純素唇部精華 11ml"),
    ("韓國Torriden桃瑞丹聯名玻尿酸洗面奶150ml*2只",
     "Torriden Dive-In 低分子透明質酸保濕潔面乳 150ml"),
]

FIND = """
query($q: String!) {
  products(first: 10, query: $q) {
    edges { node { id title status
      media(first: 1) { edges { node { ... on MediaImage { image { url } } } } } } }
  }
}
"""

CREATE = """
mutation($pid: ID!, $media: [CreateMediaInput!]!) {
  productCreateMedia(productId: $pid, media: $media) {
    media { status } mediaUserErrors { field message }
  }
}
"""

UPDATE = """
mutation($input: ProductInput!) {
  productUpdate(input: $input) { product { status } userErrors { field message } }
}
"""


def find(title):
    q = 'vendor:"Torriden" title:"%s"' % title.replace('"', "")
    for e in gql(FIND, {"q": q})["products"]["edges"]:
        if e["node"]["title"] == title:
            return e["node"]
    return None


def trim(im, bg=245):
    """The product's own bounding box, with the white field cut away.

    Pasting two full frames on top of each other does not work: the frames
    are mostly white, and white is opaque, so the front copy paints out
    the back one and you get a picture of one bottle on a listing that
    says two."""
    from PIL import Image, ImageChops
    field = Image.new("RGB", im.size, (255, 255, 255))
    diff = ImageChops.difference(im.convert("RGB"), field).convert("L")
    box = diff.point(lambda v: 255 if v > (255 - bg) else 0).getbbox()
    return im.crop(box) if box else im


def twin(url):
    """Two of it, the same size, side by side and centred.

    An earlier version set one copy back and smaller for depth. It read as
    a mistake rather than a composition, because the source packshot has
    its own drop shadow baked in and two shadows at two scales look like
    an accident. Equal and evenly spaced reads as deliberate — which is
    the point: the listing is two of the same thing."""
    from PIL import Image
    blob = urllib.request.urlopen(
        urllib.request.Request(url, headers=UA), timeout=60).read()
    item = trim(Image.open(io.BytesIO(blob)).convert("RGB"))

    side = 1400
    gap = int(side * 0.035)
    margin = int(side * 0.11)
    scale = min((side - margin * 2 - gap) / 2 / item.width,
                (side - margin * 2) / item.height)
    w, h = max(1, int(item.width * scale)), max(1, int(item.height * scale))
    one = item.resize((w, h), Image.LANCZOS)

    out = Image.new("RGB", (side, side), "white")
    x0 = (side - (w * 2 + gap)) // 2
    y0 = (side - h) // 2
    out.paste(one, (x0, y0))
    out.paste(one, (x0 + w + gap, y0))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    if not os.path.isdir("/Volumes/core"):
        raise SystemExit("/Volumes/core 未掛載")
    os.makedirs(WORK, exist_ok=True)

    for bundle_title, single_title in PAIRS:
        bundle = find(bundle_title)
        single = find(single_title)
        if not bundle or not single:
            print(f"  ✗ 搵唔到：{bundle_title[:34]}")
            continue
        media = single["media"]["edges"]
        src = media[0]["node"]["image"]["url"] if media and media[0]["node"].get("image") else None
        if not src:
            print(f"  ✗ 單支冇圖：{single_title[:34]}")
            continue

        print(f'  {bundle_title[:36]}\n      ← 兩支 {single_title[:36]}')
        if args.dry_run:
            continue

        path = os.path.join(WORK, f"{bundle['id'].rsplit('/', 1)[-1]}.jpg")
        twin(src).save(path, "JPEG", quality=90)
        staged = upload(path)
        if not staged:
            print("      上載失敗")
            continue
        out = gql(CREATE, {"pid": bundle["id"], "media": [
            {"originalSource": staged, "mediaContentType": "IMAGE",
             "alt": bundle_title}]})
        errs = out["productCreateMedia"].get("mediaUserErrors") or []
        if errs:
            print("      ", errs)
            continue
        user_errors(gql(UPDATE, {"input": {"id": bundle["id"], "status": "ACTIVE"}}),
                    "productUpdate")
        print("      上架咗")


if __name__ == "__main__":
    main()
