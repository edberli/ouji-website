#!/usr/bin/env python3
"""Fold every category into one 全部產品 menu.

The top bar had grown to twelve links — 全部產品, 護膚, 彩妝, 隱形眼鏡,
K-pop 周邊, 身體護理, 香氛, 生活風格, 品牌, 獲獎產品, 妝感配對, 專欄 —
and on a normal laptop it wrapped onto two lines with every label broken
mid-word（「隱形眼／鏡」）. A navigation bar that wraps is not a
navigation bar, it is a wall.

The categories now live in one panel under 全部產品, the way the mobile
drawer already did it. That leaves five links across the top, and every
subcategory is one hover away instead of two.

    python3 scripts/rebuild_nav.py
"""
import glob
import re

# 一欄一組。分欄係為咗排得平均，唔係分類邏輯 —— 彩妝本身太深，
# 硬塞落一欄會拉到成個 panel 長過螢幕。
COLUMNS = [
    [("護膚", "category.html", [
        ("潔面", "category.html?cat=cleanser"),
        ("爽膚水", "category.html?cat=toner"),
        ("棉片", "category.html?cat=pad"),
        ("精華液", "category.html?cat=serum"),
        ("乳液", "category.html?cat=moisturizer"),
        ("面膜", "category.html?cat=mask"),
        ("眼部護理", "category.html?cat=eye"),
        ("防曬", "category.html?cat=sunscreen"),
    ])],
    [("彩妝 · 底妝", "makeup.html?cat=base", [
        ("粉底", "makeup.html?cat=foundation"),
        ("氣墊", "makeup.html?cat=cushion"),
        ("遮瑕", "makeup.html?cat=concealer"),
     ]),
     ("彩妝 · 眼妝", "makeup.html?cat=eye", [
        ("眼影", "makeup.html?cat=eyeshadow"),
        ("眼線", "makeup.html?cat=eyeliner"),
        ("睫毛膏", "makeup.html?cat=mascara"),
        ("眉筆", "makeup.html?cat=brow"),
     ])],
    [("彩妝 · 唇妝", "makeup.html?cat=lip", [
        ("唇膏", "makeup.html?cat=lipstick"),
        ("唇釉", "makeup.html?cat=liptint"),
        ("唇彩", "makeup.html?cat=lipgloss"),
     ]),
     ("彩妝 · 頰彩", "makeup.html?cat=cheek", [
        ("胭脂", "makeup.html?cat=blush"),
        ("修容", "makeup.html?cat=contour"),
        ("高光", "makeup.html?cat=highlight"),
     ])],
    [("隱形眼鏡", "lens.html", [
        ("Feliamo", "lens.html?cat=feliamo"),
        ("Lilmoon", "lens.html?cat=lilmoon"),
        ("Molak", "lens.html?cat=molak"),
        ("N's Collection", "lens.html?cat=nscollection"),
        ("TOPARDS", "lens.html?cat=topards"),
     ]),
     ("K-pop 周邊", "kpop.html", [
        ("專輯", "kpop.html?cat=album"),
        ("寫真書", "kpop.html?cat=photobook"),
     ])],
    [("其他", None, [
        ("身體護理", "bodycare.html"),
        ("香氛", "fragrance.html"),
        ("生活風格", "lifestyle.html"),
     ]),
     ("全部", None, [
        ("瀏覽全部產品", "shop.html"),
        ("所有品牌", "brands.html"),
     ])],
]

TAIL = [("品牌", "brands.html"), ("獲獎產品", "awards.html"),
        ("妝感配對", "match.html"), ("專欄", "column.html")]


def build():
    cols = []
    for groups in COLUMNS:
        blocks = []
        for title, href, items in groups:
            head = (f'<a class="header__mega-title" href="{href}">{title}</a>'
                    if href else f'<span class="header__mega-title">{title}</span>')
            links = "".join(f'<a href="{h}">{t}</a>' for t, h in items)
            blocks.append(f'<div class="header__mega-group">{head}{links}</div>')
        cols.append('<div class="header__mega-col">' + "".join(blocks) + "</div>")

    tail = "".join(f'\n          <a href="{h}">{t}</a>' for t, h in TAIL)
    return (
        '<nav class="header__nav">\n'
        '          <div class="header__nav-item header__nav-item--mega">\n'
        '            <a href="shop.html">全部產品</a>\n'
        '            <div class="header__mega">' + "".join(cols) + '</div>\n'
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
    print(f"頂欄由 12 條減到 {1 + len(TAIL)} 條")


if __name__ == "__main__":
    main()
