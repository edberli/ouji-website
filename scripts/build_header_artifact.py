#!/usr/bin/env python3
"""
將 prototypes/header2.html 打包成一個「自己一個檔就行得」嘅版本，
畀老闆喺手機／claude.ai Artifact 度睇。

點解要打包：Artifact 有 CSP，唔准出去外面攞任何嘢 —— Shopify CDN
嘅相、Google Fonts 全部會被擋。所以要：
  1. 啲產品相下載返嚟，轉 data:image/jpeg;base64
  2. 字型由原型嘅 <link> 攞返嚟內嵌。原型嘅中文字型已經用 Google Fonts
     嘅 &text= 只叫咗真係用到嗰百零個字，所以 subset 得十幾 KB
     （成套 Noto Serif TC 係幾 MB）。
  3. 加手機用嘅補丁：pill bar 捲得、一個「說明」浮層

**原型本身一個字都唔改。** 呢個 script 淨係讀，出一個新檔。

    python3 scripts/build_header_artifact.py                    # 出去 /tmp
    python3 scripts/build_header_artifact.py --src ... --out ...
"""
import argparse
import base64
import json
import os
import re
import urllib.request

DEFAULT_SRC = os.path.join(os.path.dirname(__file__), "..", "prototypes", "header2.html")
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"}
# 字型唔再寫死 —— 由原型入面嘅 <link> 攞。原型已經用 &text= 只叫咗用到嘅中文字，
# 所以每個 subset 都好細（成套 Noto Serif TC 要幾 MB，subset 得十幾 KB）。


def get(url, timeout=40):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout).read()


def inline_fonts(src):
    """由原型嘅 <link> 攞 Google Fonts CSS，逐個 woff2 轉 data URI。"""
    urls = re.findall(r'<link href="(https://fonts\.googleapis\.com/[^"]+)" rel="stylesheet">', src)
    out, n = [], 0
    for u in urls:
        css = get(u.replace("&amp;", "&")).decode()
        for blk in re.findall(r"@font-face\s*\{[^}]*\}", css):
            m = re.search(r"url\((https://[^)]+\.woff2)\)", blk)
            if not m:
                continue
            raw = get(m.group(1))
            n += len(raw)
            out.append(blk.replace(m.group(1), "data:font/woff2;base64," + base64.b64encode(raw).decode()))
    print(f"  字型 {len(out)} 個 face，合共 {n//1024}KB")
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
.note-head h2{margin:0 0 4px;font-family:var(--tcserif);font-weight:700;
 font-size:1.9rem;letter-spacing:-.01em;text-wrap:balance}
.note-head .sub{margin:0;font-family:var(--mono);font-size:.64rem;font-weight:700;
 letter-spacing:.16em;color:var(--dim);text-transform:uppercase}
