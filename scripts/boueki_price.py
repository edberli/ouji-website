#!/usr/bin/env python3
"""Boueki 嘅貨定價：折完要**平過**佢官網。

老闆 2026-08-29：
  1.「售價跟返佢哋官網」
  2.「如果你折完之後嘅價錢同官方一樣，就冇誘因，同埋啲人就會覺得係假折扣。
     所以你要定一個價，就係折完之後，都係要比官網平啲。」

所以規則係（全店 88 折）：
  目標折後價 = 官網價 × (1 − SAVE)     ← 客見到實際平過官網
  最低折後價 = 成本 ÷ (1 − FLOOR)      ← 唔可以蝕，同其他 script 一致 15%
  標價 = 折後價 ÷ 0.88，取整

⚠️ 有啲貨兩樣做唔到同時 —— 例如 Fiancee 身體噴霧成本 $79.8、官網賣 $88，
   要有 15% 毛利，折後就要 $93.9，已經貴過官網。呢啲會標記出嚟，
   毛利底線行先（唔賣蝕本），同時如實講明佢平唔過官網。

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
SAVE = 0.08          # 折後最少要平過官網幾多
MIN_SAVE = 0.03      # 成本高嘅貨，起碼都要平過官網咁多
FLOOR = 0.15         # 折後最低毛利


def main():
    apply = "--apply" in sys.argv
    src = {v["gtin"]: v for v in json.loads(SRC.read_text()) if v.get("gtin") and v.get("price")}
    n, bad = 0, []
    for bc, v in src.items():
        d = gql(FIND, {"q": f"barcode:{bc}"})["products"]["nodes"]
        if not d:
            continue
        p = d[0]
        var = next((x for x in p["variants"]["nodes"] if (x["barcode"] or "").strip() == bc), None)
        if not var:
            continue
        off = float(v["price"])
        cost = float((var["inventoryItem"]["unitCost"] or {}).get("amount") or 0)
        want = off * (1 - SAVE)                      # 想要嘅折後價
        floor = cost / (1 - FLOOR) if cost else 0    # 唔可以低過呢個
        after = want
        note = f"平官網 {SAVE*100:.0f}%"
        if after < floor:
            after = floor
            note = "毛利底線"
            # 如果連毛利底線價都貴過官網，就寧願要薄毛利都要平過官網 ——
            # 老闆：「折完同官方一樣就冇誘因，仲會俾人覺得係假折扣。」
            # 底線係唔可以蝕（毛利要 > 0）。
            if after > off * (1 - MIN_SAVE):
                thin = off * (1 - MIN_SAVE)
                if thin > cost:
                    after, note = thin, f"⚠ 薄毛利（成本高，只做到平 {MIN_SAVE*100:.0f}%）"
                else:
                    note = "⚠ 成本太高，平唔過官網"
                    bad.append((p["title"], off, after, cost))
        new = round(after / DISCOUNT)
        after = new * DISCOUNT
        cur = float(var["price"])
        if abs(new - cur) < 0.01:
            continue
        n += 1
        save = (off - after) / off * 100
        margin = (after - cost) / after * 100 if after else 0
        print(f"  {p['title'][:32]:<34} 官網${off:>5.0f}  標價${new:>5.0f}"
              f"  折後${after:>6.1f}（平{save:>5.1f}%）毛利{margin:>5.1f}%  {note}")
        if apply:
            user_errors(gql(UP, {"pid": p["id"], "v": [{"id": var["id"], "price": f"{new:.2f}"}]}),
                        "productVariantsBulkUpdate")
    print(f"\n{n} 件{'改咗' if apply else '會改（加 --apply）'}")
    if bad:
        print(f"\n⚠️ {len(bad)} 件成本太高，折完都平唔過官網（已按毛利底線定價）：")
        for t, off, after, cost in bad:
            print(f"   {t[:34]:<36} 官網${off:.0f}  我哋折後${after:.1f}  成本${cost:.1f}")


if __name__ == "__main__":
    main()
