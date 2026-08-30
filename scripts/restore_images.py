#!/usr/bin/env python3
"""把備份入面嘅相，重新掛返上 Shopify 產品度。

`shopify-import.csv` 帶得住文字同價錢，唯獨相帶唔到 —— Shopify 個
importer 係去 `Image Src` 嗰條 URL 攞相。舊店仲喺度嗰陣，CSV 入面嘅
cdn.shopify.com 連結行得通；但真係出事嗰日（帳戶冇咗、相一齊冇咗），
嗰啲連結全部係死嘅，import 完就係 1,400 件冇相嘅產品。

呢個 script 就係補嗰一步：唔使搵地方放相、唔使公開任何嘢，直接讀
`/Volumes/core/ouji-backup/images/<handle>/` 嘅原檔，經 staged upload
掉返上 Shopify。

    python3 scripts/restore_images.py --dry-run          # 睇下會做乜
    python3 scripts/restore_images.py                    # 只補冇相嗰啲
    python3 scripts/restore_images.py --handle abc-123   # 淨係整一件
    python3 scripts/restore_images.py --force            # 有相都照重掛

預設**只掂冇相嘅產品** —— 唔會整多份重複相出嚟。
"""
import argparse
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from shopify_admin import gql, user_errors  # noqa: E402
from upload_files import upload  # noqa: E402

BACKUP = "/Volumes/core/ouji-backup"

FIND = """
query($q: String!) {
  products(first: 1, query: $q) {
    edges { node { id handle title media(first: 1) { edges { node { id } } } } }
  }
}
"""

CREATE = """
mutation($id: ID!, $media: [CreateMediaInput!]!) {
  productCreateMedia(productId: $id, media: $media) {
    media { ... on MediaImage { id } }
    mediaUserErrors { field message }
  }
}
"""


def local_images(root, handle):
    """備份入面嗰個 handle 嘅相，照檔名排序（檔名頭嗰兩個位就係次序）。"""
    d = os.path.join(root, "images", handle)
    if not os.path.isdir(d):
        return []
    ok = (".jpg", ".jpeg", ".png", ".webp", ".gif")
    return [os.path.join(d, n) for n in sorted(os.listdir(d))
            if n.lower().endswith(ok)]


def find_product(handle):
    edges = gql(FIND, {"q": f"handle:{handle}"})["products"]["edges"]
    return edges[0]["node"] if edges else None


def restore_one(p, paths, alt):
    urls = []
    for f in paths:
        try:
            urls.append(upload(f))
        except Exception as e:      # 一張壞檔唔應該拖冧成件貨
            print(f"    ✗ 上載唔到 {os.path.basename(f)}：{e}")
    if not urls:
        return 0
    media = [{"originalSource": u, "mediaContentType": "IMAGE", "alt": alt}
             for u in urls]
    r = gql(CREATE, {"id": p["id"], "media": media})
    errs = user_errors(r, "productCreateMedia")
    if errs:
        print(f"    ✗ 掛唔上：{errs}")
        return 0
    return len(urls)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--backup", default=BACKUP)
    ap.add_argument("--handle", action="append",
                    help="淨係整呢個 handle（可以寫幾次）")
    ap.add_argument("--force", action="store_true",
                    help="產品已經有相都照掛多一次")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    src = os.path.join(args.backup, "products.json")
    if not os.path.exists(src):
        raise SystemExit(f"搵唔到 {src} —— 跑咗 backup_store.py 未？")
    products = json.load(open(src))

    if args.handle:
        want = set(args.handle)
        products = [p for p in products if p["handle"] in want]
        if not products:
            raise SystemExit("備份入面搵唔到呢個 handle")

    done = fixed = shots = skipped = missing = gone = 0
    for p in products:
        if args.limit and fixed >= args.limit:
            break
        paths = local_images(args.backup, p["handle"])
        if not paths:
            missing += 1
            continue
        live = find_product(p["handle"])
        if not live:
            gone += 1
            print(f"  ⚠️  店入面冇 {p['handle']} —— 要先 import CSV 建返件產品")
            continue
        has = bool(live["media"]["edges"])
        if has and not args.force:
            skipped += 1
            continue
        print(f"  {live['title'][:44]:<46} {len(paths)} 張")
        if args.dry_run:
            fixed += 1
            continue
        n = restore_one(live, paths, p["title"])
        shots += n
        if n:
            fixed += 1
        time.sleep(0.3)          # 唔好撼爆 API rate limit
        done += 1

    print(f"\n{'（試行）' if args.dry_run else ''}"
          f"補咗 {fixed} 件、{shots} 張相；"
          f"本身有相跳過 {skipped}、備份冇相 {missing}、店入面搵唔到 {gone}")


if __name__ == "__main__":
    main()
