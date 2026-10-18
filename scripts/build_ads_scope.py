#!/usr/bin/env python3
"""Google 購物廣告投放範圍＋每件貨嘅出價級別 → data/ads-scope.json（api/google-feed.js 讀）。

規則 v3（2026-10-18 晚，逐點核對另一個 AI 嘅批評、用 9/15–10/18 真數重做）：
  v2 三個錯：①「Google 賣過」連贈品都計（Round Lab 白樺樹面霜 60 日 5 件全部係滿額贈品，
  竟然升咗做最高一級 $1.50）；② 轉換率靠估（賣過 3%、冇賣過 1%）；③ 只計單件利潤，
  而 Google 廣告單平均買 2 件。v3 改為：
    每次點擊值幾多 = 預計轉換率 × 每張單最多可以用嘅廣告費
    每張單最多可以用嘅廣告費 = min(預計每單淨利 − $5, $50)    ← $50 係網店廣告目標，出價同目標用同一條數
    預計每單淨利 = 1.6 件 ×（售價 × 96.55% − 成本）− 運費 $15 − 包裝 $3 − 手續費 $2.35
      （Shopify Payments 實收 3.3–3.9% + 每單 $2.35；Google 廣告單平均 2 件，取 1.6 保守啲；
       呢件貨有 Google 真單就同真單淨利平均，模型當 2 張單）
    預計轉換率 = 加購率 × 加購後落單率 × 0.84（GA4 只記到約 84% 廣告點擊）
      加購率   =（GA4 呢件貨 Google 廣告落地嘅加購 + 4.9% × 60）÷（落地 session + 60）  ← 加購次數唔多過 session
      落單率   =（真單 + 30% × 10）÷（加購 + 10）      ← 真單只計真係俾錢買嗰件（贈品唔計）
      （4.9%、30% 係 9/15–10/18 範圍內貨品嘅實數：670 session、33 加購、12 張真單）
  出價級別 = 唔高過「每次點擊值幾多」嘅最高一級（標籤名係級別 ID，唔等於出價）：
    cpc120 $1.50｜cpc080 $1.00｜cpc060 $0.80｜cpc040 $0.65｜cpc025 $0.50｜cpc015 $0.40
  值唔到 $0.40 → 唔出付費廣告（免費 listing 照出）。
  已核實貴過屈臣氏／莎莎／HKTVmall 官方店一成以上嘅貨唔出付費廣告（PRICE_DEARER），留畀 11/5 定價檢討。
  化妝品同其他貨用同一條規則（v3 定價後 A／B 級唔貴過對手），未有自己加購／真單證據前最高 $0.40 試水；
  Maybelline、ROSY ROSA、STUDIO 17 定價高過莎莎，唔投。
  公仔、盲盒、隱形眼鏡、短效期、家品、食物、服飾等唔投。
  python3 scripts/build_ads_scope.py
"""
import collections, datetime, json, os, re, sys, urllib.parse
sys.path.insert(0, os.path.join(os.path.expanduser(os.environ.get('OUJI_WEBSITE', '~/Documents/ouji-website')), 'scripts'))
from shopify_admin import gql

EXCLUDE_TYPES = {'隱形眼鏡', '公仔', '盲盒', '短效期特價', '家居香氛', '專輯', '配件', '掛件', '雜貨', '零食',
                 '玩具', '便攜風扇', '口腔護理'}
