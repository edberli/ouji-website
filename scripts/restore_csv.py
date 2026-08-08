#!/usr/bin/env python3
"""Turn the backup into a CSV Shopify's importer will actually accept.

`products.csv` in the backup is for reading — our own column names, one
row per variant, cost and stock included. Shopify's importer will not
touch it. This writes the other file: the exact 36-column shape the
Products → Import dialog expects.

The one thing a CSV cannot carry is the photographs. Shopify's importer
reads `Image Src` as a URL and fetches it — so on the day the account is
gone, every `cdn.shopify.com` link in an old export is dead, and the
import lands 800 products with no pictures. That is why the backup keeps
the actual files, and why this script takes `--image-base`: point it at
wherever the images are reachable from and the URLs are rewritten to
match.

    # 睇下會出咩（唔寫檔）
    python3 scripts/restore_csv.py --dry-run

    # 圖已經放咗上一個可以公開讀嘅地方
    python3 scripts/restore_csv.py --image-base https://example.com/ouji-images

    # 未有地方放圖 —— 照出，但 Image Src 留空，之後再上圖
    python3 scripts/restore_csv.py --no-images

還原步驟見 docs/restore.md。
"""
import argparse
import csv
import json
import os
import sys

BACKUP = "/Volumes/core/ouji-backup"

# Shopify 產品匯入嘅欄位，次序照佢哋個範本。
COLUMNS = [
    "Handle", "Title", "Body (HTML)", "Vendor", "Type", "Tags", "Published",
    "Option1 Name", "Option1 Value", "Option2 Name", "Option2 Value",
    "Option3 Name", "Option3 Value",
    "Variant SKU", "Variant Grams", "Variant Inventory Tracker",
    "Variant Inventory Qty", "Variant Inventory Policy",
    "Variant Fulfillment Service", "Variant Price", "Variant Compare At Price",
    "Variant Requires Shipping", "Variant Taxable", "Variant Barcode",
    "Image Src", "Image Position", "Image Alt Text", "Gift Card",
    "SEO Title", "SEO Description", "Variant Image", "Variant Weight Unit",
    "Cost per item", "Status",
]

GRAMS = {"GRAMS": 1, "KILOGRAMS": 1000, "OUNCES": 28.3495, "POUNDS": 453.592}


def grams(m):
    w = ((m or {}).get("weight") or {})
    if not w.get("value"):
        return ""
    return str(round(w["value"] * GRAMS.get(w.get("unit", "GRAMS"), 1)))


def img_url(product, index, media_id, url, base):
    """本機檔名 → 新地方嘅 URL。冇 base 就照用原本個（假設仲生存）。"""
    if base is None:
        return url
    if base == "":
        return ""
    ext = os.path.splitext(url.split("?")[0])[1] or ".jpg"
    return f'{base.rstrip("/")}/{product["handle"]}/{index:02d}-{media_id}{ext}'


def rows_for(p, base):
    """Shopify 嘅格式：第一行載住產品，之後每行只加一個變體或者一張圖。"""
    opts = p.get("options") or []
    media = [e["node"] for e in p["media"]["edges"] if e["node"].get("image")]
    variants = [e["node"] for e in p["variants"]["edges"]]
    seo = p.get("seo") or {}
    published = any(e["node"]["isPublished"]
                    for e in p["resourcePublicationsV2"]["edges"])

    out = []
    for i, v in enumerate(variants):
        inv = v.get("inventoryItem") or {}
        sel = {o["name"]: o["value"] for o in v["selectedOptions"]}
        qty = 0
        for le in (inv.get("inventoryLevels") or {}).get("edges", []):
            for q in le["node"]["quantities"]:
                if q["name"] == "available":
                    qty += q["quantity"]
        r = dict.fromkeys(COLUMNS, "")
        r["Handle"] = p["handle"]
        if i == 0:
            r.update({
                "Title": p["title"],
                "Body (HTML)": p.get("descriptionHtml") or "",
                "Vendor": p.get("vendor") or "",
                "Type": p.get("productType") or "",
                "Tags": ", ".join(p.get("tags") or []),
                "Published": "TRUE" if published else "FALSE",
                "SEO Title": seo.get("title") or "",
                "SEO Description": seo.get("description") or "",
                "Status": (p.get("status") or "DRAFT").lower(),
                "Gift Card": "FALSE",
            })
        for n in range(3):
            if n < len(opts):
                r[f"Option{n + 1} Name"] = opts[n]["name"]
                r[f"Option{n + 1} Value"] = sel.get(opts[n]["name"], "")
        r.update({
            "Variant SKU": v.get("sku") or "",
            "Variant Grams": grams(inv.get("measurement")),
            "Variant Inventory Tracker": "shopify" if inv.get("tracked") else "",
            "Variant Inventory Qty": str(qty),
            "Variant Inventory Policy": (v.get("inventoryPolicy") or "deny").lower(),
            "Variant Fulfillment Service": "manual",
            "Variant Price": v["price"],
            "Variant Compare At Price": v.get("compareAtPrice") or "",
            "Variant Requires Shipping": "TRUE",
            "Variant Taxable": "TRUE",
            "Variant Barcode": v.get("barcode") or "",
            "Variant Weight Unit": "g",
            "Cost per item": (inv.get("unitCost") or {}).get("amount") or "",
        })
        # 頭幾行順便帶住圖，行數唔夠先另開行。
        if i < len(media):
            m = media[i]
            r["Image Src"] = img_url(p, i, m["id"].rsplit("/", 1)[-1],
                                     m["image"]["url"], base)
            r["Image Position"] = str(i + 1)
            r["Image Alt Text"] = m.get("alt") or ""
        out.append(r)

    for i in range(len(variants), len(media)):
        m = media[i]
        r = dict.fromkeys(COLUMNS, "")
        r["Handle"] = p["handle"]
        r["Image Src"] = img_url(p, i, m["id"].rsplit("/", 1)[-1],
                                 m["image"]["url"], base)
        r["Image Position"] = str(i + 1)
        r["Image Alt Text"] = m.get("alt") or ""
        out.append(r)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--backup", default=BACKUP)
    ap.add_argument("--image-base", default=None,
                    help="圖擺咗去邊（例：https://cdn.example.com/ouji）")
    ap.add_argument("--no-images", action="store_true", help="Image Src 留空")
    ap.add_argument("--out", default=None)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    src = os.path.join(args.backup, "products.json")
    if not os.path.exists(src):
        raise SystemExit(f"搵唔到 {src} —— 跑咗 backup_store.py 未？")
    products = json.load(open(src))
    base = "" if args.no_images else args.image_base

    rows = []
    for p in products:
        rows += rows_for(p, base)

    imgs = sum(1 for r in rows if r["Image Src"])
    print(f"{len(products)} 件產品 → {len(rows)} 行、{imgs} 個圖片連結")
    if base is None:
        print("  ⚠️  Image Src 用緊 cdn.shopify.com —— 舊店冇咗嗰陣呢啲連結會死。"
              "\n     真係要還原就用 --image-base 指去圖實際擺咗嘅地方。")
    if args.dry_run:
        print("\n頭三行：")
        for r in rows[:3]:
            print("  " + " | ".join(f"{k}={v}" for k, v in r.items() if v)[:150])
        return

    out = args.out or os.path.join(args.backup, "shopify-import.csv")
    with open(out, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS)
        w.writeheader()
        w.writerows(rows)
    print(f"寫咗 {out}")


if __name__ == "__main__":
    main()
