#!/usr/bin/env python3
"""修好 rom&nd 六件新貨嘅長圖 —— 由 staged URL 換返永久 cdn 連結。

## 個錯係點
砌產品描述嗰陣用咗 `upload_all()`，佢回嘅係 **staged upload 嘅
resourceUrl**（shopify-staged-uploads.storage.googleapis.com/tmp/…）。
嗰個 URL 淨係做 productCreateMedia 嘅 originalSource 用，過咗就失效 ——
所以產品頁下半截 170 張長圖全部變白／爛圖。

正路係 `upload_files.host()`：佢會再行多一步 fileCreate，把 bytes 收入
Shopify Files，回一個永久 cdn.shopify.com 連結，可以直接 hotlink。
（`upload_files.py` 個 docstring 本身已經寫住呢一點，係我睇漏。）

  python3 fix_romand_desc.py --apply
"""
import argparse
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from shopify_admin import gql, user_errors  # noqa
from upload_files import host  # noqa
from add_romand_products import PRODUCTS, ROOT, files  # noqa

FIND = 'query($h:String!){products(first:1, query:$h){nodes{id handle title descriptionHtml}}}'
UPDATE = """mutation($id:ID!,$d:String!){
  productUpdate(product:{id:$id, descriptionHtml:$d}){
    product{id} userErrors{field message}}}"""
BLOCK = re.compile(r'<div class="product-detail-images">.*?</div>', re.S)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    a = ap.parse_args()

    for cfg in PRODUCTS:
        p = gql(FIND, {"h": f"handle:{cfg['handle']}"})["products"]["nodes"]
        if not p:
            print(f"✗ 揾唔到 {cfg['handle']}"); continue
        p = p[0]
        dt = files(cfg["img"], "detail")
        bad = len(re.findall(r'shopify-staged-uploads', p["descriptionHtml"] or ""))
        print(f"{cfg['handle']:<34}長圖 {len(dt):>2} 張｜描述入面壞連結 {bad}")
        if not a.apply or not dt:
            continue
        urls = [u for u in host([str(f) for f in dt], alt=cfg["title"]) if u]
        strips = "".join(
            f'<img src="{u}" alt="{cfg["title"]} 產品介紹" loading="lazy">' for u in urls)
        new_block = f'<div class="product-detail-images">{strips}</div>'
        desc = p["descriptionHtml"] or ""
        desc = BLOCK.sub(new_block, desc) if BLOCK.search(desc) else desc + new_block
        d = gql(UPDATE, {"id": p["id"], "d": desc})
        user_errors(d, "productUpdate")
        print(f"   ✓ 換咗 {len(urls)} 條永久連結")
    if not a.apply:
        print("\n加 --apply 先會真係改。")


main()
