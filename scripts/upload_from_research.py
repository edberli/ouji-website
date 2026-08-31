#!/usr/bin/env python3
"""把 agent 搵返嚟嘅資料，變成真正上架嘅產品。

Agent 只負責搵：條碼 → 正名、品牌、圖片 URL。佢哋唔准直接開產品 ——
實測過太多次，交返嚟嘅「產品相」其實係促銷橫額、模特兒相、×3 多件裝、
甚至空白圖。所以中間硬性插一步：**我自己睇過張 contact sheet 先上**。

    # 1. 落圖、篩走明顯唔啱嘅、砌 contact sheet
    python3 scripts/upload_from_research.py --tag zy --sheet

    # 2. 我睇完 sheet，剔走唔要嘅
    python3 scripts/upload_from_research.py --tag zy --drop 8809xxxx,8809yyyy --apply

價錢、成本、庫存一律以 POS 為準；agent 嗰邊只攞名同相。
"""
import argparse
import csv
import json
import os
import re
import sys
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).parent))
from shopify_admin import gql, user_errors  # noqa: E402
from upload_files import upload, host as host_files  # noqa: E402
from bulk_upload import (FIND, CREATE, VUP, QTY, MEDIA, PUBLISH, ACTIVATE,  # noqa: E402
                         LOCATION, PUBS, priced)

SCRATCH = Path("/private/tmp/claude-501/-Users-winstonli-Documents/"
               "b509ca2a-6150-4200-819f-038b13b6c9d8/scratchpad")
WORK = Path("/Volumes/core/ouji-ads/research")
POS = Path("/Volumes/core/ouji-pos/raw/Ouji_KT_skus_prince.csv")

# 圖太窄／太扁多數係詳情長條或者橫額，唔係產品相。
MIN_SIDE, MIN_BYTES = 400, 4000
RATIO_LO, RATIO_HI = 0.35, 2.8


def pos_rows():
    out = {}
    for r in csv.DictReader(open(POS, encoding="utf-8-sig")):
        b = (r.get("barcode") or "").strip()
        if b:
            out[b] = r
    return out


def grab(url, dest):
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0", "Referer": "https://www.google.com/"})
    data = urllib.request.urlopen(req, timeout=40).read()
    if len(data) < MIN_BYTES:
        raise ValueError(f"太細 {len(data)}B")
    dest.write_bytes(data)
    return dest


# Shopify 收唔到超過 20 百萬像素或者 20MB 嘅圖，直接彈錯。
MAX_MP, MAX_MB = 20_000_000, 20_000_000


def shrink(path):
    """太大張就縮細，順手把透明底鋪返白。

    ⚠️ HETRAS 兩張官方護手霜圖係 3976×5964＝23.7 百萬像素，超過 Shopify
    嘅 20MP 上限 —— 唔縮就上唔到，而且錯誤訊息係喺 media 那一步先出，
    件產品已經開咗，收拾起嚟好煩。所以喺上載之前就處理好。
    透明底一併鋪白：Shopify 出縮圖嗰陣唔保證背景，鋪咗白就唔會有意外。
    """
    if os.path.getsize(path) <= MAX_MB:
        with Image.open(path) as im:
            if im.size[0] * im.size[1] <= MAX_MP and im.mode not in ("RGBA", "LA"):
                return path
    with Image.open(path) as im:
        out = flatten(im)
        w, h = out.size
        if w * h > MAX_MP:
            k = (MAX_MP / (w * h)) ** 0.5
            out = out.resize((int(w * k), int(h * k)), Image.LANCZOS)
        dest = os.path.splitext(path)[0] + "-fit.jpg"
        out.save(dest, "JPEG", quality=90)
    return dest


