#!/usr/bin/env python3
"""標題同牌子名淨返中文＋英文，拎走日文假名同韓文。

老闆 2026-09-02：「嗰啲產品係咪唔需要日文名同韓文名呢？亦都唔需要嘅。
你針對香港顧客啫嘛。你中文同埋英文名咪得囉。」

點做（保守，寧願留低都唔好刪錯）：
1. 由「／」「/」分開嘅段落，成段係外文就成段拎走。
2. 括號入面逐段睇，外文嗰段拎走；成個括號空咗就連括號一齊拎。
3. 韓文係獨立詞，唔會夾埋中文，所以剩返嘅韓文碎片可以直接拎走。
4. **假名唔可以逐個字拎** —— 日文名成日係漢字＋假名夾埋
   （「食スルー酵素」拎走假名就變咗「食酵素」）。所以假名只喺
   第 1、2 步整段拎，唔做碎片清理；剩低嗰啲人手睇。
"""
import argparse
import re
import sys

sys.path.insert(0, "scripts")
from shopify_admin import gql, user_errors

HAN = re.compile(r"[가-힣]")
KANA = re.compile(r"[ぁ-ゟ゠-ヺー-ヿ]")   # 特登唔包「・」(U+30FB)：佢係標點，唔係日文字
FOREIGN = re.compile(r"[가-힣ぁ-ゟ゠-ヺー-ヿ]")


def foreign_only(seg):
    """呢一段除咗外文、數字、單位同標點之外，冇中文亦冇有意義嘅英文字。"""
    if not FOREIGN.search(seg):
        return False
    if re.search(r"[一-鿿]", seg):          # 有中文 → 唔算純外文
        return False
    words = re.findall(r"[A-Za-z]{3,}", seg)
    if not words:
        return True
    # 只係重複咗個牌子名、其餘全部假名／韓文（例：「DUO ザ ウォッシュ ブラックリペア」）
    rest = re.sub(r"[A-Za-z0-9\s\.\-×x]+", "", seg)
    return bool(rest) and not re.search(r"[一-鿿]", rest) and len(words) <= 2



# 自動規則搞唔掂嘅，人手寫死。多數係假名夾住漢字（拎走假名會整爛個詞），
# 或者括號入面得個日文商品名。
MANUAL_TITLES = {
 "ISDG 醫食同源 232種蔬果發酵 食スルー酵素 Gold 120粒（37.2g／310mg×120粒）":
 "ISDG 醫食同源 232種蔬果發酵酵素 Gold 120粒（37.2g／310mg×120粒）",
 "BOTANIST 植物性護髮素 柔順型 櫻花＆櫻桃香 460g（2025春季限定 ボタニカルトリートメント スムース サクラ＆チェリーの香り）":
 "BOTANIST 植物性護髮素 柔順型 櫻花＆櫻桃香 460g（2025 春季限定）",
 "BOTANIST 植物性護髮膏 櫻花＆櫻桃香 32g（2025春季限定）／ ボタニカルヘアバーム サクラ＆チェリーの香り":
 "BOTANIST 植物性護髮膏 櫻花＆櫻桃香 32g（2025 春季限定）",
 "WELLP 藥用頭皮護理洗髮水 柔順型 370ml（薬用スカルプケアシャンプー［スムース］／医薬部外品）":
 "WELLP 藥用頭皮護理洗髮水 柔順型 370ml（醫藥部外品）",
 "WELLP 藥用頭皮護理洗髮水 保濕型 370mL（ウェルプ 薬用スカルプケアシャンプー モイスト）":
 "WELLP 藥用頭皮護理洗髮水 保濕型 370mL（醫藥部外品）",
 "WELLP 藥用頭皮護理護髮素［柔順型］370g（醫藥部外品）／ 薬用スカルプケアトリートメント［スムース］":
 "WELLP 藥用頭皮護理護髮素［柔順型］370g（醫藥部外品）",
 "WELLP 藥用頭皮護理護髮素［保濕型］370g（醫藥部外品）／ 薬用スカルプケアトリートメント［モイスト］":
 "WELLP 藥用頭皮護理護髮素［保濕型］370g（醫藥部外品）",
 "YOLU MOCKTAIL 夜間柔順修護洗髮露 440ml 青檸夏日莫吉托香（モクテル リラックスナイトリペアシャンプー，2025夏季限定）":
 "YOLU MOCKTAIL 夜間柔順修護洗髮露 440ml 青檸夏日莫吉托香（2025 夏季限定）",
 "Sanrio Characters キャラボム 炭酸ガス入浴料「ゆらゆらベビー」造型公仔沐浴球 (葡萄香．全6款隨機)":
 "Sanrio 角色造型公仔沐浴球 葡萄香 (全 6 款隨機)",
}

# 牌子名：自動清會留低「（ ，Olive Young 自家品牌）」呢類碎片，所以寫死。
MANUAL_VENDORS = {
 "su:m37° (숨37°, LG H&H)": "su:m37°",
 "Ariul (아리얼)": "Ariul",
 "Garglin 가그린": "Garglin",
 "DUO（デュオ／PREMIER ANTI-AGING）": "DUO",
 "Delight Project（딜라이트 프로젝트，Olive Young 自家品牌）": "Delight Project",
 "oganacell (오가나셀)": "oganacell",
 "DIAPIA 다이아피아": "DIAPIA",
 "COSNORI 코스노리": "COSNORI",
 "Rucipello 루치펠로": "Rucipello",
 "WELLAGE 維拉珠 (웰라쥬．Hugel Pharma)": "WELLAGE 維拉珠",
 "S.NATURE (에스네이처)": "S.NATURE",
 "SZCO (에스지코 / (주)에스지코코스메틱)": "SZCO",
 "BEYOND (비욘드, LG생활건강)": "BEYOND",
 "JAHWANGSU (자황수)": "JAHWANGSU",
}


