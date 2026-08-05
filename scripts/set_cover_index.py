#!/usr/bin/env python3
"""
Promote one of a product's existing images to cover, by its position.

Scoring covers numerically failed twice — a swatch chart and a promo
banner both look like "product in frame" to an edge detector. So the
choice is made by eye off a contact sheet, and this just applies it.

    python3 scripts/set_cover_index.py <handle> <index>
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pick_covers import MEDIA_Q, REORDER
from publish import existing_id
from shopify_admin import gql, user_errors


def main():
    handle, idx = sys.argv[1], int(sys.argv[2])
    pid = existing_id(handle)
    media = gql(MEDIA_Q, {"id": pid})["product"]["media"]["edges"]
    ids = [e["node"]["id"] for e in media if (e["node"].get("image") or {}).get("url")]
    out = gql(REORDER, {"id": pid,
                        "moves": [{"id": ids[idx], "newPosition": "0"}]})
    user_errors(out, "productReorderMedia")
    print(f"{handle}  <- #{idx}")


if __name__ == "__main__":
    main()
