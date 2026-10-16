"""YesStyle：搜尋（伺服器直出列表）＋評論 API（api.yesstyle.com，需要頁面 token）。評分 5 分制。"""
import os
import html, json, re, time, urllib.parse, urllib.request

UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36'
_tok = [None]


def get(url):
    for i in range(3):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=40).read().decode('utf-8', 'replace')
        except Exception:
            time.sleep(4 * (i + 1))
    return ''


def token(h=None):
    if _tok[0] is None:
        h = h or get('https://www.yesstyle.com/en/list.html?q=cosrx')
        m = re.search(r'\\"token\\":\\"([^\\]+)\\"', h)
        _tok[0] = m.group(1) if m else ''
    return _tok[0]


def search(q):
    h = get('https://www.yesstyle.com/en/list.html?q=' + urllib.parse.quote_plus(q))
    token(h)
    out, seen = [], set()
    for blk in re.split(r'<a class="[^"]*itemContainer[^"]*"', h)[1:]:
        m = re.search(r'href="(/en/([a-z0-9-]+)/info\.html/pid\.(\d+))"', blk[:600])
        if not m or m.group(3) in seen: continue
        seen.add(m.group(3))
        nm = re.search(r'itemTitle[^>]*>([^<]+)<', blk) or re.search(r'<img[^>]*alt="([^"]{8,})"', blk)
        cnt = re.search(r'newReviewCount[^>]*>([\d,]+)<', blk)
        out.append({'pid': m.group(3), 'slug': m.group(2), 'name': html.unescape(nm.group(1)) if nm else m.group(2).replace('-', ' '),
                    'url': m.group(1), 'count': int(cnt.group(1).replace(',', '')) if cnt else 0})
    return out


def reviews(pid, page=1, sort='130'):
    body = {'token': token(), 'locale': 'en', 'countryId': 98, 'currencyCode': 'HKD', 'productId': int(pid),
            'pageNum': page, 'sortByOptionId': sort, 'reviewerRatingFilterOptionId': 8}
    path = '/api/public/product/productDataReview' + ('-init' if page == 1 else '')
    req = urllib.request.Request('https://api.yesstyle.com' + path, data=json.dumps(body).encode(), method='POST',
                                 headers={'User-Agent': UA, 'Content-Type': 'application/json',
                                          'Origin': 'https://www.yesstyle.com', 'Referer': 'https://www.yesstyle.com/'})
    return json.loads(urllib.request.urlopen(req, timeout=40).read().decode())
