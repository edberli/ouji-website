"""清洗 raw-oy／raw-cosme，每件揀 8 則，出翻譯批次。
python3 build.py            → work/clean.json + work/tr-in/*.json
規矩同舊 pipeline（scripts/oy_reviews*.py）一樣：剷 spam、剷重覆、剷講價錢；低分一定留。"""
import glob, html, json, os, re, sys
from difflib import SequenceMatcher

W = os.environ.get('REVIEWS_WORK', '/Volumes/core/AI-Workspace/Claude/ouji-reviews-fill-20261016/work')
SITE = os.environ.get('REVIEWS_SITE', os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
sys.path.insert(0, f'{SITE}/scripts')
from oy_reviews import ATTR_ZH, PRICE, clean, spammy  # noqa: E402

PER = 8
# 講店舖／送貨／客服而唔係講產品嘅評價：喺我哋產品頁出現等於幫人哋間舖講好說話，亦冇資訊。
SHOP = re.compile(r'yesstyle|olive ?young|customer service|shipping|shipped|delivery|delivered|arrived|package|parcel|packaging was|'
                  r'\bmy order\b|\bordered\b|\bseller\b|refund|配送|発送|梱包|届い|届き|到着|ショップ|店員|免税', re.I)
# 醫療功效字眼：評論係第三方講，但放喺我哋產品頁就等於我哋賣廣告 —— 香港《不良醫藥廣告條例》，一律唔收。
MED = re.compile(r'治っ|治る|治り|治療|完治|根治|治好|療效|療程|消炎|\bcur(?:e|ed|es|ing)\b|\bheal(?:ed|s)?\b|eczema|dermatitis|アトピー|皮膚炎|濕疹', re.I)
JP_PRICE = re.compile(r'コスパ|安い|安く|高い|お得|セール|割引|値段|価格|プチプラ|\d+円|円で|値上|値下|安価|高価|クーポン|ポイント')
ATTR_ZH = {**ATTR_ZH, 'Easy to blend': '易推勻', 'Coverage': '遮瑕力', 'Oil control': '控油', 'Hydration': '保濕度',
           'Moisturizing': '保濕度', 'Soothing': '舒緩', 'Cleansing power': '清潔力', 'Hair texture': '髮質',
           'Fragrance': '香味', 'Stickiness': '黏膩感', 'Lightweight': '輕盈感', 'Adhesion': '服貼度',
           'Low irritant': '低刺激', 'Absorbs quickly': '吸收快', 'Stretch': '延展度', 'Effective cleansing': '清潔力',
           'Soothe sensitive skin': '舒緩敏感肌', 'Softens the hair': '柔順頭髮', 'Easy to use': '易用', 'Finish': '妝效',
           'Freshness': '清新感', 'Flavor': '味道', 'Natural result': '自然效果', 'Fixing': '定妝力', 'Waterproof': '防水',
           'Volume': '濃密度', 'Curling': '捲翹度'}
PRICE_ATTR = {'Affordable', 'Value for money', 'Price', 'Cost-effective'}
SKIN = {'乾燥肌': '乾性肌', '混合肌': '混合性肌', '脂性肌': '油性肌', '普通肌': '中性肌', '敏感肌': '敏感肌',
        'アトピー肌': '異位性肌'}


def dedupe(rows):
    kept = []
    for r in rows:
        if any(r['who'] == k['who'] and SequenceMatcher(None, r['text'][:160], k['text'][:160]).ratio() > 0.8 for k in kept):
            continue
        kept.append(r)
    return kept


def pick(rows, low_cut):
    if len(rows) <= PER:
        return sorted(rows, key=lambda r: r['date'], reverse=True)
    low = [r for r in rows if r['star'] <= low_cut]
    chosen = [max(low, key=lambda r: min(len(r['text']), 400))] if low else []
    rest = sorted([r for r in rows if r not in chosen], key=lambda r: -min(len(r['text']), 400))
    chosen += rest[:PER - len(chosen)]
    return sorted(chosen, key=lambda r: r['date'], reverse=True)


def oy_rec(no):
    f = f'{W}/raw-oy/{no}.json'
    if not os.path.exists(f): return None
    d = json.load(open(f)); s = d['summary'] or {}
    if not s.get('totalReviewCount'): return None
    rows = []
    for r in d['reviews']:
        t = clean(r.get('conText'))
        if len(t) < 12 or spammy(t) or PRICE.search(t) or MED.search(t) or SHOP.search(t): continue
        dt = r.get('reviewRgstYmd') or ''
        rows.append({'star': int(r.get('previewScore') or 0), 'date': f'{dt[:4]}-{dt[4:6]}-{dt[6:]}', 'who': r.get('loginId') or '',
                     'shade': clean(r.get('snglOptnName') or ''), 'text': t,
                     'attrs': [{'name': ATTR_ZH.get(a['evltItemNm'], a['evltItemNm']), 'score': int(a['previewScore'])}
                               for a in (r.get('reviewEvltList') or []) if a.get('previewScore') and a['evltItemNm'] not in PRICE_ATTR]})
    rows = pick(dedupe(rows), 3)
    tot = sum(x['count'] for x in s.get('scores') or []) or 1
    dist = [{'star': i, 'count': n, 'pct': round(n / tot * 100)} for i in range(5, 0, -1)
            for n in [sum(x['count'] for x in s.get('scores') or [] if x['star'] == i)]]
    return {'source': 'Olive Young Global', 'src': 'oy', 'sourceRef': no, 'star': round(float(s['totalStarRate']), 1),
            'count': int(s['totalReviewCount']), 'dist': dist,
            'attrs': [{'name': ATTR_ZH.get(a['evltItemNm'], a['evltItemNm']), 'avg': a['rate']} for a in s.get('evltScores') or []
                      if a.get('rate') and a['evltItemNm'] not in PRICE_ATTR],
            'reviews': rows}


def mask(name):
    name = (name or '').strip()
    return (name[:2] + '*****') if name else '匿名'


def cosme_rec(pid):
    f = f'{W}/raw-cosme/{pid}.json'
    if not os.path.exists(f): return None
    d = json.load(open(f)); p = d.get('product') or {}
    if not d.get('total'):      # 評論少嘅頁冇「【クチコミN件】」標題，用品牌目錄嘅數
        for cf in glob.glob(f'{W}/cosme-cat/*.json'):
            c = next((x for x in json.load(open(cf)) if x['id'] == str(pid)), None)
            if c: d['total'] = c.get('count'); break
    if not p.get('star') or not d.get('total'): return None
    rows = []
    for r in d['full']:
        t = clean(r['text'])
        if len(t) < 15 or len(t) > 900 or JP_PRICE.search(t) or PRICE.search(t) or spammy(t) or MED.search(t) or SHOP.search(t): continue
        prof = [SKIN.get(x, x.replace('歳', '歲')) for x in r.get('profile') or []]
        rows.append({'star': r['star'], 'date': r['date'], 'who': ' · '.join([mask(r.get('who'))] + prof),
                     'shade': clean(r.get('shade') or ''), 'text': t, 'attrs': []})
    rows = pick(dedupe(rows), 4)
    return {'source': '@cosme', 'src': 'cosme', 'max': 7, 'sourceRef': pid, 'star': p['star'], 'count': int(d['total']),
            'dist': [], 'attrs': [], 'reviews': rows}


def ys_rec(pid):
    import datetime
    f = f'{W}/raw-ys/{pid}.json'
    if not os.path.exists(f): return None
    d = json.load(open(f)); o = d.get('overall') or {}
    if not d.get('rating') or not o.get('totalReviews'): return None
    rows = []
    for g in d['reviews']:
        for r in g.get('reviews') or []:
            t = clean('\n'.join(r.get('contentLines') or []))
            if len(t) < 12 or spammy(t) or PRICE.search(t) or MED.search(t) or SHOP.search(t): continue
            try: dt = datetime.datetime.strptime(r.get('datePosted', ''), '%B %d, %Y').strftime('%Y-%m-%d')
            except Exception: dt = ''
            rows.append({'star': round((g.get('rating') or 0) / 20), 'date': dt, 'who': mask(g.get('reviewerName')),
                         'shade': '', 'text': t, 'attrs': []})
    rows = pick(dedupe(rows), 3)
    cnt = o.get('reviewCount') or []
    tot = sum(cnt) or 1
    dist = [{'star': 5 - i, 'count': n, 'pct': round(n / tot * 100)} for i, n in enumerate(cnt[:5])]
    return {'source': 'YesStyle', 'src': 'ys', 'sourceRef': pid, 'star': round(float(d['rating']), 1),
            'count': int(o['totalReviews']), 'dist': dist, 'attrs': [], 'reviews': rows}


def main():
    out = {}
    for m in json.load(open(f'{W}/match-oy.json')) if os.path.exists(f'{W}/match-oy.json') else []:
        rec = oy_rec(m['no'])
        if rec: out[m['h']] = rec
    for m in json.load(open(f'{W}/match-cosme.json')) if os.path.exists(f'{W}/match-cosme.json') else []:
        if m['h'] in out: continue
        rec = cosme_rec(str(m['id']))
        if rec: out[m['h']] = rec
    for m in json.load(open(f'{W}/match-ys.json')) if os.path.exists(f'{W}/match-ys.json') else []:
        if m['h'] in out: continue
        rec = ys_rec(str(m['pid']))
        if rec: out[m['h']] = rec
    json.dump(out, open(f'{W}/clean.json', 'w'), ensure_ascii=False, indent=0)
    # 翻譯：用原文 hash 做鎖匙（見 trmap.py），同一段原文只譯一次
    from trmap import key, load
    have = load()
    todo, seen = [], set()
    for h, rec in out.items():
        for r in rec['reviews']:
            k = key(r['text'])
            if k in seen or k in have: continue
            seen.add(k); todo.append({'id': k, 'text': r['text']})
    os.makedirs(f'{W}/tr-in', exist_ok=True)
    queued = set()        # 已經出咗批次、等緊譯嘅（唔刪舊檔：子代理可能讀緊）
    for fn in glob.glob(f'{W}/tr-in/*.json'):
        queued |= {x['id'] for x in json.load(open(fn))}
    todo = [x for x in todo if x['id'] not in queued]
    B = 120
    import time
    tag = time.strftime('%H%M')          # 每輪獨立檔名，唔會蓋咗 tr-out 入面之前譯好嘅批次
    for i in range(0, len(todo), B):
        json.dump(todo[i:i + B], open(f'{W}/tr-in/r{tag}-{i // B:03d}.json', 'w'), ensure_ascii=False, indent=0)
    n = sum(len(v['reviews']) for v in out.values())
    print(f'{len(out)} handles · {n} reviews · 要譯 {len(todo)} 則 → {(len(todo) + B - 1) // B} 批 · 已譯 {len(have)}')
    from collections import Counter
    print(Counter(v['src'] for v in out.values()))


if __name__ == '__main__':
    main()
