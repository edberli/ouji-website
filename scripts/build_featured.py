#!/usr/bin/env python3
"""重建 `featured.json` —— 每件貨嘅「單件毛利」百分位。

點解要有呢個檔：預設排序要平衡「客想要」同「舖頭賺唔賺」，
但 `featured.json` 係公開檔，**成本價唔可以出街**。所以只出百分位，
唔出銀碼 —— 0 = 最低毛利，100 = 最高。

點解係**銀碼毛利**唔係毛利率：一件 $148 賺 40% ＝ $59，
一件 $25 賺 60% ＝ $15。免運門檻 $250、客單價 $206，
真正付租嘅係銀碼，唔係百分比。

成本價由 Shopify `inventoryItem.unitCost` 攞（1,517 / 1,528 件有）。
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from shopify_admin import gql  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
Q = """query($c:String){ products(first:250, after:$c, query:"status:active"){
  pageInfo{ hasNextPage endCursor }
  nodes{ handle variants(first:1){ nodes{ price inventoryItem{ unitCost{ amount } } } } } } }"""


def main():
    prods, cur = [], None
    while True:
        d = gql(Q, {"c": cur})["products"]
        prods += d["nodes"]
        if not d["pageInfo"]["hasNextPage"]:
            break
        cur = d["pageInfo"]["endCursor"]

    profit = {}
    for p in prods:
        v = p["variants"]["nodes"]
        if not v:
            continue
        uc = (v[0].get("inventoryItem") or {}).get("unitCost")
        try:
            price = float(v[0]["price"])
            cost = float(uc["amount"]) if uc and uc.get("amount") else None
        except (TypeError, ValueError):
            continue
        if cost is None or price <= 0:
            continue
        profit[p["handle"]] = price - cost

    order = sorted(profit.items(), key=lambda kv: kv[1])
    n = len(order)
    rank = {h: round(i / max(n - 1, 1) * 100) for i, (h, _) in enumerate(order)}

    out = os.path.join(ROOT, "featured.json")
    json.dump({"profitRank": rank}, open(out, "w"), ensure_ascii=False,
              separators=(",", ":"), sort_keys=True)
    lo = [h for h, r in rank.items() if r < 5]
    print(f"{n} 件有成本價｜寫好 featured.json"
          f"（之前只有 202 件有排名）\n最低 5% 毛利：{len(lo)} 件")


if __name__ == "__main__":
    main()
