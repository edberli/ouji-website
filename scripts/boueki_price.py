#!/usr/bin/env python3
"""Boueki 嘅貨跟返佢官網個價。

老闆 2026-08-29：「Boueki 嘅售價就跟返佢哋官網就得㗎啦。本身零售店好似係
平啲嘅，不過呢個可以跟返佢官網個價錢就得㗎啦。」

⚠️ 全店有 88 折。如果照抄官網價，客實際畀嘅係官網價 ×0.88，即係仍然平過
Boueki。所以要唔要「加價到折完等於官網價」係另一個決定 —— 呢個 script
淨係做老闆講嗰樣：**標價 = 官網價**，同時印返折後價同毛利畀人睇。

  python3 scripts/boueki_price.py            # 睇下會改乜
  python3 scripts/boueki_price.py --apply
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from shopify_admin import gql, user_errors  # noqa

SRC = Path(__file__).resolve().parent.parent / "boueki_variants.json"
FIND = """query($q:String!){products(first:1, query:$q){nodes{id title
  variants(first:5){nodes{id barcode price inventoryItem{unitCost{amount}}}}}}}"""
UP = """mutation($pid:ID!,$v:[ProductVariantsBulkInput!]!){
  productVariantsBulkUpdate(productId:$pid, variants:$v){userErrors{field message}}}"""
DISCOUNT = 0.88
FLOOR = 0.15          # 折完之後最少要有嘅毛利，同其他上架 script 一致


def main():
    apply = "--apply" in sys.argv
    src = {v["gtin"]: v for v in json.loads(SRC.read_text()) if v.get("gtin") and v.get("price")}
    n = 0
    for bc, v in src.items():
        d = gql(FIND, {"q": f"barcode:{bc}"})["products"]["nodes"]
        if not d:
            continue
        p = d[0]
        var = next((x for x in p["variants"]["nodes"] if (x["barcode"] or "").strip() == bc), None)
        if not var:
            continue
        new = float(v["price"])
        cur = float(var["price"])
        if abs(new - cur) < 0.01:
            continue
        cost = float((var["inventoryItem"]["unitCost"] or {}).get("amount") or 0)
        after = new * DISCOUNT
        margin = (after - cost) / after if after else 0
        # ⚠️ 全店 88 折。照抄官網價，Fiancee 幾隻身體噴霧折完會蝕本
        #    （成本 $79.8 vs 折後 $77.4）。老闆早幾個鐘先定過規矩：
        #    折完蝕本嘅要加到「折完 = 原價」。兩個指示夾埋就係：
        #    毛利夠 → 直接抄官網價；唔夠 → 標價 = 官網價 ÷ 0.88，
        #    咁客實際畀嘅仍然係官網價，但我哋唔使蝕。
        bumped = False
        if margin < FLOOR:
            new = round(new / DISCOUNT)
            after = new * DISCOUNT
            margin = (after - cost) / after if after else 0
            bumped = True
        if abs(new - cur) < 0.01:
            continue
        n += 1
        print(f"  {p['title'][:34]:<36} ${cur:>6.0f} → ${new:>6.0f}"
              f"  折後 ${after:>6.1f}  成本 ${cost:>5.1f}  毛利 {margin*100:>5.1f}%"
              f"{'  ←折完會蝕，加返' if bumped else ''}")
        if apply:
            user_errors(gql(UP, {"pid": p["id"], "v": [{"id": var["id"], "price": f"{new:.2f}"}]}),
                        "productVariantsBulkUpdate")
    print(f"\n{n} 件{'改咗' if apply else '會改（加 --apply）'}")


if __name__ == "__main__":
    main()
