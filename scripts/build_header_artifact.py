#!/usr/bin/env python3
"""
將 prototypes/header.html 打包成一個「自己一個檔就行得」嘅版本，
畀老闆喺手機／claude.ai Artifact 度睇。

點解要打包：Artifact 有 CSP，唔准出去外面攞任何嘢 —— Shopify CDN
嘅相、Google Fonts 全部會被擋。所以要：
  1. 啲產品相下載返嚟，轉 data:image/jpeg;base64
  2. Cormorant Garamond ／ Manrope 嘅 latin woff2 下載返嚟內嵌
     （中文字唔內嵌 —— 原型本身 --corm 就係 'Cormorant Garamond',Georgia,serif，
      中文一路都係靠系統字型 fallback，同本機睇到嘅一模一樣。
      內嵌成套 Noto Serif TC 要幾 MB，冇必要。）
  3. 加手機用嘅補丁：pill bar 捲得、一個「說明」浮層

**原型本身一個字都唔改。** 呢個 script 淨係讀，出一個新檔。

    python3 scripts/build_header_artifact.py            # 出去 /tmp
    python3 scripts/build_header_artifact.py --out x.html
"""
import argparse
import base64
import json
import os
import re
import urllib.request

SRC = os.path.join(os.path.dirname(__file__), "..", "prototypes", "header.html")
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"}
FONT_CSS = ("https://fonts.googleapis.com/css2?"
            "family=Cormorant+Garamond:wght@300;400;500"
            "&family=Manrope:wght@300;400;600;700;800&display=swap")


def get(url, timeout=40):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout).read()


def inline_fonts():
    """淨係要 latin subset —— 中文靠系統字型，同原型一樣。"""
    css = get(FONT_CSS).decode()
    blocks = re.findall(r"/\*\s*([\w\-\[\]]+)\s*\*/\s*(@font-face\s*\{[^}]*\})", css)
    out = []
    for name, blk in blocks:
        if name != "latin":
            continue
        url = re.search(r"url\((https://[^)]+\.woff2)\)", blk).group(1)
        out.append(blk.replace(url, "data:font/woff2;base64," + base64.b64encode(get(url)).decode()))
    print(f"  字型 {len(out)} 個 face")
    return "\n".join(out)


def inline_images(data):
    seen = {}
    for cat in data["subs"]:
        for p in cat["picks"]:
            u = p["img"]
            if u not in seen:
                raw = get(u + ("&" if "?" in u else "?") + "width=700")
                seen[u] = "data:image/jpeg;base64," + base64.b64encode(raw).decode()
                print(f"  相 {len(seen):>2} {len(raw)//1024:>4}KB  {u.split('/')[-1][:38]}")
            p["img"] = seen[u]
    return data


