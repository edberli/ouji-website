#!/usr/bin/env python3
"""換走某件貨嘅產品相（gallery），長圖唔郁。

用嚟執「主圖係一張文字宣傳板」嗰種——喺 grid 度睇落唔似產品相。

  python3 scripts/reset_media.py <barcode> <圖URL> [<圖URL> ...] --apply
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from shopify_admin import gql, user_errors  # noqa
from upload_files import upload  # noqa

FIND = 'query($q:String!){products(first:1, query:$q){nodes{id title media(first:20){nodes{id}}}}}'
DEL = """mutation($id:ID!,$m:[ID!]!){productDeleteMedia(productId:$id, mediaIds:$m){
  deletedMediaIds userErrors{field message}}}"""
ADD = """mutation($id:ID!,$m:[CreateMediaInput!]!){productCreateMedia(productId:$id, media:$m){
  mediaUserErrors{field message}}}"""
TMP = Path("/Volumes/core/ouji-ads/brandsrc/reset")


def main():
    args = [a for a in sys.argv[1:] if a != "--apply"]
    apply = "--apply" in sys.argv
    bc, urls = args[0], args[1:]
    d = gql(FIND, {"q": f"barcode:{bc}"})["products"]["nodes"]
    if not d:
        print("✗ 搵唔到", bc); return 1
    p = d[0]
    print(f"  {p['title'][:44]}  舊圖 {len(p['media']['nodes'])} 張 → 新圖 {len(urls)} 張")
    if not apply:
        return 0
    TMP.mkdir(parents=True, exist_ok=True)
    import urllib.request
    files = []
    for i, u in enumerate(urls, 1):
        data = urllib.request.urlopen(urllib.request.Request(
            u, headers={"User-Agent": "Mozilla/5.0",
                        "Referer": "https://www.asianbeautywholesale.com/"}), timeout=40).read()
        f = TMP / f"{bc}-r{i:02d}.jpg"; f.write_bytes(data); files.append(f)
    if p["media"]["nodes"]:
        user_errors(gql(DEL, {"id": p["id"],
                              "m": [m["id"] for m in p["media"]["nodes"]]}), "productDeleteMedia")
    staged = [upload(str(f)) for f in files]
    gql(ADD, {"id": p["id"], "m": [{"originalSource": s, "mediaContentType": "IMAGE",
                                    "alt": p["title"]} for s in staged]})
    print("     ✓ 換好")
    return 0


if __name__ == "__main__":
    sys.exit(main())
