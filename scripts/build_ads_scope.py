#!/usr/bin/env python3
"""Google 購物廣告投放範圍＋每件貨嘅出價級別 → data/ads-scope.json（api/google-feed.js 讀）。

規則 v2（2026-10-18，Winston：用專業揀最好方案、唔准放棄 Google 付費）：
  舊規則（護膚／洗護、售價 ≥ $100、每件淨賺 ≥ $40）只投「賺得多但少人買」嘅貨：
  60 日內喺 Google 賣得出嘅 54 個規格，31 個被排走（Torriden、Round Lab、AROMATICA…），
  因為佢哋價錢夠競爭、每件賺得少。v2 改為按「預計每單淨利 × 預計轉換率」計每件貨值得出幾多錢一次點擊：
    每件淨賺 N   = 售價 × 95.5%（扣手續費）− 成本
    預計每單淨利 = N − $21（我哋畀嘅運費平均約 $18 ＋ 包裝 $3；大部分廣告單得一件貨）
    預計轉換率   = 60 日內經 Google（廣告或免費 listing）賣出過 → 3%；其他 → 1%
    值得出價     = 每單淨利 × 轉換率 × 0.8（留兩成安全位），取最接近而唔高過嘅級別
  級別：cpc120／cpc080／cpc060／cpc040／cpc025／cpc015（Google Ads 產品群組按 custom_label_1 出價）。
  化妝品只投 Winston 10-11 批過嘅 26 款（已核唔貴過對手）＋ Google 賣過嘅規格。
  低過 $0.15 嘅貨唔出付費廣告（免費 listing 照出）。公仔、盲盒、隱形眼鏡、短效期、家品、食物、服飾等唔投。
  python3 scripts/build_ads_scope.py
"""
import collections, datetime, json, os, sys
sys.path.insert(0, os.path.join(os.path.expanduser(os.environ.get('OUJI_WEBSITE', '~/Documents/ouji-website')), 'scripts'))
from shopify_admin import gql

EXCLUDE_TYPES = {'隱形眼鏡', '公仔', '盲盒', '短效期特價', '家居香氛', '專輯', '配件', '掛件', '雜貨', '零食',
                 '玩具', '便攜風扇', '口腔護理'}
EXCLUDE_PREFIX = ('服飾', '襪類', '護具')
# 化妝品：沿用 Winston 2026-10-11 批嘅規則（只投已核實唔貴過最平對手同 Google 平均嘅款，即下面名單），
# 另加 60 日內經 Google 賣出過嘅規格（真實成交證明價錢有競爭力）。
MAKEUP_TYPES = {'唇釉', '胭脂', '眼影', '氣墊粉底', '眼線', '唇膏', '眉筆', '底妝', '眉妝', '高光', '睫毛膏', '彩妝',
                '修容', '粉底', '唇妝', '唇線筆', '唇彩', '唇蜜', '多用彩妝', '遮瑕', '定妝噴霧', '蜜粉', '妝前底霜',
                '眼線筆', '眼線液', '定妝', '妝前乳', '假睫毛', '化妝工具', '美甲貼', '美甲工具'}
VETTED_MAKEUP = {'8817694998686', '8817695096990', '8817695195294', '8807260553374', '8807260618910', '8814591770782',
                 '8817560715422', '8818803671198', '8818929008798', '8818931892382', '8818933727390', '8818937299102',
                 '8819135938718', '8819371606174', '8819372032158', '8819373342878', '8819374031006', '8819508183198',
                 '8819508740254', '8819509133470', '8819511001246', '8820286390430', '8820286521502', '8835163553950',
                 '8859481800862', '8883671859358'}
FEE, SHIP_PACK = 0.955, 21
CVR_PROVEN, CVR_DEFAULT, SAFETY = 0.03, 0.01, 0.8
BUCKETS = [1.20, 0.80, 0.60, 0.40, 0.25, 0.15]
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', 'ads-scope.json')

QP = """query($after:String){ products(first:100, after:$after, query:"status:active"){
 pageInfo{hasNextPage endCursor}
 edges{ node{ id productType variants(first:100){edges{node{ id price inventoryItem{unitCost{amount}} }}} }}}}"""
QO = """query($after:String,$q:String!){ orders(first:100, after:$after, query:$q){
 pageInfo{hasNextPage endCursor}
 edges{ node{ cancelledAt customAttributes{key value} lineItems(first:50){nodes{ variant{id} }} }}}}"""


def google_sellers():
    """60 日內經 Google（廣告 gclid／免費 listing）賣出過嘅規格。read_orders 最多睇 60 日。"""
    since = (datetime.date.today() - datetime.timedelta(days=59)).isoformat()
    out, after = set(), None
    while True:
        d = gql(QO, {'after': after, 'q': f'created_at:>={since}'})['orders']
        for e in d['edges']:
            n = e['node']
            if n['cancelledAt']:
                continue
            a = {x['key']: x['value'] for x in n['customAttributes']}
            click = (a.get('_src_clickid') or '').lower()
            if any(k in click for k in ('gclid=', 'gbraid=', 'wbraid=')) or a.get('_src_last') == 'google_organic':
                out |= {li['variant']['id'].split('/')[-1] for li in n['lineItems']['nodes'] if li.get('variant')}
        if not d['pageInfo']['hasNextPage']:
            break
        after = d['pageInfo']['endCursor']
    return out


def bucket(bid):
    if bid < BUCKETS[-1]:
        return None
    return next(b for b in BUCKETS if b <= bid)


def main():
    proven = google_sellers()
    cpc, seen, after = {}, 0, None
    while True:
        d = gql(QP, {'after': after})['products']
        for e in d['edges']:
            p = e['node']
            if p['productType'] in EXCLUDE_TYPES or p['productType'].startswith(EXCLUDE_PREFIX):
                seen += len(p['variants']['edges'])
                continue
            pid = p['id'].split('/')[-1]
            for v in (x['node'] for x in p['variants']['edges']):
                seen += 1
                cost = (v['inventoryItem'] or {}).get('unitCost')
                if not cost:
                    continue
                vid = v['id'].split('/')[-1]
                if p['productType'] in MAKEUP_TYPES and pid not in VETTED_MAKEUP and vid not in proven:
                    continue
                per_order = float(v['price']) * FEE - float(cost['amount']) - SHIP_PACK
                b = bucket(per_order * (CVR_PROVEN if vid in proven else CVR_DEFAULT) * SAFETY)
                if b:
                    cpc[vid] = f'cpc{round(b * 100):03d}'
        if not d['pageInfo']['hasNextPage']:
            break
        after = d['pageInfo']['endCursor']
    json.dump({'generated': datetime.date.today().isoformat(),
               'rule': 'v2：預計每單淨利 × 轉換率（Google 賣過 3%、其他 1%）× 0.8 → 出價級別',
               'variants': sorted(cpc),
               'cpc': dict(sorted(cpc.items()))}, open(OUT, 'w'), ensure_ascii=False, indent=0)
    c = collections.Counter(cpc.values())
    print(f'{len(cpc)} / {seen} 個規格入廣告範圍（Google 賣過嘅 {len(proven & set(cpc))} 個）→ {OUT}')
    print('級別：' + '、'.join(f'{k} {v}' for k, v in sorted(c.items(), reverse=True)))


if __name__ == '__main__':
    main()