EXTRA_CSS = """
/* ── 打包成 Artifact 先至加嘅嘢（原型本身冇改）─────────────────
   1) 手機嗰條揀版本 pill bar 要捲得，十粒掣塞唔落 390px
   2) 一個「說明」浮層，等睇嘅人知道條紅線係咩、十個係咩
   3) body 明寫底色 —— Artifact 會喺自己嘅底色上面疊，唔寫會借咗人哋嘅
   呢個原型跟返 OUJI 網站嘅淺色設計，所以唔做深色版。            */
body{background:#fff;color:#14201f}
.proto-picker{max-width:calc(100vw - 16px);overflow-x:auto;overflow-y:hidden;scrollbar-width:none}
.proto-picker::-webkit-scrollbar{display:none}
.proto-picker-item{flex:none}
.proto-picker-item:focus-visible{outline:2px solid #8fc0cf;outline-offset:2px}
@media (max-width:900px){.proto-picker{bottom:12px;font-size:12px}
 .proto-picker-item{padding:0 10px}}
.note-btn{padding:0 11px;font-size:12px;font-weight:600;letter-spacing:.04em;color:#9fd0dd!important}
.note-btn:hover{color:#c8e6ee!important}

/* 原型冇落全域 box-sizing，唔明寫嘅話 .note-sheet 嘅 padding 會加喺
   width:100% 之外 → 成塊嘢闊過螢幕，右邊嗰欄同粒 × 全部飛咗出去。 */
.note,.note *{box-sizing:border-box}
.note{position:fixed;inset:0;z-index:2147483646;display:none;
 background:rgba(12,22,26,.46);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px)}
.note[open-panel]{display:block}
.note-sheet{position:absolute;left:50%;bottom:0;transform:translateX(-50%);
 width:min(680px,100%);max-height:86vh;overflow-y:auto;background:#fff;
 border-radius:20px 20px 0 0;padding:24px 20px 92px;
 box-shadow:0 -10px 50px rgba(12,22,26,.22)}
.note-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}
.note-head h2{margin:0 0 4px;font-family:var(--corm);font-weight:400;
 font-size:1.9rem;letter-spacing:-.01em;text-wrap:balance}
.note-head .sub{margin:0;font-family:var(--num);font-size:.66rem;font-weight:700;
 letter-spacing:.16em;color:var(--dim);text-transform:uppercase}
.note-x{flex:none;width:34px;height:34px;border:0;border-radius:50%;
 background:#eef2f3;color:#14201f;font-size:18px;line-height:1;cursor:pointer}
.note-x:hover{background:#e2e9ea}
.note-sheet h3{margin:24px 0 8px;font-family:var(--serif);font-weight:500;font-size:.98rem}
.note-sheet p,.note-sheet li{font-size:.87rem;line-height:1.72;color:#3b4a4d;margin:0 0 8px}
.note-sheet ul{margin:0;padding-left:1.1em}
.note-tbl{width:100%;table-layout:fixed;border-collapse:collapse;font-size:.8rem;margin-top:6px}
.note-tbl th,.note-tbl td{text-align:left;padding:8px 6px;border-bottom:1px solid #e8ecec;
 vertical-align:baseline;line-height:1.5}
.note-tbl th{font-family:var(--num);font-size:.6rem;letter-spacing:.14em;color:var(--dim);
 text-transform:uppercase;font-weight:700}
.note-tbl col.c1{width:5.6em}.note-tbl col.c3{width:4.4em}
.note-tbl td.px{font-family:var(--num);font-weight:700;text-align:right;
 font-variant-numeric:tabular-nums;white-space:nowrap}
.note-tbl tr[data-pick] td{background:#f2f7f8}
.note-tbl td b{font-weight:600}
"""

NOTE_HTML = """
<div class="note" id="note" role="dialog" aria-modal="true" aria-label="說明">
 <div class="note-sheet">
  <div class="note-head">
   <div><h2>彩妝頁頂十揀一</h2><p class="sub">10 proposals · real stock, real photos</p></div>
   <button class="note-x" id="noteX" aria-label="閂咗佢">&times;</button>
  </div>

  <h3>點睇</h3>
  <ul>
   <li>撳下面條黑色掣揭版本（電腦可以襟 <b>1–9</b>，或者 <b>←</b> <b>→</b>）。</li>
   <li>版面下面條<b>紅色虛線</b>係「第一件貨由頂計落嚟幾多 px」。Olive Young 係 219px。</li>
   <li>啲相同件數全部係 Shopify 現貨真數，唔係填充。</li>
  </ul>

  <h3>十個係咩</h3>
  <table class="note-tbl">
   <colgroup><col class="c1"><col><col class="c3"></colgroup>
   <thead><tr><th>版本</th><th>諗法</th><th style="text-align:right">第一件貨</th></tr></thead>
   <tbody>
    <tr><td><b>1 巨字</b></td><td>字大到出血，右上吊一件貨</td><td class="px">720</td></tr>
    <tr><td><b>2 對開</b></td><td>雜誌跨頁，左字右物</td><td class="px">874</td></tr>
    <tr data-pick><td><b>3 標本</b></td><td>博物館牆牌，全部係規格</td><td class="px">677</td></tr>
    <tr><td><b>4 暗房</b></td><td>一束光、一件貨、一個名</td><td class="px">781</td></tr>
    <tr><td><b>5 色域</b></td><td>純色塊，白字置中</td><td class="px">750</td></tr>
    <tr data-pick><td><b>6 貨牆</b></td><td>五張韓國模特相拼成橫帶</td><td class="px">822</td></tr>
    <tr data-pick><td><b>7 一句</b></td><td>兩行大字問句，冇圖</td><td class="px">704</td></tr>
    <tr><td><b>8 索引</b></td><td>子分類排成橫線清單</td><td class="px">948</td></tr>
    <tr><td><b>9 本週</b></td><td>大數字＋四張唇妝相</td><td class="px">857</td></tr>
    <tr><td><b>10 鏡面</b></td><td>大字＋淡倒影</td><td class="px">751</td></tr>
   </tbody>
  </table>

  <h3>我點睇</h3>
  <ul>
   <li><b>6 貨牆</b>最貼「韓式零售」方向 —— 因為佢用咗貨品本身嗰啲韓國模特相。
    之前寫低話我哋淨係得白底 packshot，<b>嗰句係錯嘅</b>：目錄本來就有模特相，只係冇攞出嚟用。</li>
   <li><b>3 標本</b>同 <b>7 一句</b>最矮，但兩個都係純文字。</li>
   <li><b>5 色域</b>、<b>10 鏡面</b>仲係「長方形入面放大字」，你之前彈過；
    <b>8 索引</b>第一輪已經出過。呢三個唔使再考慮。</li>
  </ul>

  <h3>十個都追唔到 219px</h3>
  <p>最矮嗰個都 677px。原因唔喺 header：<b>第一件貨 − header 高 = 467px</b>，十個一模一樣。
   嗰 467px 係<b>子分類 tile 行 ＋ 篩選條</b> —— 即係 header 就算做到 0px 高，
   第一件貨都仲喺 467px。</p>
  <p>Olive Young 頂上根本冇 tile 行，佢係「分類名（16px）＋ items · filter · sort」就落貨。
   要真係追到佢，就要郁 tile 行 —— 但嗰個係你 8 月 18 號親自揀嘅「入口式」設計，我唔會自己拆。</p>
 </div>
</div>
"""

