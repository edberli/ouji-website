#!/usr/bin/env python3
"""
上架閘：條碼 × 名 × 圖 × 分類 四方交叉對比。

老闆 2026-09-19 定死嘅規矩（原話）：
  「條碼係最緊要嘅，條碼就係個身份證。你可以攞條碼、個名、搵到嘅圖，
    同埋搵到嘅產品嚟做交叉對比，呢啲嘢真係唔應該錯。」
  「個產品本身條碼係十件裝，點知個圖係二十件裝……啲客人會嘈㗎。」

呢個 script 就係嗰條規矩嘅**可執行版本**。上架前／改完圖之後一定要跑，
唔好靠人眼記住。文字版規矩喺 `CLAUDE.md`〈產品上架四條硬規矩〉。

    python3 scripts/listing_check.py <handle> [<handle> ...]   # 上架前查
    python3 scripts/listing_check.py --all                     # 全店掃
    python3 scripts/listing_check.py --all --json report.json  # 出機讀檔

退出碼：有 🔴 = 1，淨係 🟡 = 0。所以可以直接擺落 CI／定時任務。

五項檢查
  1. 條碼   每個規格都要有 barcode，而且要喺 POS 條碼表搵返到
  2. 名     Shopify 標題嘅規格（10 條／50ml／SPF50+）要同 POS 條碼名一致
  3. 圖     封面圖 OCR 出嚟嘅規格唔可以同標題相反（10 條裝擺 20 條裝嗰張）
  4. 贈品   封面唔准印住「送贈品」字眼，除非個名真係講明送
  5. 分類   一定要有 productType，而且要落到至少一格分類

OCR 靠本機 Apple Vision（零 API 成本），venv 喺
`/Volumes/core/AI-Workspace/Claude/ouji-image-audit/venv`。venv 唔喺度就
自動跳過第 3、4 項，並且喺報告講明「未驗」——唔准當通過。
"""
import argparse
import csv
import glob
import json
import os
import re
import subprocess
import sys
import tempfile
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from shopify_admin import gql  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
POS_GLOB = "/Volumes/core/ouji-pos/raw/*barcodes*.csv"
OCR_HOME = "/Volumes/core/AI-Workspace/Claude/ouji-image-audit"

PRODUCT_Q = """
query($q: String!, $n: Int!) {
  products(first: $n, query: $q) {
    pageInfo { hasNextPage endCursor }
    nodes {
      handle title vendor productType status tags
      media(first: 1) { nodes { ... on MediaImage { image { url } } } }
      variants(first: 60) { nodes { title barcode } }
    }
  }
}
"""

PAGE_Q = """
query($c: String) {
  products(first: 100, after: $c) {
    pageInfo { hasNextPage endCursor }
    nodes {
      handle title vendor productType status tags
      media(first: 1) { nodes { ... on MediaImage { image { url } } } }
      variants(first: 60) { nodes { title barcode } }
    }
  }
}
"""

# ── 贈品字眼 ────────────────────────────────────────────────────────────
# 只收「真係承諾送嘢」嗰啲。`FREE`／`SET` 唔可以入，佢哋會撞正常成份聲明
# （Alcohol Free）同真套裝產品 —— 2026-09-19 實測一掃就出一堆假警報。
GIFT_RE = re.compile(
    r"증정|사은품|덤으로|추가\s*증정|랜덤\s*증정|\bGIFT\b|\bGIFY\b"
    r"|加贈|贈品|隨貨贈|買.{0,4}送|免費送",
    re.I,
)
# 個名本身講明送／附，就唔算呃人。
GIFT_OK_RE = re.compile(r"附贈|附補充裝|連補充裝|套裝|\bset\b|\+\s*refill|refill", re.I)


