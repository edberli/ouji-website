#!/usr/bin/env python3
"""Fold every category into one 全部產品 menu — same look as the mobile drawer.

The top bar had grown to twelve links — 全部產品, 護膚, 彩妝, 隱形眼鏡,
K-pop 周邊, 身體護理, 香氛, 生活風格, 品牌, 獲獎產品, 妝感配對, 專欄 —
and on a normal laptop it wrapped onto two lines with every label broken
mid-word（「隱形眼／鏡」）. A navigation bar that wraps is not a
navigation bar, it is a wall.

**2026-08-10 改版。** 第一版係一塊五欄闊嘅淺色半透明面板。喺深色首頁
睇落幾靚，但一放喺產品格上面就散晒 —— 後面啲產品相直接透上嚟，
「潔面」兩隻字疊住一舊眼影盤，讀都讀唔到。老闆嘅原話係「相 1 好差，
我要相 2 嗰個」，相 2 就係手機嗰個抽屜。

所以而家兩邊用同一套語言：深色實淨面板、白字、一行一個大分類、
右邊一個箭嘴，撳落去先展開。手機嗰個抽屜行咗好耐都冇問題，
桌面冇理由要另一套。

    python3 scripts/rebuild_nav.py
"""
import glob
import re

# 一個 tuple 一格：(標題, 連去邊, 子項)
# 子項 = None 即係唔摺疊，成行就係一條連結，撳落去直接去嗰版。
# 分類入面得三兩件嘢就唔值得摺 —— 多一下手續，少一個入口。
# 子項每個係 (文字, 連結, 種類)；種類 None＝普通、"heading"＝細標題、
# "sub"＝細標題下面嗰啲（多縮一格）。
GROUPS = [
    ("護膚", "category.html", [
        ("全部護膚產品", "category.html", None),
        ("潔面", "category.html?cat=cleanser", None),
        ("爽膚水", "category.html?cat=toner", None),
        ("棉片", "category.html?cat=pad", None),
        ("精華液", "category.html?cat=serum", None),
        ("乳液", "category.html?cat=moisturizer", None),
        ("面膜", "category.html?cat=mask", None),
        ("眼部護理", "category.html?cat=eye", None),
        ("防曬", "category.html?cat=sunscreen", None),
    ]),
    # 彩妝本身太深，四個子分類唔開細標題就變成一條十四項嘅長清單。
    ("彩妝", "makeup.html", [
        ("全部彩妝產品", "makeup.html", None),
        ("底妝", "makeup.html?cat=base", "heading"),
        ("粉底", "makeup.html?cat=foundation", "sub"),
        ("氣墊", "makeup.html?cat=cushion", "sub"),
        ("遮瑕", "makeup.html?cat=concealer", "sub"),
        ("眼妝", "makeup.html?cat=eye", "heading"),
        ("眼影", "makeup.html?cat=eyeshadow", "sub"),
        ("眼線", "makeup.html?cat=eyeliner", "sub"),
        ("睫毛膏", "makeup.html?cat=mascara", "sub"),
        ("眉筆", "makeup.html?cat=brow", "sub"),
        ("唇妝", "makeup.html?cat=lip", "heading"),
        ("唇膏", "makeup.html?cat=lipstick", "sub"),
        ("唇釉", "makeup.html?cat=liptint", "sub"),
        ("唇彩", "makeup.html?cat=lipgloss", "sub"),
        ("頰彩", "makeup.html?cat=cheek", "heading"),
        ("胭脂", "makeup.html?cat=blush", "sub"),
        ("修容", "makeup.html?cat=contour", "sub"),
        ("高光", "makeup.html?cat=highlight", "sub"),
    ]),
    # 呢兩個項目少，摺埋反而阻住 —— 直接一撳入去。
    ("隱形眼鏡", "lens.html", None),
    ("K-pop 周邊", "kpop.html", None),
    ("其他", None, [
        ("身體護理", "bodycare.html", None),
        ("香氛", "fragrance.html", None),
        ("生活風格", "lifestyle.html", None),
    ]),
]

TAIL = [("品牌", "brands.html"), ("獲獎產品", "awards.html"),
        ("妝感配對", "match.html"), ("專欄", "column.html")]

CHEVRON = ('<svg class="header__mega-chevron" viewBox="0 0 24 24" fill="none" '
           'stroke="currentColor" stroke-width="1.5"><path d="m6 9 6 6 6-6"/></svg>')

CLS = {None: "", "heading": ' class="header__mega-subheading"',
       "sub": ' class="header__mega-subitem"'}


def build():
    groups = []
    for title, href, items in GROUPS:
        if items is None:
            groups.append(
                '<div class="header__mega-group">'
                f'<a class="header__mega-row header__mega-row--link" href="{href}">'
                f'<span>{title}</span></a>'
                '</div>'
            )
            continue
        links = "".join(f'<a href="{h}"{CLS[kind]}>{t}</a>' for t, h, kind in items)
        groups.append(
            '<div class="header__mega-group">'
            f'<button class="header__mega-row" aria-expanded="false">'
            f'<span>{title}</span>{CHEVRON}</button>'
            f'<div class="header__mega-sub">{links}</div>'
            '</div>'
        )

    tail = "".join(f'\n          <a href="{h}">{t}</a>' for t, h in TAIL)
    return (
        '<nav class="header__nav">\n'
        '          <div class="header__nav-item header__nav-item--mega">\n'
        '            <a href="shop.html">全部產品</a>\n'
        '            <div class="header__mega">' + "".join(groups) + '</div>\n'
        '          </div>' + tail + '\n        </nav>'
    )


def main():
    nav = build()
    rx = re.compile(r'<nav class="header__nav">.*?</nav>', re.S)
    n = 0
    for f in sorted(glob.glob("*.html")):
        h = open(f).read()
        if not rx.search(h):
            continue
        h2 = rx.sub(lambda m: nav, h, count=1)
        if h2 != h:
            open(f, "w").write(h2)
            n += 1
    print(f"{n} 版導航重寫咗")
    fold = sum(1 for _, _, i in GROUPS if i is not None)
    print(f"頂欄 {1 + len(TAIL)} 條，面板 {fold} 個可摺疊 + {len(GROUPS)-fold} 條直接連結")


if __name__ == "__main__":
    main()
