#!/usr/bin/env python3
"""
Publish the 11 brands from the 2026-08-14 stock list.

Same pipeline as `build_skincare.py` — sheet gives title/price/stock/cost,
the brand's own store (or an authorised exporter) gives imagery, cost goes
in as `InventoryItem.cost` and never anywhere a shopper can see it.

Two deliberate differences:

  * **imagery and copy join on barcode, not on name.** build_skincare.py
    matched by name because its brands' stores were English against a
    Chinese sheet; here the mapping is decided once, per brand, and
    written down in `data/brands14_images.json` / `data/brands14_copy.json`
    keyed by barcode. A wrong photo on the wrong SKU is worse than no
    photo, and a name match cannot be audited after the fact.

  * **no product is drafted for want of a photo.** These are lines the
    shop physically stocks; a customer standing in front of the shelf
    should be able to find the thing online. Anything with no findable
    image goes up without one and is listed at the end of the run so it
    can be photographed in store.

Copy comes from `data/brands14_copy.json` when the brand's own material
said something real. When it did not, the fallback says only what is
verifiable — what kind of product it is, its size, its brand — rather
than inventing a paragraph.

    python3 scripts/build_brands14.py SOLEP --dry-run
    python3 scripts/build_brands14.py SOLEP
    python3 scripts/build_brands14.py --all
"""
import argparse
import html
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import publish as publish_mod  # noqa: E402
from brands14_data import by_vendor, load  # noqa: E402
from build_skincare import KIND, TAGS_BY_KIND, SET_COST, VARIANTS_OF  # noqa: E402
from mirror_media import mirror  # noqa: E402
from publish import existing_id, publish  # noqa: E402
from shopify_admin import gql, user_errors  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
IMAGES = os.path.join(DATA, "brands14_images.json")
COPY = os.path.join(DATA, "brands14_copy.json")

# The brief names exactly two channels. publish.py's own list also carries
# "Shop", which is right for the makeup range but is not what was asked
# for here — so the channel list is pinned rather than discovered.
CHANNELS = [
    "gid://shopify/Publication/202340466846",   # ouji Headless
    "gid://shopify/Publication/202340335774",   # Online Store
]

# Categories build_skincare.KIND cannot reach, because it was written for a
# range with no colour cosmetics and no ingestibles in it.
EXTRA_KIND = [
    ("定妝噴霧", r"定妝噴霧|定妝?噴|setting (?:spray|mist)|fixer"),
    ("妝前乳", r"妝前|primer|base(?! makeup)"),
    ("美容食品", r"果凍條|飲品|膠原蛋白條|jelly stick"),
]

# KIND reads left to right and 「噴霧」 sits in the 爽膚水 rule, so BOH's
# ampoule-in-a-mist-bottle came out as a toner. These are decided by hand,
# by barcode, because there is no rule that separates 「安瓶精華噴霧」 from
# 「化妝水噴霧」 without knowing the product.
KIND_OVERRIDE = {
    # KIND's 頭髮護理 rule knows 洗髮 and 髮絲 but not 護髮, so an ampoule
    # hair treatment fell through to 精華.
    "8809035144022": "頭髮護理",   # SOLEP 安瓶護髮療程 150ml
    "8809931831392": "頭髮護理",   # HEVEBLUE 洗髮露 500ml
    "8809931831408": "頭髮護理",   # HEVEBLUE 護髮素 300ml
    "8809864756717": "精華",       # BOH 泛醇積雪草安瓶精華噴霧 100ml
    "8809864756700": "面霜",       # BOH 泛醇積雪草乳霜噴霧
    "8803463007201": "防曬",       # VT PDRN 防曬粉餅
    "8803463006518": "唇部護理",   # VT 微針豐唇膏 初階版
    "8803463006501": "唇部護理",   # VT 微針豐唇膏 專業版
    "8809931831101": "美容食品",   # HEVEBLUE 膠原蛋白果凍條
    "8809835060386": "潔面",       # TOCOBO 礦物粉卸妝油 10 包裝
}

# Where a makeup-side product has to land in the site nav. Everything else
# takes TAGS_BY_KIND, which is skincare-shaped.
EXTRA_TAGS = {
    "定妝噴霧": "makeup, 彩妝, 底妝, base makeup, 定妝噴霧",
    "妝前乳": "makeup, 彩妝, 底妝, base makeup, 妝前乳",
    "美容食品": "inner beauty, 美容食品, 生活",
}
# Kinds that are not skincare, so must not get the blanket 護膚 tag.
NOT_SKINCARE = {"定妝噴霧", "妝前乳", "美容食品", "頭髮護理", "身體護理"}