# ── 規格 token ──────────────────────────────────────────────────────────
def specs(text):
    """由一段文字抽出可比對嘅規格。回傳 {類型: {值}}。

    只抽「客會嘈」嗰幾種：容量、件數、SPF／PA。抽唔到就唔比 —— 呢個
    script 寧願靜，都唔好出一堆假警報搞到冇人再睇。
    """
    t = (text or "").replace("，", ",")
    # 千分位：「1,013ml」同「1 013ml」要讀成 1013，唔係 13。
    # （2026-09-19 實測：hetras 兩支 1,013ml 沐浴露就係咁報假警報。）
    t = re.sub(r"(?<=\d)[,\u00a0 ](?=\d{3}(?!\d))", "", t)
    out = {}

    def add(k, v):
        out.setdefault(k, set()).add(v)

    # 單位後面唔可以用 \b —— 中文字本身係 word char，「18克x20包」嗰個
    # 「克」後面跟住 x 就唔算 boundary，會靜靜哋漏咗。用「後面唔係數字」。
    for m in re.finditer(r"(\d+(?:\.\d+)?)\s*(?:ml|mL|ML|毫升)(?![0-9a-z])", t, re.I):
        add("ml", float(m.group(1)))
    for m in re.finditer(r"(\d+(?:\.\d+)?)\s*(?:g|G)(?![0-9a-z])", t):
        add("g", float(m.group(1)))
    # 中文／韓文單位：後面淨係唔可以係數字。「18克x20包」個 18 要收得到，
    # 否則 POS 只讀到總重 360 克，就會同標題嘅 18g 報假衝突。
    for m in re.finditer(r"(\d+(?:\.\d+)?)\s*(?:克|공)(?!\d)", t):
        add("g", float(m.group(1)))
    # 件數：10 條裝／20 片／30매／2 支／x2／2 入
    for m in re.finditer(r"(\d+)\s*(?:條|片|支|入|個|件|매|개|pcs|ea)\s*裝?", t, re.I):
        add("count", int(m.group(1)))
    for m in re.finditer(r"[x×]\s*(\d+)\b", t, re.I):
        add("count", int(m.group(1)))
    for m in re.finditer(r"SPF\s*(\d+)", t, re.I):
        add("spf", int(m.group(1)))
    m = re.search(r"PA\s*(\++)", t, re.I)
    if m:
        add("pa", len(m.group(1)))
    return out


def spec_conflict(a, b):
    """兩邊都講到同一種規格，但講嘅唔同 → 衝突。一邊冇講就當冇資料。"""
    bad = []
    for k in set(a) & set(b):
        if not (a[k] & b[k]):
            bad.append((k, sorted(a[k]), sorted(b[k])))
    return bad


def name_issues(title, ts, barcode, pos):
    """標題規格 vs 呢個條碼喺 POS 嘅名。

    一個條碼可以有幾個 POS 名（老闆自己改過名、兩間鋪各自入過）。
    **只要對得上其中一個就當過** —— 否則 POS 自己新舊名並存就會日日報假警報。
    全部都對唔上先係真問題。POS 幾個名之間自己打交，另外用 🟡 講出嚟，
    因為嗰個係 POS 要執，唔係網站要執。
    """
    names = sorted(pos.get(barcode, ()))
    if not names:
        return []
    confl = [(n, spec_conflict(ts, specs(n))) for n in names]
    out = []
    if all(c for _, c in confl):
        n, c = confl[0]
        d = "；".join(f"{k} 標題{a} vs POS{bb}" for k, a, bb in c)
        out.append(("🔴", "名", f"標題同條碼名唔夾（{barcode}）：{d}｜POS：{n[:60]}"))
    elif len(names) > 1 and any(c for _, c in confl):
        bad_names = [n[:40] for n, c in confl if c]
        out.append(("🟡", "名",
                    f"同一條碼 {barcode} 喺 POS 有幾個唔同規格嘅名，"
                    f"網站對得上其中一個：{' ／ '.join(bad_names)} —— POS 要執"))
    return out


# ── POS 條碼表 ──────────────────────────────────────────────────────────
def load_pos():
    """barcode → {老闆喺 POS 入面改嘅名}。呢個名先係產品身份證。"""
    pos = {}
    for f in glob.glob(POS_GLOB):
        try:
            rows = csv.reader(open(f, encoding="utf-8-sig"))
        except OSError:
            continue
        for row in rows:
            if len(row) < 3:
                continue
            a, b, c = row[0].strip(), row[1].strip(), row[2].strip()
            # 兩間鋪兩種欄位次序：sku,name,barcode 同 barcode,sku,name
            for code in (a, c):
                if code.isdigit() and len(code) >= 8 and b and not b.isdigit():
                    pos.setdefault(code, set()).add(b.split("\n")[0].strip())
    return pos


