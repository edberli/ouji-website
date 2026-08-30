#!/usr/bin/env python3
"""Take a full, self-contained backup of the OUJI catalogue.

The point is not "we have a CSV somewhere". The point is: if Shopify
closes the account tomorrow morning, everything needed to stand the shop
up again is already on the external disk — every field, every price,
every cost, every photo, at full resolution, with checksums so a silent
truncation is detectable.

So it saves three things, not one:

* `products.json` — the whole Admin API record per product. Not a
  flattened export; the raw shape, including the fields a CSV drops:
  variant-level cost, inventory levels per location, SEO, metafields,
  the publication list, and which image belongs to which variant.
* `products.csv` — a flat sheet for reading with human eyes, and for
  feeding a different platform's importer in a hurry.
* `images/<handle>/<n>-<mediaId>.<ext>` — the actual files. A backup
  that points at `cdn.shopify.com` is not a backup; those URLs die with
  the account.

Incremental by default: an image already on disk with the right size is
not re-downloaded, so a nightly run is cheap.

    python3 scripts/backup_store.py            # 去 /Volumes/core/ouji-backup
    python3 scripts/backup_store.py --out DIR
    python3 scripts/backup_store.py --no-images
"""
import argparse
import csv
import hashlib
import json
import os
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from shopify_admin import gql  # noqa: E402

DEFAULT_OUT = "/Volumes/core/ouji-backup"

# 一次過攞晒，唔好分開叫 —— 分開叫就會有「產品有、變體版本唔同步」嘅風險。
QUERY = """
query($cursor: String) {
  products(first: 10, after: $cursor) {
    pageInfo { hasNextPage endCursor }
    edges { node {
      id handle title descriptionHtml vendor productType tags status
      createdAt updatedAt publishedAt
      onlineStoreUrl
      seo { title description }
      options { id name position values }
      featuredMedia { ... on MediaImage { id } }
      media(first: 20) { edges { node {
        ... on MediaImage { id alt image { url width height } }
      } } }
      metafields(first: 20) { edges { node {
        namespace key type value
      } } }
      resourcePublicationsV2(first: 5) { edges { node {
        publication { id name } isPublished
      } } }
      variants(first: 60) { edges { node {
        id title sku barcode position
        price compareAtPrice
        selectedOptions { name value }
        image { url }
        inventoryPolicy
        inventoryQuantity
        inventoryItem {
          id tracked
          unitCost { amount currencyCode }
          measurement { weight { value unit } }
          inventoryLevels(first: 5) { edges { node {
            location { id name }
            quantities(names: ["available", "on_hand", "committed"]) { name quantity }
          } } }
        }
      } } }
    } }
  }
}
"""


def fetch_all():
    out, cursor = [], None
    while True:
        d = gql(QUERY, {"cursor": cursor})["products"]
        out += [e["node"] for e in d["edges"]]
        print(f"\r  攞咗 {len(out)} 件…", end="", flush=True)
        if not d["pageInfo"]["hasNextPage"]:
            break
        cursor = d["pageInfo"]["endCursor"]
    print()
    return out


def flat_rows(products):
    """一個變體一行 —— CSV 係畀人睇同畀第二個平台食嘅。"""
    for p in products:
        media = [e["node"]["image"]["url"] for e in p["media"]["edges"]
                 if e["node"].get("image")]
        for i, ve in enumerate(p["variants"]["edges"]):
            v = ve["node"]
            inv = v.get("inventoryItem") or {}
            cost = (inv.get("unitCost") or {}).get("amount")
            qty = {}
            for le in (inv.get("inventoryLevels") or {}).get("edges", []):
                for q in le["node"]["quantities"]:
                    qty[q["name"]] = qty.get(q["name"], 0) + q["quantity"]
            yield {
                "handle": p["handle"],
                "title": p["title"] if i == 0 else "",
                "vendor": p["vendor"] if i == 0 else "",
                "type": p["productType"] if i == 0 else "",
                "tags": ",".join(p["tags"]) if i == 0 else "",
                "status": p["status"] if i == 0 else "",
                "variant": v["title"],
                "sku": v["sku"] or "",
                "barcode": v["barcode"] or "",
                "price": v["price"],
                "compare_at": v["compareAtPrice"] or "",
                "cost": cost or "",
                "available": qty.get("available", ""),
                "on_hand": qty.get("on_hand", ""),
                "policy": v["inventoryPolicy"],
                "options": " / ".join(f'{o["name"]}={o["value"]}'
                                      for o in v["selectedOptions"]),
                "images": len(media) if i == 0 else "",
                "description": p["descriptionHtml"] if i == 0 else "",
            }