PAREN = re.compile(r"[（(][^（()）]*[）)]")


def clean_parens(title):
    """逐個括號入面 split，純外文嗰段拎走；成個括號空咗就連括號拎走。"""
    def one(m):
        raw = m.group(0)
        inner = raw[1:-1]
        segs = re.split(r"\s*[／/]\s*", inner)
        kept = [x for x in segs if x.strip() and not foreign_only(x)]
        if len(kept) == len(segs):
            return raw                       # 冇嘢掉走 → 原封不動
        body = " / ".join(x.strip() for x in kept)
        if not body:
            return ""
        return raw[0] + body + raw[-1]
    return PAREN.sub(one, title)


def clean(title):
    if title in MANUAL_TITLES:
        return MANUAL_TITLES[title]
    if title in MANUAL_VENDORS:
        return MANUAL_VENDORS[title]
    t = clean_parens(title)

    # 頂層按「／」分段，但括號入面嗰啲斜線唔算 —— 所以先遮住括號。
    holes, masked = [], t
    def hide(m):
        holes.append(m.group(0))
        return f"\x00{len(holes)-1}\x00"
    masked = PAREN.sub(hide, t)
    segs = re.split(r"\s*[／/]\s*", masked)
    if len(segs) > 1:
        kept, dropped = [], False
        for seg in segs:
            if not seg.strip():
                continue
            core = re.sub(r"\x00\d+\x00", "", seg).strip()
            if core and foreign_only(core):
                dropped = True
                # 段落本身係外文，但括號入面可能有中文／英文（例：香調名）→ 貼返上一段
                keeps = [holes[int(i)] for i in re.findall(r"\x00(\d+)\x00", seg)
                         if not foreign_only(holes[int(i)])]
                if keeps and kept:
                    kept[-1] = kept[-1] + "".join(keeps)
                elif keeps:
                    kept.append("".join(keeps))
                continue
            kept.append(seg.strip())
        masked = " / ".join(kept) if dropped else masked
    t = re.sub(r"\x00(\d+)\x00", lambda m: holes[int(m.group(1))], masked)

    # 剩返嘅韓文碎片（韓文唔會夾埋中文，安全）
    t = HAN.sub("", t)
    t = re.sub(r"[（(]\s*[）)]", "", t)
    t = re.sub(r"\s{2,}", " ", t)
    t = re.sub(r"\s*/\s*$", "", t).strip(" -／/,，")
    return t


Q = """query($c:String){ products(first:250, after:$c){
  pageInfo{ hasNextPage endCursor } nodes{ id title vendor } } }"""
M = """mutation($p:ProductUpdateInput!){ productUpdate(product:$p){ userErrors{ field message } } }"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--vendors", action="store_true", help="順埋牌子名一齊清")
    a = ap.parse_args()

    prods, cur = [], None
    while True:
        d = gql(Q, {"c": cur})["products"]
        prods += d["nodes"]
        if not d["pageInfo"]["hasNextPage"]:
            break
        cur = d["pageInfo"]["endCursor"]

    jobs, leftover = [], []
    for p in prods:
        if not FOREIGN.search(p["title"]):
            continue
        new = clean(p["title"])
        if new and new != p["title"]:
            jobs.append((p, new))
            if FOREIGN.search(new):
                leftover.append((p["title"], new))
        elif FOREIGN.search(p["title"]):
            leftover.append((p["title"], new))

    print(f"標題有外文 {sum(1 for p in prods if FOREIGN.search(p['title']))} 件"
          f"｜改得到 {len(jobs)} 件\n")
    for p, new in jobs[:200]:
        print(f"  舊：{p['title']}")
        print(f"  新：{new}\n")
    if leftover:
        print(f"\n⚠️ 清完仍然有外文（假名夾漢字，要人手睇）{len(leftover)} 件：")
        for old, new in leftover:
            print(f"   {new or old}")

    if a.vendors:
        vend = {}
        for p in prods:
            if FOREIGN.search(p["vendor"]) and p["vendor"] not in vend:
                vend[p["vendor"]] = clean(p["vendor"])
        print(f"\n牌子名 {len(vend)} 個：")
        for k, v in vend.items():
            print(f"   {k}  →  {v}")

    if not a.apply:
        print("\n（未改任何嘢。加 --apply）")
        return
    for p, new in jobs:
        user_errors(gql(M, {"p": {"id": p["id"], "title": new}}), "productUpdate")
    n = len(jobs)
    if a.vendors:
        for p in prods:
            v = clean(p["vendor"]) if FOREIGN.search(p["vendor"]) else None
            if v and v != p["vendor"]:
                user_errors(gql(M, {"p": {"id": p["id"], "vendor": v}}), "productUpdate")
                n += 1
    print(f"\n改咗 {n} 次。")


if __name__ == "__main__":
    main()
