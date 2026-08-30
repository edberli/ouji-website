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
VAGUE = {"", "護膚", "彩妝", "美妝", "化妝", "個人護理", "個人謢理", "頭髮護理", "身體護理",
         "套裝", "配件", "測試", "保健", "美容食品", "食品 / 飲品", "生活風格",
         "女士用品", "家品", "季節性", "美容工具"}

# 化妝品劑型 —— 見到呢啲就一定唔係口服保健品。
# ⚠️ 2026-08-30 老闆揪到：「AKARAN 維C**酵素**亮肌卸妝啫喱」同
#    「OOTD 奇異果**維他命 C** 卸妝膏」兩隻卸妝品去咗保健品格。
#    根因就係下面條保健品規則夾成分詞（酵素、維他命 C、膠原蛋白），
#    而成分只係個名嘅一部分 —— **決定分類嘅係劑型**。
COSMETIC = re.compile(
    r"卸妝|潔面|洗面|洗顏|面膜|安瓶|爽膚|化妝水|乳液|面霜|眼霜|防曬|微針|"
    r"沐浴|洗髮|洗頭|護髮|髮膜|髮油|護手|身體乳|磨砂|去角質|棉片|化妝棉|"
    r"唇膏|唇釉|唇彩|眼影|眼線|睫毛|粉底|氣墊|遮瑕|胭脂|高光|修容|定妝|"
    r"香水|噴霧|牙膏|濕紙巾|\d+\s*(ml|mL|毫升)|serum|ampoule|cleans|toner|"
    r"cushion|lipstick|mascara|shampoo|sunscreen", re.I)

# 順序 = 優先次序，由最 specific 行到最闊
RULES = [
    ("保健品",   r"益生菌|乳酸菌|膠原蛋白粉|維他命\s*[A-Dcс]|康普茶|紅參|人參|酵素|蘋果醋|"
                 r"穀胱甘肽.*(粒|條|包|片劑)|\d+\s*(粒|錠|膠囊)|果凍條|口服"),
    ("隱形眼鏡配件", r"隱形眼鏡盒|鏡盒|藥水"),
    ("隱形眼鏡", r"隱形眼鏡|美瞳|日拋|月拋"),
    # 美髮工具行喺化妝工具前面：「髮梳」「髮夾」唔應該同粉底掃撈埋一齊
    ("美髮工具", r"髮梳|梳子|多功能梳|按摩梳|圓梳|折疊梳|髮夾|髮圈|髮箍|髮捲|橡筋|口袋梳|擦髮巾|"
                 r"護髮彈性梳|頭皮護理刷|清潔按摩梳|hair (brush|towel)|comb"),
    ("化妝工具", r"化妝掃|粉撲|美妝蛋|海綿|睫毛夾|刷具|掃具|眉剪|暈染刷|刷\b|手持鏡|"
                 r"粉底掃|遮瑕掃|眉掃|胭脂掃|眼影掃|碎粉掃|蜜粉掃|掃\b|brush|puff|sponge|tweezer"),
    ("假睫毛",   r"假睫毛|eyelash|睫毛(?!膏)"),
    ("眼影",     r"眼影|eyeshadow"),
    ("美容工具", r"黑頭鏟|刮刀|去黑頭|冷卻大師|棉棒|夾子"),
    ("公仔玩具", r"盲盒|毛絨|掛件|公仔"),
    ("香水",     r"香水|香露|perfume|eau de (parfum|toilette)"),
    ("身體噴霧", r"身體噴霧|body mist|髮香噴霧|hair mist|香體噴霧|清涼噴霧|冰涼噴霧|冰感"),
    ("成人用品", r"condom|安全套|保險套"),
    ("唇部護理", r"護唇膏|潤唇膏|唇膏\b(?!.*(唇釉|tint))"),
    # ⚠️ 「香氛奶油護手霜 **洗髮水香味**」—— 洗髮兩個字係香味名唔係劑型，
    #    所以護手霜要行喺洗髮前面，否則會歸錯做洗髮水。
    ("護手霜",   r"護手霜|潤手霜|hand cream"),
    ("濕紙巾",   r"濕紙巾|濕巾|wipes?"),
    ("口腔護理", r"牙膏|牙粉|潔牙|口腔|牙刷|漱口"),
    ("家居香氛", r"家居用香氛|擴香|香薰片|香氛膏|除臭|纖維香氛|織物香氣|布料香氛|室內香氛|房間噴霧|衣物"),
    ("洗髮",     r"洗髮水\b|洗頭水|shampoo"),
    ("護髮",     r"護髮|髮膜|髮油|髮霧|護髮素|髮根|增強劑|修護?膜|conditioner|hair (oil|pack|treatment|essence|mist)|頭皮|三合一護理液"),
    ("沐浴",     r"沐浴露|沐浴乳|沐浴|body wash|body cleanser|浴鹽|泡泡浴"),
    ("身體護理", r"身體乳|身體霜|身體乳液|潤膚乳|身體磨砂|body lotion|body cream|body oil|按摩油|磨砂|scrub|足部|foot"),
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
    ("唇釉",     r"唇釉|唇彩|唇粉|tint|gloss"),
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
    cosmetic = bool(COSMETIC.search(title or ""))
    for label, pat in RULES:
        # 外用品幾多成分詞都好，都唔會變成口服保健品
        if label == "保健品" and cosmetic:
            continue
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
