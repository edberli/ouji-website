#!/usr/bin/env python3
"""同一個牌子分咗幾格、同埋掛錯牌子嘅貨 —— 第二輪清理。

第一輪（merge_vendors.py）只夾得到「大細楷／括號註解」呢類差異。
呢一輪處理兩樣佢捉唔到嘅：

1. **同一間公司，個名寫法差太遠**。最嚴重係鍾根堂健康：
   `Chong Kun Dang Health`、`LACTO-FIT`、`Eyeclear 아이클리어（…）`、
   `鍾根堂健康 종근당건강 (…) / Promega`、`鐘根堂健康 (…) - LACTO-FIT`、
   `종근당건강 CKD Health / LACTO-FIT` —— **六格，全部係同一間公司**，
   仲有「鍾／鐘」兩個唔同嘅字。客見到六個牌子，撳邊格都得一兩件貨。

2. **掛錯牌子**。Wasabi Bear 盲盒掛咗做 Abib（韓國護膚牌）；
   NatuLaka 掛咗做 Laka —— 查實 NatuLaka 係日本 Miraichi 嘅牌子
   （條碼 4571528…，日本），同韓國彩妝 Laka 完全冇關係。
"""
import argparse
import sys

sys.path.insert(0, "scripts")
from shopify_admin import gql, user_errors

# 舊寫法 → 正式寫法
MERGE = {
    # 鍾根堂健康：六格合一
    "Chong Kun Dang Health": "鍾根堂健康 Chong Kun Dang Health",
    "LACTO-FIT": "鍾根堂健康 Chong Kun Dang Health",
    "Eyeclear 아이클리어（종근당건강 Chong Kun Dang Health）": "鍾根堂健康 Chong Kun Dang Health",
    "鍾根堂健康 종근당건강 (Chong Kun Dang Health) / Promega 프로메가": "鍾根堂健康 Chong Kun Dang Health",
    "鐘根堂健康 (종근당건강 / Chong Kun Dang Health) - LACTO-FIT 락토핏": "鍾根堂健康 Chong Kun Dang Health",
    "종근당건강 CKD Health / LACTO-FIT 락토핏": "鍾根堂健康 Chong Kun Dang Health",
    # 其餘：長寫法併返短嗰個（網站本身已經用緊短嗰個）
    "Torriden 토리든 桃瑞丹": "Torriden",
    "BIOHEAL BOH（바이오힐 보）": "BOH",
    "ma:nyo 마녀공장 Manyo Factory": "ma:nyo",
    "蠟筆小新 Crayon Shin-chan (ROCK 洛克 正版授權)": "蠟筆小新",
    "蠟筆小新 Crayon Shin-chan × ROCK 洛克": "蠟筆小新",
    "UNOVE by Dr.FORHAIR": "UNOVE",
    "d'Alba Piedmont 達爾巴": "d'Alba Piedmont",
    "BB LAB（Nutrione 뉴트리원）": "BB LAB",
    "宮中秘策 GOONGBE 궁중비책": "GOONGBE 宮中秘策",
    "GOONGBE 궁중비책": "GOONGBE 宮中秘策",
    "ISDG 医食同源ドットコム": "ISDG 醫食同源",
}

# 掛錯牌子：標題中咗呢個字 ＋ 而家掛住嗰個 vendor → 改做正確嗰個
WRONG = [
    ("wasabi bear", "Abib", "Wasabi Bear"),
    ("natulaka", "Laka", "NatuLaka"),
]

Q = """query($c:String){ products(first:250, after:$c){
  pageInfo{ hasNextPage endCursor } nodes{ id title vendor } } }"""
M = """mutation($p:ProductUpdateInput!){ productUpdate(product:$p){ userErrors{ field message } } }"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    a = ap.parse_args()

    prods, cur = [], None
    while True:
        d = gql(Q, {"c": cur})["products"]
        prods += d["nodes"]
        if not d["pageInfo"]["hasNextPage"]:
            break
        cur = d["pageInfo"]["endCursor"]

    plan = []
    for p in prods:
        dst = MERGE.get(p["vendor"])
        if not dst:
            for needle, old, new in WRONG:
                if needle in p["title"].lower() and p["vendor"] == old:
                    dst = new
                    break
        if dst and dst != p["vendor"]:
            plan.append((p, dst))

    by = {}
    for p, dst in plan:
        by.setdefault((p["vendor"], dst), []).append(p["title"])
    print(f"要改 {len(plan)} 件：\n")
    for (src, dst), titles in sorted(by.items(), key=lambda x: -len(x[1])):
        print(f"  {len(titles):3} 件  {src}  →  {dst}")
        for t in titles[:2]:
            print(f"          {t[:56]}")

    if not a.apply:
        print("\n（未改任何嘢。加 --apply）")
        return
    for p, dst in plan:
        user_errors(gql(M, {"p": {"id": p["id"], "vendor": dst}}), "productUpdate")
    print(f"\n改咗 {len(plan)} 件。")


if __name__ == "__main__":
    main()
