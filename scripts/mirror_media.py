#!/usr/bin/env python3
"""
Hand Shopify the bytes instead of a URL.

`repair_failed_media.py` documents the failure this avoids: Shopify fetches
product media itself, StyleKorean's CloudFront and several Cafe24 hosts
refuse its fetcher, and productSet reports success because only the
*asynchronous* fetch fails. Fifty-six live products came out as blank cards
before anyone noticed.

So this range never asks Shopify to fetch. Each source image is downloaded
here, put through a staged upload, and the returned resourceUrl is what
productSet is given. Downloads land on the external volume, not the
internal SSD, and both the download and the staged URL are cached so a
rebuild costs nothing.

    from mirror_media import mirror
    urls = mirror(["https://…/a.png", "https://…/b.jpg"], "solep-shampoo")
"""
import hashlib
import json
import os
import sys
import urllib.parse
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from upload_files import upload  # noqa: E402

WORK = "/Volumes/core/ouji-brands14/media"
CACHE = "/Volumes/core/ouji-brands14/staged.json"
UA = {"User-Agent": ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                     "AppleWebKit/537.36 Chrome/120 Safari/537.36")}

# A staged upload URL is single-use-ish and short-lived, but a build run
# publishes within minutes of mirroring, so caching it inside one session
# is safe and caching the *download* across sessions is the expensive half.
_staged = None


def _cache():
    global _staged
    if _staged is None:
        _staged = json.load(open(CACHE)) if os.path.exists(CACHE) else {}
    return _staged


def _save():
    os.makedirs(os.path.dirname(CACHE), exist_ok=True)
    with open(CACHE, "w") as f:
        json.dump(_staged, f, indent=1)


def _ext(url):
    tail = os.path.splitext(urllib.parse.urlparse(url).path)[1].lower()
    return tail if tail in (".jpg", ".jpeg", ".png", ".gif", ".webp") else ".jpg"


def grab(url, slug, i):
    """Download once, keyed by a hash of the URL so two products sharing a
    photo share the file."""
    if not os.path.isdir("/Volumes/core"):
        raise SystemExit("/Volumes/core 未掛載 —— 唔好寫落內置 SSD")
    os.makedirs(WORK, exist_ok=True)
    key = hashlib.sha1(url.encode()).hexdigest()[:12]
    path = os.path.join(WORK, f"{slug[:40]}-{i:02d}-{key}{_ext(url)}")
    if os.path.exists(path) and os.path.getsize(path) > 2000:
        return path
    try:
        req = urllib.request.Request(
            urllib.parse.quote(url, safe=":/?=&%#"), headers=UA)
        with urllib.request.urlopen(req, timeout=60) as h:
            blob = h.read()
    except Exception as e:
        print(f"      攞唔到圖: {e}  {url[:80]}")
        return None
    # A 1x1 tracking pixel or an error page dressed as an image is not a
    # product photo. Anything under 2 KB is one of those.
    if len(blob) < 2000:
        return None
    with open(path, "wb") as f:
        f.write(blob)
    return path


def mirror(urls, slug):
    """Source URLs in, Shopify staged-upload URLs out. Anything that could
    not be downloaded is dropped rather than published broken."""
    cache = _cache()
    out, dirty = [], False
    for i, u in enumerate(urls, 1):
        if u in cache:
            out.append(cache[u])
            continue
        path = grab(u, slug, i)
        if not path:
            continue
        try:
            staged = upload(path)
        except Exception as e:
            print(f"      上載失敗: {e}")
            continue
        cache[u] = staged
        dirty = True
        out.append(staged)
    if dirty:
        _save()
    return out


if __name__ == "__main__":
    print(mirror(sys.argv[2:], sys.argv[1]))
