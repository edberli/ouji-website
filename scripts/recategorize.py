#!/usr/bin/env python3
"""執 productType —— 分類系統嘅地基。

網站啲分類係夾 productType ＋ tags，唔係夾標題（夾標題會出事：
TIRTIR「Mask Fit」氣墊全部變咗面膜）。所以 productType 準唔準
直接決定客撳分類見到乜。

而家有一堆貨嘅 productType 係含糊詞（護膚 116 件、個人護理 23、
美妝 9、套裝 9⋯），落唔到任何細分類。呢個 script 淨係動呢啲含糊嘅，
由標題推返一個具體型號出嚟。已經有具體型號嘅唔郁。

  python3 scripts/recategorize.py           # 睇下會改乜
  python3 scripts/recategorize.py --apply
"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from shopify_admin import gql, user_errors  # noqa

Q = """query($c:String){products(first:100, after:$c){pageInfo{hasNextPage endCursor}
  nodes{id title vendor productType tags}}}"""
UP = """mutation($id:ID!,$t:String!){productUpdate(product:{id:$id, productType:$t}){
  userErrors{field message}}}"""

# 含糊到落唔到分類嘅型號 —— 只有呢啲先會改
VAGUE = {"", "護膚", "彩妝", "美妝", "個人護理", "個人謢理", "頭髮護理", "身體護理",
         "套裝", "配件", "測試", "保健", "美容食品", "食品 / 飲品", "生活風格"}

# 順序 = 優先次序，由最 specific 行到最闊
RULES = [
    ("保健品",   r"益生菌|乳酸菌|膠原蛋白粉|維他命\s*[A-Dcс]|康普茶|紅參|人參|酵素|蘋果醋|"
                 r"穀胱甘肽.*(粒|條|包|片劑)|\d+\s*(粒|錠|膠囊)|果凍條|口服"),
    ("隱形眼鏡", r"隱形眼鏡|美瞳|日拋|月拋"),
    ("化妝工具", r"化妝掃|粉撲|美妝蛋|睫毛夾|刷具|掃具|眉剪|暈染刷|刷\b|手持鏡|胭脂掃|brush|puff|sponge|tweezer"),
    ("假睫毛",   r"假睫毛|eyelash|睫毛(?!膏)"),
    ("眼影",     r"眼影|eyeshadow"),
    ("美容工具", r"黑頭鏟|刮刀|去黑頭|冷卻大師|棉棒|夾子"),
    ("公仔玩具", r"盲盒|毛絨|掛件|公仔"),
    ("香水",     r"香水|perfume|eau de (parfum|toilette)"),
    ("身體噴霧", r"身體噴霧|body mist|髮香噴霧|hair mist|香體噴霧"),
    ("洗髮",     r"洗髮|洗頭|shampoo"),
    ("護髮",     r"護髮|髮膜|髮油|髮霧|護髮素|髮根|增強劑|conditioner|hair (oil|pack|treatment|essence|mist)|頭皮|三合一護理液"),
    ("沐浴",     r"沐浴露|沐浴乳|沐浴|body wash|body cleanser|浴鹽|泡泡浴"),
    # 護手霜獨立一格：老闆要佢入「季節性」，同身體乳唔同格
    ("護手霜",   r"護手霜|潤手霜|hand cream"),
    ("身體護理", r"身體乳|身體霜|身體乳液|潤膚乳|body lotion|body cream|body oil|按摩油|磨砂|scrub|足部|foot"),
    ("潔面",     r"潔面|洗面|卸妝|cleansing (foam|oil|gel|balm|water)|cleanser|makeup remover"),
    ("防曬",     r"防曬|sun (cream|stick|essence|milk|serum)|sunscreen|spf"),
    ("面膜",     r"面膜|mask pack|sheet mask"),
    ("棉片",     r"棉片|爽膚棉|化妝棉|toner pad|pad\b"),
    ("爽膚水",   r"爽膚水|化妝水|toner"),
    ("精華",     r"精華|安瓶|serum|ampoule|essence"),
    ("眼霜",     r"眼霜|眼部|eye cream"),
    ("面霜",     r"面霜|乳霜|cream\b"),
    ("乳液",     r"乳液|lotion|emulsion"),
    ("唇部護理", r"潤唇|唇膜|lip balm|lip mask"),
    ("唇釉",     r"唇釉|唇彩|tint|gloss"),
    ("爽膚水",   r"潔膚水|柔膚水|化妝水"),
    # 套裝：跟入面主打嗰件貨歸類，唔好自己開一格「套裝」——
    # 客搵嘅係「積雪草套裝」，唔係「套裝」。
    ("去角質",   r"去角質|角質|peeling|exfoliat"),
    ("潔面",     r"潔淨油|潔面油"),
    ("精華",     r"微晶精|\d+\s*針"),
    ("面霜",     r"霜|凝膠|gel\b"),
    ("套裝護膚", r"套裝|kit|set\b"),
]


def guess(title):
    for label, pat in RULES:
        if re.search(pat, title, re.I):
            return label
    return None


def main():
    apply = "--apply" in sys.argv
    c, n, miss = None, 0, []
    while True:
        d = gql(Q, {"c": c})["products"]
        for p in d["nodes"]:
            cur = (p["productType"] or "").strip()
            if cur not in VAGUE:
                continue
            new = guess(p["title"] or "")
            if not new or new == cur:
                miss.append(f"{cur or '(空)'} | {p['title'][:44]}")
                continue
            n += 1
            print(f"  {cur or '(空)':<10} → {new:<8} {p['title'][:46]}")
            if apply:
                user_errors(gql(UP, {"id": p["id"], "t": new}), "productUpdate")
        if not d["pageInfo"]["hasNextPage"]:
            break
        c = d["pageInfo"]["endCursor"]
    print(f"\n{n} 件{'改咗' if apply else '會改'}；{len(miss)} 件推唔到，維持原狀：")
    for m in miss[:25]:
        print("   ", m)


if __name__ == "__main__":
    main()
