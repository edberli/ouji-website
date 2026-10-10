#!/usr/bin/env python3
"""Google 購物廣告投放範圍 → data/ads-scope.json（api/google-feed.js 讀）。

規則（2026-10-06，按 8/24–10/6 廣告數據定）：護膚／洗護類、規格售價 ≥ $100、
每件淨賺（售價 × 95.5% − 成本）≥ $40。冇成本嘅規格當唔合格。
唔合格嘅規格喺 feed 加 excluded_destination=Shopping_ads：唔出付費廣告，免費刊登照出。
  python3 scripts/build_ads_scope.py
"""
import json, os, sys, datetime
sys.path.insert(0, os.path.join(os.path.expanduser(os.environ.get('OUJI_WEBSITE', '~/Documents/ouji-website')), 'scripts'))
from shopify_admin import gql

GROUPS = {'防曬', '面膜', '精華', '潔面', '面霜', '爽膚水', '眼霜', '乳液', '套裝護膚', '局部護理', '去角質',
          '護膚', '護膚／手膜', '棉片', '唇部護理', '洗髮護髮', '沐浴', '身體護理', '身體噴霧', '頭髮護理', '沐浴護理', '護手霜'}
# 類別以外指定加入嘅產品（2026-10-08 Winston：CLIO 三款氣墊試廣告）；售價同淨賺條件照計
# 2026-10-11 Winston 批：定價 v3 後，化妝品只加「售價≥$100、每件淨賺≥$40、唔貴過最平對手同 Google 平均」嘅款
EXTRA_PRODUCTS = {'8817694998686', '8817695096990', '8817695195294', '8807260553374', '8807260618910', '8814591770782', '8817560715422', '8818803671198', '8818929008798', '8818931892382', '8818933727390', '8818937299102', '8819135938718', '8819371606174', '8819372032158', '8819373342878', '8819374031006', '8819508183198', '8819508740254', '8819509133470', '8819511001246', '8820286390430', '8820286521502', '8835163553950', '8859481800862', '8883671859358'}
MIN_PRICE, MIN_NET, FEE = 100, 40, 0.955
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', 'ads-scope.json')

Q = """query($after:String){ products(first:100, after:$after, query:"status:active"){
 pageInfo{hasNextPage endCursor}
 edges{ node{ id productType tags variants(first:100){edges{node{ id price inventoryItem{unitCost{amount}} }}} }}}}"""

def main():
    keep, seen, after = [], 0, None
    while True:
        d = gql(Q, {'after': after})['products']
        for e in d['edges']:
            p = e['node']
            for v in (x['node'] for x in p['variants']['edges']):
                seen += 1
                cost = (v['inventoryItem'] or {}).get('unitCost')
                if (p['productType'] not in GROUPS and p['id'].split('/')[-1] not in EXTRA_PRODUCTS) or not cost:
                    continue
                price = float(v['price'])
                if price >= MIN_PRICE and price * FEE - float(cost['amount']) >= MIN_NET:
                    keep.append(v['id'].split('/')[-1])
        if not d['pageInfo']['hasNextPage']:
            break
        after = d['pageInfo']['endCursor']
    json.dump({'generated': datetime.date.today().isoformat(),
               'rule': f'護膚／洗護、售價≥{MIN_PRICE}、每件淨賺≥{MIN_NET}',
               'variants': sorted(keep)}, open(OUT, 'w'), ensure_ascii=False, indent=0)
    print(f'{len(keep)} / {seen} 個規格入廣告範圍 → {OUT}')

if __name__ == '__main__':
    main()
