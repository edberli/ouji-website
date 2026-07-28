#!/usr/bin/env python3
"""
Build the Shopify import CSV for the Glint range.

One product per series, colour shades as variants, gallery images from the
brand's official photography, and the long Traditional-Chinese detail
strips embedded in the product description (Taobao-style page).

    python3 scripts/build_glint_csv.py <out.csv>
"""
import csv
import sys

OMG = "https://www.ohmyglow.co/wp-content/uploads/"
OY = "https://cdn-image.oliveyoung.com/prdtImg/"
OUJI = "https://oujikbeauty.com/brands/glint/"

COLS = [
    "Handle", "Title", "Body (HTML)", "Vendor", "Type", "Tags", "Published",
    "Option1 Name", "Option1 Value", "Variant SKU", "Variant Grams",
    "Variant Inventory Tracker", "Variant Inventory Qty",
    "Variant Inventory Policy", "Variant Fulfillment Service", "Variant Price",
    "Variant Requires Shipping", "Variant Taxable", "Variant Barcode",
    "Image Src", "Image Position", "Image Alt Text", "Variant Image",
    "Cost per item", "Status",
]

TAGS_HL = "Glint, K-Beauty, 彩妝, 修容, 高光, makeup, cheek, highlight"
TAGS_BL = "Glint, K-Beauty, 彩妝, 修容, 胭脂, makeup, cheek, blush"


def body(intro, bullets, detail_imgs):
    """Description = copy + the long Traditional-Chinese detail strips."""
    html = f"<p>{intro}</p><ul>" + "".join(f"<li>{b}</li>" for b in bullets) + "</ul>"
    if detail_imgs:
        html += '<div class="product-detail-images">'
        html += "".join(
            f'<img src="{u}" alt="產品介紹" loading="lazy" '
            f'style="width:100%;max-width:1200px;display:block;margin:0 auto;">'
            for u in detail_imgs
        )
        html += "</div>"
    return html


PRODUCTS = [
    {
        "handle": "glint-highlighter",
        "title": "Glint Highlighter 高光粉",
        "type": "高光",
        "tags": TAGS_HL,
        "price": "128",
        "intro": "Glint 粉狀高光質地絲滑貼膚，奶油觸感細膩順滑不卡粉，輕抹即透出細緻光澤，"
                 "為面部輪廓添上立體層次與光感。",
        "bullets": [
            "容量：2.3g／2.8g",
            "妝效：細緻光澤閃爍，像光線繡於肌膚上，自然提亮",
            "用法：以刷具或指尖沾取適量，輕點於顴骨、眉骨、鼻樑；亦可作胭脂或眼影使用",
            "產地：韓國 Made in Korea",
        ],
        "gallery": [
            OY + "1112/ba4a8279-5e16-45e6-9e50-87d370171194.jpg",
            OY + "1141/395fc426-d9c7-491f-a224-d4dba73d6c5e.jpg",
            OY + "1931/c6b5349b-cc40-4b59-a67a-8cca54804554.jpg",
            OY + "1980/70535c44-7cd3-4997-8e7b-3854af7df0e6.png",
        ],
        "detail": [OUJI + f"info/glint-highlighter-{n:02d}.jpg" for n in range(1, 5)],
        "shades": [
            ("#01 Dewy Moon 香檳水光", "8801051274240", "2300", "2", "continue", OUJI + "powder-01.jpg", "76.5"),
            ("#02 Diamond Veil 鑽石光幕", "8801051274257", "2300", "0", "deny", "", "76.5"),
            ("#03 Chrome Baby 珊瑚金光", "8801051274264", "2300", "5", "continue", "", "74.1"),
            ("#05 Pitch Moon 桃粉月光", "8801051257274", "2300", "0", "deny", OUJI + "powder-05.jpg", "76.5"),
            ("#11 Rose Peach 玫瑰蜜桃光", "8809949520981", "2800", "4", "continue", "", "76.5"),
        ],
    },
    {
        "handle": "glint-stick-highlighter",
        "title": "Glint Stick Highlighter 高光棒",
        "type": "高光",
        "tags": TAGS_HL,
        "price": "138",
        "intro": "Glint 高光棒採用獨特三重分層系統，膏體柔滑貼服不黏膩，加入植物油成分，"
                 "妝感水潤細緻，輕抹即透出細緻珍珠光澤。",
        "bullets": [
            "容量：7g／7.8g",
            "妝效：透明水潤亮澤，像細小珍珠藏於肌底，貼膚細緻",
            "用法：直接以棒頭塗抹於需要提亮的位置，再以手指或粉撲輕印暈開",
            "產地：韓國 Made in Korea",
        ],
        "gallery": [
            OMG + "2023/10/Glint-Stick-Highlighter-cover-1.jpg",
            OMG + "2023/10/Glint-Stick-Highlighter-cover-2.jpeg",
            OMG + "2023/10/Glint-Stick-Highlighter-cover-3.jpeg",
            OMG + "2023/10/Glint-Stick-Highlighter-cover-4.jpeg",
        ],
        "detail": [
            OMG + "2023/10/Glint-Stick-Highlighter-detail-1.jpeg",
            OMG + "2023/10/Glint-Stick-Highlighter-detail-3.jpeg",
            OMG + "2023/10/Glint-Stick-Highlighter-detail-5.jpeg",
        ],
        "shades": [
            ("#01 Dewy Moon 香檳水光", "8801051493801", "7000", "0", "deny", "", "83.03"),
            ("#02 Milky Moon 透明乳白月光", "8801051493818", "7000", "2", "continue", "", "83.03"),
            ("#03 Rosy Moon 淡粉玫瑰月光", "8801051285246", "7800", "5", "continue", "", "89.66"),
        ],
    },
    {
        "handle": "glint-baked-blush",
        "title": "Glint Baked Blush 烘焙胭脂",
        "type": "胭脂",
        "tags": TAGS_BL,
        "price": "128",
        "intro": "Glint 烘焙胭脂以烘焙製法壓製，粉體細滑如絲，自然顯色可逐層疊加，"
                 "為雙頰帶來健康紅潤感。",
        "bullets": [
            "妝效：一層薄透自然，可疊加至理想濃度",
            "用法：以胭脂掃沾取適量，由顴骨最高點向太陽穴方向輕掃",
            "質地：粉狀胭脂，貼膚不飛粉",
            "產地：韓國 Made in Korea",
        ],
        "gallery": [
            OMG + "2023/10/Glint-Baked-Blush-cover-1.jpg",
            OMG + "2023/10/Glint-Baked-Blush-cover-2.jpeg",
            OMG + "2023/10/Glint-Baked-Blush-cover-3.jpeg",
            OMG + "2023/10/Glint-Baked-Blush-cover-4.jpeg",
            OMG + "2023/10/Glint-Baked-Blush-cover-5.jpeg",
        ],
        "detail": [
            OMG + f"2023/10/Glint-Baked-Blush-detail-{n}.jpeg" for n in range(1, 5)
        ],
        "shades": [
            ("#04 Tulip On 鬱金香", "8801051285383", "0", "0", "deny", OUJI + "blush-04.jpg", "76.5"),
            ("#05 Strawberry Smoke 草莓煙燻", "8801051285284", "0", "2", "continue", OUJI + "blush-05.jpg", "76.5"),
            ("#07 Pale Lilac 淡紫丁香", "8801051285307", "0", "5", "continue", OUJI + "blush-07.jpg", "76.5"),
        ],
    },
]


