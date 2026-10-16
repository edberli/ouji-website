"""@cosme（www.cosme.net）抓取：品牌產品列表、產品評分、評論列表、評論全文。
頁面係 Shift_JIS（cp932），全部伺服器直出。評分係 7 分制。"""
import os
import html, re, time, urllib.request

UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36'
BASE = 'https://www.cosme.net'


import threading
_lock = threading.Lock()
_last = [0.0]
GAP = 5.0          # @cosme 會限流（約 100 個請求就封 5 分鐘）：全程序共用一條隊，每 5 秒最多一個請求


class Blocked(Exception):
    pass


def _fetch(url):
    with _lock:
        wait = _last[0] + GAP - time.time()
        if wait > 0: time.sleep(wait)
        _last[0] = time.time()
    b = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=30).read()
    try:
        h = b.decode('cp932')
    except UnicodeDecodeError:
        try:
            h = b.decode('utf-8')
        except UnicodeDecodeError:
            h = b.decode('cp932', 'replace')
    if len(h) < 20000 and 'アクセスを制限' in h:
        raise Blocked(url)
    return h


def get(url, tries=3, block_waits=8):
    for i in range(tries + block_waits):
        try:
            return _fetch(url)
        except Blocked:
            print('  @cosme 限流，等 5 分鐘', flush=True)
            time.sleep(300)
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return ''
            time.sleep(3 * (i + 1))
        except Exception:
            time.sleep(3 * (i + 1))
    raise Blocked(url)


def text(s):
    s = re.sub(r'<br\s*/?>', '\n', s or '')
    s = re.sub(r'<[^>]+>', '', s)
    s = html.unescape(s).replace('\r', '')
    s = re.sub(r'[ \t　]+', ' ', s)
    s = '\n'.join(x.strip() for x in s.split('\n'))
    return re.sub(r'\n{3,}', '\n\n', s).strip()


def brand_products(bid, max_pages=60, sleep=0):
    out, seen = [], set()
    for page in range(1, max_pages + 1):
        h = get(f'{BASE}/brands/{bid}/product/?page={page}')
        blocks = re.split(r'<div class="productInformation">', h)[1:]
        new = 0
        for b in blocks:
            b = b.split('starReviewer_small')[0]
            m = re.search(r'products/(\d+)/"\s*>([^<]+)</a></h4>', b)
            if not m or m.group(1) in seen:
                continue
            seen.add(m.group(1)); new += 1
            star = re.search(r'<li class="top">.*?<strong>([\d.]+)</strong>', b, re.S)
            cnt = re.search(r'class="count">([\d,]+)</a>', b)
            cats = re.findall(r'categories/item/\d+/">([^<]+)</a>', b)
            price = re.search(r'容量・税込価格：<span>(.*?)</span>', b, re.S)
            rel = re.search(r'発売日：<span>(.*?)</span>', b)
            out.append({'id': m.group(1), 'name': text(m.group(2)),
                        'star': float(star.group(1)) if star else None,
                        'count': int(cnt.group(1).replace(',', '')) if cnt else 0,
                        'cats': cats, 'size': text(price.group(1))[:160] if price else '',
                        'release': rel.group(1) if rel else ''})
        if not new:
            break
    return out


def product(pid):
    """產品頁：品牌／名稱、平均分（7 分制）、評論數、色號。"""
    h = get(f'{BASE}/products/{pid}/')
    if not h:
        return None
    t = re.search(r'<title>(.*?)</title>', h)
    avg = re.search(r'<p class="average[^"]*">([\d.]+)</p>', h)
    bid = re.search(r'"page_brand_id":(\d+)', h)
    return {'id': pid, 'title': text(t.group(1)).split('の公式商品情報')[0] if t else '',
            'star': float(avg.group(1)) if avg else None,
            'brand_id': int(bid.group(1)) if bid else None}


def review_list(pid, page=1):
    h = get(f'{BASE}/products/{pid}/review/' + (f'?page={page}' if page > 1 else ''))
    rows = []
    total = re.search(r'【クチコミ([\d,]+)件】', h)
    for rid, s in re.findall(r'<!-- reviewId: (\d+) -->(.*?)<!-- /review-sec -->', h, re.S):
        r = re.search(r'reviewer-rating rtg-(\d)', s)
        ex = re.search(r'<p class="read">(.*?)<span class="read-more">', s, re.S)
        who = re.search(r'<span class="reviewer-name">(.*?)</span>', s)
        prof = re.findall(r'<li>([^<]{1,12})</li>', s)
        d = re.search(r'class="mobile-date">([\d/]+)', s)
        rows.append({'rid': rid, 'star': int(r.group(1)) if r else None,
                     'excerpt': text(ex.group(1)) if ex else '', 'who': text(who.group(1)) if who else '',
                     'profile': prof[:2], 'date': d.group(1).replace('/', '-') if d else '',
                     'bought': '購入品' in s})
    return rows, (int(total.group(1).replace(',', '')) if total else None)


def review_full(rid):
    h = get(f'{BASE}/reviews/{rid}/')
    if not h:
        return None
    body = h[h.find('<div class="body">'):] if '<div class="body">' in h else h
    t = re.search(r'<p class="read">(.*?)</p>', body, re.S)
    r = re.search(r'reviewer-rating rtg-(\d)', body)
    d = re.search(r'class="mobile-date">([\d/]+)', body)
    shade = re.findall(r'variations/\d+/">\s*<img[^>]*alt="([^"]*)"', body[:6000])
    pid = re.search(r'"page_product_id":(\d+)', h)
    return {'rid': rid, 'text': text(t.group(1)) if t else '', 'star': int(r.group(1)) if r else None,
            'date': d.group(1).replace('/', '-') if d else '', 'shade': text(shade[0]) if shade else '',
            'pid': pid.group(1) if pid else None}
