#!/usr/bin/env python3
"""逐件貨對「標題講嘅係咩」同「productType 寫住咩」。

老闆 2026-09-02：「我香水嗰度見到有面膜⋯全部產品你要睇一次，
呢啲好好基本嘢嚟。」

分區係睇 productType，所以 productType 錯 = 件貨去錯格。
實例：`numbuzin 4號 冰感急救鎮靜面膜` 個 type 竟然係「身體噴霧」，
所以佢出現喺香水香氛頁。

規則由**標題**推斷應該係咩型號，順序 = 優先次序（最specific行先）。
只報告，唔會自己改 —— 改之前要人眼睇過。
"""
import argparse
import json
import re
import sys

sys.path.insert(0, "scripts")
from shopify_admin import gql, user_errors

# 順序 = 優先次序，行到邊個 match 就收工。
#
# ⚠️ 頭幾條係「工具閘」——「粉底掃」係掃唔係粉底、「柔順護髮梳」係梳唔係護髮素。
#    唔行呢個閘就會將成套 STUDIO 17 化妝掃判成底妝／胭脂／眼影。
# ⚠️ 保健品一定要有**劑型字**（粒／丸／膠囊／條裝）先算。淨係見到「維他命」
#    「膠原蛋白」「益生菌」就當保健品，會將維他命C精華、益生菌防曬全部判錯。
RULES = [
    # ── 工具閘（最優先）──
    (r"髮梳|梳子|髮夾|髮圈|髮箍|橡筋|髮捲|擦髮巾|直髮|捲髮", "美髮工具"),
    (r"掃|刷|粉撲|化妝海綿|美妝蛋|brush|puff|sponge", "化妝工具"),
    (r"化妝鏡|修眉|睫毛夾|捲翹器|削筆", "美容工具"),
    # ── 明確品類 ──
    (r"隱形眼鏡|美瞳|日拋|月拋", "隱形眼鏡"),
    (r"盲盒|扭蛋|毛絨|公仔|匙扣|掛件|掛飾|吊飾", "公仔"),
    (r"專輯|寫真書|photobook", "專輯"),
    (r"濕紙巾|濕巾", "濕紙巾"),
    (r"牙刷|牙膏|牙粉|漱口|口腔", "口腔護理"),
    # 保健品：要有劑型
    (r"(粒|丸|膠囊|錠|條裝|\d+\s*條|\d+\s*包|軟糖|沖劑|粉末|口服液|滴劑)", "保健品"),
    (r"香薰|擴香|室內香氛|香氛掛片|房間噴霧|衣物噴霧|織品噴霧|香氛膏|半凝膠香膏", "家居香氛"),
    (r"淡香水|淡香精|走珠香水|滾珠香水|eau de|perfume", "香水"),
    (r"身體噴霧|body mist", "身體噴霧"),
    (r"護手霜|hand cream|潤手霜", "護手霜"),
    (r"指緣|護甲|指甲油|甲油|拋光銼|指甲銼", "美甲"),
    (r"潤唇膏|護唇膏|唇膜|唇部精華|lip balm|lip cream|唇霜", "唇部護理"),
    (r"唇釉|唇彩|唇蜜|唇泥|lip tint|唇頰|唇露", "唇釉"),
    (r"洗髮|洗頭|shampoo", "洗髮"),
    (r"護髮素|護髮乳|髮膜|護髮油|髮尾油|conditioner", "護髮"),
    (r"沐浴露|沐浴乳|body wash|沐浴球|入浴", "沐浴"),
    (r"磨砂膏|身體乳|body lotion|止汗|爽身", "身體護理"),
    (r"氣墊", "氣墊粉底"),
    (r"防曬|sunscreen|sun cream|spf\s*\d", "防曬"),
    (r"卸妝", "潔面"),
    (r"潔面|洗面|洗顏|cleansing foam|cleanser", "潔面"),
    (r"爽膚水|化妝水|toner", "爽膚水"),
    (r"面膜|眼膜|sheet mask", "面膜"),
    (r"精華|安瓶|ampoule|serum|essence", "精華"),
    (r"眼霜|eye cream", "眼霜"),
    (r"棉片|化妝棉", "棉片"),
    (r"粉底液|粉底霜|遮瑕|蜜粉|定妝粉|粉餅", "底妝"),
    (r"眼影", "眼影"),
    (r"胭脂|腮紅|blush", "胭脂"),
    (r"眼線|eyeliner", "眼線"),
    (r"睫毛液|睫毛膏|mascara", "睫毛膏"),
    (r"假睫毛", "假睫毛"),
    (r"眉筆|眉粉", "眉筆"),
    (r"唇膏|lipstick", "唇膏"),
    (r"面霜|乳霜|保濕霜", "面霜"),
    (r"乳液|emulsion", "乳液"),
]

# 呢啲字出現喺標題只係形容香味／賣點，唔代表件貨係嗰樣嘢。
NOISE = [
    (r"香水沐浴露|香水溫泉|花香水潤|香水香氛沐浴", ""),
    (r"洗髮水香味|洗髮水香氣|shampoo\s*香", ""),
    (r"mask\s*fit", ""),
]


def expected(title):
    t = title.lower()
    for pat, sub in NOISE:
        t = re.sub(pat, sub, t)
    for pat, want in RULES:
        if re.search(pat, t):
            return want
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--only", help="只睇某個現有型號")
    a = ap.parse_args()

    Q = """query($c:String){ products(first:250, after:$c, query:"status:active"){
      pageInfo{ hasNextPage endCursor } nodes{ id title productType } } }"""
    prods, cur = [], None
    while True:
        d = gql(Q, {"c": cur})["products"]
        prods += d["nodes"]
        if not d["pageInfo"]["hasNextPage"]:
            break
        cur = d["pageInfo"]["endCursor"]

    bad = []
    for p in prods:
        want = expected(p["title"])
        if want and want != (p["productType"] or ""):
            if a.only and p["productType"] != a.only:
                continue
            bad.append((p, want))

    import collections
    g = collections.Counter((p["productType"] or "（冇）", w) for p, w in bad)
    print(f"ACTIVE {len(prods)} 件｜型號同標題對唔上 {len(bad)} 件\n")
    for (now, want), n in g.most_common(40):
        print(f"  {n:4}  {now:10} → 應該係 {want}")
    print()
    for p, w in bad[:120]:
        print(f'  [{(p["productType"] or "冇"):8} → {w:8}] {p["title"][:52]}')

    if not a.apply:
        print("\n（只係報告，未改任何嘢）")
        return
    M = """mutation($p:ProductUpdateInput!){ productUpdate(product:$p){ userErrors{ field message } } }"""
    for p, w in bad:
        user_errors(gql(M, {"p": {"id": p["id"], "productType": w}}), "productUpdate")
    print(f"\n改咗 {len(bad)} 件。")


if __name__ == "__main__":
    main()
