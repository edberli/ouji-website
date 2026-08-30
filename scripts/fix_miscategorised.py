#!/usr/bin/env python3
"""執返擺錯格嘅產品 —— productType 同 section tag 兩樣一齊執。

由 `audit_types.py` 揪出嚟，逐件我親眼睇過先寫入呢張表。唔用純規則
自動改：規則會連「CLIO 網光亮肌**精華**氣墊粉底」都當成精華，
「星形痘痘貼 80**粒**」都當成保健品。

根因係 `tag_health.py` 同 `recategorize.py` 都係先夾成分詞
（維他命／膠原蛋白／酵素／穀胱甘肽），夾中就當保健品 —— 但成分只係
個名嘅一部分，**決定分類嘅係劑型**。兩個 script 已經一齊改咗。

第二個問題係 **tag**：網站係夾 productType ＋ tags，所以一粒錯 tag
一樣會令件貨行錯格。實例：AFC 五隻口服丸有四隻掛住 `護膚`，
所以佢哋一直出現喺護膚頁；HEVEBLUE 三支沐浴洗頭貨掛住 `保健品`。

  python3 scripts/fix_miscategorised.py            # 睇下會改乜
  python3 scripts/fix_miscategorised.py --apply
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from shopify_admin import gql, user_errors  # noqa: E402

UP = """mutation($id:ID!,$t:String!){productUpdate(product:{id:$id, productType:$t}){
  userErrors{field message}}}"""
ADD = """mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id, tags:$t){userErrors{field message}}}"""
DEL = """mutation($id:ID!,$t:[String!]!){tagsRemove(id:$id, tags:$t){userErrors{field message}}}"""
GET = """query($c:String){products(first:100, after:$c){pageInfo{hasNextPage endCursor}
  nodes{id title productType tags}}}"""

# ── 手改嗰批：productType 擺錯格 ──────────────────────────────
FIX = {
    # 成分詞壓過劑型，畀 tag_health.py 掃咗入保健品
    "8861743841438": ("潔面", "AKARAN 維C酵素亮肌卸妝啫喱"),
    "8860683075742": ("潔面", "OOTD 奇異果維他命 C 卸妝膏"),
    "8860689531038": ("精華", "numbuzin No.5 告別痘痘精華 維他命C"),
    "8835164831902": ("精華", "VT 維他命光感微針精華"),
    "8835165388958": ("精華", "VT 膠原蛋白微針精華"),
    "8835160637598": ("沐浴", "HEVEBLUE 鮭魚積雪草沐浴露"),
    "8835160703134": ("洗髮", "HEVEBLUE 鮭魚角蛋白積雪草洗髮露"),
    "8835160735902": ("護髮", "HEVEBLUE 鮭魚角蛋白積雪草護髮素"),
    # 用咗個唔喺分類表入面嘅型號，落唔到任何細分類
    "8861750198430": ("唇部護理", "蠟筆小新唇膏（原本「唇部護理」冇問題，統一）"),
    # 係掃，唔係眼影
    # （rosy rosa 兩支）
    # 係梳，唔係護髮產品
    # （MAPEPE 兩把）
    # 「洗髮水香味」係香味名，唔係劑型
    # （Fiancee 兩支）
    "8861766385822": ("防曬", "蠟筆小新防曬（原本「公仔」）"),
}

# 按標題認嗰批（同款有幾件，ID 逐個查太散）
BY_TITLE = [
    ("rosy rosa", "掃", "化妝工具"),
    ("MAPEPE", "梳", "美髮工具"),
    ("Fiancee", "護手霜", "護手霜"),
    ("Niconui", "匙扣", "公仔玩具"),
    ("隱形眼鏡盒", "", "隱形眼鏡配件"),
    ("入浴球", "", "沐浴"),
    ("fwee", "唇部精華", "唇部護理"),
    ("dasique", "潤唇膏", "唇部護理"),
]

# ── tag 只執「肯定衝突」嗰幾種 ──────────────────────────────
# ⚠️ 之前試過用一張「型號 → 格」對照表去反推，結果表入面漏咗「眼線筆」
#    「氣墊」「妝前乳」呢啲型號，就當佢哋唔屬彩妝，差啲刪走咗一支眼線筆
#    嘅「彩妝」tag。所以呢度反過嚟做：**只刪明顯講唔通嗰幾種**，
#    唔識就唔郁，亦都唔加新 tag。
ORAL = "保健品"
BODY = {"沐浴", "洗髮", "護髮", "身體護理", "身體乳"}
SKIN_MAKEUP = {"潔面", "爽膚水", "棉片", "精華", "乳液", "面霜", "面膜", "眼霜",
               "防曬", "局部護理", "去角質", "套裝護膚", "底妝", "粉底", "氣墊",
               "氣墊粉底", "遮瑕", "眼影", "眼線", "眼線筆", "睫毛膏", "眉筆",
               "唇膏", "唇釉", "唇彩", "唇蜜", "胭脂", "高光", "修容", "妝前乳",
               "定妝噴霧", "假睫毛", "多用彩妝", "唇部護理", "唇線筆", "潤唇膏"}


def bad_tags(ptype, tags):
    """返回應該刪走嘅 tag。唔肯定就返空 —— 寧願漏執，唔好執錯。"""
    t = set(tags or [])
    if ptype == ORAL:
        # 口服嘢唔係護膚品，亦唔係彩妝
        return sorted(t & {"護膚", "彩妝"})
    if ptype in BODY | SKIN_MAKEUP:
        # 外用嘢唔應該掛保健品
        return sorted(t & {ORAL, "美容食品", "inner beauty"})
    return []


def main():
    apply = "--apply" in sys.argv
    # 1. productType
    todo = dict(FIX)
    c = None
    all_products = []
    while True:
        d = gql(GET, {"c": c})["products"]
        all_products += d["nodes"]
        if not d["pageInfo"]["hasNextPage"]:
            break
        c = d["pageInfo"]["endCursor"]

    for p in all_products:
        t = p["title"] or ""
        for brand, word, newtype in BY_TITLE:
            if brand in t and (not word or word in t) and p["productType"] != newtype:
                todo[p["id"].rsplit("/", 1)[-1]] = (newtype, t[:44])

    by_id = {p["id"].rsplit("/", 1)[-1]: p for p in all_products}
    n = 0
    for pid, (newtype, label) in todo.items():
        p = by_id.get(pid)
        if not p or p["productType"] == newtype:
            continue
        n += 1
        print(f"  型號  {p['productType'] or '(空)':<8} → {newtype:<8} {label}")
        if apply:
            user_errors(gql(UP, {"id": p["id"], "t": newtype}), "productUpdate")
            p["productType"] = newtype

    # 2. 講唔通嘅 section tag
    m = 0
    for p in all_products:
        wrong = bad_tags(p["productType"] or "", p["tags"])
        if not wrong:
            continue
        m += 1
        print(f"  標籤  [{p['productType']:<8}] {p['title'][:40]:<42} 刪 {wrong}")
        if apply:
            user_errors(gql(DEL, {"id": p["id"], "t": wrong}), "tagsRemove")

    print(f"\n型號改 {n} 件、標籤改 {m} 件"
          + ("" if apply else "\n加 --apply 先會真係改。"))


if __name__ == "__main__":
    main()
