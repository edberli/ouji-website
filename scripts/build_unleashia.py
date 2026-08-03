#!/usr/bin/env python3
"""
Build and publish the UNLEASHIA range.

UNLEASHIA is a vegan brand built around glitter and festival looks, so
the copy leads on the two things shoppers actually worry about with
glitter — fallout and removal — rather than on the vegan claim, which
every brand now makes.

Imagery from unleashiacosmetics.com; titles, shades, prices and stock
from our own supplier list.

    python3 scripts/build_unleashia.py mirror
    python3 scripts/build_unleashia.py publish [--dry-run]
"""
from brand_build import run

VENDOR = "UNLEASHIA"

T_EYE = "UNLEASHIA, K-Beauty, 彩妝, 眼妝, makeup, eye, vegan"
T_LIP = "UNLEASHIA, K-Beauty, 彩妝, 唇妝, makeup, lip, vegan"
T_CHEEK = "UNLEASHIA, K-Beauty, 彩妝, 修容, makeup, cheek, vegan"
T_BASE = "UNLEASHIA, K-Beauty, 彩妝, 底妝, makeup, base, vegan"

P = {
    "unleashia-glitterpedia-eye-palette": dict(
        title="UNLEASHIA Glitterpedia 閃片眼影盤", type="眼影", tags=T_EYE + ", eyeshadow, palette",
        price=158,
        hook="一盤十色，由裸妝一路去到派對。",
        lede="閃片盤最怕係得幾格用得着。Glitterpedia 每盤都係「五啞光＋五閃片」，啞光打底、閃片壓軸，同一盤由返工妝疊到夜晚妝——唔使再開第二盒。",
        bullets=[("啞光＋閃片同盤", "打底、加深、點綴一次過，唔使配第二個盤。"),
                 ("閃片唔跌落面", "膠質基底抓實閃片，眨眼一日都唔會跌落眼底。"),
                 ("粉質綿密", "啞光格唔飛粉，唔會落喺顴骨變髒。"),
                 ("純素配方", "唔含動物成分，敏感眼皮都用得。")],
        how="淺啞光打底整個眼窩，中間色暈染雙眼皮褶，深色壓眼尾，最後以指腹點閃片於眼中央。",
        specs=["產地：韓國 Made in Korea", "純素配方 Vegan"],
        shades=[("N°1 All Of Glitter", "8809647770657", 4),
                ("N°2 All Of Brown", "8809647770664", 4),
                ("N°3 All Of Coral Pink", "8809647770671", 3),
                ("N°4 All Of Lavender Fog", "8809647770763", 4),
                ("N°5 All Of Dusty Rose", "8809647770770", 4),
                ("N°6 All Of Citrus", "8809647770893", 4),
                ("N°7 All Of Peach Ade", "8809647770909", 5)]),

    "unleashia-sunset-dazzle-gloss-balm": dict(
        title="UNLEASHIA Sunset Dazzle 唇彩潤唇膏", type="唇彩", tags=T_LIP + ", lipgloss",
        price=98,
        hook="似搽咗潤唇膏，但係影相有色。",
        lede="想要水光又怕黐、想要護唇又嫌冇色——Sunset Dazzle 兩樣都做到。膏體滑過唇部即刻化開，光澤似黃昏海面反光，而唔係一層厚膠。",
        bullets=[("唇彩＋潤唇兩用", "有色有光澤，同時滋潤唇紋。"),
                 ("唔黐頭髮", "海邊、風大都唔會黐住面。"),
                 ("薄透可疊", "單搽係裸唇，疊喺唇膏上即刻水光。"),
                 ("六個度假色", "由 Wakiki 到 Amalfi，以海島命名。")],
        how="直接以膏體塗於唇部；想更亮就集中點唇中央。",
        specs=["產地：韓國 Made in Korea", "純素配方 Vegan"],
        shades=[("No.0 Wakiki", "8809647772477", 5),
                ("No.1 Malibu", "8809647772484", 3),
                ("No.2 Bondi", "8809647772491", 4),
                ("No.3 Ibiza", "8809647772507", 3),
                ("No.4 Bora Bora", "8809647772514", 5),
                ("No.5 Amalfi", "8809647772521", 3)]),

    "unleashia-oh-happy-day-lip-pencil": dict(
        title="UNLEASHIA Oh! Happy Day 唇線筆", type="唇線筆", tags=T_LIP + ", lip pencil",
        price=89,
        hook="唇形唔清晰，唔係唇色問題。",
        lede="同一隻唇膏，畫咗唇線同冇畫，成個人精神度差好遠。呢支筆芯夠硬描得準，但質地夠軟唔會拉扯唇部，而且可以直接填滿全唇當唇膏用。",
        bullets=[("描得準", "筆芯幼細，唇峰同唇角都定得住。"),
                 ("唔拉扯唇部", "膏體順滑，乾唇都唔會刮。"),
                 ("可當唇膏", "填滿全唇即刻係一支霧面唇膏。"),
                 ("防脫色", "定型後唔會隨飲食走位。")],
        how="由唇峰向唇角描出輪廓，再填滿全唇或以唇膏疊加。",
        specs=["產地：韓國 Made in Korea", "純素配方 Vegan"],
        shades=[("No.1 Birthday", "8809647771340", 4),
                ("No.2 Keep Smile", "8809647771357", 5),
                ("No.3 Strawberry Cake", "8809647771364", 4),
                ("No.4 Bae Bae", "8809647771371", 0),
                ("No.5 Love Rose", "8809647771388", 8),
                ("No.6 After Party", "8809647771395", 1)]),

    "unleashia-cotton-candy-face-palette": dict(
        title="UNLEASHIA A by Unleashia 棉花糖修容盤", type="修容", tags=T_CHEEK + ", palette",
        price=79,
        hook="細細盒，出街補妝最方便。",
        lede="修容、腮紅、高光三格喺同一個小盒入面，色調事先夾好。放喺化妝袋唔佔位，中午補妝唔使開三個盒。",
        bullets=[("三格一盒", "修容、腮紅、高光一次過。"),
                 ("色調已配好", "同盤互相夾，唔會撞色。"),
                 ("粉質細滑", "唔會浮粉，唔會結塊。"),
                 ("六款可選", "由蜜桃、可可到莓果同古銅。")],
        how="深色收修下顎同髮際，中間色掃顴骨，最後點高光於顴骨最高點。",
        specs=["產地：韓國 Made in Korea", "純素配方 Vegan"],
        shades=[("#01 Peach Crush", "8809647772538", 3),
                ("#02 Cocoa Mist", "8809647772545", 4),
                ("#03 Rose Veil", "8809647772200", 3),
                ("#04 Mystic Petal", "8809647772217", 3),
                ("#05 Berry Nana", "8809647773009", 5),
                ("#06 Golden Bronze", "8809647773016", 3)]),

    "unleashia-babe-skin-baby-blue-cushion": dict(
        title="UNLEASHIA Babe Skin Baby Blue 氣墊粉底", type="氣墊粉底", tags=T_BASE + ", cushion",
        price=178,
        hook="泛紅同暗黃，藍色調一次過中和。",
        lede="遮瑕力夠但一上臉就變面具，係大部分氣墊嘅通病。Babe Skin 用藍調校色，先中和泛黃再上色，所以薄薄一層已經夠勻，唔使搽厚。",
        bullets=[("藍調校色", "中和泛黃同泛紅，膚色即刻乾淨。"),
                 ("薄塗夠遮", "唔使疊厚就均勻，唔會有面具感。"),
                 ("水潤唔卡粉", "乾肌都唔會起皮。"),
                 ("純素配方", "唔含動物成分。")],
        how="以粉撲輕拍上臉，由面中央向外推；瑕疵位再輕拍多一層。",
        specs=["產地：韓國 Made in Korea", "純素配方 Vegan"],
        shades=[("#17C Seraphic", "8809647771470", 3),
                ("#21N Fluffy", "8809647771487", 3),
                ("#23W Jolly", "8809647771494", 5)]),

    "unleashia-satin-wear-healthy-green-cushion": dict(
        title="UNLEASHIA Satin Wear Healthy-Green 氣墊粉底", type="氣墊粉底", tags=T_BASE + ", cushion",
        price=178,
        hook="面紅同痘印，綠調壓得住。",
        lede="泛紅肌用一般粉底要搽好厚先蓋到。Healthy-Green 綠色校色底層先中和紅調，上面先落遮瑕，所以用量少好多，妝感自然啲。",
        bullets=[("綠調中和泛紅", "痘印同面紅唔使再另外遮。"),
                 ("緞面光澤", "唔油亮亦唔死白，似健康皮膚。"),
                 ("持妝唔氧化", "全日唔會變深變黃。"),
                 ("純素配方", "敏感肌都用得。")],
        how="以粉撲由泛紅位置向外輕拍推開。",
        specs=["產地：韓國 Made in Korea", "純素配方 Vegan"],
        shades=[("#18C Sea Shell", "8809647770961", 4),
                ("#21N Eburnean", "8809647770978", 4),
                ("#23W Bisque", "8809647770985", 4)]),

    "unleashia-tap-me-palette-duo": dict(
        title="UNLEASHIA Tap Me 雙色眼影盤", type="眼影", tags=T_EYE + ", eyeshadow",
        price=108,
        hook="兩格，三十秒完成眼妝。",
        lede="返工前得五分鐘。Tap Me 只有兩格——一格打底一格點綴，用手指拍兩下就有完整眼妝，唔使刷、唔使暈染。",
        bullets=[("兩格就夠", "唔使諗配色，順住用就完成。"),
                 ("手指直接用", "免工具，通勤途中都補得到。"),
                 ("貼膚不飛粉", "唔會落喺眼底變髒。"),
                 ("三種調子", "由甜美粉到沉穩大地。")],
        how="淺色以指腹拍滿眼窩，深色或閃片壓眼尾及眼中央。",
        specs=["產地：韓國 Made in Korea", "純素配方 Vegan"],
        shades=[("N°1 Pit-a-Pat", "8809647770473", 4),
                ("N°2 Groovy", "8809647770534", 4),
                ("N°3 Rub-a-Dub", "8809647770541", 5)]),

    "unleashia-moonlight-liquid-glitter": dict(
        title="UNLEASHIA A by Unleashia 月光液體閃粉", type="眼影", tags=T_EYE + ", glitter",
        price=68,
        hook="閃到，但唔會跌落面。",
        lede="閃粉最煩係化完妝半個鐘，顴骨滿佈金粉。液體質地令閃片黏實眼皮，乾透之後點眨都唔跌，卸妝時一抹即走。",
        bullets=[("零掉落", "液體成膜抓實閃片。"),
                 ("即塗即用", "自帶刷頭，唔使另備工具。"),
                 ("可疊喺眼影上", "日常妝三秒變派對妝。"),
                 ("易卸妝", "一般卸妝油即清走。")],
        how="以自帶刷頭點於眼皮中央，輕拍推開後待乾。",
        specs=["產地：韓國 Made in Korea", "純素配方 Vegan"],
        shades=[("#01 Shine Star", "8809647773023", 0),
                ("#02 Gold Star", "8809647773030", 3),
                ("#03 Peach Star", "8809647773047", 0)]),

    "unleashia-mood-shower-face-palette": dict(
        title="UNLEASHIA Mood Shower 高光修容盤", type="高光", tags=T_CHEEK + ", highlighter",
        price=138,
        hook="芭蕾舞台燈嘅光，落喺面上。",
        lede="高光唔係愈閃愈好。Mood Shower 珠光極細，掃上顴骨只會令輪廓浮起，唔會見到一粒粒閃片——影相同真人睇都乾淨。",
        bullets=[("細緻珠光", "光澤流動，唔見閃片顆粒。"),
                 ("多格可調", "由柔和提亮到強光影，自己調。"),
                 ("唔卡乾紋", "貼膚細滑，唔會突顯細紋。"),
                 ("純素配方", "唔含動物成分。")],
        how="以扇形掃沾取，由顴骨最高點向太陽穴輕掃；鼻樑同唇珠可點少量。",
        specs=["產地：韓國 Made in Korea", "純素配方 Vegan"],
        shades=[("No. 100 Ballerina Shower", "8809647771456", 3),
                ("No. 101 Ballerino Shower", "8809647771463", 2)]),
}

run(__name__, VENDOR, P, "unleashia")
