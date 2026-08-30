#!/usr/bin/env python3
"""查成個目錄有冇「分類擺錯咗」—— 唔限於某一格。

2026-08-30 老闆：「其中一隻卸妝啫喱，唔知點解去咗保健品嗰度。」
查到根因唔止嗰一件：`recategorize.py` 同 `tag_health.py` 都係先夾成分詞
（維他命、膠原蛋白、酵素、穀胱甘肽⋯），夾中就當保健品。但成分只係
個名嘅一部分，**決定分類嘅係劑型**：

    AKARAN 維C酵素亮肌卸妝啫喱   → 「酵素」中招 → 保健品 ✗（係卸妝）
    OOTD 奇異果維他命 C 卸妝膏    → 「維他命 C」中招 → 保健品 ✗（係卸妝）
    VT 膠原蛋白微針精華          → 「膠原蛋白」中招 → 保健品 ✗（係精華）

所以呢度用兩層：
1. 標題入面有冇**化妝品劑型**（卸妝／潔面／精華／面膜／沐浴／洗髮⋯）——
   有就一定唔係保健品，成分詞唔作數。
2. 保健品只認**口服劑型**（粒／錠／膠囊／片劑／條裝／粉末／飲／沖劑⋯）。

    python3 scripts/audit_types.py            # 淨係報告
    python3 scripts/audit_types.py --apply    # 順手改返 productType
"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from shopify_admin import gql, user_errors  # noqa: E402
from recategorize import RULES, guess  # noqa: E402

Q = """query($c:String){products(first:100, after:$c){pageInfo{hasNextPage endCursor}
  nodes{id title productType tags}}}"""
UP = """mutation($id:ID!,$t:String!){productUpdate(product:{id:$id, productType:$t}){
  userErrors{field message}}}"""
TAGS = """mutation($id:ID!,$t:[String!]!){tagsRemove(id:$id, tags:$t){
  userErrors{field message}}}"""

# 化妝品劑型 —— 標題見到呢啲，件貨就唔可能係口服保健品。
# ⚠️「精華」兩個字唔可以放喺呢度：紅參**精華**純液、護眼**精華**丸
#    都係口服嘢。呢個字要交返俾下面 ORAL 同 ml 嗰兩個條件拆。
COSMETIC = re.compile(
    r"卸妝|潔面|洗面|洗顏|面膜|安瓶|爽膚|化妝水|乳液|面霜|眼霜|防曬|微針|"
    r"\d+\s*(ml|mL|毫升)|"
    r"沐浴|洗髮|洗頭|護髮|髮膜|髮油|護手|身體乳|磨砂|去角質|棉片|化妝棉|"
    r"唇膏|唇釉|唇彩|眼影|眼線|睫毛|粉底|氣墊|遮瑕|胭脂|高光|修容|定妝|"
    r"香水|噴霧|牙膏|濕紙巾|serum|ampoule|cleans|toner|essence|cushion|"
    r"lipstick|mascara|shampoo|sunscreen|spf", re.I)

# 底妝有 SPF 係常態 —— 一支氣墊粉底寫住 SPF50 都仲係氣墊粉底，
# 唔可以因為見到 SPF 就當防曬。
BASE = re.compile(r"氣墊|粉底|遮瑕|底霜|妝前|cushion|foundation|concealer|BB|CC", re.I)

# 真正嘅口服劑型
ORAL = re.compile(
    r"\d+\s*(粒|錠|膠囊|片劑|丸)|膠囊|片劑|軟糖|果凍條|沖劑|口服|"
    r"益生菌|乳酸菌|康普茶|紅參|人參|葉黃素|蘋果醋|小檗鹼|"
    r"精華丸|精華液?\s*\d+\s*條|粉末|\d+\s*條裝?", re.I)

# type → 邊一格（同 shopify.js 嘅 CATEGORY_TAXONOMY 對齊，只用嚟判斷
# 「錯得嚴唔嚴重」：同一格入面嘅偏差唔報，跨格先報）
SECTION = {}
for t in ("潔面 爽膚水 棉片 精華 乳液 面霜 面膜 眼霜 防曬 局部護理 去角質 "
          "套裝護膚 護膚 卸妝").split():
    SECTION[t] = "護膚"
for t in ("底妝 粉底 氣墊 遮瑕 眼影 眼線 睫毛膏 眉筆 唇膏 唇釉 唇彩 唇蜜 胭脂 "
          "高光 修容 定妝噴霧 假睫毛 多用彩妝 唇部護理 唇線筆").split():
    SECTION[t] = "彩妝"
for t in "洗髮 護髮 沐浴 身體護理 身體乳".split():
    SECTION[t] = "沐浴洗護"
for t in "化妝工具 美髮工具 美容工具".split():
    SECTION[t] = "工具"
for t in "香水 身體噴霧 家居香氛".split():
    SECTION[t] = "香氛"
SECTION["保健品"] = "保健品"
SECTION["隱形眼鏡"] = "隱形眼鏡"


def expected(title):
    """由標題推個 productType 出嚟，成分詞唔准壓過劑型。"""
    t = title or ""
    cosmetic = bool(COSMETIC.search(t))
    for label, pat in RULES:
        if label == "防曬" and BASE.search(t):
            continue
        if label == "保健品":
            # 有化妝品劑型就跳過保健品；冇就要真係有口服劑型先算
            if cosmetic or not ORAL.search(t):
                continue
        if re.search(pat, t, re.I):
            return label
    return None


def main():
    apply = "--apply" in sys.argv
    c, bad = None, []
    total = 0
    while True:
        d = gql(Q, {"c": c})["products"]
        for p in d["nodes"]:
            total += 1
            cur = (p["productType"] or "").strip()
            want = expected(p["title"])
            if not want or want == cur:
                continue
            # 同一格入面嘅偏差（例如 面霜 vs 乳液）唔算擺錯格，唔報
            if SECTION.get(cur) and SECTION.get(cur) == SECTION.get(want):
                continue
            bad.append((p, cur, want))
        if not d["pageInfo"]["hasNextPage"]:
            break
        c = d["pageInfo"]["endCursor"]

    print(f"查咗 {total} 件，跨格擺錯 {len(bad)} 件\n")
    for p, cur, want in bad:
        print(f"  {cur or '(空)':<8} → {want:<8} {p['title'][:50]}")
        if apply:
            user_errors(gql(UP, {"id": p["id"], "t": want}), "productUpdate")
            # 錯格嘅 tag 一樣要清 —— 分類係夾 productType ＋ tags 兩樣
            drop = [t for t in (p["tags"] or [])
                    if t in ("保健品", "護膚", "彩妝", "身體護理", "頭髮護理")
                    and t != want and SECTION.get(t) != SECTION.get(want)]
            if drop:
                user_errors(gql(TAGS, {"id": p["id"], "t": drop}), "tagsRemove")
    if not apply and bad:
        print("\n加 --apply 先會真係改。")


if __name__ == "__main__":
    main()