def kind_of(row):
    if row["barcode"] in KIND_OVERRIDE:
        return KIND_OVERRIDE[row["barcode"]]
    for name, rx in EXTRA_KIND:
        if re.search(rx, row["title"], re.I):
            return name
    for name, rx in KIND:
        if re.search(rx, row["title"], re.I):
            return name
    return "護膚"


def tags_for(kind, vendor):
    base = EXTRA_TAGS.get(kind) or ("護膚, skincare, K-Beauty, "
                                    + TAGS_BY_KIND.get(kind, ""))
    if kind in NOT_SKINCARE and kind not in EXTRA_TAGS:
        base = "K-Beauty, " + TAGS_BY_KIND.get(kind, "")
    if kind in EXTRA_TAGS:
        base = "K-Beauty, " + base
    return [t.strip() for t in f"{base}, {vendor}".split(",") if t.strip()]


def handle_of(vendor, title, barcode):
    base = re.sub(r"[^a-z0-9]+", "-", f"{vendor} {title}".lower()).strip("-")[:60]
    return f"{base}-{barcode[-4:]}" if base else f"sku-{barcode}"


# What a category is for, in one line, when the brand told us nothing. Kept
# short on purpose: an honest sentence beats an invented paragraph.
GENERIC = {
    "防曬": "日常防曬，出門前搽。",
    "面膜": "急救補水嗰一步，敷完即刻見到分別。",
    "棉片": "一片做齊清潔同上水，唔使倒唔使等。",
    "潔面": "洗走油同污垢，洗完唔應該覺得繃緊。",
    "爽膚水": "洗完第一層水，皮膚濕住嘅時候，跟住搽落去嘅嘢先入到。",
    "精華": "一套護膚入面濃度最高、真正做嘢嗰支。",
    "眼霜": "眼周皮膚厚度只有面部三分一，所以要獨立一支。",
    "面霜": "最後一步鎖住前面搽落去嘅嘢，唔鎖就蒸發走。",
    "乳液": "同面霜一樣係鎖水，但質地薄啲，油肌夏天啱用。",
    "唇部護理": "唇部本身冇皮脂腺，乾就要靠外力補返。",
    "身體護理": "沖完涼三分鐘內搽，鎖水效果最好。",
    "頭髮護理": "頭皮都係皮膚，一樣會出油、一樣會敏感。",
    "局部護理": "邊度出事搽邊度，唔使成面孭住高濃度成分。",
    "美容工具": "工具唔會改善皮膚本身，佢令你手上嗰啲產品用得順手啲。",
    "套裝": "同一條線嘅產品一齊用，質地同成分先唔會打交。",
    "定妝噴霧": "化好妝之後噴一層，減少甩妝同脫粉。",
    "妝前乳": "上底妝之前嗰一層，處理質地同貼服度。",
    "美容食品": "食嘅，唔係搽嘅。",
    "護膚": "韓國護膚品，由品牌官方渠道入貨，逐件對條碼上架。",
}


def esc(s):
    return html.escape(str(s), quote=False)


def body(row, kind, copy):
    """Description HTML in the store's existing shape: a lead paragraph,
    then 優點 / 用法 / 主要成分 only where the source actually said so."""
    out = []
    lead = (copy or {}).get("intro") or GENERIC.get(kind, GENERIC["護膚"])
    out.append(f"<p>{esc(lead)}</p>")

    for head, key in (("優點", "benefits"), ("主要成分", "ingredients")):
        items = (copy or {}).get(key) or []
        if items:
            lis = "".join(f"<li>{esc(i)}</li>" for i in items)
            out.append(f"<h3>{head}</h3><ul>{lis}</ul>")
        if key == "benefits" and (copy or {}).get("usage"):
            out.append(f'<h3>用法</h3><p>{esc(copy["usage"])}</p>')

    specs = []
    if row["size"]:
        specs.append(f'容量／規格：{row["size"]}')
    specs.append(f'品牌：{row["vendor"]}')
    out.append("<ul>" + "".join(f"<li>{esc(s)}</li>" for s in specs) + "</ul>")
    return "".join(out)


