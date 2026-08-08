#!/usr/bin/env python3
"""Check M3's Olive Young matches, then write the ratings file.

The model is good at "same product, different language" and bad in one
specific way: when two products in a brand share a series name it will
sometimes pick the wrong body — an eye palette matched to a lip base
because both are called "Dote On Mood". That is the same failure that
put wrong photographs on twenty-five COSRX pages earlier in this
project, so it gets the same treatment: a mechanical type check that
does not care how confident the model was.

Anything that fails the type check is dropped, not flagged. A product
page showing another product's reviews is worse than a product page
showing none.

    python3 scripts/check_oy_match.py
    python3 scripts/check_oy_match.py --min-confidence high
"""
import argparse
import collections
import glob
import json
import os
import re

SRC = "/Volumes/core/ouji-oy"
OUT = os.path.join(SRC, "ratings.json")

# 類型閘。第一版純粹「類型唔同就剷」，結果剷錯咗大半 ——「人參保濕防曬
# 精華液」對「Ginseng Moist Sun Serum」係同一支嘢，但一個讀成防曬、一個
# 讀成精華；「防水眼線液」對「Super Proof Brush Liner」都係同一支，
# 但個 brush 字令佢變咗「工具」。
#
# 所以分兩層：先睇大類（彩妝／護膚留肌／沖洗／貼片／工具），大類唔同先剷。
# 彩妝入面再嚴啲 —— 眼影配唇釉係硬錯，唔可以放生。
TYPE = [
    ("tool",    r"(?<!brush )\b(?:makeup brush|puff|applicator|tweezer|sponge)\b|粉撲|美妝蛋|鑷"),
    ("eyecare", r"eye cream|eye serum|eye patch|eye mask|eye essence|眼霜|眼部精華|眼膜|眼部護理"),
    ("eye",     r"eyeshadow|eye palette|eye ?liner|mascara|brow|眼影|眼線|睫毛|眉"),
    ("lip",     r"\blip\b|lipstick|lip ?tint|gloss|口紅|唇"),
    ("cheek",   r"blush|cheek|contour|shading|highlight|bronzer|胭脂|修容|高光|腮紅"),
    ("base",    r"cushion|foundation|concealer|primer|\bbb\b|\bpowder\b|氣墊|粉底|遮瑕|飾底|蜜粉|定妝"),
    ("sun",     r"\bsun\b|sunscreen|sunstick|spf\s*\d|防曬"),
    ("mask",    r"\bmask\b|마스크|面膜"),
    ("pad",     r"\bpads?\b|棉片|化妝棉|濾片"),
    ("cleanse", r"cleans|foam|micellar|scrub|peeling|潔面|潔膚|卸妝|洗面|去角質|洗頭|沐浴"),
    ("toner",   r"\btoner\b|爽膚水|化妝水"),
    ("serum",   r"serum|ampoule|essence|booster|mist|精華|安瓶|噴霧"),
    ("cream",   r"cream|lotion|emulsion|moisturi|balm|面霜|乳液|保濕霜|凝霜|乳霜"),
]

# 大類。同一個大類入面互相唔算衝突。
BUCKET = {
    "lip": "makeup", "eye": "makeup", "cheek": "makeup", "base": "makeup",
    "toner": "leave", "serum": "leave", "cream": "leave",
    "sun": "leave", "eyecare": "leave",
    "cleanse": "rinse",
    "mask": "sheet", "pad": "sheet",
    "tool": "tool",
}


def types_of(s):
    """一個名可以中多過一個類型，全部收 —— 「Powder Velvet Tint」
    既係 powder 又係 tint，取單一個答案就一定會揀錯。"""
    return {name for name, rx in TYPE if re.search(rx, s or "", re.I)}


def clashes(a, b):
    """兩邊嘅類型集完全冇交集，而且兩邊都係彩妝，先算硬錯。

    第一版連護膚都閂，結果九單入面八單係誤殺 ——「去角質安瓶」對
    「Exfoliating Rice Ampoule」、「潔面粉」對「Cleansing Powder」
    都被當成唔同嘢。護膚嘅命名太散，機械閘喺嗰邊淨係製造噪音；
    真正會出事嘅係眼影配唇部產品呢類，而嗰類淨係喺彩妝出現。"""
    if not a or not b or (a & b):
        return False
    return all(BUCKET.get(t) == "makeup" for t in a | b)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--min-confidence", default="medium",
                    choices=["high", "medium"])
    args = ap.parse_args()
    rank = {"high": 2, "medium": 1, "none": 0}
    floor = rank[args.min_confidence]

    oy = {p["no"]: p for p in json.load(open(f"{SRC}/oy-catalog.json"))}
    mine = {p["h"]: p for p in json.load(open(f"{SRC}/our-products.json"))}

    stats = collections.Counter()
    bad_type, out = [], {}

    for f in sorted(glob.glob(f"{SRC}/match-out/*.md")):
        brand = os.path.basename(f)[:-3]
        raw = open(f).read().strip()
        raw = re.sub(r"^```(?:json)?|```$", "", raw, flags=re.M).strip()
        try:
            rows = json.loads(raw)
        except json.JSONDecodeError:
            stats["檔案讀唔到"] += 1
            print(f"  ⚠️  {brand} 出唔到 JSON")
            continue
        job = json.load(open(f"{SRC}/match-in/{brand}.json"))
        pool = job["oliveyoung"]

        for r in rows:
            h = r.get("handle")
            stats["總共"] += 1
            if h not in mine:
                stats["handle 唔存在"] += 1
                continue
            i, conf = r.get("i"), r.get("confidence", "none")
            if i is None or rank.get(conf, 0) < floor:
                stats["配唔到"] += 1
                continue
            if not isinstance(i, int) or not (0 <= i < len(pool)):
                stats["i 出界"] += 1
                continue
            no = None
            name = pool[i]["name"]
            for k, v in oy.items():
                if v["n"] == name:
                    no = k
                    break
            if no is None:
                stats["搵唔返 prdtNo"] += 1
                continue

            # 類型閘 —— 唔理佢幾有信心。
            mt = types_of(mine[h]["t"]) | types_of(mine[h]["ty"])
            ot = types_of(name)
            if clashes(mt, ot):
                stats["類型唔對，剷走"] += 1
                bad_type.append(f'{mine[h]["t"][:40]}  ✗  {name[:40]}  '
                                f'({"/".join(sorted(mt))} ≠ {"/".join(sorted(ot))})')
                continue

            score = oy[no].get("s")
            if not score:
                stats["對到但 OY 冇評分"] += 1
                continue
            out[h] = {"prdtNo": no, "oyName": name, "star": round(float(score), 1),
                      "count": int(oy[no].get("c") or 0), "confidence": conf}
            stats["收貨"] += 1

    json.dump(out, open(OUT, "w"), ensure_ascii=False, indent=1)

    print("\n── 核對結果 ──")
    for k, v in stats.most_common():
        print(f"  {k:<18}{v}")
    print(f"\n收貨 {len(out)} 件 / 我哋 {len(mine)} 件彩妝護膚 "
          f"= {len(out) / len(mine) * 100:.1f}%")
    if bad_type:
        print(f"\n類型閘剷走咗 {len(bad_type)} 件，頭十件：")
        for x in bad_type[:10]:
            print("  " + x)
    print(f"\n寫咗 {OUT}")


if __name__ == "__main__":
    main()
