#!/usr/bin/env python3
"""
Give a product a new cover from a local image.

Some products' whole gallery is a black studio packshot, so reordering
has nothing better to promote — but the model shot is often sitting in
the detail strips, which are mirrored anyway. This picks the best-scoring
strip (or a file you name), uploads it, and moves it to first position.

    python3 scripts/add_cover.py tirtir-mask-fit-red-cushion            # auto-pick
    python3 scripts/add_cover.py <handle> brands/x/detail/y-02.jpg      # explicit
"""
import glob
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pick_covers import MEDIA_Q, REORDER, score
from publish import existing_id
from shopify_admin import gql, user_errors
from upload_files import upload

CREATE = """
mutation($id: ID!, $media: [CreateMediaInput!]!) {
  productCreateMedia(productId: $id, media: $media) {
    media { ... on MediaImage { id } }
    mediaUserErrors { field message }
  }
}
"""


def best_strip(handle):
    """Detail strips are named after the product slug; the brand folder is
    the slug's first segment."""
    brand = handle.split("-")[0]
    files = sorted(glob.glob(f"brands/{brand}/detail/{handle}-*.jpg"))[:14]
    if not files:
        return None
    ranked = sorted(((score(open(f, "rb").read()), f) for f in files), reverse=True)
    return ranked[0][1] if ranked and ranked[0][0] > 40 else None


def main():
    handle = sys.argv[1]
    path = sys.argv[2] if len(sys.argv) > 2 else best_strip(handle)
    if not path:
        raise SystemExit(f"{handle}: 本機冇夠靚嘅圖，要另外搵")

    pid = existing_id(handle)
    if not pid:
        raise SystemExit(f"{handle}: Shopify 搵唔到")

    src = upload(path)
    data = gql(CREATE, {"id": pid, "media": [
        {"originalSource": src, "mediaContentType": "IMAGE", "alt": handle}]})
    user_errors(data, "productCreateMedia")

    # the new media needs a moment before it can be reordered
    import time
    for _ in range(20):
        time.sleep(3)
        media = gql(MEDIA_Q, {"id": pid})["product"]["media"]["edges"]
        new = [e["node"]["id"] for e in media
               if (e["node"].get("image") or {}).get("url")]
        if len(new) > 1:
            break
    target = data["productCreateMedia"]["media"][0]["id"]
    out = gql(REORDER, {"id": pid, "moves": [{"id": target, "newPosition": "0"}]})
    user_errors(out, "productReorderMedia")
    print(f"{handle}  <- {os.path.basename(path)}")


if __name__ == "__main__":
    main()
