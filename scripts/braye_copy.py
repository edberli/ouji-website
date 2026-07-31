#!/usr/bin/env python3
"""
Product copy for the BRAYE range.

BRAYE sells under "COOL WOMEN NEVER DIE" — the packaging is a sliding
metal case you wear on a chain, so the product is as much an object as
a cosmetic. Copy leads on that, then on the practical problem each
formula solves.
"""

COPY = {
    "braye-lipsleek": {
        "title": "BRAYE Lipsleek 唇頰彩妝",
        "hook": "掛喺身上都好睇的唇膏。",
        "lede": (
            "BRAYE 把唇膏做成一件可以戴出街的物件——金屬滑蓋外殼，配上頸鏈或掛繩，"
            "補妝變成一個動作，而唔係一件麻煩事。"
            "膏體加入腺苷同蘋果籽油，唇同頰都用得，一支搞掂全臉氣色。"
        ),
        "bullets": [
            ("唇頰兩用", "同一支點唇、點頰、點眼皮，妝感自然統一，出門唔使帶成袋嘢。"),
            ("半啞光水潤感", "唔會乾唇起皮，亦唔會油亮反光，介乎兩者之間嘅高級感。"),
            ("含護唇成分", "腺苷 + 蘋果籽油，補色同時滋潤，卸妝後唇唔會乾裂。"),
            ("可配掛繩", "金屬滑蓋設計，戴喺頸上或掛袋上，補妝隨手可及。"),
        ],
        "specs": ["容量：2.3g", "產地：韓國 Made in Korea", "純素配方 Vegan"],
        "how": "直接以膏體點於唇中央再向外推開；點頰時用指腹輕拍暈染，由顴骨向外帶。",
        "closer": "2024 GLOWPICK 唇彩類冠軍——韓國女生話：「無得買嗰陣先知有幾紅。」",
    },
    "braye-lipsleek-blur": {
        "title": "BRAYE Lipsleek Blur 霧感唇頰彩妝",
        "hook": "咬唇妝，但唔使咬。",
        "lede": (
            "想要霧面又怕乾、想要顯色又怕似塊膠——Blur 版本用超細粉體做出天鵝絨質感，"
            "上唇即刻霧化唇紋，顏色由中央自然淡出，唔使刻意暈染都似天生。"
        ),
        "bullets": [
            ("天鵝絨霧感", "細粉體令唇部平滑，唇紋、乾紋一次過模糊掉。"),
            ("霧面但唔乾", "配方保留潤度，唔會出現一般霧面唇膏嘅緊繃感。"),
            ("自然淡出邊緣", "顏色由內向外過渡，唔會有生硬唇線。"),
            ("唇頰通用", "輕掃雙頰即成霧感腮紅，妝容自然一致。"),
        ],
        "specs": ["容量：3.2g", "產地：韓國 Made in Korea", "純素配方 Vegan"],
        "how": "由唇中央向外輕點，再以指腹拍散邊緣。想更濃可以待第一層定妝後再疊。",
        "closer": "七款中性色調，由日常裸色到深沉玫瑰，返工同約會都用得。",
    },
    "braye-thin-glow-tint": {
        "title": "BRAYE Thin Glow Tint 薄透唇釉",
        "hook": "薄到似冇搽，但鏡頭影到。",
        "lede": (
            "唇釉最怕黐笠笠、飲啖水就冇晒色。"
            "Thin Glow 用輕盈水感質地，上唇薄透貼服完全唔黐，"
            "色素卻牢牢附著——食完飯淡咗一層，反而更似自然唇色。"
        ),
        "bullets": [
            ("薄透水光", "一層極薄嘅光澤膜，唔會有厚重唇釉嗰種黏膩感。"),
            ("唔黐頭髮", "風吹過唔會黐住面，戴口罩都冇咁易印。"),
            ("持色自然淡出", "唔會斑駁脫色，只會均勻變淡。"),
            ("十色任揀", "由詩意裸粉到奔放正紅，總有一隻夾你。"),
        ],
        "specs": ["容量：3.6g", "產地：韓國 Made in Korea", "純素配方 Vegan"],
        "how": "以斜口刷頭沿唇形描一次，再抿唇令顏色均勻。想層次感可只點唇中央。",
        "closer": "薄、透、亮——韓國女生日常出門最常伸手拎嗰支。",
    },
    "braye-pocket-lip-brush": {
        "title": "BRAYE Pocket Lip Brush 隨身唇掃",
        "hook": "唇膏擦花咗，一秒救返。",
        "lede": (
            "BRAYE 的金屬伸縮唇掃，收起只有拇指長度，"
            "刷毛細密有彈性，補唇線、修邊、暈染都做到。"
            "外殼同 Lipsleek 同一系列語言，一齊掛喺袋上都好睇。"
        ),
        "bullets": [
            ("伸縮收納", "刷頭完全收入殼內，掉落袋底都唔會污糟。"),
            ("細密刷毛", "描唇線精準，暈染又夠柔，一支兩用。"),
            ("金屬質感", "同 Lipsleek 同系列設計，成套用更完整。"),
        ],
        "specs": ["產地：韓國 Made in Korea", "兩色可選：銀色 / 深銀色"],
        "how": "沾取唇膏後由唇峰向唇角描繪，再由外向內輕掃暈開邊緣。",
        "closer": "細細支，但係化妝袋入面最常用嗰件。",
    },
}


def build_html(slug, detail_images=()):
    c = COPY[slug]
    h = [f'<p><strong>{c["hook"]}</strong></p>', f'<p>{c["lede"]}</p>', "<ul>"]
    h += [f"<li><strong>{t}</strong>——{d}</li>" for t, d in c["bullets"]]
    h.append("</ul>")
    h.append("<p><strong>用法</strong><br>" + c["how"] + "</p>")
    h.append("<ul>" + "".join(f"<li>{s}</li>" for s in c["specs"]) + "</ul>")
    h.append(f'<p><em>{c["closer"]}</em></p>')
    if detail_images:
        h.append('<div class="product-detail-images">')
        h += [f'<img src="{u}" alt="{c["title"]} 產品介紹" loading="lazy">' for u in detail_images]
        h.append("</div>")
    return "".join(h)


if __name__ == "__main__":
    for slug in COPY:
        print("=" * 62)
        print(COPY[slug]["title"], "\n ", COPY[slug]["hook"])