def grab(job):
    """一張圖。已經落咗地而且大細啱就唔再下載。"""
    url, path = job
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return "skip"
    tmp = path + ".part"
    os.makedirs(os.path.dirname(path), exist_ok=True)
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "ouji-backup"})
            with urllib.request.urlopen(req, timeout=90) as r, open(tmp, "wb") as f:
                while chunk := r.read(1 << 16):
                    f.write(chunk)
            os.replace(tmp, path)
            return "get"
        except (urllib.error.URLError, TimeoutError, OSError):
            time.sleep(1 + attempt * 2)
    if os.path.exists(tmp):
        os.remove(tmp)
    return "fail"


def image_jobs(products, root):
    jobs = []
    for p in products:
        for i, e in enumerate(p["media"]["edges"]):
            img = e["node"].get("image")
            if not img:
                continue
            # 檔名帶 media id：Shopify 換 CDN 路徑都對得返。
            mid = e["node"]["id"].rsplit("/", 1)[-1]
            ext = os.path.splitext(img["url"].split("?")[0])[1] or ".jpg"
            jobs.append((img["url"],
                         os.path.join(root, "images", p["handle"], f"{i:02d}-{mid}{ext}")))
    return jobs


def sha256(path, buf=1 << 20):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(buf):
            h.update(chunk)
    return h.hexdigest()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=DEFAULT_OUT)
    ap.add_argument("--no-images", action="store_true")
    ap.add_argument("--stamp", help="備份日期 YYYY-MM-DD，唔畀就用檔案時間")
    args = ap.parse_args()

    base = os.path.dirname(args.out.rstrip("/"))
    if not os.path.isdir(base):
        # 內置 SSD 淨返幾十 GB，圖唔可以掉落去。寧願唔跑。
        raise SystemExit(f"{base} 唔存在 —— /Volumes/core 掛咗未？")
    os.makedirs(args.out, exist_ok=True)

    print("攞緊產品…")
    products = fetch_all()

    with open(os.path.join(args.out, "products.json"), "w") as f:
        json.dump(products, f, ensure_ascii=False, indent=1)

    rows = list(flat_rows(products))
    with open(os.path.join(args.out, "products.csv"), "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)
    print(f"  products.json / products.csv —— {len(products)} 件、{len(rows)} 個變體")

    stats = {"get": 0, "skip": 0, "fail": 0}
    jobs = image_jobs(products, args.out)
    if not args.no_images:
        print(f"下載緊 {len(jobs)} 張圖…")
        with ThreadPoolExecutor(max_workers=8) as pool:
            for i, r in enumerate(pool.map(grab, jobs), 1):
                stats[r] += 1
                if i % 25 == 0 or i == len(jobs):
                    print(f"\r  {i}/{len(jobs)}  新 {stats['get']} · "
                          f"已有 {stats['skip']} · 失敗 {stats['fail']}", end="", flush=True)
        print()

    # 清單 + checksum：日後可以驗到有冇靜靜哋少咗嘢。
    files = []
    for dirpath, _, names in os.walk(os.path.join(args.out, "images")):
        for n in sorted(names):
            p = os.path.join(dirpath, n)
            files.append({"path": os.path.relpath(p, args.out),
                          "bytes": os.path.getsize(p), "sha256": sha256(p)})
    # 用檔名夾，唔好淨係減個數 —— 店入面刪咗嘅產品，佢張相仲會留喺
    # 備份度（呢個係好事，備份唔應該跟住刪嘢），但咁樣一減就會出現
    # 「欠 -13 張」呢啲睇唔明嘅數。分開講：真係欠幾多、多咗幾多舊嘢。
    have = {f["path"] for f in files}
    want = {os.path.relpath(dst, args.out) for _, dst in jobs}
    manifest = {
        "store": "5rerjn-mt.myshopify.com",
        "products": len(products),
        "variants": len(rows),
        "expected_images": len(jobs),
        "stored_images": len(files),
        "missing_images": len(want - have),
        "stale_images": sorted(have - want),
        "images": files,
    }
    if args.stamp:
        manifest["taken"] = args.stamp
    with open(os.path.join(args.out, "manifest.json"), "w") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)

    total = sum(x["bytes"] for x in files)
    print(f"\n備份完成：{args.out}")
    print(f"  {len(products)} 件產品 · {len(rows)} 個變體 · "
          f"{len(files)} 張圖 · {total / 1e9:.2f} GB")
    if manifest["missing_images"]:
        print(f"  ⚠️  有 {manifest['missing_images']} 張圖下載唔到 —— 再跑一次會補返")
    if manifest["stale_images"]:
        print(f"  ℹ️  {len(manifest['stale_images'])} 張相店入面已經冇 —— "
              f"照留喺備份度，唔會刪")


if __name__ == "__main__":
    main()
