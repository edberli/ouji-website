#!/usr/bin/env python3
"""將 MASCLUB 官方原圖（連長圖）整套掛落三件風扇。

⚠️ 唔准裁、唔准揀。老闆講明：「嗰啲日文、韓文根本上唔緊要，甚至更加
   好睇。你唔好亂咁自己做決定。」同埋「長圖你都要有嘅」。
   所以：官方圖庫由頭到尾照掛，長圖照掛，一張都唔剔走。

  python3 attach_masclub_media.py --apply
"""
import argparse
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from shopify_admin import gql, user_errors  # noqa
from upload_files import upload  # noqa

BASE = Path(__file__).parent.parent / "brands" / "masclub"
MAP = {
    # handle: (圖庫資料夾, alt, 樂天出處)
    "masclub-handheld-fan-phone-stand": ("phone", "Masclub 手持風扇 可放手機", "hclc/ksa-c"),
    "masclub-cooling-handheld-fan":     ("cool",  "Masclub 制冷手拎風扇",      "hclc/e2"),
    "masclub-neck-fan":                 ("neck",  "Masclub 頸掛式風扇",        "hclc/ksg-i"),
}

FIND = """query($q:String!){products(first:1, query:$q){nodes{id handle title
  media(first:50){nodes{id}}}}}"""
ADD = """mutation($id:ID!,$m:[CreateMediaInput!]!){
  productCreateMedia(productId:$id, media:$m){
    media{... on MediaImage{id}} mediaUserErrors{field message}}}"""
DEL = """mutation($id:ID!,$m:[ID!]!){
  productDeleteMedia(productId:$id, mediaIds:$m){
    deletedMediaIds mediaUserErrors{field message}}}"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    a = ap.parse_args()

    for handle, (folder, alt, src) in MAP.items():
        files = sorted((BASE / folder).glob("*.jpg"))
        print(f"{handle}: {len(files)} 張（{src}）")
        if not a.apply:
            continue
        p = gql(FIND, {"q": f"handle:{handle}"})["products"]["nodes"]
        if not p:
            print("  ✗ 揾唔到"); continue
        p = p[0]
        old = [m["id"] for m in p["media"]["nodes"]]

        media = [{"originalSource": upload(str(f)), "mediaContentType": "IMAGE",
                  "alt": f"{alt} {i:02d}"} for i, f in enumerate(files, 1)]
        # 一次過過百張會 timeout，分批落
        for i in range(0, len(media), 10):
            d = gql(ADD, {"id": p["id"], "m": media[i:i + 10]})
            errs = d["productCreateMedia"]["mediaUserErrors"]
            if errs:
                print("  ✗", errs); break
        else:
            if old:
                d = gql(DEL, {"id": p["id"], "m": old})
                user_errors(d, "productDeleteMedia")
            print(f"  ✓ 掛咗 {len(media)} 張，刪走舊嘅 {len(old)} 張")


main()