# ── OCR ─────────────────────────────────────────────────────────────────
OCR_SNIPPET = r"""
import sys, Vision, Quartz
from Foundation import NSURL
def ocr(path):
    src = Quartz.CGImageSourceCreateWithURL(NSURL.fileURLWithPath_(path), None)
    if not src: return ""
    cg = Quartz.CGImageSourceCreateImageAtIndex(src, 0, None)
    if not cg: return ""
    req = Vision.VNRecognizeTextRequest.alloc().init()
    req.setRecognitionLevel_(0)
    req.setUsesLanguageCorrection_(False)
    req.setRecognitionLanguages_(["ko-KR","en-US","zh-Hant","zh-Hans","ja-JP"])
    h = Vision.VNImageRequestHandler.alloc().initWithCGImage_options_(cg, None)
    ok, _ = h.performRequests_error_([req], None)
    if not ok: return ""
    out = []
    for r in (req.results() or []):
        c = r.topCandidates_(1)
        if c and len(c): out.append(str(c[0].string()))
    return " | ".join(out)
for p in sys.argv[1:]:
    print(p + "\t" + ocr(p).replace("\t", " "))
"""


def ocr_available():
    return os.path.exists(f"{OCR_HOME}/venv/bin/python")


def ocr_covers(jobs):
    """jobs = [(handle, url)] → {handle: 圖上面讀到嘅字}。"""
    if not jobs or not ocr_available():
        return {}
    tmp = tempfile.mkdtemp(prefix="listing-ocr-")
    paths = {}
    for h, url in jobs:
        sep = "&" if "?" in url else "?"
        p = os.path.join(tmp, f"{abs(hash(h))}.jpg")
        try:
            urllib.request.urlretrieve(url + sep + "width=900", p)
            paths[p] = h
        except Exception:
            pass
    if not paths:
        return {}
    script = os.path.join(tmp, "_ocr.py")
    open(script, "w").write(OCR_SNIPPET)
    out = {}
    batch = list(paths)
    for i in range(0, len(batch), 60):
        chunk = batch[i:i + 60]
        try:
            r = subprocess.run([f"{OCR_HOME}/venv/bin/python", script] + chunk,
                               capture_output=True, text=True, timeout=900)
        except Exception:
            continue
        for line in r.stdout.splitlines():
            if "\t" not in line:
                continue
            p, text = line.split("\t", 1)
            if p in paths:
                out[paths[p]] = text
    return out


# ── 分類 ────────────────────────────────────────────────────────────────
def load_taxonomy():
    """由 shopify.js 抽返同一份 CATEGORY_TAXONOMY —— 唔准喺呢度另寫一份，
    兩份一定會走樣。"""
    js = r"""
      const fs=require("fs");
      const src=fs.readFileSync(process.argv[1],"utf8");
      const i=src.indexOf("const CATEGORY_TAXONOMY = {");
      const j=src.indexOf("\n};", i);
      const T=eval("("+src.slice(i+"const CATEGORY_TAXONOMY = ".length, j+2)+")");
      const out={};
      for(const [k,v] of Object.entries(T)){
        out[k]=[...(v.keywords||[]),
                ...Object.values(v.subs||{}).flatMap(s=>s.keywords||[])];
      }
      console.log(JSON.stringify(out));
    """
    r = subprocess.run(["node", "-e", js, os.path.join(ROOT, "shopify.js")],
                       capture_output=True, text=True)
    return json.loads(r.stdout) if r.returncode == 0 else {}


LIP_CARE_TYPES = {"唇部護理", "潤唇膏", "護唇膏", "唇膜", "唇部精華"}