EXCLUDE_PREFIX = ('服飾', '襪類', '護具')
# 化妝品（2026-10-19 改）：v3 最終版定價（10-15）之後，A／B 級品牌已經唔貴過最平主要對手，改價後 4 張化妝品單
# 全部嚟自 Google 免費 listing，所以同其他貨用同一條價值規則，唔再淨係限 10-11 批嘅 26 款。
# 只排走定價本身就高過莎莎嘅品牌：C 級陪襯（Maybelline、ROSY ROSA 跟萬寧／屈臣氏貨架價）同 D 級賺錢（STUDIO 17 最多貴 15%）
# —— Google 購物並排比價，呢啲貨俾點擊錢都唔會有人買。
ABOVE_MARKET_BRANDS = {'MAYBELLINE', 'ROSY ROSA', 'STUDIO 17'}
# 化妝品付費點擊 9 月（改價前）幾乎冇人加購、0 張單；改價後付費仲未有數據，所以未有自己加購／真單證據之前最高 $0.40 試水。
MAKEUP_TYPES = {'唇釉', '胭脂', '眼影', '氣墊粉底', '眼線', '唇膏', '眉筆', '底妝', '眉妝', '高光', '睫毛膏', '彩妝', '修容', '粉底',
                '唇妝', '唇線筆', '唇彩', '唇蜜', '多用彩妝', '遮瑕', '定妝噴霧', '蜜粉', '妝前底霜', '眼線筆', '眼線液', '定妝', '妝前乳',
                '假睫毛', '化妝工具', '美甲貼', '美甲工具'}
MAKEUP_TRIAL_CAP = 0.40
# 2026-10-18 核實貴過連鎖店一成以上（屈臣氏／HKTVmall 官方店 10-16 價按條碼對；UNOVE／d'Alba／Torriden 按品名同容量對莎莎）。
# Google 購物會將我哋同佢哋並排顯示，貴咗就唔會有人買，唔好為佢哋俾點擊錢。改價後喺度刪走。
PRICE_DEARER = {
    '48215366074526': "UNOVE 髮膜 2 支 $270；莎莎 2 支 $178",
    '48215602593950': "UNOVE 髮膜 2 支 $270；莎莎 2 支 $178",
    '48215602167966': "d'Alba 白松露噴霧 $158；屈臣氏／莎莎 $128",
    '48093437722782': "Torriden 5D 棉片 80 片 $118；莎莎 $95",
    '48093303832734': "SKIN1004 積雪草爽膚水 $185；屈臣氏 $139",
    '48093303144606': "SKIN1004 積雪草潔面乳 $99；屈臣氏 $89",
    '48093310091422': "Anua PDRN 噴霧 $110；屈臣氏 $99",
    '48208200597662': "MOEV 蘋果多酚洗髮水 $148；屈臣氏 $128",
    '48215599612062': "BOTANIST 沐浴露 $108；屈臣氏 $83",
    '48215600300190': "BOTANIST 沐浴露 $108；屈臣氏 $83",
    '48218296909982': "HETRAS 沐浴露 $105；屈臣氏 $88",
    '48083500236958': "hince 光澤氣墊 $168；HKTVmall 官方店 $138",
    '48083516883102': "hince 輕透粉底液 $258；HKTVmall 官方店 $198",
}
FEE_PCT, FEE_FLAT, SHIP, PACK = 0.0345, 2.35, 15, 3
UNITS, MARGIN_KEEP, CPA_CAP = 1.6, 5, 50
ATC_PRIOR, ATC_N, BUY_PRIOR, BUY_N, GA4_CAPTURE = 0.049, 60, 0.30, 10, 0.84
SHIP_COST = (('7-Eleven', 13), ('郵局', 13), ('順豐站', 25), ('智能櫃', 25), ('上門', 30), ('商店', 0), ('門市', 0))
TIERS = [(1.50, 'cpc120'), (1.00, 'cpc080'), (0.80, 'cpc060'), (0.65, 'cpc040'), (0.50, 'cpc025'), (0.40, 'cpc015')]
CAMPAIGN = '24151378266'
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', 'ads-scope.json')

QP = """query($after:String){ products(first:100, after:$after, query:"status:active"){
 pageInfo{hasNextPage endCursor}
 edges{ node{ id handle vendor productType variants(first:100){edges{node{ id price inventoryItem{unitCost{amount}} }}} }}}}"""
