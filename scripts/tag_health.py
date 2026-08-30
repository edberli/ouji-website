#!/usr/bin/env python3
"""揀出「保健品」，改 productType 同 tags。

點解要：add_from_lila.py 寫死咗 productType/tags = 護膚，所以今晚上嘅
BOTO、Vitamin village、JUNGWONSAM 呢啲口服品全部落咗護膚格，
客喺護膚頁會見到膠原蛋白粉。

分辨規則（順序）：
  1. 牌子本身只賣保健品 —— 最硬淨嘅訊號
  2. productType 已經係保健／美容食品／食品
  3. 標題有「口服劑型」（粒／錠／膠囊／條／包）＋ 保健成分，
     而且冇護膚劑型字眼（面膜／棉片／精華／爽膚⋯）
     ⚠️ 第 3 條唔可以淨係睇成分：面膜同棉片好多都叫「維他命C」「膠原蛋白」，
        淨睇成分會將 20 幾張面膜當成保健品。

  python3 scripts/tag_health.py            # 睇下會改乜
  python3 scripts/tag_health.py --apply
"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from shopify_admin import gql, user_errors  # noqa

Q = """query($c:String){products(first:100, after:$c){pageInfo{hasNextPage endCursor}
  nodes{id title vendor productType tags}}}"""
UP = """mutation($id:ID!,$t:String!,$g:[String!]!){
  productUpdate(product:{id:$id, productType:$t, tags:$g}){userErrors{field message}}}"""

LABEL = "保健品"
BRANDS = {"BOTO", "JUNGWONSAM", "VITAMIN VILLAGE", "VITAMINVILLAGE", "WELLIT", "NE:AR",
          "EVERBIKINI", "DANONGWON", "NUTRI D-DAY", "GRN", "GRN PLUS", "HEVEBLUE"}
TYPES = {"保健", "美容食品", "食品 / 飲品", "食品", "飲品"}
FORM = re.compile(r"\d+\s*(粒|錠|캡슐|정)|膠囊|口服|果凍條|沖劑|\d+\s*(條|包|포)\b")
ING = re.compile(r"益生菌|乳酸菌|膠原蛋白|維他命|維生素|康普茶|紅參|人參|酵素|酵母|蘋果醋|"
                 r"穀胱甘肽|葉酸|肌醇|鈣鎂|生物素|小檗鹼|納豆|蘆薈精華素|奶薊|薑黃")
# 外用劑型 —— 中咗其中一個就唔算保健品，唔理成分寫住乜。
# ⚠️ 2026-08-30 補闊咗一大截。之前呢條淨係擋到面膜／爽膚水嗰類，
#    所以「維C**酵素**亮肌卸妝啫喱」「奇異果**維他命 C** 卸妝膏」
#    「**膠原蛋白**微針精華」「鮭魚**膠原**沐浴露／洗髮露／護髮素」
#    全部被當成保健品，客喺保健品格見到卸妝同沐浴用品。
#    有毫升數（ml／毫升）亦當外用 —— 口服嘢計 g、粒、條。
SKIN = re.compile(
    r"面膜|棉片|眼膜|精華液|爽膚|化妝水|乳霜|面霜|潔面|安瓶|精華$|凝膠面膜|唇膏|眼霜|"
    r"卸妝|洗面|洗顏|微針|防曬|沐浴|洗髮|洗頭|護髮|髮膜|髮油|護手|身體乳|磨砂|去角質|"
    r"化妝棉|唇釉|唇彩|眼影|眼線|睫毛|粉底|氣墊|遮瑕|胭脂|高光|修容|定妝|香水|噴霧|"
    r"牙膏|濕紙巾|\d+\s*(ml|mL|毫升)|serum|ampoule|cleans|toner|cushion|shampoo",
    re.I)


def is_health(p):
    v = (p["vendor"] or "").upper()
    t = p["title"] or ""
    # ⚠️ 劑型行先，牌子行後。HEVEBLUE 主打口服膠原果凍條，所以入咗
    #    BRANDS，但佢同時有沐浴露、洗髮露、護髮素 —— 之前「牌子＝保健品」
    #    喺劑型之前行，三支洗頭沖涼貨每次跑呢個 script 都會俾拉返入保健品格。
    if SKIN.search(t):
        return False
    if v in BRANDS:
        return True
    if (p["productType"] or "").strip() in TYPES:
        return True
    return bool(FORM.search(t) and ING.search(t))


def main():
    apply = "--apply" in sys.argv
    c, n = None, 0
    while True:
        d = gql(Q, {"c": c})["products"]
        for p in d["nodes"]:
            if not is_health(p):
                continue
            tags = [x for x in (p["tags"] or []) if x not in ("護膚", "彩妝")]
            if LABEL not in tags:
                tags.append(LABEL)
            if p["productType"] == LABEL and set(tags) == set(p["tags"] or []):
                continue
            n += 1
            print(f"  {(p['vendor'] or '')[:14]:<16}{p['title'][:42]:<44}"
                  f"{p['productType']} → {LABEL}")
            if apply:
                user_errors(gql(UP, {"id": p["id"], "t": LABEL, "g": tags}), "productUpdate")
        if not d["pageInfo"]["hasNextPage"]:
            break
        c = d["pageInfo"]["endCursor"]
    print(f"\n{n} 件{'改咗' if apply else '會改（加 --apply）'}")


if __name__ == "__main__":
    main()
