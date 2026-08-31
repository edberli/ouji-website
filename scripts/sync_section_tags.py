#!/usr/bin/env python3
"""令 section tag 同 productType 對得住 —— 唔好再逐件人手執。

2026-08-31 老闆：「好多分類都錯咗喎，洗頭水嗰啲呢，你就當咗係護膚。」
查實：94 件洗頭水／沐浴露／護髮油／身體乳掛住 `護膚`（同 `skincare`）
呢個 tag。網站係夾 **productType ＋ tags** 兩樣，所以一粒錯 tag 就足以
令一支洗頭水出現喺護膚頁。

呢啲 tag 係早期上架時一律照掛落去嘅，唔係逐件諗過。而家有咗準確嘅
productType，section tag 就唔應該再靠人手 —— 由型號推返出嚟，
講唔通嘅就刪。

⚠️ 只刪講唔通嗰啲，唔會加新 tag，亦唔會掂唔喺下面對照表入面嘅型號。
   分類重疊係老闆明確要求（潔面同時屬護膚同沐浴洗護），嗰種重疊係
   由 taxonomy 嘅 keywords 做，唔係靠 tag，所以刪錯 tag 唔會拆散佢哋。

    python3 scripts/sync_section_tags.py            # 睇下會刪乜
    python3 scripts/sync_section_tags.py --apply
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from shopify_admin import gql, user_errors  # noqa: E402

Q = """query($c:String){products(first:100, after:$c){pageInfo{hasNextPage endCursor}
  nodes{id title productType tags}}}"""
DEL = """mutation($id:ID!,$t:[String!]!){tagsRemove(id:$id, tags:$t){
  userErrors{field message}}}"""

# 型號 → 佢真正屬邊格。冇列出嘅型號一律唔郁。
SECTION = {}
for t in "潔面 爽膚水 棉片 精華 乳液 面霜 面膜 眼霜 防曬 局部護理 去角質 套裝護膚 護膚".split():
    SECTION[t] = "skin"
for t in ("底妝 粉底 氣墊粉底 氣墊 遮瑕 眼影 眼線 眼線筆 睫毛膏 眉筆 唇膏 唇釉 唇彩 "
          "唇蜜 胭脂 高光 修容 定妝噴霧 假睫毛 多用彩妝 唇部護理 唇線筆 妝前乳").split():
    SECTION[t] = "makeup"
for t in "洗髮 護髮 沐浴 身體護理 身體乳".split():
    SECTION[t] = "bath"
for t in "化妝工具 美髮工具 美容工具".split():
    SECTION[t] = "tools"
for t in "保健品".split():
    SECTION[t] = "health"
for t in "公仔 家品 零食 濕紙巾 口腔護理 成人用品 便攜風扇 玩具".split():
    SECTION[t] = "other"

# 每格唔可以出現嘅 tag
FORBID = {
    "bath":   {"護膚", "skincare", "彩妝", "makeup", "保健品"},
    "tools":  {"護膚", "skincare", "保健品"},
    "health": {"護膚", "skincare", "彩妝", "makeup"},
    "other":  {"護膚", "skincare", "彩妝", "makeup", "保健品"},
    "makeup": {"保健品"},
    "skin":   {"保健品"},
}


def main():
    apply = "--apply" in sys.argv
    c, n, tot = None, 0, 0
    while True:
        d = gql(Q, {"c": c})["products"]
        for p in d["nodes"]:
            sec = SECTION.get((p["productType"] or "").strip())
            if not sec:
                continue
            bad = sorted(set(p["tags"] or []) & FORBID[sec])
            if not bad:
                continue
            n += 1
            tot += len(bad)
            print(f"  [{p['productType']:<6}] {p['title'][:44]:<46} 刪 {bad}")
            if apply:
                user_errors(gql(DEL, {"id": p["id"], "t": bad}), "tagsRemove")
        if not d["pageInfo"]["hasNextPage"]:
            break
        c = d["pageInfo"]["endCursor"]
    print(f"\n{n} 件、{tot} 個 tag{'刪咗' if apply else '會刪'}"
          + ("" if apply else "\n加 --apply 先會真係改。"))


if __name__ == "__main__":
    main()