def sections_of(p, tax):
    hay = f"{p.get('productType') or ''} {' '.join(t for t in p.get('tags') or [])}".lower()
    hit = [k for k, kws in tax.items() if any(str(w).lower() in hay for w in kws)]
    # 同 shopify.js 嘅 SECTION_EXCLUDE 一致：潤唇膏唔算彩妝
    if (p.get("productType") or "").strip() in LIP_CARE_TYPES and "makeup" in hit:
        hit.remove("makeup")
    return hit


# ── 主檢查 ──────────────────────────────────────────────────────────────
def fetch(handles=None):
    out = []
    if handles:
        for h in handles:
            n = gql(PRODUCT_Q, {"q": f"handle:{h}", "n": 1})["products"]["nodes"]
            if n:
                out += n
            else:
                print(f"⚠️  Shopify 搵唔到 handle：{h}")
        return out
    c = None
    while True:
        d = gql(PAGE_Q, {"c": c})["products"]
        out += d["nodes"]
        if not d["pageInfo"]["hasNextPage"]:
            return out
        c = d["pageInfo"]["endCursor"]


def check(products, pos, tax, ocr_text, ocr_on):
    report = []
    for p in products:
        bad = []
        h, title = p["handle"], p["title"] or ""
        media = p["media"]["nodes"]
        cover = (media[0].get("image") or {}).get("url") if media else None
        variants = p["variants"]["nodes"]

        # 1 條碼 —— 身份證
        nobc = [v["title"] for v in variants if not (v.get("barcode") or "").strip()]
        if nobc:
            # 全部規格都冇碼 ＝ 呢件貨根本冇身份證，🔴。
            # 只係部分冇（隱形眼鏡某幾隻度數 POS 冇逐度數出碼）＝ 補得返，🟡。
            lvl = "🔴" if len(nobc) == len(variants) else "🟡"
            bad.append((lvl, "條碼", f"{len(nobc)}/{len(variants)} 個規格冇條碼：{', '.join(nobc[:4])}"))
        codes = [(v.get("barcode") or "").strip() for v in variants]
        unknown = [b for b in codes if b and b not in pos]
        if unknown and len(unknown) == len([b for b in codes if b]):
            bad.append(("🟡", "條碼", f"全部條碼喺 POS 表搵唔到（{unknown[0]}…）—— 網店獨有貨就當正常，否則係對錯咗"))

        # 2 名 vs POS 名
        ts = specs(title)
        for b in codes:
            bad += name_issues(title, ts, b, pos)

        # 3 + 4 封面
        if not cover:
            bad.append(("🔴", "圖", "冇封面圖"))
        elif not ocr_on:
            bad.append(("⚪", "圖", "OCR venv 唔喺度，封面未驗（唔准當通過）"))
        else:
            text = ocr_text.get(h, "")
            if GIFT_RE.search(text) and not GIFT_OK_RE.search(title):
                hit = GIFT_RE.search(text).group(0)
                bad.append(("🔴", "贈品", f"封面印住「{hit}」但個名冇講明送 —— 客會嘈"))
            cf = spec_conflict(ts, specs(text))
            for k, a, bb in cf:
                if k in ("count", "ml", "g"):
                    bad.append(("🟡", "圖", f"標題 {k}={a} 但封面圖讀到 {bb} —— 要人眼覆核係咪擺錯裝量"))

        # 5 分類
        if not (p.get("productType") or "").strip():
            bad.append(("🔴", "分類", "冇 productType"))
        else:
            secs = sections_of(p, tax)
            if not secs:
                bad.append(("🟡", "分類", f"productType「{p['productType']}」落唔到任何分類，客只會喺「其他」見到"))

        if bad:
            report.append({"handle": h, "title": title, "vendor": p.get("vendor"),
                           "issues": [{"level": a, "kind": b, "msg": c} for a, b, c in bad]})
    return report


# ── 上架前閘（publish.py 叫）────────────────────────────────────────────
_POS_CACHE = None
_TAX_CACHE = None