.note-x{flex:none;width:34px;height:34px;border:0;border-radius:50%;
 background:#eef2f3;color:#14201f;font-size:18px;line-height:1;cursor:pointer}
.note-x:hover{background:#e2e9ea}
.note-sheet h3{margin:24px 0 8px;font-family:var(--tcserif);font-weight:700;font-size:.98rem}
.note-sheet p,.note-sheet li{font-size:.87rem;line-height:1.72;color:#3b4a4d;margin:0 0 8px}
.note-sheet ul{margin:0;padding-left:1.1em}
.note-tbl{width:100%;table-layout:fixed;border-collapse:collapse;font-size:.8rem;margin-top:6px}
.note-tbl th,.note-tbl td{text-align:left;padding:8px 6px;border-bottom:1px solid #e8ecec;
 vertical-align:baseline;line-height:1.5}
.note-tbl th{font-family:var(--mono);font-size:.6rem;letter-spacing:.14em;color:var(--dim);
 text-transform:uppercase;font-weight:700}
.note-tbl col.c1{width:5.6em}.note-tbl col.c3{width:4.4em}
.note-tbl td.px{font-family:var(--arch);font-weight:700;text-align:right;
 font-variant-numeric:tabular-nums;white-space:nowrap}
.note-tbl tr[data-pick] td{background:#f2f7f8}
.note-tbl td b{font-weight:600}
"""

NOTE_HTML = """
<div class="note" id="note" role="dialog" aria-modal="true" aria-label="說明">
 <div class="note-sheet">
  <div class="note-head">
   <div><h2>彩妝頁頂十揀一</h2><p class="sub">rebuild 2 · real stock, real photos</p></div>
   <button class="note-x" id="noteX" aria-label="閂咗佢">&times;</button>
  </div>

  <h3>點睇</h3>
  <ul>
   <li>撳下面條黑色掣揭版本（電腦可以襟 <b>1–9</b>、<b>0</b>，或者 <b>←</b> <b>→</b>）。</li>
   <li>版面下面條<b>紅色虛線</b>係「第一件貨由頂計落嚟幾多 px」。Olive Young 係 219px。</li>
   <li>啲相、件數、品牌數全部係 Shopify 現貨真數。</li>
  </ul>

  <h3>今次改咗個諗法</h3>
  <p>上一輪十個全部係「大標題 ＋ 一張相」，下面再排多一行子分類方格。
   今次<b>子分類本身就係 header</b> —— 十個入面九個係咁，所以第一件貨由
   677–948px 跌到 <b>359–614px</b>。</p>

  <h3>十個係咩</h3>
  <table class="note-tbl">
   <colgroup><col class="c1"><col><col class="c3"></colgroup>
   <thead><tr><th>版本</th><th>世界</th><th style="text-align:right">第一件貨</th></tr></thead>
   <tbody>
    <tr><td><b>1 色卡</b></td><td>油漆色卡，模切缺口，色由真貨相抽出</td><td class="px">614</td></tr>
    <tr data-pick><td><b>2 菲林</b></td><td>燈檯上一條菲林，齒孔＋格號</td><td class="px">403</td></tr>
    <tr data-pick><td><b>3 手寫牌</b></td><td>香港藥房螢光紙手寫價錢牌</td><td class="px">408</td></tr>
    <tr data-pick><td><b>4 收銀紙</b></td><td>感熱收銀單，件數就係單據行</td><td class="px">561</td></tr>
    <tr><td><b>5 咭簿</b></td><td>小卡簿內頁，抽起一張</td><td class="px">596</td></tr>
    <tr><td><b>6 扇卡</b></td><td>專櫃色號扇卡，鉚釘串住</td><td class="px">433</td></tr>
    <tr><td><b>7 分格盤</b></td><td>亞加力化妝盤，格唔等大</td><td class="px">440</td></tr>
    <tr><td><b>8 貨架</b></td><td>洞洞板＋掛鈎＋吊牌</td><td class="px">600</td></tr>
    <tr><td><b>9 鏡</b></td><td>化妝鏡燈膽（<b>對照組</b>，唯一要多排一行）</td><td class="px">776</td></tr>
    <tr data-pick><td><b>10 貼紙</b></td><td>模切貼紙紙，翹起個角</td><td class="px">359</td></tr>
   </tbody>
  </table>

  <h3>我點睇</h3>
  <ul>
   <li><b>2 菲林</b>同 <b>3 手寫牌</b>最出色。菲林用返目錄本身嗰啲韓國模特相，
    手寫牌最有香港味。兩個都喺 400px 左右。</li>
   <li><b>4 收銀紙</b>最出奇（件數變咗一張單），<b>10 貼紙</b>最矮（359px）。</li>
   <li><b>9 鏡</b>係<b>對照組</b>，特登唔食子分類 —— 睇下多排一行要付幾多代價（376px）。</li>
  </ul>

  <h3>呢一版係 rebuild 過嘅</h3>
  <p>頭一版交出去之前俾 review agent 判咗 <b>rebuild</b>，主要三點，已經改咗：</p>
  <ul>
   <li>本來嘅「燈箱」係<b>一張大相＋黑漸變＋標題</b> —— 即係你彈咗四輪嗰個款。
    改咗做菲林。</li>
   <li>色票／應援卡／抽屜／標籤本來係<b>同一副骨</b>（五張相一行加幾行字），
    各自換咗做色卡、咭簿、分格盤、貼紙紙。</li>
   <li>剷走咗<b>作出嚟嘅嘢</b>：貨架本來只喺兩格標「現貨」（等於作咗個庫存分別，
    其實 182 件全部有貨）；貼紙同收銀紙本來有假 SKU 碼。</li>
  </ul>

  <h3>要留意</h3>
  <ul>
   <li>呢十個係<b>樣稿</b>。未做嘅：菲林／錫紙／亞加力／離型紙嘅真實貼圖、動效。</li>
   <li>最矮嗰個（359px）都仲未到 Olive Young 嘅 219px。要再落就要郁埋
    「篩選／排序」條 —— 嗰個要你話事。</li>
  </ul>
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
    ap.add_argument("--src", default=DEFAULT_SRC)
    ap.add_argument("--out", default="/tmp/makeup-header.html")
    a = ap.parse_args()

    src = open(a.src).read()
    css = re.search(r"<style>(.*?)</style>", src, re.S).group(1)
    body = re.search(r"<body>(.*?)<script>", src, re.S).group(1)
    js = re.search(r"<script>(.*?)</script>", src, re.S).group(1)

    print("下載緊：")
    fonts = inline_fonts(src)
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
