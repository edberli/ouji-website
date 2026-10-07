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
MIN_PRICE, MIN_NET, FEE = 100, 40, 0.955
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', 'ads-scope.json')

Q = """query($after:String){ products(first:100, after:$after, query:"status:active"){
 pageInfo{hasNextPage endCursor}
 edges{ node{ productType tags variants(first:100){edges{node{ id price inventoryItem{unitCost{amount}} }}} }}}}"""

def main():
    keep, seen, after = [], 0, None
    while True:
        d = gql(Q, {'after': after})['products']
        for e in d['edges']:
            p = e['node']
            for v in (x['node'] for x in p['variants']['edges']):
                seen += 1
                cost = (v['inventoryItem'] or {}).get('unitCost')
                if p['productType'] not in GROUPS or not cost:
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
