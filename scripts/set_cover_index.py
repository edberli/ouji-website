#!/usr/bin/env python3
"""
Promote one of a product's existing images to cover, by its position.

Scoring covers numerically failed twice — a swatch chart and a promo
banner both look like "product in frame" to an edge detector. So the
choice is made by eye off a contact sheet, and this just applies it.

The handle is recorded in covers.lock.json so the next pick_covers run
leaves it alone: a hand-picked cover kept getting overwritten by the
scorer on the following brand sweep, which is how good covers turned bad
again after being fixed.

    python3 scripts/set_cover_index.py <handle> <index>
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pick_covers import LOCK_PATH, MEDIA_Q, REORDER, locked
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

    lock = sorted(set(locked()) | {handle})
    with open(LOCK_PATH, "w") as f:
        json.dump(lock, f, indent=1, ensure_ascii=False)
    print(f"{handle}  <- #{idx}   (鎖咗，pick_covers 唔會再郁)")


if __name__ == "__main__":
    main()
