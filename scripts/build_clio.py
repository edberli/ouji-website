#!/usr/bin/env python3
"""
Build and publish the CLIO range.

Titles, shades, prices and stock come from OUR supplier list — CLIO's HK
distributor carries different editions and a wider line-up than we
actually stock, so their product names cannot be trusted to describe the
box we ship. What we do take from clio.com.hk is the imagery and the
Traditional Chinese body copy (awards and feature ticks), which is
already written for a Hong Kong shopper and needs no translating. Their
shade lists are dropped for the same reason as their titles.

    python3 scripts/build_clio.py mirror     # pull + optimise imagery
    python3 scripts/build_clio.py publish    # push to Shopify
    python3 scripts/build_clio.py publish --dry-run
"""
import argparse
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fetch_clio_hk as clio  # noqa: E402
from publish import publish  # noqa: E402

BASE = "https://oujikbeauty.com/brands/clio"
VENDOR = "CLIO"

T_BASE = "CLIO, K-Beauty, 彩妝, 底妝, makeup, base"
T_EYE = "CLIO, K-Beauty, 彩妝, 眼妝, makeup, eye"
T_LIP = "CLIO, K-Beauty, 彩妝, 唇妝, makeup, lip"
T_CHEEK = "CLIO, K-Beauty, 彩妝, 修容, makeup, cheek"

# slug: (our title, productType, tags, price, clio.com.hk page, [(shade, barcode, qty)])
# page = None -> nothing on the HK site; ships as a draft until we source art
PRODUCTS = {
    "clio-crystal-glam-tint": (
        "CLIO Crystal Glam Tint 晶透水光唇釉", "唇釉", T_LIP + ", liptint", 138, "125439", [
            ("01 Vintage Apple", "8809900987501", 6),
            ("05 Fresh Cherry", "8809900987549", 5),
            ("06 Daily Mauve", "8809900987556", 4),
            ("11 Mellow Fig", "8809937593515", 5),
            ("19 Baby Apple", "8800255687399", 5),
            ("20 Vanilla Apple", "8800255687832", 5),
            ("27 Honey Cherry", "8800290369519", 6),
            ("28 Dry Cherry", "8800290369502", 5),
        ]),
    "clio-kill-cover-founwear-cushion": (
        "CLIO 極致持妝無瑕氣墊粉底 附補充裝 SPF40+ PA++", "氣墊粉底", T_BASE + ", cushion", 269, "64505", [
            ("21C 亮膚色", "8800290368062", 2),
            ("21N 象牙色", "8800290368055", 5),
            ("23N 自然色", "8800290368048", 5),
        ]),
    "clio-kill-cover-skin-fixer-cushion": (
        "CLIO 柔霧遮瑕氣墊粉底 附補充裝 SPF40+ PA++", "氣墊粉底", T_BASE + ", cushion", 269, "290058", [
            ("21C 亮膚色", "8800290365542", 5),
            ("21N 象牙色", "8800290365559", 4),
            ("23N 自然色", "8800290365566", 3),
        ]),
    "clio-kill-cover-high-glow-cushion": (
        "CLIO 網光亮肌精華氣墊粉底 附補充裝 SPF50+ PA+++", "氣墊粉底", T_BASE + ", cushion", 269, "166886", [
            ("21C 亮膚色", "8800255688846", 0),
            ("21N 象牙色", "8800255688839", 3),
            ("23N 自然色", "8800255688822", 2),
        ]),
    # 8809937598411 arrived from the supplier labelled as mascara "02 濃密纖長";
    # the barcode is a brow pencil, and the box is what ships.
    "clio-kill-brow-auto-hard-pencil": (
        "CLIO 自動塑形眉筆連削筆器", "眉筆", T_EYE + ", brow", 155, "58616", [
            ("01 Natural Brown 自然棕", "8809937598404", 4),
            ("02 Light Brown 淺棕", "8809937598411", 4),
            ("05 Gray Brown 灰棕", "8809937598442", 4),
        ]),
    # Likewise 8800255687276 is #20 Bouncy Lash, not the "02 濃密纖長" on the list.
    "clio-kill-lash-superproof-mascara": (
        "CLIO 極緻捲翹超防水睫毛膏", "睫毛膏", T_EYE + ", mascara", 138, "49476", [
            ("01 Long Curling 纖長捲翹", "8809598299719", 3),
            ("20 Bouncy Lash 彈力捲翹", "8800255687276", 5),
        ]),
    "clio-superproof-brush-liner": (
        "CLIO 魅黑高效防水眼線液", "眼線", T_EYE + ", eyeliner", 138, "46922", [
            ("01 極黑", "8809691975763", 4),
            ("02 極棕", "8809691975770", 4),
        ]),
    "clio-sharp-so-simple-pencil-liner": (
        "CLIO 簡易利落極細防水眼線筆", "眼線", T_EYE + ", eyeliner", 85, "281408", [
            ("01 黑色", "8809937599814", 6),
            ("002", "8809937599821", 3),
            ("003", "8809937599838", 4),
            ("04 深棕色", "8809937599845", 4),
            ("005", "8809937599852", 5),
            ("06 香草米色", "8809937599869", 4),
            ("007", "8809937599876", 6),
        ]),
    "clio-sharp-so-simple-pen-liner": (
        "CLIO 簡易利落極細防水眼線液", "眼線", T_EYE + ", eyeliner", 99, "71085", [
            ("01 黑", "8809644496000", 8),
            ("02 啡", "8809644496017", 10),
        ]),
    "clio-pro-single-shadow": (
        "CLIO 柔和順滑眼影筆", "眼影", T_EYE + ", eyeshadow", 130, "158039", [
            ("M201 柔和紫色", "8800255688334", 4),
            ("M202 柔暖灰棕色", "8800255688327", 3),
            ("M301 拿鐵棕色", "8800255688310", 8),
            ("S101 牡丹粉色", "8800255688372", 5),
            ("S102 粉蜜桃色", "8800255688365", 5),
            ("G301 閃耀海洋色", "8800290360370", 5),
        ]),
    "clio-pro-eye-palette-stardust": (
        "CLIO 星沙12色眼影盤", "眼影", T_EYE + ", eyeshadow, palette", 260, "158061", [
            ("02 Rose Connect", "8809900989291", 0),
        ]),
    "clio-pro-eye-palette-light": (
        "CLIO 輕盈12色眼影盤", "眼影", T_EYE + ", eyeshadow, palette", 260, "155527", [
            ("03 燕麥奶茶", "8809900989307", 4),
        ]),
    # Not on clio.com.hk at all — published as drafts until we source art.
    "clio-essential-blush-tap": (
        "CLIO Essential Blush Tap 胭脂", "胭脂", T_CHEEK + ", blush", 138, None, [
            ("M101 Fluffy Peach", "8800255687665", 1),
            ("M102 Chiffon Pink", "8800255687658", 4),
            ("S201 Coral Posy", "8800255687627", 5),
            ("S202 Almond Rose", "8800255687610", 4),
        ]),
    "clio-waterproof-brush-liner": (
        "CLIO 超強防水眼線液", "眼線", T_EYE + ", eyeliner", 115, None, [
            ("01 黑色", "8809786590628", 4),
            ("02 啡色", "8809786590635", 3),
        ]),
}