NOTE_JS = """
(function(){
 const note=document.getElementById('note'),x=document.getElementById('noteX');
 const b=document.createElement('button');
 b.className='proto-picker-item note-btn';b.textContent='說明';
 b.addEventListener('click',()=>note.toggleAttribute('open-panel'));
 const bar=document.querySelector('.proto-picker');
 bar.insertBefore(b,bar.querySelector('.proto-picker-item'));
 // 插咗粒掣入去，後面啲掣位全部移咗，要叫個 highlight 重新度位
 window.dispatchEvent(new Event('resize'));
 x.addEventListener('click',()=>note.removeAttribute('open-panel'));
 note.addEventListener('click',e=>{if(e.target===note)note.removeAttribute('open-panel')});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')note.removeAttribute('open-panel')});
})();
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="/tmp/makeup-header.html")
    a = ap.parse_args()

    src = open(SRC).read()
    css = re.search(r"<style>(.*?)</style>", src, re.S).group(1)
    body = re.search(r"<body>(.*?)<script>", src, re.S).group(1)
    js = re.search(r"<script>(.*?)</script>", src, re.S).group(1)

    print("下載緊：")
    fonts = inline_fonts()
    data = inline_images(json.loads(re.search(r"const DATA=(\{.*?\});", js, re.S).group(1)))

    js = re.sub(r"const DATA=\{.*?\};",
                "const DATA=" + json.dumps(data, ensure_ascii=False) + ";", js, count=1, flags=re.S)
    # 相已經係 data URI，唔可以再貼 ?width= 落去
    js = js.replace("const w=(u,n)=>u+(u.includes('?')?'&':'?')+'width='+n;", "const w=(u,n)=>u;")
    # iframe 入面 replaceState 可能會掟嘢
    js = js.replace("history.replaceState(null,'',u);", "try{history.replaceState(null,'',u)}catch(e){}")
    # 手機揭版本嗰陣要捲到嗰粒掣
    js = js.replace("moveHighlight();const u=new URL(location);",
                    "moveHighlight();items[i].scrollIntoView({block:'nearest',inline:'center',"
                    "behavior:'smooth'});const u=new URL(location);")

    out = ("<title>彩妝頁頂十揀一</title>\n<style>\n" + fonts + "\n" + css + EXTRA_CSS
           + "</style>\n" + body + NOTE_HTML + "<script>\n" + js + NOTE_JS + "\n</script>\n")
    open(a.out, "w").write(out)
    print(f"\n寫咗 {a.out}  ({len(out.encode())/1048576:.2f} MB)")


if __name__ == "__main__":
    main()