def flatten(im):
    """透明 PNG 要用白底合埋，唔可以直接 convert('RGB')。

    ⚠️ 之前直接 convert，透明嗰忽會變**黑色**。HETRAS 兩支護手霜嘅官方
    圖係 RGBA，喺 contact sheet 度就變咗左下角一嚿黑，我差啲當佢係
    爛圖剔走 —— 其實原檔乾乾淨淨。判圖之前一定要先鋪白底，否則我睇到
    嘅根本唔係客會睇到嗰張。
    """
    if im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info):
        rgba = im.convert("RGBA")
        bg = Image.new("RGBA", rgba.size, (255, 255, 255, 255))
        return Image.alpha_composite(bg, rgba).convert("RGB")
    return im.convert("RGB")


def usable(path):
    """明顯唔係產品相嘅，喺我睇之前先隔一層。"""
    try:
        with Image.open(path) as im:
            w, h = im.size
    except Exception as e:
        return None, f"開唔到（{e}）"
    if min(w, h) < MIN_SIDE:
        return None, f"太細 {w}×{h}"
    r = w / h
    if not (RATIO_LO <= r <= RATIO_HI):
        return None, f"比例怪 {w}×{h}（詳情長條／橫額）"
    return (w, h), ""


def load_research(tag):
    items, seen = [], set()
    for f in sorted(SCRATCH.glob(f"{tag}_*_out.json")):
        try:
            data = json.loads(f.read_text())
        except Exception as e:
            print(f"  ⚠️  {f.name} 讀唔到：{e}")
            continue
        for x in data:
            bc = str(x.get("bc", "")).strip()
            if not bc or bc in seen or not x.get("found"):
                continue
            seen.add(bc)
            items.append(x)
    return items