AWARD = re.compile(r"[🏆⭐]")


def description(slug, pid, title):
    """Awards, then CLIO's own feature ticks, then the mirrored strips."""
    lines = clio.copy_lines(pid) if pid else []
    awards, ticks, rest = [], [], []
    for ln in lines:
        clean = ln.strip("．・ ").strip()
        if not clean or clean in {"🏆", "⭐"}:
            continue
        if clean.startswith("✓"):
            ticks.append(clean.lstrip("✓ ").strip())
        elif AWARD.search(clean) or "第一名" in clean or "第" in clean and "名" in clean:
            awards.append(AWARD.sub("", clean).strip())
        else:
            rest.append(clean)

    h = []
    if ticks:
        h.append("<ul>" + "".join(f"<li>{t}</li>" for t in ticks) + "</ul>")
    for r in rest:
        h.append(f"<p>{r}</p>")
    if awards:
        h.append("<p><strong>得獎紀錄</strong></p><ul>"
                 + "".join(f"<li>{a}</li>" for a in awards) + "</ul>")
    h.append("<ul><li>產地：韓國 Made in Korea</li></ul>")

    strips = detail_urls(slug)
    if strips:
        h.append('<div class="product-detail-images">'
                 + "".join(f'<img src="{u}" alt="{title} 產品介紹" loading="lazy">' for u in strips)
                 + "</div>")
    return "".join(h)


def files_in(group, slug):
    d = os.path.join("brands", "clio", group)
    if not os.path.isdir(d):
        return []
    return sorted(n for n in os.listdir(d)
                  if re.fullmatch(re.escape(slug) + r"-\d+\.jpg", n))


def gallery_urls(slug):
    return [f"{BASE}/gallery/{n}" for n in files_in("gallery", slug)]


def detail_urls(slug):
    return [f"{BASE}/detail/{n}" for n in files_in("detail", slug)]


def mirror():
    for slug, (_, _, _, _, pid, _) in PRODUCTS.items():
        if not pid:
            print(f"\n{slug}: 官網冇呢件貨，跳過")
            continue
        print(f"\n{slug}  <- clio.com.hk/product/{pid}")
        clio.fetch(pid, slug)
    subprocess.run([sys.executable, "scripts/optimise_brand_images.py", "brands/clio"], check=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["mirror", "publish"])
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if args.cmd == "mirror":
        return mirror()

    for slug, (title, ptype, tags, price, pid, shades) in PRODUCTS.items():
        images = gallery_urls(slug)
        draft = not pid or not images
        p = {
            "handle": slug,
            "title": title,
            "descriptionHtml": description(slug, pid, title),
            "vendor": VENDOR,
            "productType": ptype,
            "tags": [t.strip() for t in tags.split(",")],
            "status": "DRAFT" if draft else "ACTIVE",
            "option_name": "色號",
            "price": price,
            "images": images,
            "shades": [{"name": n, "barcode": b, "qty": q} for n, b, q in shades],
        }
        flag = "  [草稿：冇官方圖]" if draft else ""
        print(f"{len(shades):>2} 色  {len(images):>2} 圖  {len(detail_urls(slug)):>2} 長圖  {title}{flag}")
        if not args.dry_run:
            r = publish(p)
            print(f"        -> {r['handle']}  {r['variants']} variants, {r['media']} media, {r['channels']} channels")


if __name__ == "__main__":
    main()
