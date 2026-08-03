#!/usr/bin/env python3
"""
Scrape CLIO's Hong Kong site (clio.com.hk).

Unlike the Cafe24 Korean storefronts, CLIO has a local site whose copy is
already Traditional Chinese — product names, award lines, feature bullets
and shade lists — so nothing needs translating. Its imagery is hosted on
the distributor's WordPress (ohmyglow.co), which serves fine to a plain
client even though the HTML pages sit behind Cloudflare.

    python3 scripts/fetch_clio_hk.py index          # build the catalogue index
    python3 scripts/fetch_clio_hk.py show 525919    # dump one product
    python3 scripts/fetch_clio_hk.py fetch 525919 clio-kill-brow-auto-hard

Category listings are paginated through an htmx partial, so the index
walks those rather than the visible first page.
"""
import html
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request

SITE = "https://clio.com.hk"
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
CATEGORIES = ["底妝", "唇妝", "眼妝"]
INDEX = "brands/clio/catalogue.json"
IMG = re.compile(r'https://www\.ohmyglow\.co/wp-content/uploads/[^"\'  )]+?\.(?:jpg|jpeg|png|gif|webp)', re.I)


class Redirect308(urllib.request.HTTPRedirectHandler):
    """The site 308s every .html path to its extensionless form, and
    urllib raises rather than follows on 308."""
    def http_error_308(self, req, fp, code, msg, headers):
        return self.http_error_301(req, fp, 301, msg, headers)


_opener = urllib.request.build_opener(Redirect308)


def get(url, tries=3):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Referer": SITE + "/"})
    for i in range(tries):
        try:
            return _opener.open(req, timeout=45).read().decode("utf-8", "ignore")
        except Exception:
            if i == tries - 1:
                return ""
            time.sleep(2 ** i)


def category_ids(name):
    """Walk a category through its htmx pagination partial."""
    first = get(f"{SITE}/category/{urllib.parse.quote(name)}")
    ids = list(dict.fromkeys(re.findall(r"/product/(\d+)", first)))
    m = re.search(r'hx-get="(/partials/\d+/\d+)/\d+\.html"', first)
    if not m:
        return ids
    page = 2
    while page < 40:
        more = re.findall(r"/product/(\d+)", get(f"{SITE}{m.group(1)}/{page}.html"))
        fresh = [i for i in dict.fromkeys(more) if i not in ids]
        if not fresh:
            break
        ids += fresh
        page += 1
    return ids


def product(pid):
    s = get(f"{SITE}/product/{pid}")
    if not s:
        return None
    title = re.search(r"<title>(.*?)</title>", s, re.S)
    title = html.unescape(title.group(1)).replace(" - CLIO", "").strip() if title else ""
    price = re.search(r"HKD?\$\s?([0-9,]+)", s)
    imgs = [u for u in dict.fromkeys(IMG.findall(s)) if "clio-logo" not in u and "banner" not in u]
    cover = next((u for u in imgs if "cover" in u.lower()), imgs[0] if imgs else None)
    detail = [u for u in imgs if u != cover]

    body = re.sub(r"<script.*?</script>", " ", s, flags=re.S)
    body = re.sub(r"<style.*?</style>", " ", body, flags=re.S)
    body = html.unescape(re.sub(r"<[^>]+>", "\n", body))
    lines = [ln.strip() for ln in body.split("\n") if ln.strip()]
    return {
        "id": pid,
        "title": title,
        "price": price.group(1).replace(",", "") if price else None,
        "cover": cover,
        "detail": detail,
        "lines": lines,
    }


def build_index():
    ids = []
    for c in CATEGORIES:
        got = category_ids(c)
        print(f"  {c}: {len(got)}")
        ids += [i for i in got if i not in ids]
    out = {}
    for n, pid in enumerate(ids, 1):
        p = product(pid)
        if not p:
            continue
        out[pid] = {k: p[k] for k in ("title", "price", "cover", "detail")}
        print(f"  [{n}/{len(ids)}] {pid} ${p['price'] or '?':>4} {len(p['detail']):>3}img  {p['title'][:60]}")
    os.makedirs(os.path.dirname(INDEX), exist_ok=True)
    with open(INDEX, "w") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print(f"\n{len(out)} 個產品寫入 {INDEX}")


def save(url, dest):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Referer": SITE + "/"})
    data = _opener.open(req, timeout=60).read()
    with open(dest, "wb") as f:
        f.write(data)
    return len(data)


def fetch(pid, slug):
    p = product(pid)
    if not p:
        raise SystemExit(f"{pid} not reachable")
    for group, urls in (("gallery", [p["cover"]]), ("detail", p["detail"])):
        outdir = os.path.join("brands", "clio", group)
        os.makedirs(outdir, exist_ok=True)
        for i, u in enumerate([u for u in urls if u], 1):
            ext = os.path.splitext(urllib.parse.urlparse(u).path)[1] or ".jpg"
            dest = os.path.join(outdir, f"{slug}-{i:02d}{ext}")
            try:
                n = save(u, dest)
                print(f"  {n/1024:7.0f}KB  {group}/{os.path.basename(dest)}")
            except Exception as e:
                print(f"  FAIL         {os.path.basename(dest)}  {e}")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "index"
    if cmd == "index":
        build_index()
    elif cmd == "show":
        print(json.dumps(product(sys.argv[2]), ensure_ascii=False, indent=1))
    elif cmd == "fetch":
        fetch(sys.argv[2], sys.argv[3])
