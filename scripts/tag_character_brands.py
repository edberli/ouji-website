#!/usr/bin/env python3
"""角色貨嘅牌子寫返角色名，唔好再掛住「K-BEAUTY」。

客搵呢啲貨嘅時候心入面諗嘅係「Hello Kitty」「大耳狗」「蠟筆小新」，
唔係製造商（Race、シャンティ）。品牌列同 /brands 都係用 vendor 做 key，
所以 vendor 寫角色名，客先搵得返。

Sanrio 旗下嘅角色（Hello Kitty、美樂蒂、酷洛米、大耳狗、帕恰狗、
水怪／人魚漢頓、Cinnamoroll）全部歸「Sanrio」—— 網站本身已經有呢個牌子，
唔另開一堆得一件貨嘅格。其他自成一家嘅 IP 各自一格。

認唔出係邊個角色嘅唔郁（避孕套、維他命、無牌香水嗰啲）。
"""
import argparse
import sys

sys.path.insert(0, "scripts")
from shopify_admin import gql, user_errors

# 標題中咗任何一個字就當係嗰個牌子。順序＝優先次序。
RULES = [
    ("蠟筆小新", "蠟筆小新"),
    ("chiikawa", "吉伊卡哇 Chiikawa"),
    ("吉伊卡哇", "吉伊卡哇 Chiikawa"),
    ("初音未來", "初音未來 Hatsune Miku"),
    ("角落小夥伴", "角落生物 Sumikko Gurashi"),
    ("角落生物", "角落生物 Sumikko Gurashi"),
    ("shimaenaga", "銀喉長尾山雀 Shimaenaga"),
    ("銀喉長尾山雀", "銀喉長尾山雀 Shimaenaga"),
    # —— 以下全部係 Sanrio 旗下角色 ——
    ("hello kitty", "Sanrio"),
    ("my melody", "Sanrio"),
    ("美樂蒂", "Sanrio"),
    ("kuromi", "Sanrio"),
    ("酷洛米", "Sanrio"),
    ("cinnamoroll", "Sanrio"),
    ("cinamoroll", "Sanrio"),
    ("玉桂狗", "Sanrio"),
    ("大耳狗", "Sanrio"),
    ("帕恰狗", "Sanrio"),
    ("hangyodon", "Sanrio"),
    ("人魚漢頓", "Sanrio"),
]
# 「幸運扭蛋玩具 @銀喉長尾山雀」係扭蛋，唔係角色美妝線，唔跟角色歸類。
SKIP = ["幸運扭蛋玩具"]

Q = """query($c:String){ products(first:250, after:$c, query:"vendor:'K-BEAUTY'"){
  pageInfo{ hasNextPage endCursor } nodes{ id title } } }"""
M = """mutation($p:ProductUpdateInput!){ productUpdate(product:$p){ userErrors{ field message } } }"""


def brand_of(title):
    t = title.lower()
    if any(s in title for s in SKIP):
        return None
    for needle, brand in RULES:
        if needle in t:
            return brand
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    a = ap.parse_args()

    prods, cur = [], None
    while True:
        d = gql(Q, {"c": cur})["products"]
        prods += d["nodes"]
        if not d["pageInfo"]["hasNextPage"]:
            break
        cur = d["pageInfo"]["endCursor"]

    todo = [(p, brand_of(p["title"])) for p in prods]
    go = [(p, b) for p, b in todo if b]
    left = [p for p, b in todo if not b]

    counts = {}
    for _, b in go:
        counts[b] = counts.get(b, 0) + 1
    print(f"K-BEAUTY {len(prods)} 件｜認得出角色 {len(go)} 件｜維持 {len(left)} 件\n")
    for b, n in sorted(counts.items(), key=lambda x: -x[1]):
        print(f"  {n:3} → {b}")
    print("\n維持 K-BEAUTY（認唔出邊個角色／根本唔係角色貨）：")
    for p in left:
        print(f"   {p['title'][:56]}")

    if not a.apply:
        print("\n（未改任何嘢。加 --apply）")
        return
    for p, b in go:
        user_errors(gql(M, {"p": {"id": p["id"], "vendor": b}}), "productUpdate")
    print(f"\n改咗 {len(go)} 件。")


if __name__ == "__main__":
    main()
