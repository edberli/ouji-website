#!/usr/bin/env python3
"""
Product copy for the Glint range.

Written for the OUJI shopper: Hong Kong women in their 20s–30s who follow
K-beauty, want the "素顏感" glow they see on Korean creators, and are wary
of highlighters that read as glitter or cling to dry patches. Each entry
leads with the feeling, names the pain point, then earns it with detail.

Imported by build_glint_csv.py / the Shopify import script.
"""

COPY = {
    "glint-highlighter": {
        "title": "Glint Highlighter 高光粉",
        "hook": "韓國女生口中的「開燈肌」，就是這一盒。",
        "lede": (
            "打高光最怕兩件事：一是閃粉浮喺面、行近先發現一粒粒；"
            "二是掃完卡喺毛孔同乾紋度，反而顯老。"
            "Glint 高光粉用超微細珠光粉體，光澤係「透出嚟」而唔係「貼上去」——"
            "遠睇係氣色，近睇係好皮膚。"
        ),
        "bullets": [
            ("奶油質地，一掃即溶", "粉體細滑得似奶油，落喺面上即刻融入肌膚，唔會浮粉、唔會結塊。"),
            ("自然光感，唔見閃片", "微米級珠光，光線流動而唔係閃爍，返工、見家長都用得。"),
            ("疊到幾多都唔怕", "薄薄一層係好氣色，加多兩層係打卡妝，濃淡自己話事。"),
            ("一物三用", "顴骨提亮、眼皮打底、鼻樑修飾，出門帶一盒就夠。"),
        ],
        "specs": ["容量：2.3g／2.8g", "產地：韓國 Made in Korea", "適合：所有膚質，包括乾肌"],
        "how": "以刷具或無名指沾取適量，輕點於顴骨最高點、眉骨、鼻樑同唇珠，"
               "再向外輕輕推開。想再明顯啲，等第一層乾透先疊第二層。",
        "closer": "GLOWPICK 高光類冠軍、Olive Young 彩妝銷量第一——"
                  "韓國女生揀嚟揀去，最後都返返嚟呢一盒。",
    },
    "glint-stick-highlighter": {
        "title": "Glint Stick Highlighter 高光棒",
        "hook": "唔使刷、唔使鏡，三秒還你剛睡飽的臉。",
        "lede": (
            "返工前得五分鐘、通勤途中先發現面色差——呢啲時候你需要嘅唔係一盤粉。"
            "Glint 高光棒直接推上面，膏體遇溫即化，"
            "指腹一按就融入底妝，唔會推花、唔會斷層。"
        ),
        "bullets": [
            ("三重分層配方", "光澤層、保濕層、貼服層各司其職，所以先做到「濕潤但唔油」。"),
            ("乾肌救星", "加入植物油成分，掃過脫皮位都唔會起皮、唔會卡粉。"),
            ("免工具，隨時補", "袋住一支，等車、搭𨋢、去洗手間三秒補得返。"),
            ("裸妝都用得", "唔化底妝淨係推兩下，已經似瞓夠八個鐘。"),
        ],
        "specs": ["容量：7g／7.8g", "產地：韓國 Made in Korea", "適合：乾肌、混合肌、懶人"],
        "how": "直接以棒頭喺顴骨、眉骨、鼻樑輕輕畫兩下，再用手指或粉撲輕印暈開。"
               "喺底妝之後用效果最自然。",
        "closer": "空姐、化妝師隨身嗰支，就係佢。",
    },
    "glint-baked-blush": {
        "title": "Glint Baked Blush 烘焙胭脂",
        "hook": "由內透出嚟嘅紅暈，唔係「搽咗胭脂」。",
        "lede": (
            "胭脂難就難喺分寸：手一重就似曬傷，手輕又完全睇唔到。"
            "Glint 用意大利烘焙製法，粉體壓得細滑如絲，"
            "顯色係一層一層慢慢上，你想去到邊就停喺邊。"
        ),
        "bullets": [
            ("烘焙工藝，細滑如絲", "粉體綿密不飛粉，掃上面唔會結塊、唔會有粉感。"),
            ("超易控色", "一層薄透氣色，三層打卡上鏡，新手都唔會落錯手。"),
            ("持妝到收工", "貼膚力強，戴口罩、食完飯照樣有顏色。"),
            ("九色任揀", "由日常裸粉到玫瑰紫調，總有一隻夾你膚色。"),
        ],
        "specs": ["產品類型：粉狀胭脂", "產地：韓國 Made in Korea", "適合：所有膚質"],
        "how": "以胭脂掃沾取適量，喺手背輕拍去除多餘粉量，"
               "由顴骨最高點向太陽穴方向輕掃，逐層疊加至理想顯色度。",
        "closer": "2023 GLOWPICK Rookie 得獎作，韓國女生一入手就要儲齊色。",
    },
}


def build_html(slug, detail_images):
    """Product description: copy first, then the long detail strips."""
    c = COPY[slug]
    h = [
        f'<p class="product-copy__hook"><strong>{c["hook"]}</strong></p>',
        f'<p>{c["lede"]}</p>',
        "<ul>",
    ]
    h += [f"<li><strong>{t}</strong>——{d}</li>" for t, d in c["bullets"]]
    h.append("</ul>")
    h.append("<p><strong>用法</strong><br>" + c["how"] + "</p>")
    h.append("<ul>" + "".join(f"<li>{s}</li>" for s in c["specs"]) + "</ul>")
    h.append(f'<p class="product-copy__closer"><em>{c["closer"]}</em></p>')
    if detail_images:
        h.append('<div class="product-detail-images">')
        h += [
            f'<img src="{u}" alt="{c["title"]} 產品介紹" loading="lazy">'
            for u in detail_images
        ]
        h.append("</div>")
    return "".join(h)


if __name__ == "__main__":
    for slug in COPY:
        print("=" * 60)
        print(build_html(slug, [])[:600])
