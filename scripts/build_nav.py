#!/usr/bin/env python3
"""一次過重寫全部 HTML 嘅導覽（電腦 mega menu ＋ 手機側欄）。

點解要 script：個 header 係逐頁 copy 咗一份，24 隻 HTML 檔都有一份
同樣嘅 markup。手改一定會有頁漏咗，客撳到一半就會見到舊分類。

分類定義只喺呢度寫一次，同 shopify.js 嘅 CATEGORY_TAXONOMY 對齊。

  python3 scripts/build_nav.py            # 睇下會改幾多頁
  python3 scripts/build_nav.py --apply
"""
import glob
import re
import sys

CHEV = ('<svg class="header__mega-chevron" viewBox="0 0 24 24" fill="none" '
        'stroke="currentColor" stroke-width="1.5"><path d="m6 9 6 6 6-6"/></svg>')

# (標題, 主連結, [(細分類名, 連結, 層級)])  層級：'' 一般／'heading' 粗體組／'item' 縮排
NAV = [
    ('護膚', 'category.html', [
        ('全部護膚產品', 'category.html', ''),
        ('潔面', 'category.html?cat=cleanser', ''),
        ('爽膚水', 'category.html?cat=toner', ''),
        ('棉片', 'category.html?cat=pad', ''),
        ('精華液', 'category.html?cat=serum', ''),
        ('乳液', 'category.html?cat=moisturizer', ''),
        ('面膜', 'category.html?cat=mask', ''),
        ('眼部護理', 'category.html?cat=eye', ''),
        ('防曬', 'category.html?cat=sunscreen', ''),
        ('局部護理', 'category.html?cat=spot', ''),
    ]),
    ('彩妝', 'makeup.html', [
        ('全部彩妝產品', 'makeup.html', ''),
        ('底妝', 'makeup.html?cat=base', 'heading'),
        ('粉底', 'makeup.html?cat=foundation', 'item'),
        ('氣墊', 'makeup.html?cat=cushion', 'item'),
        ('遮瑕', 'makeup.html?cat=concealer', 'item'),
        ('眼妝', 'makeup.html?cat=eye', 'heading'),
        ('眼影', 'makeup.html?cat=eyeshadow', 'item'),
        ('眼線', 'makeup.html?cat=eyeliner', 'item'),
        ('睫毛膏', 'makeup.html?cat=mascara', 'item'),
        ('眉筆', 'makeup.html?cat=brow', 'item'),
        ('唇妝', 'makeup.html?cat=lip', 'heading'),
        ('唇膏', 'makeup.html?cat=lipstick', 'item'),
        ('唇釉', 'makeup.html?cat=liptint', 'item'),
        ('唇彩', 'makeup.html?cat=lipgloss', 'item'),
        ('頰彩', 'makeup.html?cat=cheek', 'solo'),
        ('修容', 'makeup.html?cat=contour', 'solo'),
        ('定妝', 'makeup.html?cat=setting', 'solo'),
    ]),
    ('彩妝工具', 'tools.html', [
        ('全部彩妝工具', 'tools.html', ''),
        ('化妝掃', 'tools.html?cat=brush', ''),
        ('粉撲海綿', 'tools.html?cat=puff', ''),
        ('美容小工具', 'tools.html?cat=beauty', ''),
    ]),
    ('沐浴洗護', 'bath.html', [
        ('全部沐浴洗護', 'bath.html', ''),
        ('潔面', 'bath.html?cat=cleanser', ''),
        ('洗髮', 'bath.html?cat=shampoo', ''),
        ('護髮', 'bath.html?cat=hair', ''),
        ('沐浴', 'bath.html?cat=body', ''),
        ('身體乳', 'bath.html?cat=lotion', ''),
    ]),
    ('保健品', 'health.html', [
        ('全部保健品', 'health.html', ''),
        ('益生菌', 'health.html?cat=probiotics', ''),
        ('膠原蛋白', 'health.html?cat=collagen', ''),
        ('維他命', 'health.html?cat=vitamin', ''),
        ('紅參人參', 'health.html?cat=ginseng', ''),
        ('康普茶', 'health.html?cat=kombucha', ''),
    ]),
    ('季節性', 'seasonal.html', [
        ('全部季節性用品', 'seasonal.html', ''),
        ('防曬', 'seasonal.html?cat=sun', ''),
        ('護手霜', 'seasonal.html?cat=hand', ''),
    ]),
    ('香水香氛', 'fragrance.html', [
        ('全部香水香氛', 'fragrance.html', ''),
        ('香水', 'fragrance.html?cat=perfume', ''),
        ('身體噴霧', 'fragrance.html?cat=mist', ''),
    ]),
    ('隱形眼鏡', 'lens.html', None),
    ('K-pop 周邊', 'kpop.html', None),
]

CLS = {'': '', 'heading': ' class="header__mega-subheading"',
       'item': ' class="header__mega-subitem"',
       'solo': ' class="header__mega-subheading header__mega-subheading--solo"'}


def mega():
    out = []
    for label, href, subs in NAV:
        if subs is None:
            out.append('<div class="header__mega-group">'
                       f'<a class="header__mega-row header__mega-row--link" href="{href}">'
                       f'<span>{label}</span></a></div>')
            continue
        links = ''.join(f'<a href="{h}"{CLS[k]}>{n}</a>' for n, h, k in subs)
        out.append('<div class="header__mega-group">'
                   f'<button class="header__mega-row" aria-expanded="false"><span>{label}</span>{CHEV}</button>'
                   f'<div class="header__mega-sub">{links}</div></div>')
    return '<div class="header__mega">' + ''.join(out) + '</div>'


def mobile():
    """手機側欄：頂層直接出，唔再收埋喺『其他』。"""
    rows = []
    for label, href, subs in NAV:
        rows.append(f'      <a href="{href}">{label}</a>')
    return '\n'.join(rows)


def main():
    apply = '--apply' in sys.argv
    m = mega()
    n = 0
    for f in sorted(glob.glob('*.html')):
        src = open(f, encoding='utf-8').read()
        new = re.sub(r'<div class="header__mega">.*?</div></div></div>\s*(?=\n)',
                     m.replace('\\', '\\\\'), src, count=1, flags=re.S)
        # 手機側欄：換走舊嘅三條「其他」連結
        new = new.replace(
            '      <a href="bodycare.html">沐浴洗護</a>\n'
            '      <a href="fragrance.html">香氛</a>\n'
            '      <a href="lifestyle.html">生活風格</a>\n',
            mobile() + '\n')
        new = new.replace(
            '      <a href="bodycare.html">身體護理</a>\n'
            '      <a href="fragrance.html">香氛</a>\n'
            '      <a href="lifestyle.html">生活風格</a>\n',
            mobile() + '\n')
        if new != src:
            n += 1
            print('  ', f)
            if apply:
                open(f, 'w', encoding='utf-8').write(new)
    print(f'\n{n} 頁{"改咗" if apply else "會改"}')


if __name__ == '__main__':
    main()
