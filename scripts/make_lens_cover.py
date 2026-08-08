#!/usr/bin/env python3
"""
Compose the lens cover: a main shot with the effect inset in the corner.

Two wrong answers were tried first. The packaging box, which tells a
shopper nothing — a beige carton is not a colour. Then a bare eyeball
cropped square, which does show the colour and looks like a medical
photograph.

What a circle-lens listing wants is both at once: the picture that makes
you want it, with the picture that tells you what you are buying tucked
into the corner. That is how every Japanese lens brand lays out its own
campaign, and it is what the merchant asked for.

    python3 scripts/make_lens_cover.py --dry-run
    python3 scripts/make_lens_cover.py "Feliamo 1Day #Espresso"

Feliamo and Molak publish a model portrait per colour, so those get
model + worn-eye inset. TOPARDS, Lilmoon and N's Collection publish no
model shot at all, so theirs is worn-eye + lens inset — still a composed
cover, still shows the colour twice, without inventing a face.
"""
import argparse
import io
import json
import os
import re
import sys
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lens_data import load  # noqa: E402
from shopify_admin import gql, user_errors  # noqa: E402
from upload_files import upload  # noqa: E402

IMAGES = "/tmp/lens_images.json"
WORK = "/Volumes/core/ouji-lens-covers"
UA = {"User-Agent": ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                     "AppleWebKit/537.36 Chrome/120 Safari/537.36")}

SIDE = 1400
INSET = 0.36          # inset width as a share of the frame
PAD = 0.035           # inset margin from the edges

MODEL = ("eyecatch", "image_0", "model")
WORN = ("lens_on", "sample_0", "wear")
LENS = ("lens.", "lens@", "product@2x", "product.")


def pick(urls, keys):
    for u in urls:
        n = u.rsplit("/", 1)[-1].lower()
        if any(k in n for k in keys):
            return u
    return None


def grab(url):
    from PIL import Image
    blob = urllib.request.urlopen(
        urllib.request.Request(url, headers=UA), timeout=60).read()
    return Image.open(io.BytesIO(blob)).convert("RGB")


def fill(im, w, h):
    """Cover-crop to exactly w x h, keeping the centre."""
    from PIL import Image
    scale = max(w / im.width, h / im.height)
    im = im.resize((max(1, round(im.width * scale)), max(1, round(im.height * scale))),
                   Image.LANCZOS)
    x = (im.width - w) // 2
    # Faces sit in the upper half, so bias the crop upward rather than
    # centring it and cutting the top of a head off.
    y = max(0, min(im.height - h, (im.height - h) // 3))
    return im.crop((x, y, x + w, y + h))


def compose(main_url, inset_url):
    from PIL import Image, ImageDraw
    out = fill(grab(main_url), SIDE, SIDE)

    if not inset_url:
        return out
    iw = round(SIDE * INSET)
    ih = round(iw * 0.72)                     # an eye is wider than tall
    inset = fill(grab(inset_url), iw, ih)

    pad = round(SIDE * PAD)
    x, y = SIDE - iw - pad, SIDE - ih - pad

    # A white keyline and a soft shadow so the inset reads as laid on top
    # rather than as a hole cut in the photograph.
    frame = Image.new("RGB", (iw + 8, ih + 8), "white")
    frame.paste(inset, (4, 4))
    shadow = Image.new("RGBA", out.size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rectangle(
        [x - 2, y - 2, x + iw + 10, y + ih + 10], fill=(0, 0, 0, 38))
    try:
        from PIL import ImageFilter
        shadow = shadow.filter(ImageFilter.GaussianBlur(9))
    except Exception:
        pass
    out = Image.alpha_composite(out.convert("RGBA"), shadow).convert("RGB")
    out.paste(frame, (x - 4, y - 4))
    return out


def plan(urls):
    """(main, inset) — model over worn eye where a model exists, worn eye
    over the lens where it does not."""
    model, worn, lens = pick(urls, MODEL), pick(urls, WORN), pick(urls, LENS)
    if model and worn:
        return model, worn
    if worn:
        return worn, lens
    return (urls[0] if urls else None), None


DELETE = """
mutation($pid: ID!, $ids: [ID!]!) {
  productDeleteMedia(productId: $pid, mediaIds: $ids) {
    deletedMediaIds userErrors { message }
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
REORDER = """
mutation($id: ID!, $moves: [MoveInput!]!) {
  productReorderMedia(id: $id, moves: $moves) { job { id } userErrors { message } }
}
"""
FIND = """
query($h: String!) {
  productByIdentifier(identifier: { handle: $h }) {
    id title media(first: 20) { edges { node { ... on MediaImage { id } } } }
  }
}
"""


def handle_of(colour):
    s = re.sub(r"[^a-z0-9]+", "-", colour.lower()).strip("-")
    return f"lens-{s}"[:70]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("colour", nargs="?")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    if not os.path.isdir("/Volumes/core"):
        raise SystemExit("/Volumes/core 未掛載")
    os.makedirs(WORK, exist_ok=True)

    imgs = json.load(open(IMAGES))
    done = 0
    for colour in sorted(load()):
        if args.colour and colour != args.colour:
            continue
        urls = imgs.get(colour) or []
        if not urls:
            continue
        main_url, inset_url = plan(urls)
        kind = ("模特兒＋戴上眼" if any(k in main_url.lower() for k in MODEL)
                else "戴上眼＋鏡片" if inset_url else "淨主圖")
        print(f"{colour:<44}{kind}")
        if args.dry_run:
            done += 1
            continue

        path = os.path.join(WORK, handle_of(colour) + ".jpg")
        compose(main_url, inset_url).save(path, "JPEG", quality=90)
        src = upload(path)
        if not src:
            print("      上載失敗")
            continue
        p = gql(FIND, {"h": handle_of(colour)})["productByIdentifier"]
        if not p:
            print("      搵唔到產品")
            continue
        out = gql(CREATE, {"pid": p["id"], "media": [
            {"originalSource": src, "mediaContentType": "IMAGE",
             "alt": p["title"]}]})
        errs = out["productCreateMedia"].get("mediaUserErrors") or []
        if errs:
            print("      ", errs)
            continue
        after = gql(FIND, {"h": handle_of(colour)})["productByIdentifier"]
        ids = [e["node"]["id"] for e in after["media"]["edges"] if e["node"].get("id")]
        if len(ids) > 1:
            user_errors(gql(REORDER, {"id": p["id"],
                                      "moves": [{"id": ids[-1], "newPosition": "0"}]}),
                        "productReorderMedia")
        done += 1

    print(f"\n{done} 個色" + ("（dry run）" if args.dry_run else " 換咗封面"))


if __name__ == "__main__":
    main()
