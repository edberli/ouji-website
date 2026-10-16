"""將 clean.json＋譯文寫入網站 data/。
python3 merge.py           # dry run
python3 merge.py --write
兩個檢查（同舊 merge_reviews.py）：冇譯文嘅評價唔放；譯文長過原文好多就標出嚟。"""
import argparse, glob, json, os, sys
W = os.environ.get('REVIEWS_WORK', '/Volumes/core/AI-Workspace/Claude/ouji-reviews-fill-20261016/work')
SITE = os.environ.get('REVIEWS_SITE', os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
TAIL = '冇改動內容，亦冇刪走負評。只顯示我哋有貨嘅色號，同價錢有關嘅評價唔會收錄（兩邊售價唔同）。'
NOTE = {
    'oy': '以下評價由 Olive Young 顧客撰寫，OUJI 原文引用、只加中文翻譯，' + TAIL,
    'cosme': '以下評價由日本 @cosme 會員撰寫，OUJI 原文引用、只加中文翻譯，' + TAIL + '@cosme 用 7 分制評分，分數照原樣顯示。',
    'ys': '以下評價由 YesStyle 顧客撰寫，OUJI 原文引用、只加中文翻譯，' + TAIL,
}


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--write', action='store_true'); a = ap.parse_args()
    clean = json.load(open(f'{W}/clean.json'))
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from trmap import key, load
    tr = load()
    idx = json.load(open(f'{SITE}/data/ratings.json'))
    missing, padded, out = 0, [], {}
    for h, d in clean.items():
        rows = []
        for r in d['reviews']:
            t = tr.get(key(r['text']))
            if not t: missing += 1; continue
            if '人手處理' in t['zh'] or '[歌詞' in t['zh'] or '非產品評論' in t['zh']:      # 子代理標咗唔譯（例如歌詞）→ 呢則唔放
                continue
            zh = t['zh'].strip()
            if zh.startswith('「') and zh.endswith('」') and not r['text'].lstrip().startswith(('「', '"', '“')):
                zh = zh[1:-1].strip()
            t = {**t, 'zh': zh}
            lim = 1.3 if d['src'] != 'cosme' else 1.6   # 日文譯中文長度比例唔同
            if len(t['zh']) > len(r['text']) * lim and len(r['text']) > 40:
                padded.append(f"{h}  原文{len(r['text'])} → 譯文{len(t['zh'])}")
            rows.append({**r, 'zh': t['zh'], 'lang': t.get('lang') or ''})
        out[h] = {**d, 'reviews': rows, 'note': NOTE[d['src']]}
    n = sum(len(v['reviews']) for v in out.values())
    print(f'{len(out)} handles · {n} 則評價 · 漏譯 {missing} · 譯文偏長 {len(padded)}')
    for x in padded[:10]: print('   ', x)
    if not a.write:
        print('（dry run）'); return
    os.makedirs(f'{SITE}/data/reviews', exist_ok=True)
    for h, v in out.items():
        e = {'star': v['star'], 'count': v['count']}
        if v['src'] != 'oy': e['src'] = v['src']
        if v.get('max'): e['max'] = v['max']
        if v['reviews']:
            e['text'] = 1
            json.dump(v, open(f'{SITE}/data/reviews/{h}.json', 'w'), ensure_ascii=False, separators=(',', ':'))
        idx['products'][h] = e
    json.dump(idx, open(f'{SITE}/data/ratings.json', 'w'), ensure_ascii=False, separators=(',', ':'))
    print('寫咗', len(out), '件；索引共', len(idx['products']))


if __name__ == '__main__':
    main()
