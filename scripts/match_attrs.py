#!/usr/bin/env python3
"""
Derive the attributes the matcher needs, from what the catalogue already
says.

The matcher cannot run on category and brand alone — those tell you what
a thing is, not whether it suits you. This works out finish, coverage,
longevity, which skin it suits, how hard it is to use, and which looks it
belongs to, by reading the copy we already wrote plus the product type
and the shade names.

Two rules keep it honest:

  * Anything not evidenced stays "unknown" rather than being guessed. A
    sensitive-skin filter that guesses is worse than no filter — the
    whole point of that filter is that being nearly right is being wrong.
  * Skin fit is inferred from finish, which is a defensible reading (a
    matte, long-wear base does suit oily skin). Ingredient safety is not
    inferred from anything, because nothing in our copy evidences it.

Import from a build script; run directly to see the spread.
"""
import re

# ---------------------------------------------------------------- finish
FINISH = [
    ("水光", r"水光|鏡面|光澤感|dewy|果凍|玻璃|水潤透亮"),
    ("珠光", r"珠光|閃片|亮片|微閃|glitter|閃粉|細閃"),
    ("啞光", r"啞光|霧面|絲霧|matte|奶霧|柔霧"),
    ("自然", r"自然妝感|裸妝|素顏感|貼膚自然"),
]

# ------------------------------------------------------------- longevity
LONG_STRONG = r"防水|防汗|唔會甩|唔甩色|持妝\s*\d{2}|24\s*小時|30\s*小時|全日唔|唔脫妝|超持久"
LONG_SOME = r"持妝|持久|定妝|唔易甩|唔印杯"

# -------------------------------------------------------------- coverage
COV_HIGH = r"高遮瑕|完美遮蓋|全覆蓋|遮到|蓋走|遮瑕力"
COV_LOW = r"薄透|輕透|自然遮瑕|裸妝感|似皮膚本身|唔會有面具感"

# ------------------------------------------------------------- skin type
DRY_HINT = r"滋潤|保濕|唔會乾|乾紋|乾燥|唔卡粉|唔起皮"
OIL_HINT = r"控油|出油|油光|T ?字|唔會浮油|清爽"

# ---------------------------------------------- evidenced gentleness only
GENTLE = r"無香料|無香精|唔含酒精|無酒精|低刺激|敏感肌|溫和配方|眼科測試"

# ------------------------------------------------------------ difficulty
EASY = r"新手|易上手|唔會失手|一步|簡單|唔使技巧|手殘"
HARD = r"進階|技巧|層次疊加|需要練習"

# Looks. A product joins a look when the look's rule fires; a product can
# belong to several, which is what makes a look a filter rather than a
# category.
LOOKS = {
    "korean": dict(
        label="韓系純慾",
        desc="水光底妝、微醺眼、果汁唇。似皮膚本身好，唔似化過妝。",
        types={"氣墊粉底", "唇釉", "唇彩", "唇蜜", "胭脂", "高光"},
        finish={"水光", "自然"},
        words=r"水光|純慾|微醺|果汁|漸層|奶茶|裸粉",
    ),
    "office": dict(
        label="返工通勤",
        desc="頂足成日，唔會太搶。開會、見客、放工食飯都撐得住。",
        types={"氣墊粉底", "底妝", "遮瑕", "眉筆", "眼線", "睫毛膏", "唇膏"},
        finish={"自然", "啞光"},
        words=r"持妝|持久|防水|唔甩|定妝|自然|通勤|返工|OL",
    ),
    "wasteland": dict(
        label="廢土妝",
        desc="灰調、棕調、霧面。冷感、有骨感，唔係甜。",
        types={"眼影", "唇釉", "唇膏", "修容"},
        finish={"啞光"},
        words=r"灰|棕|大地|可可|摩卡|咖啡|煙燻|冷調|霧面|奶茶棕|燒焦",
    ),
    "japanese": dict(
        label="日系減齡",
        desc="粉調、微閃、臥蠶。柔和顯年輕，唔會太濃。",
        types={"胭脂", "眼影", "高光", "唇蜜", "唇彩"},
        finish={"珠光", "水光"},
        words=r"粉調|蜜桃|櫻花|臥蠶|少女|減齡|柔和|奶油|杏|珊瑚",
    ),
    "party": dict(
        label="濃妝派對",
        desc="高顯色、閃片、夠上鏡。影相同夜晚場合。",
        types={"眼影", "睫毛膏", "唇釉", "高光"},
        finish={"珠光"},
        words=r"閃片|亮片|glitter|高顯色|飽和|派對|夜晚|上鏡|奪目",
    ),
    "barefaced": dict(
        label="素顏感",
        desc="薄到似冇化妝，但氣色好咗。返學、落街、返工前趕時間。",
        types={"唇釉", "唇彩", "胭脂", "潤唇膏", "底妝"},
        finish={"自然", "水光"},
        words=r"素顏|薄透|似冇化|輕透|自然裸|一步|唇色本身",
    ),
}


