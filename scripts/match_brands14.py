#!/usr/bin/env python3
"""
Join the 2026-08-14 stock sheet to a fetched store catalogue, by name.

The sheet has barcodes; no storefront publishes them. So the join is by
name, once per brand, cached in /tmp/skin/matched.json — the same file and
the same {barcode, index} shape build_skincare / attach_skincare_detail
already read, so nothing downstream needs a special case.

Two of the sources speak our language and one does not:

  * ohmyglow.co is a Hong Kong shop, so its titles are already Traditional
    Chinese. Chinese-to-Chinese bigram overlap on those is decisive.
  * the brands' own Korean sites are not, so the same score means much less
    there and the run only proposes; a human still reads the list.

Guards, in the order they fire — a wrong photo on a page is worse than no
photo, so each of these drops a pair rather than downgrading it:

  1. size must agree when both sides state one (50ml is not 100ml)
  2. dosage form must agree (a sun stick is not a sun lotion)
  3. a "set / kit / duo" on one side must be one on the other

    python3 scripts/match_brands14.py "SUNGBOON EDITOR"        # 睇下配到乜
    python3 scripts/match_brands14.py "SUNGBOON EDITOR" --write
"""
import argparse
import json
import os
import re
import sys
import unicodedata

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from brands14_data import by_vendor, load  # noqa: E402

STORES = "/tmp/skin/stores.json"
MATCHED = "/tmp/skin/matched.json"
IMAGES = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                      "data", "brands14_images.json")

# 中文 / 韓文 / 英文，同一個劑型嘅講法。兩邊都講得出劑型而唔同 → 唔配。
FORM = [
    ("stick",  ["棒"],                 ["선스틱", "스틱", "stick"]),
    ("cushion", ["氣墊", "粉餅"],       ["쿠션", "팩트", "cushion", "pact"]),
    ("oil",    ["油"],                 ["오일", "oil"]),
    ("balm",   ["膏", "唇膏"],          ["밤", "balm"]),
    ("foam",   ["泡沫", "泡"],          ["폼", "foam"]),
    ("cleanser", ["潔面", "洗面", "啫喱", "洗顏"], ["클렌저", "클렌징", "cleanser", "cleansing", "wash", "gel cleanser"]),
    ("water",  ["卸妝水"],              ["클렌징워터", "cleansing water"]),
    ("powder", ["粉末", "粉洗"],        ["파우더", "powder"]),
    ("serum",  ["精華液", "精華", "安瓶"], ["세럼", "앰플", "에센스", "serum", "ampoule", "essence"]),
    ("cream",  ["霜", "乳霜"],          ["크림", "cream"]),
    ("lotion", ["乳液", "乳"],          ["로션", "에멀젼", "lotion", "emulsion"]),
    ("toner",  ["爽膚水", "化妝水", "調理水"], ["토너", "스킨", "toner"]),
    ("pad",    ["棉片", "化妝棉"],      ["패드", "pad"]),
    ("mask",   ["面膜"],               ["마스크", "팩", "mask", "pack"]),
    # 定妝噴霧喺韓牌度叫 fixer / FIXX，唔叫 spray。唔加呢幾個字，
    # So Natural 成條定妝線都會當「劑型唔夾」丟晒。
    ("mist",   ["噴霧", "定妝"],        ["미스트", "스프레이", "픽서", "mist", "spray", "fixer", "fixx", "setting"]),
    ("soap",   ["皂"],                 ["솝", "비누", "soap", "bar"]),
    ("shampoo", ["洗髮"],              ["샴푸", "shampoo"]),
    ("set",    ["套裝", "組合"],        ["키트", "세트", "듀오", "트리오", "3종", "set", "kit", "duo", "trio"]),
]


def norm(s):
    s = unicodedata.normalize("NFKC", str(s or "")).lower()
    return re.sub(r"[^a-z0-9가-힣一-鿿]+", "", s)


def sizes(s):
    t = unicodedata.normalize("NFKC", str(s or "")).lower()
    out = set()
    for m in re.finditer(r"(\d+(?:\.\d+)?)\s*(ml|g|매|片|ea|개)", t):
        out.add("%g%s" % (float(m.group(1)), "ea" if m.group(2) in ("매", "片", "개") else m.group(2)))
    return out


# 系列／成分。我哋寫住 A，人哋張相寫住 B，就一定唔係同一件貨。
SERIES = {
    "bifida": ["bifida", "비피다"], "galactomy": ["galac", "갈락", "酵母"],
    "panthenol": ["panthe", "판테"],
    "herbgreen": ["herbgreen", "herb green", "허브그린", "草本", "綠色卸妝"],
    "pure": ["pure clean", "퓨어", "純淨"], "cica": ["cica", "시카", "積雪草"],
    "collagen": ["collagen", "콜라겐", "膠原"], "tomato": ["tomato", "토마토", "番茄", "蕃茄"],
    "silk": ["silk pep", "실크", "絲蛋白"], "kojic": ["kojic", "코직"],
    "vita": ["vita", "비타", "維他命"], "niacin": ["niacin", "나이아신", "煙醯胺", "煙酰胺"],
}


