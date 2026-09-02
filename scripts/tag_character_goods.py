#!/usr/bin/env python3
"""卡通角色貨加 `卡通角色` tag —— 老闆 2026-09-02：「卡通角色貨 公仔類別」。

分區係睇 productType ＋ tags，而且**唔係互斥**：加咗個 tag，Hello Kitty
護手霜就會同時出現喺「公仔 › 角色美妝」同埋原本嘅「護手霜」。
客想睇大耳狗就喺公仔格睇得晒，想搵護手霜就喺護手霜格搵得到。

點解唔直接 tag `公仔`：`公仔` 會中埋 `plush` 子分類，
一支護手霜擺喺「毛絨公仔」入面就錯咗。

順手改埋四支被標成「面霜」嘅 Lip Cream —— 佢哋係唇部護理。
"""
import argparse
import sys

sys.path.insert(0, "scripts")
from shopify_admin import gql, user_errors

TAG = "卡通角色"

# 角色名。要夠specific —— 「小新」單獨會夾中「小新鮮」嗰類，所以寫全名。
CHARACTERS = [
    "hello kitty", "my melody", "my melody", "美樂蒂", "kuromi", "酷洛米",
    "cinnamoroll", "cinamoroll", "玉桂狗", "大耳狗", "帕恰狗", "pochacco",
    "hangyodon", "水怪", "布甸狗", "pompompurin", "蛋黃哥", "gudetama",
    "little twin stars", "sanrio", "三麗鷗", "chiikawa", "吉伊卡哇",
    "蠟筆小新", "初音未來", "hatsune", "角落生物", "角落小夥伴", "sumikko",
    "銀喉長尾山雀", "雪之妖精", "shimaenaga", "人魚漢頓", "wasabi bear",
    "比卡超", "pikachu", "pokemon", "寶可夢", "san-x", "迪士尼",
]
# 只係附送一個匙扣／掛件嘅正貨，唔算角色貨。
SKIP_TITLES = ["ongredients 肌膚屏障水光噴霧"]

# 已經喺公仔格嗰啲唔使加 —— 加咗反而會令一隻毛絨公仔同時出現喺
# 「毛絨公仔」同「角色美妝」兩個子分類，一隻公仔唔係美妝。
TOYS_KW = ["公仔", "盲盒", "毛絨", "掛件", "匙扣", "扭蛋", "玩具"]


def already_toys(p):
    hay = (p.get("productType") or "") + " " + " ".join(p.get("tags") or [])
    return any(k in hay for k in TOYS_KW)

# 型號標錯：Lip Cream 係唇部護理，唔係面霜。
RETYPE = {"面霜": "唇部護理"}
RETYPE_ONLY_IF = "lip cream"

Q = """query($c:String){ products(first:250, after:$c, query:"status:active"){
  pageInfo{ hasNextPage endCursor } nodes{ id title productType tags } } }"""
ADD = """mutation($id:ID!,$t:[String!]!){ tagsAdd(id:$id, tags:$t){ userErrors{ field message } } }"""
TYPE = """mutation($p:ProductUpdateInput!){ productUpdate(product:$p){ userErrors{ field message } } }"""


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

    todo, retype = [], []
    for p in prods:
        t = p["title"].lower()
        if any(s.lower() in t for s in SKIP_TITLES):
            continue
        if not any(c in t for c in CHARACTERS):
            continue
        if already_toys(p):
            continue
        if TAG not in (p["tags"] or []):
            todo.append(p)
        if p.get("productType") in RETYPE and RETYPE_ONLY_IF in t:
            retype.append(p)

    print(f"角色貨 {len(todo)} 件要加「{TAG}」tag：")
    for p in todo:
        print(f'  [{(p.get("productType") or "冇"):8}] {p["title"][:56]}')
    print(f"\n型號標錯 {len(retype)} 件（面霜 → 唇部護理）：")
    for p in retype:
        print(f'  {p["title"][:56]}')

    if not a.apply:
        print("\n（未改任何嘢。加 --apply）")
        return
    for p in todo:
        user_errors(gql(ADD, {"id": p["id"], "t": [TAG]}), "tagsAdd")
    for p in retype:
        user_errors(gql(TYPE, {"p": {"id": p["id"], "productType": RETYPE[p["productType"]]}}),
                    "productUpdate")
    print(f"\n加咗 {len(todo)} 個 tag、改咗 {len(retype)} 個型號。")


if __name__ == "__main__":
    main()