QO = """query($after:String,$q:String!){ orders(first:100, after:$after, query:$q){
 pageInfo{hasNextPage endCursor}
 edges{ node{ cancelledAt currentTotalPriceSet{shopMoney{amount}} shippingLine{title} customAttributes{key value}
   lineItems(first:50){nodes{ quantity currentQuantity variant{id product{id} inventoryItem{unitCost{amount}}}
     originalUnitPriceSet{shopMoney{amount}} discountedUnitPriceAfterAllDiscountsSet{shopMoney{amount}} }} }}}}"""


def money(x):
    return float(x['shopMoney']['amount'])


def handle_of(path):
    path = urllib.parse.unquote((path or '').split('?')[0], errors='ignore')
    if '/products/' not in path:
        return None
    return re.sub(r'[�%].*$', '', path.split('/products/')[1].strip('/'))  # _src_landing 會截斷


def google_orders(handles):
    """60 日內經 Google 嘅真單 → ({產品: [廣告單淨利]}, {產品: [廣告＋免費 listing 單淨利]}, 真係俾錢買過嘅規格)。
    轉換率只用廣告單（gclid）；每單淨利同化妝品「賣過」名單連免費 listing 單一齊計。
    客人撳入嗰件貨就係佢買嗰件（9/15–10/18 17 張廣告單 17 張都係），所以按落地頁計；冇落地頁先按俾錢嘅貨品計。
    贈品（俾錢 < 原價一半）唔計，Round Lab 白樺樹面霜就係咁誤升做最高一級。"""
    since = (datetime.date.today() - datetime.timedelta(days=59)).isoformat()
    ads, allg, paid_variants, after = collections.defaultdict(list), collections.defaultdict(list), set(), None
    while True:
        d = gql(QO, {'after': after, 'q': f'created_at:>={since}'})['orders']
        for e in d['edges']:
            n = e['node']
            if n['cancelledAt']:
                continue
            a = {x['key']: x['value'] for x in n['customAttributes']}
            click = (a.get('_src_clickid') or '').lower()
            is_ad = any(k in click for k in ('gclid=', 'gbraid=', 'wbraid='))
            if not (is_ad or a.get('_src_last') == 'google_organic'):
                continue
            total, cost, paid = money(n['currentTotalPriceSet']), 0.0, set()
            for li in n['lineItems']['nodes']:
                v, q = li.get('variant'), li['currentQuantity'] if li['currentQuantity'] is not None else li['quantity']
                if not v or not q:
                    continue
                uc = (v.get('inventoryItem') or {}).get('unitCost')
                cost += float(uc['amount']) * q if uc else 0
                if money(li['discountedUnitPriceAfterAllDiscountsSet']) >= 0.5 * money(li['originalUnitPriceSet']):
                    paid_variants.add(v['id'].split('/')[-1])
                    paid.add(v['product']['id'].split('/')[-1])
            title = (n.get('shippingLine') or {}).get('title') or ''
            ship = next((c for k, c in SHIP_COST if k in title), 20)
            margin = total - cost - total * FEE_PCT - FEE_FLAT - ship - PACK
            h = handle_of(a.get('_src_landing'))
            landed = handles.get(h) or next((pid for hh, pid in handles.items() if h and len(h) > 15 and hh.startswith(h)), None)
            for pid in ([landed] if landed in paid else paid):
                allg[pid].append(margin)
                if is_ad:
                    ads[pid].append(margin)
        if not d['pageInfo']['hasNextPage']:
            break
        after = d['pageInfo']['endCursor']
    return ads, allg, paid_variants


def ga4_landing(handles):
    """60 日內 Google 廣告落地 session 同加購（按產品頁）。GA4 用 ouji-dash 嘅憑證；攞唔到就當冇數（只用先驗）。"""
    try:
        sys.path.insert(0, '/Volumes/core/Projects/OUJI/Commerce-and-Operations/ouji-dash/bin')
        from src_ga4 import session, report, rows_of
        since = (datetime.date.today() - datetime.timedelta(days=59)).isoformat()
        p = report(session(), ['landingPage', 'sessionGoogleAdsCampaignId'], ['sessions', 'addToCarts'],
                   since, datetime.date.today().isoformat())
    except Exception as e:  # noqa: BLE001
        print(f'⚠️ GA4 攞唔到（{str(e)[:80]}），轉換率只用先驗＋真單')
        return {}
    out = collections.defaultdict(lambda: [0.0, 0.0])
    for dims, m in rows_of(p):
        pid = handles.get(handle_of(dims[0]))
        if pid and dims[1] == CAMPAIGN:
            out[pid][0] += float(m[0])
            out[pid][1] += float(m[1])
    return out


