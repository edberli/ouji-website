#!/usr/bin/env python3
"""第二輪：將「拆走咗但讀落唔順」嗰啲句改寫返，順手清埋第一輪漏咗嘅講法。

原則：**有真獎就講真獎（機構＋年份），冇獎就講產品本身做到啲乜**。
唔用「銷量最好／爆紅／人氣」呢類冇數據支持嘅講法 —— 唔係怕嚴，係我哋
真係冇銷量數據，寫落去就係作。
"""
import re, sys, os
sys.path.insert(0, os.path.expanduser("~/Documents/ouji-website/scripts"))
from shopify_admin import all_products, update_product

RULES = [
    # ── 第一輪剪到唔順口，補返 ──
    ("唔使刷、唔使鏡，出門前補一補。", "唔使刷、唔使鏡，指腹一按就勻。"),
    ("賣咗十年。", "賣咗十年嘅開架遮瑕。"),
    ("皆為銷量冠軍——各自都係基本款。", "兩件都係系列入面嘅基本款。"),
    ("皆為銷量冠軍", "兩件都係系列基本款"),

    # ── 第一輪漏咗嘅銷量講法 ──
    # 有真獎嘅，就用返個獎（機構＋年份）頂返個位
    ("韓國賣得最好嗰隻眼影盤。", "2024 화해 眼影第二位。"),
    ("階齊到深膚色都搵到位——韓國以外賣得最好嘅氣墊之一。",
     "階齊到深膚色都搵到位——2026 Allure 讀者票選韓國美妝第一位。"),
    # 冇獎嘅，就講返件貨本身
    ("Laka 賣得最好嗰支，十四隻色。", "Laka 嘅唇釉系列，十四隻色。"),
    ("AMUSE 賣得最好嗰支。", "AMUSE 嘅露水質地唇釉。"),
    ("全球爆紅嗰支 Sky High。", "Sky High 睫毛膏。"),

    ("兩件都係系列基本款——各自都係基本款。", "兩件都係系列入面嘅基本款。"),
    ("全球賣爆嗰個紅盒。TIR TIR 一戰成名嘅就係呢隻。", "TIR TIR 嗰個紅盒。"),

    # ── 功效講法 ──
    ("有效遮毛孔、控油功能", "幫助遮毛孔同控油"),
]

def fix(html):
    masks = []
    def mask(m):
        masks.append(m.group(0)); return f"\x00{len(masks)-1}\x00"
    out = re.sub(r'alt="[^"]*"', mask, html)
    changed = []
    for a, b in RULES:
        if a in out:
            out = out.replace(a, b); changed.append(a[:22])
    out = re.sub(r"\x00(\d+)\x00", lambda m: masks[int(m.group(1))], out)
    return out, changed

def main(apply=False):
    todo = []
    for p in all_products():
        html = p.get("descriptionHtml") or ""
        new, ch = fix(html)
        if new != html: todo.append((p, new, ch))
    print(f"要改：{len(todo)} 件")
    for p, _, ch in todo: print(f"  {p['handle']}  ← {ch}")
    if apply:
        for p, new, _ in todo:
            update_product(p["id"], descriptionHtml=new)
        print(f"完成：{len(todo)} 件")

if __name__ == "__main__":
    main(apply="--apply" in sys.argv)