def _text(p):
    body = re.sub(r"<[^>]+>", " ", p.get("descriptionHtml") or "")
    shades = " ".join(p.get("shades") or [])
    return f'{p.get("title","")} {body} {shades}'


# Where the copy says nothing, the category itself says something: an
# eyeliner is matte, a highlighter is pearl. Only categories with a real
# default are listed — the rest stay unknown.
FINISH_BY_TYPE = {
    "底妝": "自然", "遮瑕": "自然", "氣墊粉底": "自然", "彩妝": "自然",
    "眼線": "啞光", "眼線筆": "啞光", "眉筆": "啞光", "唇線筆": "啞光",
    "睫毛膏": "啞光", "修容": "啞光",
    "高光": "珠光",
    "潤唇膏": "水光", "唇蜜": "水光", "唇彩": "水光",
    "胭脂": "自然", "化妝工具": "自然", "配件": "自然",
}


def finish_of(text, ptype):
    hits = [name for name, rx in FINISH if re.search(rx, text, re.I)]
    if not hits:
        return FINISH_BY_TYPE.get(ptype, "unknown")
    # A tint described as both 水光 and 啞光 is describing a range; the
    # first rule that fires is the one the copy leads with.
    return hits[0]


def coverage_of(text, ptype):
    if ptype not in {"氣墊粉底", "底妝", "遮瑕", "彩妝"}:
        return None                      # coverage is meaningless for a lip
    if re.search(COV_HIGH, text):
        return 3
    if re.search(COV_LOW, text):
        return 1
    return 2


def longevity_of(text):
    if re.search(LONG_STRONG, text):
        return 3
    if re.search(LONG_SOME, text):
        return 2
    return 1


def skin_fit(text, finish, longev):
    """Which skin a product suits, read off its finish rather than claimed.

    A matte, long-wear base does suit oily skin and does not suit dry —
    that is a property of the formula, not a marketing line. Sensitive is
    deliberately absent: see `gentle_of`.
    """
    fit = set()
    if finish in {"水光"} or re.search(DRY_HINT, text):
        fit.add("dry")
    if finish in {"啞光"} or longev == 3 or re.search(OIL_HINT, text):
        fit.add("oily")
    if not fit or finish in {"自然"}:
        fit.add("combo")
    if "dry" in fit and "oily" in fit:
        fit.add("combo")
    return sorted(fit)


def gentle_of(text):
    """True only where the copy states it. Never inferred.

    An unevidenced "suitable for sensitive skin" is the one mistake this
    feature cannot make, so the answer here is yes or unknown — never a
    guess at yes.
    """
    return True if re.search(GENTLE, text) else None


def difficulty_of(text, ptype):
    if re.search(EASY, text):
        return 1
    if re.search(HARD, text):
        return 3
    return {"眼線": 3, "眼線筆": 3, "眼影": 2, "睫毛膏": 2}.get(ptype, 1)


def looks_of(p, text, finish, ptype):
    out = []
    for key, rule in LOOKS.items():
        score = 0
        if ptype in rule["types"]:
            score += 2
        if finish in rule["finish"]:
            score += 2
        if re.search(rule["words"], text, re.I):
            score += 2
        if score >= 4:
            out.append(key)
    # A liner, a brow pencil or a brush belongs to no look on finish, but
    # it is exactly what a 返工 or 廢土 face is built out of — so the
    # category alone is enough for those two.
    if not out:
        if ptype in {"眼線", "眼線筆", "眉筆", "唇線筆", "睫毛膏",
                     "遮瑕", "底妝", "化妝工具"}:
            out.append("office")
        if ptype in {"修容", "眼線", "眼線筆", "唇線筆"}:
            out.append("wasteland")
    return out


def derive(p):
    """p: {title, productType, tags, descriptionHtml, shades[]}"""
    text = _text(p)
    ptype = p.get("productType") or ""
    finish = finish_of(text, ptype)
    longev = longevity_of(text)
    return {
        "finish": finish,
        "coverage": coverage_of(text, ptype),
        "longevity": longev,
        "skin": skin_fit(text, finish, longev),
        "gentle": gentle_of(text),
        "difficulty": difficulty_of(text, ptype),
        "vegan": "vegan" in [t.lower() for t in p.get("tags") or []],
        "looks": looks_of(p, text, finish, ptype),
    }
