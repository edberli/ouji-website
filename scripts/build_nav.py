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


# 隱形眼鏡同 K-pop 喺電腦版係頂層連結，唔入 mega menu，所以 NAV 入面
# 冇 subs。但手機抽屜兩個都摺得開，所以子項喺呢度另外寫一份。
MOBILE_SUBS = {
    '隱形眼鏡': [
        ('全部隱形眼鏡', 'lens.html', ''),
        ('Feliamo', 'lens.html?cat=feliamo', 'item'),
        ('Lilmoon', 'lens.html?cat=lilmoon', 'item'),
        ('Molak', 'lens.html?cat=molak', 'item'),
        ("N's Collection", 'lens.html?cat=nscollection', 'item'),
        ('TOPARDS', 'lens.html?cat=topards', 'item'),
    ],
    'K-pop 周邊': [
        ('全部 K-pop 周邊', 'kpop.html', ''),
        ('專輯', 'kpop.html?cat=album', 'item'),
        ('寫真書', 'kpop.html?cat=photobook', 'item'),
        ('SEVENTEEN', 'kpop.html?cat=seventeen', 'item'),
        ('IVE', 'kpop.html?cat=ive', 'item'),
        ('ILLIT', 'kpop.html?cat=illit', 'item'),
        ('Stray Kids', 'kpop.html?cat=straykids', 'item'),
        ('ENHYPEN', 'kpop.html?cat=enhypen', 'item'),
        ('LE SSERAFIM', 'kpop.html?cat=lesserafim', 'item'),
    ],
}

# 抽屜最底嗰批唔係產品分類，所以唔跟 NAV 走。
MOBILE_EXTRA = [
    ('品牌', 'brands.html'),
    ('獲獎產品', 'awards.html'),
    ('妝感配對', 'match.html'),
    ('專欄', 'column.html'),
    ('帳戶', 'account.html'),
]

MCHEV = ('<svg class="mobile-nav__chevron" viewBox="0 0 24 24" fill="none" '
         'stroke="currentColor" stroke-width="1.5"><path d="m6 9 6 6 6-6"/></svg>')
MCLS = {'heading': ' class="mobile-nav__subheading"',
        'item': ' class="mobile-nav__subitem"', 'solo': '', '': ''}


def mobile():
    """手機抽屜成塊 `.mobile-nav__links` 嘅內容。

    ⚠️ 一定要成塊重出，唔可以只塞新連結入去。之前就係只換走舊嗰三條
    「其他」連結，結果原本已經寫死喺 HTML 嘅四個摺疊組（護膚／彩妝／
    隱形眼鏡／K-pop）留咗喺上面 —— 客喺手機抽屜見到「護膚」同「彩妝」
    各出現兩次，而且一半分類撳得開一半撳唔開。九個分類全部由 NAV 出，
    每個一次，全部摺得開。
    """
    out = []
    for label, href, subs in NAV:
        subs = subs or MOBILE_SUBS.get(label)
        if not subs:
            out.append(f'      <a href="{href}">{label}</a>')
            continue
        links = ''.join(
            f'\n          <a href="{h}"{MCLS[k]}>{n}</a>' for n, h, k in subs)
        out.append(
            '      <div class="mobile-nav__group">\n'
            '        <button class="mobile-nav__group-row" aria-expanded="false">'
            f'<span>{label}</span>{MCHEV}</button>\n'
            f'        <div class="mobile-nav__sublinks">{links}\n'
            '        </div>\n'
            '      </div>')
    for label, href in MOBILE_EXTRA:
        out.append(f'      <a href="{href}">{label}</a>')
    return '\n'.join(out)


def main():
    apply = '--apply' in sys.argv
    m = mega()
    mob = mobile()
    n = 0
    for f in sorted(glob.glob('*.html')):
        src = open(f, encoding='utf-8').read()
        new = re.sub(r'<div class="header__mega">.*?</div></div></div>\s*(?=\n)',
                     m.replace('\\', '\\\\'), src, count=1, flags=re.S)
        # 手機抽屜：成塊重出（見 mobile() 個註解，唔可以只補連結）
        new = re.sub(r'(<div class="mobile-nav__links">)(.*?)(\n    </div>\s*</nav>)',
                     lambda mm: mm.group(1) + '\n' + mob.replace('\\', '\\\\')
                     + mm.group(3),
                     new, count=1, flags=re.S)
        if new != src:
            n += 1
            print('  ', f)
            if apply:
                open(f, 'w', encoding='utf-8').write(new)
    print(f'\n{n} 頁{"改咗" if apply else "會改"}')


if __name__ == '__main__':
    main()