def sheet(tag, drop):
    pos = pos_rows()
    items = load_research(tag)
    root = WORK / tag
    (root / "img").mkdir(parents=True, exist_ok=True)
    plan, tiles = [], []
    for x in items:
        bc = str(x["bc"]).strip()
        if bc in drop:
            continue
        r = pos.get(bc)
        if not r:
            print(f"  ⚠️  POS 冇 {bc} —— 跳過")
            continue
        if gql(FIND, {"q": f"barcode:{bc}"})["products"]["nodes"]:
            print(f"  · {bc} 已經上咗線")
            continue
        files = []
        for i, u in enumerate(x.get("images") or [], 1):
            dest = root / "img" / f"{bc}-{i:02d}{os.path.splitext(u.split('?')[0])[1][:5] or '.jpg'}"
            try:
                if not dest.exists():
                    grab(u, dest)
            except Exception as e:
                print(f"  ✗ {bc} 圖 {i} 攞唔到：{e}")
                continue
            size, why = usable(dest)
            if not size:
                print(f"  – {bc} 圖 {i} 隔走：{why}")
                dest.unlink(missing_ok=True)
                continue
            files.append(str(dest))
        if not files:
            print(f"  ✗ {bc} 冇一張圖用得 —— {x.get('title','')[:34]}")
            continue
        plan.append({"bc": bc, "title": x.get("title") or r["name"],
                     "brand": x.get("brand", ""), "files": files,
                     "source": x.get("source", ""), "note": x.get("note", ""),
                     "confidence": x.get("confidence", "")})
        tiles.append((bc, x.get("title") or r["name"], files[0]))

    (root / "plan.json").write_text(json.dumps(plan, ensure_ascii=False, indent=1))
    # Contact sheet：每格一件貨嘅頭張相 + 條碼尾 4 位，方便我指名剔走。
    C, COLS = 260, 8
    for pg in range(0, len(tiles), COLS * 5):
        chunk = tiles[pg:pg + COLS * 5]
        rows = (len(chunk) + COLS - 1) // COLS
        canvas = Image.new("RGB", (C * COLS, (C + 26) * rows), "white")
        d = ImageDraw.Draw(canvas)
        for i, (bc, title, f) in enumerate(chunk):
            try:
                im = flatten(Image.open(f))
            except Exception:
                continue
            im.thumbnail((C - 8, C - 8))
            x0 = (i % COLS) * C + (C - im.width) // 2
            y0 = (i // COLS) * (C + 26) + (C - im.height) // 2
            canvas.paste(im, (x0, y0))
            d.text(((i % COLS) * C + 4, (i // COLS) * (C + 26) + C + 6),
                   f"{pg+i+1}. …{bc[-5:]} {title[:22]}", fill="black")
        out = root / f"sheet-{pg // (COLS*5) + 1:02d}.jpg"
        canvas.save(out, quality=82)
        print(f"  contact sheet → {out}")
    print(f"\n{len(plan)} 件準備好（{sum(len(p['files']) for p in plan)} 張圖）。"
          f"\n睇完 sheet 之後：--drop <條碼,條碼> --apply")


def apply(tag, drop, limit):
    pos = pos_rows()
    plan = json.loads((WORK / tag / "plan.json").read_text())
    made = 0
    for p in plan:
        if limit and made >= limit:
            break
        bc = p["bc"]
        if bc in drop:
            print(f"  – 剔走 {bc} {p['title'][:34]}")
            continue
        if gql(FIND, {"q": f"barcode:{bc}"})["products"]["nodes"]:
            continue
        r = pos[bc]
        cost = float(r.get("unit_cost") or 0)
        price, bumped = priced(float(r["unit_price"]), cost)
        qty = max(int(float(r.get("stock_qty") or 0)), 0)
        d = gql(CREATE, {"p": {
            "title": p["title"].strip(),
            "vendor": (p.get("brand") or "").strip() or "OUJI",
            "productType": (r.get("category") or "").strip() or "護膚",
            "status": "DRAFT",
            "tags": ["K-Beauty", "自動上架"] + ([p["brand"]] if p.get("brand") else []),
        }})
        user_errors(d, "productCreate")
        prod = d["productCreate"]["product"]
        v = prod["variants"]["nodes"][0]
        user_errors(gql(VUP, {"pid": prod["id"], "v": [{
            "id": v["id"], "barcode": bc, "price": f"{price:.2f}",
            "inventoryItem": {"sku": bc, "tracked": True, "cost": f"{cost:.2f}"}}]}),
            "productVariantsBulkUpdate")
        user_errors(gql(QTY, {"in": {"name": "available", "reason": "correction",
                                     "ignoreCompareQuantity": True,
                                     "quantities": [{"inventoryItemId": v["inventoryItem"]["id"],
                                                     "locationId": LOCATION,
                                                     "quantity": qty}]}}),
                    "inventorySetQuantities")
        urls = [upload(shrink(f)) for f in p["files"][:8]]
        gql(MEDIA, {"id": prod["id"], "m": [{"originalSource": u, "mediaContentType": "IMAGE",
                                             "alt": p["title"].strip()} for u in urls]})
        strips = "".join(f'<img src="{u}" alt="" loading="lazy">'
                         for u in host_files([shrink(f) for f in p["files"][1:6]],
                                             alt=p["title"].strip()) if u)
        desc = f"<p>{p['title'].strip()}</p>"
        if strips:
            desc += f'<div class="product-detail-images">{strips}</div>'
        user_errors(gql(ACTIVATE, {"id": prod["id"], "d": desc}), "productUpdate")
        user_errors(gql(PUBLISH, {"id": prod["id"],
                                  "in": [{"publicationId": x} for x in PUBS]}),
                    "publishablePublish")
        made += 1
        print(f"  ✓ {p['title'][:42]:<44} ${price:.0f}"
              f"{'（加咗價）' if bumped else ''} 存{qty} 圖{len(urls)}")
    print(f"\n上咗 {made} 件。")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tag", required=True, help="agent 輸出檔嘅前綴，例如 zy")
    ap.add_argument("--sheet", action="store_true")
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--drop", default="", help="唔要嘅條碼，逗號分隔")
    ap.add_argument("--limit", type=int, default=0)
    a = ap.parse_args()
    drop = {x.strip() for x in a.drop.split(",") if x.strip()}
    if a.sheet:
        sheet(a.tag, drop)
    if a.apply:
        apply(a.tag, drop, a.limit)
    if not (a.sheet or a.apply):
        print("要加 --sheet 或者 --apply")


if __name__ == "__main__":
    main()
