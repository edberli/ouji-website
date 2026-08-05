#!/usr/bin/env python3
"""
Give a draft its imagery and put it live.

Every draft on the store is a draft for one reason: no picture was found
when its brand was built. The copy, shades and stock are already right,
so all that is needed is media plus a status flip — rebuilding the whole
product through productSet would rewrite fields that are fine.

The first URL becomes the cover; the rest are appended in order and the
tail is also written into the description as detail images, which is what
every other product on the site does.

    python3 scripts/add_media.py <handle> <url> [<url> ...]
    python3 scripts/add_media.py <handle> --from-json /tmp/x.json
"""
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pick_covers import MEDIA_Q  # noqa: E402
from publish import channels, existing_id  # noqa: E402
from shopify_admin import gql, user_errors  # noqa: E402

CREATE = """
mutation($id: ID!, $media: [CreateMediaInput!]!) {
  productCreateMedia(productId: $id, media: $media) {
    media { ... on MediaImage { id } }
    mediaUserErrors { field message }
  }
}
"""

PRODUCT = """
query($id: ID!) { product(id: $id) { title descriptionHtml status } }
"""

UPDATE = """
mutation($input: ProductInput!) {
  productUpdate(input: $input) { product { id status } userErrors { field message } }
}
"""

PUBLISH = """
mutation($id: ID!, $input: [PublicationInput!]!) {
  publishablePublish(id: $id, input: $input) { userErrors { field message } }
}
"""

WANTED = {"Online Store", "ouji Headless", "Shop"}


def strip_details(html):
    """Drop a previous detail block so re-running does not stack them."""
    i = html.find('<div class="product-detail-images">')
    return html[:i] if i >= 0 else html


def main():
    handle = sys.argv[1]
    rest = sys.argv[2:]
    urls = (json.load(open(rest[1])) if rest[:1] == ["--from-json"] else rest)
    urls = list(dict.fromkeys(u.split("?")[0] if "cdn.shopify.com" in u else u
                              for u in urls))[:40]
    if not urls:
        raise SystemExit(f"{handle}: 冇圖")

    pid = existing_id(handle)
    if not pid:
        raise SystemExit(f"{handle}: Shopify 搵唔到")
    prod = gql(PRODUCT, {"id": pid})["product"]

    data = gql(CREATE, {"id": pid, "media": [
        {"originalSource": u, "mediaContentType": "IMAGE", "alt": prod["title"]}
        for u in urls]})
    user_errors(data, "productCreateMedia")

    body = strip_details(prod["descriptionHtml"] or "")
    if len(urls) > 1:
        body += ('<div class="product-detail-images">'
                 + "".join(f'<img src="{u}" alt="{prod["title"]} 產品介紹" '
                           f'loading="lazy">' for u in urls[1:])
                 + "</div>")
    out = gql(UPDATE, {"input": {"id": pid, "status": "ACTIVE",
                                 "descriptionHtml": body}})
    user_errors(out, "productUpdate")

    pubs = [{"publicationId": c} for c in channels()]
    res = gql(PUBLISH, {"id": pid, "input": pubs})
    user_errors(res, "publishablePublish")

    # media lands asynchronously; report what actually stuck
    for _ in range(15):
        time.sleep(2)
        n = len([e for e in gql(MEDIA_Q, {"id": pid})["product"]["media"]["edges"]
                 if (e["node"].get("image") or {}).get("url")])
        if n:
            break
    print(f"{handle}  {n} media, ACTIVE, {len(pubs)} channels")


if __name__ == "__main__":
    main()
