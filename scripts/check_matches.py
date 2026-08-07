#!/usr/bin/env python3
"""
Catch matches that put the wrong product's photo and words on a page.

The name matching is done by a model against a list of source products,
and a wrong row is not obvious afterwards: COSRX's 視黃醇 0.1% 面霜 was
matched to their Refresh ABC Daily Toner, so the retinol cream went live
with a toner's photo and, once the copy step ran, a toner's description.
Nothing in the pipeline complained.

Product type is the cheap check. If our title says 面霜 and the source
says toner, the pair is wrong no matter how similar the rest reads.

    python3 scripts/check_matches.py             # 全部
    python3 scripts/check_matches.py COSRX
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from skincare_data import by_vendor, load  # noqa: E402

STORES = "/tmp/skin/stores.json"
MATCHED = "/tmp/skin/matched.json"

# One row per product type, in both the languages the two lists are
# written in. A pair whose types are both known and different is wrong.
KINDS = [
    ("爽膚水", r"爽膚水|化妝水|超能水|活膚水", r"\btoner\b|토너"),
    ("精華", r"精華液?|安瓶|肌底液", r"\bserum\b|\bampoule\b|\bessence\b|세럼|앰플|에센스"),
    ("面霜", r"面霜|乳霜|修護霜|保濕霜|水霜", r"\bcream\b|크림"),
    ("乳液", r"乳液", r"\blotion\b|\bemulsion\b|로션"),
    ("潔面", r"潔面|洗面|潔膚|卸妝", r"cleans|\bfoam\b|\bbalm\b|클렌징|클렌저|폼"),
    ("面膜", r"面膜|泥膜|軟膜", r"\bmask\b|\bpack\b|마스크|팩"),
    ("棉片", r"棉片|化妝棉|爽膚棉", r"\bpad\b|\bpads\b|패드"),
    ("防曬", r"防曬", r"\bsun ?(?:screen|cream|stick|serum|lotion|fluid|essence)|\bspf\b|선크림|선세럼|선로션"),
    ("眼霜", r"眼霜|眼部|眼膜", r"\beye ?(?:cream|serum|patch|gel)|아이 ?크림"),
    ("油", r"護膚油|美容油", r"\boil\b|오일"),
    ("噴霧", r"噴霧", r"\bmist\b|\bspray\b|미스트"),
]

# The hero ingredient is the other half of the check, and the stronger
# half: type alone passes a centella cream matched to a snail cream.
# Only ingredients that are named in both languages are listed — a token
# we cannot read on one side would flag every honest pair.
INGREDIENTS = [
    ("積雪草", r"centella|\bcica\b|센텔라|시카|마데카"),
    ("魚腥草", r"heartleaf|houttuynia|어성초"),
    ("蝸牛", r"snail|mucin|달팽이"),
    ("透明質酸|玻尿酸", r"hyaluron|히알루론"),
    ("煙.胺|菸鹼醯胺", r"niacinamide|나이아신"),
    ("視黃醇|A醇|A醛", r"retino|레티노|레티날"),
    ("蜂膠", r"propolis|프로폴리스"),
    ("米|白米", r"\brice\b|쌀"), ("人參", r"ginseng|인삼"),
    ("艾草", r"mugwort|artemisia|쑥"), ("樺樹|白樺", r"birch|자작"),
    ("大豆|豆乳", r"\bsoy|콩|락토소이"), ("綠茶", r"green tea|녹차"),
    ("蘆薈", r"\baloe\b|알로에"), ("柚子", r"yuja|yuzu|유자"),
    ("茶樹", r"tea tree|티트리"), ("PDRN", r"pdrn"),
    ("胜.|胜肽", r"peptide|펩타이드"), ("燕麥", r"\boat\b|오트|귀리"),
    ("薯仔|馬鈴薯", r"potato|감자"), ("胡蘿蔔", r"carrot|당근"),
    ("金盞花", r"calendula|카렌듈라"), ("獨島", r"dokdo|독도|1025"),
    ("綠豆", r"mung bean|녹두"), ("穀胱甘", r"glutathione|글루타치온"),
]


def kind(text, col):
    return {name for name, zh, en in KINDS
            if re.search(zh if col == 0 else en, text, re.I)}


def hero(text, col):
    return {zh for zh, en in INGREDIENTS
            if re.search(zh if col == 0 else en, text, re.I)}


def main():
    only = sys.argv[1] if len(sys.argv) > 1 else None
    stores = json.load(open(STORES))
    matched = json.load(open(MATCHED))

    bad = total = 0
    for brand, rows in matched.items():
        if brand.endswith(" RET") or (only and brand != only):
            continue
        base = brand
        store = stores.get(brand, [])
        ours = {r["barcode"]: r["title"] for r in by_vendor(load(base)).get(base, [])}
        flagged = []
        for m in rows:
            if m.get("index") is None or m["barcode"] not in ours:
                continue
            total += 1
            a, b = ours[m["barcode"]], store[m["index"]]["title"]
            for read_a, read_b in ((kind, kind), (hero, hero)):
                mine, theirs = read_a(a, 0), read_b(b, 1)
                if mine and theirs and not (mine & theirs):
                    flagged.append((m["barcode"], a, b,
                                    "/".join(sorted(mine)), "/".join(sorted(theirs))))
                    break
        if flagged:
            print(f"\n== {brand}: {len(flagged)} 個對唔上")
            for b, a, c, k1, k2 in flagged:
                print(f"   {b}\n     我哋 [{k1}] {a[:48]}\n     官網 [{k2}] {c[:48]}")
        bad += len(flagged)

    print(f"\n查咗 {total} 對，{bad} 對類型或者成分對唔上")


if __name__ == "__main__":
    main()