def tier(value):
    return next((label for bid, label in TIERS if bid <= round(value, 2)), None)


def main():
    products, after = [], None
    while True:
        d = gql(QP, {'after': after})['products']
        products += [e['node'] for e in d['edges']]
        if not d['pageInfo']['hasNextPage']:
            break
        after = d['pageInfo']['endCursor']
    handles = {p['handle']: p['id'].split('/')[-1] for p in products}
    ad_orders, all_orders, proven = google_orders(handles)
    landing = ga4_landing(handles)
    cpc, value, seen, dearer = {}, {}, 0, 0
    for p in products:
        seen += len(p['variants']['edges'])
        if p['productType'] in EXCLUDE_TYPES or p['productType'].startswith(EXCLUDE_PREFIX):
            continue
        if (p.get('vendor') or '').strip().upper() in ABOVE_MARKET_BRANDS:
            continue
        pid = p['id'].split('/')[-1]
        sess, atc = landing.get(pid, (0.0, 0.0))
        atc = min(atc, sess)  # 一個 session 加購幾次只當一次
        margins = all_orders.get(pid, [])
        buy = min((len(ad_orders.get(pid, [])) + BUY_PRIOR * BUY_N) / (atc + BUY_N), 0.8)
        cvr = (atc + ATC_PRIOR * ATC_N) / (sess + ATC_N) * buy * GA4_CAPTURE
        for v in (x['node'] for x in p['variants']['edges']):
            cost = (v['inventoryItem'] or {}).get('unitCost')
            if not cost:
                continue
            vid = v['id'].split('/')[-1]
            if vid in PRICE_DEARER:
                dearer += 1
                continue
            model = UNITS * (float(v['price']) * (1 - FEE_PCT) - float(cost['amount'])) - SHIP - PACK - FEE_FLAT
            per_order = (sum(margins) + model * 2) / (len(margins) + 2)
            val = cvr * max(0.0, min(per_order - MARGIN_KEEP, CPA_CAP))
            if p['productType'] in MAKEUP_TYPES and not ad_orders.get(pid) and atc < 2:
                val = min(val, MAKEUP_TRIAL_CAP)
            t = tier(val)
            if t:
                cpc[vid], value[vid] = t, round(val, 2)
    # data/ 係公開檔：只放 feed 要用嘅級別，唔放每件貨嘅點擊價值（出價細節留喺 log）
    json.dump({'generated': datetime.date.today().isoformat(),
               'rule': 'v3：按預計轉換率 × 每單可用廣告費分級，出價唔高過每次點擊價值',
               'variants': sorted(cpc),
               'cpc': dict(sorted(cpc.items()))}, open(OUT, 'w'), ensure_ascii=False, indent=0)
    c = collections.Counter(cpc.values())
    print(f'{len(cpc)} / {seen} 個規格入廣告範圍（Google 真單貨 {len(proven & set(cpc))} 個；貴過連鎖店唔投 {dearer} 個；'
          f'GA4 落地數 {"有" if landing else "冇"}）→ {OUT}')
    top = sorted(value.items(), key=lambda kv: -kv[1])[:8]
    print('最高價值：' + '、'.join(f'{k} ${v:.2f}' for k, v in top))
    print('級別：' + '、'.join(f'{k}（${dict((l, b) for b, l in TIERS)[k]:.2f}）{v}' for k, v in sorted(c.items(), reverse=True)))


if __name__ == '__main__':
    main()
