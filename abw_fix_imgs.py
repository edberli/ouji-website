#!/usr/bin/env python3
"""補返已經爬咗嘅 ABW 檔案入面嘅 gallery 圖。

舊版自己砌 `L_g<id>_000.jpg`，撞到「一個 gid 一張圖、冇後綴」嗰種
（Lovisia）就全部 404。而家改成由 HTML 直接抽，所以要重行一次 detail 頁。
只補指定牌子，唔好成千件重爬。

  python3 abw_fix_imgs.py Lovisia plu NARD
"""
import json, re, sys, time, urllib.request
from pathlib import Path

UA = {"User-Agent": ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                     "AppleWebKit/537.36 Chrome/120 Safari/537.36"),
      "Referer": "https://www.asianbeautywholesale.com/"}
OUT = Path("/Volumes/core/ouji-ads/abw")
BASE = "https://d1flfk77wl2xk4.cloudfront.net/Assets/"


def get(u, tries=4):
    for i in range(tries):
        try:
            return urllib.request.urlopen(
                urllib.request.Request(u, headers=UA), timeout=40).read().decode("utf8", "ignore")
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(20 * (i + 1)); continue
            if i == tries - 1: raise
            time.sleep(2)
        except Exception:
            if i == tries - 1: raise
            time.sleep(2)


def main():
    for name in sys.argv[1:]:
        f = OUT / f"{name}.json"
        if not f.exists():
            print(f"✗ {name} 未爬過"); continue
        rows = json.loads(f.read_text())
        n = 0
        for p in rows:
            try:
                h = get(p["url"])
            except Exception:
                continue
            p["imgs"] = [BASE + u for u in
                         dict.fromkeys(re.findall(r'GalleryImage/[^"\']+\.jpg', h))][:28]
            n += bool(p["imgs"])
            time.sleep(1.2)
        f.write_text(json.dumps(rows, ensure_ascii=False))
        print(f"✓ {name}: {n}/{len(rows)} 件有圖", flush=True)


if __name__ == "__main__":
    main()