def gate_record(rec, ocr=True):
    """檢查一個**仲未入 Shopify** 嘅上架記錄。publish.py 每次 publish 前叫。

    rec 係 build_*.py 嗰種 shape：
        {handle, title, productType, tags, shades:[{barcode,…}], images:[url]}
    回傳 [(level, kind, msg)]。有 🔴 就唔應該上架。
    """
    global _POS_CACHE, _TAX_CACHE
    if _POS_CACHE is None:
        _POS_CACHE = load_pos()
    if _TAX_CACHE is None:
        _TAX_CACHE = load_taxonomy()
    pos, tax = _POS_CACHE, _TAX_CACHE

    bad = []
    title = rec.get("title") or ""
    ts = specs(title)

    # 1 條碼：身份證，冇就唔准上
    codes = [str(s.get("barcode") or "").strip() for s in rec.get("shades") or []]
    if not codes:
        bad.append(("🔴", "條碼", "一個規格都冇"))
    for s in rec.get("shades") or []:
        if not str(s.get("barcode") or "").strip():
            bad.append(("🔴", "條碼", f"規格「{s.get('name')}」冇條碼"))

    # 2 名：標題規格要同條碼名一致
    for b in codes:
        bad += name_issues(title, ts, b, pos)

    # 5 分類
    if not (rec.get("productType") or "").strip():
        bad.append(("🔴", "分類", "冇 productType"))
    else:
        fake = {"productType": rec.get("productType"), "tags": rec.get("tags") or []}
        if not sections_of(fake, tax):
            bad.append(("🟡", "分類",
                        f"productType「{rec['productType']}」落唔到任何分類，客只會喺「其他」見到"))

    # 3 + 4 封面
    imgs = rec.get("images") or []
    # 大批重建（幾百件）嗰陣，逐件download＋OCR 會拖多十幾分鐘。
    # `OUJI_LISTING_CHECK_NO_OCR=1` 可以淨係跳過封面兩項，
    # 條碼／名／分類照查 —— 跳咗會喺報告標「未驗」，唔等於通過。
    if os.environ.get("OUJI_LISTING_CHECK_NO_OCR") == "1":
        ocr = False
    if not imgs:
        bad.append(("🔴", "圖", "冇圖"))
    elif not ocr or not ocr_available():
        bad.append(("⚪", "圖", "OCR 未行，封面贈品／裝量未驗"))
    else:
        text = ocr_covers([(rec.get("handle", "?"), imgs[0])]).get(rec.get("handle", "?"), "")
        if GIFT_RE.search(text) and not GIFT_OK_RE.search(title):
            bad.append(("🔴", "贈品",
                        f"封面印住「{GIFT_RE.search(text).group(0)}」但個名冇講明送"))
        for k, a, bb in spec_conflict(ts, specs(text)):
            if k in ("count", "ml", "g"):
                bad.append(("🔴", "圖", f"標題 {k}={a} 但封面圖係 {bb} —— 擺錯裝量"))
    return bad


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("handles", nargs="*")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--json")
    a = ap.parse_args()
    if not a.handles and not a.all:
        ap.error("俾幾個 handle，或者用 --all 掃全店")

    products = fetch(None if a.all else a.handles)
    pos, tax = load_pos(), load_taxonomy()
    ocr_on = ocr_available()
    jobs = [(p["handle"], (p["media"]["nodes"][0].get("image") or {}).get("url"))
            for p in products if p["media"]["nodes"]]
    jobs = [(h, u) for h, u in jobs if u]
    text = ocr_covers(jobs) if ocr_on else {}

    report = check(products, pos, tax, text, ocr_on)
    red = sum(1 for r in report for i in r["issues"] if i["level"] == "🔴")
    print(f"\n查咗 {len(products)} 件貨，{len(report)} 件有問題（🔴 {red} 項）")
    if not ocr_on:
        print(f"⚠️  OCR venv 唔喺度（{OCR_HOME}/venv），封面贈品同裝量兩項未驗。")
    for r in report:
        print(f"\n── {r['handle']}  {r['title'][:46]}")
        for i in r["issues"]:
            print(f"   {i['level']} [{i['kind']}] {i['msg']}")
    if a.json:
        json.dump(report, open(a.json, "w"), ensure_ascii=False, indent=1)
        print(f"\n寫咗 {a.json}")
    sys.exit(1 if red else 0)


if __name__ == "__main__":
    main()