def series_clash(zh, other):
    """兩邊各自睇得出係邊個系列，而且唔同 → 唔配。"""
    a = norm(zh); b = norm(other)
    ours = {k for k, ws in SERIES.items() if any(norm(w) in a for w in ws)}
    theirs = {k for k, ws in SERIES.items() if any(norm(w) in b for w in ws)}
    return bool(ours) and bool(theirs) and not (ours & theirs)


def forms(zh, other):
    ours = {k for k, z, _ in FORM if any(w in zh for w in z)}
    theirs = {k for k, _, o in FORM if any(w in norm(other) for w in [norm(x) for x in o])}
    return ours, theirs


def bigrams(s):
    n = norm(s)
    return {n[i:i + 2] for i in range(len(n) - 1)}


def sim(a, b):
    A, B = bigrams(a), bigrams(b)
    if not A or not B:
        return 0.0
    return len(A & B) / min(len(A), len(B))


def rank(row, cands):
    out = []
    for i, c in enumerate(cands):
        so, st = sizes(row["title"]), sizes(c["title"])
        if so and st and not (so & st):
            continue
        fo, ft = forms(row["title"], c["title"])
        if fo and ft and not (fo & ft):
            continue
        if series_clash(row["title"], c["title"]):
            continue
        # 一邊係套裝另一邊唔係，兩件唔同貨
        if ("set" in fo) != ("set" in ft) and (fo or ft):
            continue
        s = sim(row["title"], c["title"])
        if so & st:
            s += 0.25
        if fo & ft:
            s += 0.15
        out.append((round(s, 3), i, c))
    out.sort(key=lambda x: -x[0])
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("brand")
    ap.add_argument("--key", help="stores.json 個 key，如果同品牌名唔同")
    ap.add_argument("--min", type=float, default=0.45, help="低過呢個分就唔當配到")
    ap.add_argument("--write", action="store_true")
    a = ap.parse_args()
    key = a.key or a.brand

    ours = by_vendor(load()).get(a.brand, [])
    cands = json.load(open(STORES)).get(key, [])
    if not ours:
        raise SystemExit(f"{a.brand}: 張單冇呢個牌子")
    if not cands:
        raise SystemExit(f"{key}: stores.json 冇呢個牌子")

    print(f"=== {a.brand} — 我哋 {len(ours)} 件 / 來源 {len(cands)} 件 ===")
    # 一件來源貨只可以配一件我哋嘅貨。之前兩條唔同嘅單行（純淨卸妝油同
    # 純淨深層清潔卸妝油）搶同一個 index，其中一件實貼錯相。
    # 分數高嗰個先揀，揀走咗第二個就要另揾。
    order = sorted(ours, key=lambda r: -(rank(r, cands)[0][0] if rank(r, cands) else 0))
    used = set()
    picked, miss = {}, []
    for r in order:
        top = [t for t in rank(r, cands) if t[1] not in used]
        if top and top[0][0] >= a.min:
            used.add(top[0][1])
            s, i, c = top[0]
            picked[r["barcode"]] = i
            alt = f"  (第二 {top[1][0]:.2f} {top[1][2]['title'][:26]})" if len(top) > 1 else ""
            print(f'  ✅ {r["title"][:34]:<36} → [{i:>3}] {c["title"][:34]:<36} {s:.2f}'
                  f' 相{len(c["imgs"])} 長{len(c["detail"])}{alt}')
        else:
            miss.append(r)
            best = f'  最接近 {top[0][0]:.2f} {top[0][2]["title"][:30]}' if top else ""
            print(f'  ✗  {r["title"][:34]:<36} 配唔到{best}')
    print(f"\n配到 {len(picked)} / 配唔到 {len(miss)}")

    if not a.write:
        return 0

    m = json.load(open(MATCHED)) if os.path.exists(MATCHED) else {}
    m[key] = [{"barcode": b, "index": i} for b, i in picked.items()]
    json.dump(m, open(MATCHED, "w"), ensure_ascii=False)

    imgs = json.load(open(IMAGES)) if os.path.exists(IMAGES) else {}
    for b, i in picked.items():
        if cands[i]["imgs"]:
            imgs[b] = cands[i]["imgs"]
    json.dump(imgs, open(IMAGES, "w"), ensure_ascii=False, indent=1)
    print(f"寫咗 matched.json[{key}] 同 data/brands14_images.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