def rows_for(p):
    rows = []
    desc = body(p["intro"], p["bullets"], p["detail"])
    # images: gallery first, then any variant swatches that aren't already there
    imgs = list(p["gallery"])
    for _, _, _, _, _, vimg, _ in p["shades"]:
        if vimg and vimg not in imgs:
            imgs.append(vimg)

    for i, (shade, sku, grams, qty, policy, vimg, cost) in enumerate(p["shades"]):
        r = {c: "" for c in COLS}
        r.update({
            "Handle": p["handle"],
            "Option1 Name": "色號",
            "Option1 Value": shade,
            "Variant SKU": sku,
            "Variant Grams": grams,
            "Variant Inventory Tracker": "shopify",
            "Variant Inventory Qty": qty,
            "Variant Inventory Policy": policy,
            "Variant Fulfillment Service": "manual",
            "Variant Price": p["price"],
            "Variant Requires Shipping": "TRUE",
            "Variant Taxable": "TRUE",
            "Variant Barcode": sku,
            "Cost per item": cost,
            "Variant Image": vimg or (p["gallery"][0] if i == 0 else ""),
        })
        if i == 0:
            r.update({
                "Title": p["title"], "Body (HTML)": desc, "Vendor": "Glint",
                "Type": p["type"], "Tags": p["tags"], "Published": "TRUE",
                "Status": "active",
            })
        rows.append(r)

    for pos, url in enumerate(imgs, start=1):
        if pos <= len(rows):
            rows[pos - 1]["Image Src"] = url
            rows[pos - 1]["Image Position"] = str(pos)
            rows[pos - 1]["Image Alt Text"] = p["title"]
        else:
            r = {c: "" for c in COLS}
            r.update({
                "Handle": p["handle"], "Image Src": url,
                "Image Position": str(pos), "Image Alt Text": p["title"],
            })
            rows.append(r)
    return rows


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "glint_shopify.csv"
    all_rows = []
    for p in PRODUCTS:
        rs = rows_for(p)
        all_rows += rs
        print(f"{p['handle']}: {len(p['shades'])} 色號, "
              f"{len(p['gallery'])} 圖庫, {len(p['detail'])} 長介紹圖, {len(rs)} 行")
    with open(out, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=COLS)
        w.writeheader()
        w.writerows(all_rows)
    print(f"\n→ {out}  ({len(all_rows)} 行)")
