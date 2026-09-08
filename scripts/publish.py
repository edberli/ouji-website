#!/usr/bin/env python3
"""
Create or update a product with all its shades and imagery in one call.

Replaces the CSV import dance: the importer refuses to overwrite an
existing handle, so a correction meant deleting the products and
re-importing by hand. productSet is idempotent on the handle, so a brand
can be rebuilt as many times as its copy needs.

Used by the per-brand build scripts (build_clio.py and friends).
"""
import html
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from shopify_admin import gql, user_errors  # noqa: E402

LOCATION = "gid://shopify/Location/86449356958"   # 商店地點 — the only one

PRODUCT_SET = """
mutation($input: ProductSetInput!) {
  productSet(synchronous: true, input: $input) {
    product { id handle title
      variants(first: 100) { edges { node { id title } } }
      media(first: 100) { edges { node { ... on MediaImage { id } } } }
    }
    userErrors { field message code }
  }
}
"""


def build_input(p):
    """p: {handle,title,descriptionHtml,vendor,productType,tags,status,
           option_name,shades:[{name,barcode,qty,price,image}],images:[url]}"""
    curated = _curated_for_product(p)
    images = curated["gallery"] or list(dict.fromkeys(p["images"]))
    description = p["descriptionHtml"]
    if curated["detail"]:
        description = _apply_curated_detail(
            description, p["title"], curated["detail"])
    files = [{"originalSource": u, "contentType": "IMAGE", "alt": p["title"]} for u in images]

    variants = []
    for s in p["shades"]:
        v = {
            "optionValues": [{"optionName": p["option_name"], "name": s["name"]}],
            "price": str(s.get("price", p.get("price"))),
            "barcode": s["barcode"],
            "sku": s["barcode"],
            "inventoryItem": {"tracked": True},
            "inventoryQuantities": [{
                "locationId": LOCATION,
                "name": "available",
                "quantity": int(s.get("qty", 0)),
            }],
            "inventoryPolicy": "DENY" if int(s.get("qty", 0)) == 0 else "CONTINUE",
        }
        if s.get("image") and s["image"] in images:
            v["file"] = {"originalSource": s["image"], "contentType": "IMAGE", "alt": s["name"]}
        variants.append(v)

    base = {
        "handle": p["handle"],
        "title": p["title"],
        "descriptionHtml": description,
        "vendor": p["vendor"],
        "productType": p["productType"],
        "tags": p["tags"],
        "status": p.get("status", "ACTIVE"),
        "productOptions": [{
            "name": p["option_name"],
            "values": [{"name": s["name"]} for s in p["shades"]],
        }],
        "variants": variants,
        "files": files,
    }
    if p.get("id"):
        base["id"] = p["id"]
    return base


PUBLICATIONS_QUERY = "{ publications(first: 20) { edges { node { id name } } } }"
# The storefront reads through the headless channel; the other two are
# where a shopper would otherwise find us.
WANTED_CHANNELS = {"Online Store", "ouji Headless", "Shop"}

# Optional barcode-keyed media curated by the bounded catalog audit. The
# source builders continue to work when this file is absent; when any shade
# barcode is present, its product-level gallery/detail set is authoritative.
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CURATED_MEDIA = os.path.join(ROOT, "data", "catalog_media_restoration.json")
DETAIL_BLOCK = re.compile(
    r'<div\b(?=[^>]*\bclass=["\'][^"\']*\bproduct-detail-images\b'
    r'[^"\']*["\'])[^>]*>.*?</div>', re.I | re.S)


def _load_curated_media():
    """Read the optional local barcode -> gallery/detail map."""
    if not os.path.exists(CURATED_MEDIA):
        return {}
    with open(CURATED_MEDIA, encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, dict):
        raise ValueError(f"{CURATED_MEDIA}: expected a JSON object")
    return data


def _media_urls(record, key, barcode):
    if not isinstance(record, dict):
        raise ValueError(f"curated media {barcode}: expected an object")
    raw = record.get(key) or []
    if isinstance(raw, str):
        raw = [raw]
    if not isinstance(raw, (list, tuple)):
        raise ValueError(f"curated media {barcode}.{key}: expected a URL list")
    urls = []
    for url in raw:
        if not isinstance(url, str) or not url.strip():
            continue
        url = url.strip()
        if not url.startswith(("http://", "https://")):
            raise ValueError(f"curated media {barcode}.{key}: non-absolute URL")
        if url not in urls:
            urls.append(url)
    return urls


def _curated_for_product(p):
    """Return one consistent map for any mapped shade barcode.

    Shopify product media and description are product-level, so two shades in
    one product cannot safely carry different curated sets. Failing closed
    prevents a rebuild from assigning one shade's photographs to another.
    """
    media = _load_curated_media()
    mapped = []
    seen = set()
    for shade in p.get("shades") or []:
        barcode = str(shade.get("barcode") or "").strip()
        if not barcode or barcode in seen or barcode not in media:
            continue
        seen.add(barcode)
        mapped.append((barcode, {
            "gallery": _media_urls(media[barcode], "gallery", barcode),
            "detail": _media_urls(media[barcode], "detail", barcode),
        }))
    if not mapped:
        return {"gallery": [], "detail": []}
    first_barcode, first = mapped[0]
    conflicts = [barcode for barcode, value in mapped[1:]
                 if value != first]
    if conflicts:
        joined = ", ".join([first_barcode] + conflicts)
        raise ValueError(
            "curated media differs between shade barcodes: " + joined
        )
    return first


def _detail_block(title, urls):
    imgs = "".join(
        f'<img src="{html.escape(url, quote=True)}" '
        f'alt="{html.escape(title, quote=True)} 產品介紹" loading="lazy">'
        for url in urls
    )
    return f'<div class="product-detail-images">{imgs}</div>'


def _apply_curated_detail(description, title, urls):
    """Replace only the old detail block and preserve every other character."""
    body = DETAIL_BLOCK.sub("", description or "").rstrip()
    return body + _detail_block(title, urls)

PUBLISH = """
mutation($id: ID!, $input: [PublicationInput!]!) {
  publishablePublish(id: $id, input: $input) {
    userErrors { field message }
  }
}
"""

_channels = None


def channels():
    """productSet creates products unpublished — nothing reaches the
    storefront until they are published to a sales channel."""
    global _channels
    if _channels is None:
        edges = gql(PUBLICATIONS_QUERY)["publications"]["edges"]
        _channels = [e["node"]["id"] for e in edges if e["node"]["name"] in WANTED_CHANNELS]
    return _channels


BY_HANDLE = """
query($handle: String!) { productByIdentifier(identifier: {handle: $handle}) { id } }
"""


def existing_id(handle):
    """productSet keys off the id — given only a handle it tries to create
    and trips HANDLE_NOT_UNIQUE, so a rebuild has to look the id up."""
    found = gql(BY_HANDLE, {"handle": handle}).get("productByIdentifier")
    return found["id"] if found else None


def publish(p):
    p = {**p, "id": p.get("id") or existing_id(p["handle"])}
    data = gql(PRODUCT_SET, {"input": build_input(p)})
    user_errors(data, "productSet")
    prod = data["productSet"]["product"]

    published = 0
    if p.get("status", "ACTIVE") == "ACTIVE":
        out = gql(PUBLISH, {"id": prod["id"],
                            "input": [{"publicationId": c} for c in channels()]})
        user_errors(out, "publishablePublish")
        published = len(channels())

    return {
        "handle": prod["handle"],
        "variants": len(prod["variants"]["edges"]),
        "media": len(prod["media"]["edges"]),
        "channels": published,
    }
