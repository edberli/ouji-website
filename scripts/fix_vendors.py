#!/usr/bin/env python3
"""將掛住「K-BEAUTY」呢個假品牌名嘅貨，改返做佢真正嘅牌子。

點解要做：`vendor` 唔係一個 label，係全站嘅品牌軸 ——
品牌導覽（Clearline rail）、`/brands` 品牌頁、品牌篩選、SEO 全部靠佢。
284 件貨（成個目錄嘅 19%）掛住「K-BEAUTY」，即係 MAPEPE 40 件、
Fiancee 28 件、ROSY ROSA 24 件⋯全部塞埋喺同一格，客揀唔到、
搵唔到、Google 亦都唔知呢啲係咩牌子。

只改標題開頭真係寫住個牌子嗰啲，改唔到嘅唔郁。冇 logo 唔緊要 ——
`brandLogo()` 揾唔到就出文字牌，同「K-BEAUTY」而家嘅做法一樣。
"""
import argparse
import re
import sys

sys.path.insert(0, "scripts")
from shopify_admin import gql, user_errors

# key = 標題要以呢個開頭（正規化後比對）；value = 正式品牌名
BRANDS = {
    "mapepe": "MAPEPE",
    "fiancee": "Fiancee", "flancee": "Fiancee",   # POS 有串錯做 Flancee
    "rosyrosa": "ROSY ROSA",
    "countrystream": "Country & Stream", "country&stream": "Country & Stream",
    "mirumiru": "miru miru",
    "johnsblend": "John's Blend",
    "akaran": "AKARAN",
    "agarism": "AGARISM",
    "tiarera": "Tiarera",
    "dresscode": "Dress Code",
    "aurdew": "Aurdew",
    "kartemade": "Karte Made",
    "motemaslim": "MOTEMA SLIM",
    "mumchit": "Mumchit",
    "nadeshia": "NADESHIA",
    "runegirl": "RUNE girl",
    "niconui": "Niconui",
    "oclear": "O-CLEAR",
    "anbless": "AN' BLESS",
    "noyl": "NOYL",
    "afc": "AFC",
}
# 三個字母或以下嘅牌子，要多一重閘：後面一定要有空格／標點，
# 唔係就會夾中人哋個字（例如 AFC 夾中 "AFCTIVE"）。
SHORT = {"afc"}

# 標題開頭認唔到，但成句睇得出係邊個牌子。多數係入貨時標題被截頭
# （「rosa方形化妝粉撲」其實係 rosy rosa、「JB ROOM MIST」JB ＝ John's Blend），
# 或者牌子名擺咗喺中文描述後面（「日本製造 - Daily aroma…」）。
CONTAINS = [
    ("detangling brush", "MAPEPE"),          # site 已有 Mapepe - Detangling Brush
    ("rosa方形化妝粉撲", "ROSY ROSA"),
    ("jb room mist", "John's Blend"),
    ("john blend", "John's Blend"),
    ("daily aroma", "Daily aroma"),
    ("holika holika", "Holika Holika"),
    ("dr.pepti", "Dr.Pepti"),
    ("marshique", "MARSHIQUE"),
    ("mediflower", "MediFlower"),
    ("whipped", "WHIPPED"),
    ("cogit", "COGIT"),
    ("3eemy", "3eemy"),
    ("ohana mahaalo", "OHANA MAHAALO"),
    ("reach ", "REACH"),
    ("京都念慈菴", "京都念慈菴"),
    ("ukiha", "ukiha"),
    ("calbee", "Dairei"),
]

Q = """query($cursor:String){ products(first:100, after:$cursor, query:"vendor:'K-BEAUTY'"){
  pageInfo{ hasNextPage endCursor } nodes{ id title vendor } } }"""
M = """mutation($p:ProductUpdateInput!){ productUpdate(product:$p){ userErrors{ field message } } }"""


def norm(s):
    return re.sub(r"[^0-9a-z&]", "", (s or "").lower())


def brand_of(title):
    n = norm(title)
    for key in sorted(BRANDS, key=len, reverse=True):
        if not n.startswith(key):
            continue
        if key in SHORT and not re.match(rf"(?i)^\s*{key}\s*[\s\-–—:：]", title):
            continue
        return BRANDS[key]
    low = (title or "").lower()
    for needle, brand in CONTAINS:
        if needle in low:
            return brand
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    a = ap.parse_args()

    prods, cur = [], None
    while True:
        d = gql(Q, {"cursor": cur})["products"]
        prods += d["nodes"]
        if not d["pageInfo"]["hasNextPage"]:
            break
        cur = d["pageInfo"]["endCursor"]

    hits = [(p, brand_of(p["title"])) for p in prods]
    todo = [(p, b) for p, b in hits if b]
    left = [p for p, b in hits if not b]

    counts = {}
    for _, b in todo:
        counts[b] = counts.get(b, 0) + 1
    print(f"K-BEAUTY {len(prods)} 件｜認得出牌子 {len(todo)} 件｜認唔出 {len(left)} 件\n")
    for b, n in sorted(counts.items(), key=lambda x: -x[1]):
        print(f"  {n:4}  → {b}")
    print("\n認唔出（維持 K-BEAUTY）：")
    for p in left[:12]:
        print("   ", p["title"][:60])
    if len(left) > 12:
        print(f"    …仲有 {len(left)-12} 件")

    if not a.apply:
        print("\n（未改任何嘢。加 --apply）")
        return
    for p, b in todo:
        user_errors(gql(M, {"p": {"id": p["id"], "vendor": b}}), "productUpdate")
    print(f"\n改咗 {len(todo)} 件。")


if __name__ == "__main__":
    main()
