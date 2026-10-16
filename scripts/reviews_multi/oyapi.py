"""Olive Young Global 嘅 JSON API（session + CSRF）。"""
import os
import json, re, time, urllib.request, http.cookiejar

UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36'
BASE = 'https://global.oliveyoung.com'


class OY:
    def __init__(self, seed='GA240222182'):
        self.cj = http.cookiejar.CookieJar()
        self.op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.cj))
        self.ref = f'{BASE}/product/detail?prdtNo={seed}'
        h = self.get(self.ref)
        self.tok = re.search(r'name="_csrf" content="([^"]+)"', h).group(1)
        self.hdr = re.search(r'name="_csrf_header" content="([^"]+)"', h).group(1)

    def get(self, url):
        return self.op.open(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=30).read().decode('utf-8', 'replace')

    def post(self, path, body, ref=None):
        req = urllib.request.Request(
            BASE + path, data=json.dumps(body).encode(), method='POST',
            headers={'User-Agent': UA, 'Content-Type': 'application/json;charset=UTF-8',
                     'Accept': 'application/json, text/plain, */*', 'X-Requested-With': 'XMLHttpRequest',
                     'Referer': ref or self.ref, 'Origin': BASE, self.hdr: self.tok})
        r = self.op.open(req, timeout=30)
        return json.loads(r.read().decode())

    def detail(self, no):
        return self.post('/product/detail-data', {'prdtNo': no}, f'{BASE}/product/detail?prdtNo={no}')['product']

    def _param(self, p):
        return {'filterYn': 'N', 'prdtNo': p['prdtNo'], 'prdtGbnCode': p.get('prdtGbnCode'),
                'movReviewYn': 'N', 'photoReviewYn': 'N', 'optnYn': p.get('optnYn'),
                'transUseYn': 'N', 'filterUseYn': p.get('filterUseYn')}

    def summary(self, p):
        return self.post('/product/review-summary', self._param(p), f'{BASE}/product/detail?prdtNo={p["prdtNo"]}')

    def reviews(self, p, page=1, rows=20, sort='10'):
        q = self._param(p); q.update(pageNum=page, rowsPerPage=rows, sort=sort)
        return self.post('/product/review-list', q, f'{BASE}/product/detail?prdtNo={p["prdtNo"]}')
