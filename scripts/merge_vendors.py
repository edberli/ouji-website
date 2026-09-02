#!/usr/bin/env python3
"""同一個牌子有幾個寫法 —— 合併返做一個。

點解要做：品牌導覽、`/brands`、品牌篩選全部用 `vendor` 做 key，
一個字母大細楷唔同就當咗兩個牌子。實測 2026-09-02：
「The History of Whoo」拆咗做 5 格（每格 1 件）、fillimilli 5 格、
Skin1004 兩格（50 件 + 4 件）。客見到嘅就係同一個牌子出現幾次，
撳邊格都唔齊貨。

合併規則：同一組入面揀**最短**嗰個寫法（最乾淨、最似客會 search 嗰個），
同分就揀件數多嗰個。有幾個自動揀得唔靚，喺 PREFER 度寫死。
只改 vendor，唔郁標題、價錢、庫存、tag。
"""
import argparse
import collections
import re
import sys

sys.path.insert(0, "scripts")
from shopify_admin import gql, user_errors

# 自動規則揀得唔啱嗰啲，喺呢度指定正式寫法。
# 原則：客見到嘅係品牌導覽同 /brands，所以要**乾淨、客 search 得到嗰個名**。
# 括號入面嗰啲母公司／韓文註解（（I-ne）、（LG生活健康）、메디힐）唔應該出街。
PREFER = {
    "vitaminvillage": "VITAMIN VILLAGE",
    "fillimilli": "fillimilli",
    "dalbapiedmont": "d'Alba Piedmont",
    "itsskin": "It's Skin",
    "raip": "RAIP",
    "ongredients": "ongredients",
    "yao": "YAO",
    "mediheal": "MEDIHEAL",
    "unove": "UNOVE",
    "perioe": "Perioe",
    "jmella": "JMELLA",
    "garglin": "Garglin 가그린",
    "botanist": "BOTANIST",
    "yolu": "YOLU",
    "droas": "DROAS",
    "thehistoryofwhoo": "The History of Whoo 后",
    "chongkundanghealth": "Chong Kun Dang Health",
    "lactofit": "LACTO-FIT",
    "qurap": "Qurap",
    "wellp": "WELLP",
    "drg": "Dr.G",
    "atopalm": "ATOPALM",
    "graphico": "GRAPHICO",
}

# 兩個寫法連 key 都唔同（有個帶「后」有個唔帶），要人手拉埋一齊。
ALIAS = {
    "thehistoryofwhoo后": "thehistoryofwhoo",
    "종근당건강chongkundanghealth": "chongkundanghealth",
}

Q = """query($c:String){ products(first:250, after:$c){
  pageInfo{ hasNextPage endCursor } nodes{ id vendor } } }"""
M = """mutation($p:ProductUpdateInput!){ productUpdate(product:$p){ userErrors{ field message } } }"""


def key(s):
    """兩個寫法係咪同一個牌子：唔理括號註解、大細楷、韓文、標點。"""
    s = re.sub(r"[（(].*?[）)]", "", s or "")
    s = re.sub(r"[가-힣]", "", s)
    k = re.sub(r"[^0-9a-z一-鿿]", "", s.lower())
    return ALIAS.get(k, k)


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

    count = collections.Counter(p["vendor"] for p in prods)
    groups = collections.defaultdict(list)
    for name in count:
        k = key(name)
        if k:
            groups[k].append(name)

    plan = {}
    for k, names in groups.items():
        if len(names) < 2:
            continue
        # 最短行先，同分先睇件數多嗰個
        best = PREFER.get(k) or sorted(names, key=lambda n: (len(n), -count[n]))[0]
        for n in names:
            if n != best:
                plan[n] = best

    moved = [p for p in prods if p["vendor"] in plan]
    print(f"{len(plan)} 個重複寫法 → 合併，影響 {len(moved)} 件貨\n")
    for src, dst in sorted(plan.items(), key=lambda x: -count[x[0]]):
        print(f"  {count[src]:3} 件  {src}  →  {dst}")

    if not a.apply:
        print("\n（未改任何嘢。加 --apply）")
        return
    for p in moved:
        user_errors(gql(M, {"p": {"id": p["id"], "vendor": plan[p["vendor"]]}}),
                    "productUpdate")
    print(f"\n改咗 {len(moved)} 件。品牌數 {len(count)} → {len(count) - len(plan)}")


if __name__ == "__main__":
    main()
