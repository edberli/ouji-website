#!/usr/bin/env python3
"""補返兩件冇 description 嘅產品 —— Google Search Console 報「description 欄位未填」。

根因：`fix_two.py`（2026-09-02，補相上線 Vitamin village／MAPEPE 嗰次）
淨係上載張相同 publish，**由頭到尾冇寫 descriptionHtml**。呢兩件貨
`description`／`descriptionHtml` 兩個欄一直都係空字串。

`api/product.js` 同 `analytics.js` 嘅 JSON-LD 生成器見到空 description
就會直接 `undefined` 唔出呢個欄 —— Google 判做「description 欄位未填」，
2026-09-04 嗰封 Search Console email 就係咁嚟。

呢個 script 淨係補呢兩件貨嘅文案，唔郁第三件。
"""
import sys

sys.path.insert(0, "scripts")
from shopify_admin import gql, user_errors

FIND = """query($q:String!){ products(first:5, query:$q){ nodes{ id title } } }"""
UPDATE = """mutation($p:ProductUpdateInput!){ productUpdate(product:$p){ userErrors{ field message } } }"""

DESCRIPTIONS = {
    "vitamin-village-意大利法羅發酵酵素-100-黃金版-2g-x-30條": """
<p><strong>Vitamin village 意大利法羅發酵酵素 100 黃金版 [2g x 30條]</strong></p>
<ul>
<li>英文名：Vitamin Village Italian Farro Grain Enzyme 100 Gold 30 sticks</li>
<li>成分：意大利法羅古麥（Farro）發酵酵素 50%（法羅麥 32%）、番薯濃縮粉 4%、16 種穀物混合粉 3%、19 種混合乳酸菌 0.25%</li>
<li>每包（2g）含：α-澱粉酶 1,000,000 unit、蛋白酶 4,000 unit</li>
<li>容量：2g × 30 條（60g，238kcal）</li>
<li>產地：韓國 Made in Korea</li>
</ul>
<div class="product-detail-images">
<img src="https://cdn.shopify.com/s/files/1/0765/3405/5070/files/vv-flat.jpg?v=1788320488" alt="Vitamin village 意大利法羅發酵酵素 100 黃金版" loading="lazy">
</div>
""".strip(),
    "mapepe天然木梳專用清潔刷": """
<p><strong>MAPEPE 天然木梳專用清潔刷</strong></p>
<ul>
<li>英文名：MAPEPE Hair Brush Cleaner</li>
<li>用途：專用嚟清潔天然鬃毛梳，將卡喺梳齒之間嘅頭髮同塵屑清走</li>
<li>用法：梳橫放，由梳齒底部插入清潔刷，向梳齒尖端方向梳出即可，重複幾次直至乾淨</li>
<li>物料：木柄 ＋ 不鏽鋼刷毛</li>
<li>重量：13g</li>
<li>產地：日本 Made in Japan</li>
</ul>
<div class="product-detail-images">
<img src="https://cdn.shopify.com/s/files/1/0765/3405/5070/files/mapepe-flat.jpg?v=1788320491" alt="MAPEPE 天然木梳專用清潔刷" loading="lazy">
</div>
""".strip(),
}


def main():
    for handle, html in DESCRIPTIONS.items():
        n = gql(FIND, {"q": f"handle:{handle}"})["products"]["nodes"]
        if not n:
            print(f"  ✗ 揾唔到 {handle}")
            continue
        p = n[0]
        user_errors(gql(UPDATE, {"p": {"id": p["id"], "descriptionHtml": html}}),
                    "productUpdate")
        print(f"  ✓ {p['title'][:50]}")


if __name__ == "__main__":
    main()