# Words the shop does not put on a product page, whatever the source said.
BANNED = re.compile(r"治療|療效|根治|患處|消炎|醫治|藥用|抗炎")


def check_no_claims(barcode, text):
    hit = BANNED.search(text)
    if hit:
        raise SystemExit(f"{barcode}: 描述有唔可以用嘅字「{hit.group()}」")


def set_cost(handle, row):
    """Cost lives on the inventory item — admin-only — and only exists once
    the product has been created."""
    if not row["cost"]:
        return
    pid = existing_id(handle)
    if not pid:
        return
    for e in gql(VARIANTS_OF, {"id": pid})["product"]["variants"]["edges"]:
        if (e["node"]["barcode"] or "").strip() != row["barcode"]:
            continue
        out = gql(SET_COST, {"id": e["node"]["inventoryItem"]["id"],
                             "input": {"cost": f'{row["cost"]:.2f}'}})
        user_errors(out, "inventoryItemUpdate")


def load_json(path):
    if not os.path.exists(path):
        return {}
    with open(path) as f:
        return json.load(f)


def run(brand, rows, images, copies, dry_run):
    made, noimg, skipped = [], [], []
    for r in sorted(rows, key=lambda x: x["title"]):
        if not r["price"]:
            skipped.append((r, "冇售價"))
            continue
        kind = kind_of(r)
        copy = copies.get(r["barcode"])
        desc = body(r, kind, copy)
        check_no_claims(r["barcode"], desc + r["title"])
        # Cost must never leave the admin side. Belt and braces: the copy is
        # generated from the row, so assert the number is not in it.
        if r["cost"] and str(int(r["cost"])) in re.sub(r"<[^>]+>", "", desc):
            raise SystemExit(f'{r["barcode"]}: 成本價數字漏咗入描述')
        srcs = [u for u in dict.fromkeys(images.get(r["barcode"]) or []) if u][:12]
        handle = handle_of(brand, r["title"], r["barcode"])
        # Shopify is never asked to fetch these — see mirror_media.py. On a
        # dry run nothing is downloaded, so the count shown is of sources.
        imgs = srcs if dry_run else mirror(srcs, handle)

        item = {
            "handle": handle,
            "title": r["title"], "vendor": brand, "productType": kind,
            "descriptionHtml": desc, "tags": tags_for(kind, brand),
            "status": "ACTIVE", "option_name": "規格", "price": r["price"],
            "images": imgs,
            "shades": [{"name": r["size"] or "單一規格",
                        "barcode": r["barcode"], "qty": r["qty"]}],
        }
        flag = "" if imgs else "   ← 冇圖"
        src = "抄" if copy else "  "
        print(f'{r["qty"]:>3} 件  {len(imgs):>2} 圖 {src}  {kind:<5}'
              f'{r["title"][:44]}{flag}')
        (made if imgs else noimg).append(r)
        if dry_run:
            continue
        publish(item)
        set_cost(handle, r)
    return made, noimg, skipped


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("brand", nargs="?")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    # Pin the sales channels rather than letting publish.py discover them.
    publish_mod._channels = CHANNELS

    groups = by_vendor(load())
    wanted = sorted(groups, key=lambda b: len(groups[b])) if args.all \
        else [args.brand]
    images, copies = load_json(IMAGES), load_json(COPY)

    total_img = total_noimg = 0
    all_noimg = []
    for brand in wanted:
        rows = groups.get(brand)
        if not rows:
            raise SystemExit(f"{brand}: 個 sheet 入面搵唔到")
        print(f"\n=== {brand} ({len(rows)} 件) ===")
        made, noimg, skipped = run(brand, rows, images, copies, args.dry_run)
        total_img += len(made)
        total_noimg += len(noimg)
        all_noimg += [(brand, r) for r in noimg]
        for r, why in skipped:
            print(f'  ⚠️  {why}，跳過：{r["barcode"]}')

    print(f'\n合共 {total_img + total_noimg} 件'
          f'（{total_img} 件有圖、{total_noimg} 件冇圖）'
          + ("（dry run）" if args.dry_run else ""))
    if all_noimg:
        print("\n要喺舖頭影相：")
        for b, r in all_noimg:
            print(f'  {b:<16}{r["barcode"]}  {r["title"]}')


if __name__ == "__main__":
    main()
