#!/usr/bin/env python3
"""
Build and publish the Laka range.

Laka is a genderless vegan brand whose whole positioning is muted,
low-saturation colour — so the copy leads on how forgiving the shades
are rather than on how pigmented they get, which is the opposite of most
K-beauty tints.

Bulky Matte Lipstick, Maxi Glayer Tint and the two NatuLaka skincare
items are not on laka.co.kr, so they publish as drafts.

    python3 scripts/build_laka.py mirror
    python3 scripts/build_laka.py publish [--dry-run]
"""
from brand_build import run

VENDOR = "Laka"

T_EYE = "Laka, K-Beauty, 彩妝, 眼妝, makeup, eye, vegan"
T_LIP = "Laka, K-Beauty, 彩妝, 唇妝, makeup, lip, vegan"
T_CHEEK = "Laka, K-Beauty, 彩妝, 修容, makeup, cheek, vegan"
SPECS = ["產地：韓國 Made in Korea", "純素配方 Vegan"]

P = {
    "laka-fruity-glam-tint": dict(
        title="Laka Fruity Glam Tint 果感水光唇釉", type="唇釉", tags=T_LIP + ", liptint",
        price=115, specs=SPECS,
        hook="Laka 賣得最好嗰支，十四隻色。",
        lede="Laka 嘅色調全部偏灰、偏柔，所以唔會有「一搽就好濃妝」嘅問題。Fruity Glam 水感薄透，疊層先夠飽和——即係話由裸唇到正式妝，同一支就搞掂。",
        bullets=[("柔霧果調", "低飽和度，日常返工唔會太搶。"),
                 ("水感薄透", "唔黐笠，唔會黐頭髮。"),
                 ("可疊層", "薄一層裸唇，三層係完整唇妝。"),
                 ("十四色最闊", "全線色域最齊，冷暖膚色都揀到。")],
        how="沿唇形塗一層，抿唇令顏色均勻；想更飽和就疊多一層。",
        shades=[("#101 Joyful", "8809611861664", 2),
                ("#102 Dewy", "8809611861671", 4),
                ("#103 Humming", "8809611861688", 6),
                ("#104 Cherry", "8809611861695", 4),
                ("#105 Cold", "8809611861701", 4),
                ("#108 Salty", "8809611861732", 5),
                ("#109 Fresh", "8809611861763", 6),
                ("#111 Mellow", "8809611861787", 2),
                ("#114 Harmony", "8809611861817", 6),
                ("#115 Envy", "8809611861923", 5),
                ("#116 Candid", "8809611861930", 4),
                ("#120 Caffeine Rose", "8809611862166", 5),
                ("#121 Ash Nut", "8809611862562", 3),
                ("#122 Rosy Rose", "8809611862739", 5)]),

    "laka-popping-balloon-tint": dict(
        title="Laka Popping Balloon Tint 氣球感唇釉", type="唇釉", tags=T_LIP + ", liptint",
        price=115, specs=SPECS,
        hook="輕到似冇搽嘢。",
        lede="唇釉重手就會覺得唇上有嘢。Popping Balloon 質地輕如氣球薄膜，貼唇但無重量感，色素卻穩定——薄，唔代表唔耐用。",
        bullets=[("極輕質地", "戴上去感覺唔到有嘢。"),
                 ("持色穩定", "薄透但唔易脫。"),
                 ("柔和色調", "灰調配色，唔會過艷。"),
                 ("七色可選", "由裸調到活潑莓紅。")],
        how="沿唇形塗抹，可只點唇中央做漸層。",
        shades=[("#502 Spunky", "8809968130482", 5),
                ("#503 Sparkling", "8809968130499", 5),
                ("#504 Popping", "8809968130505", 5),
                ("#506 Tangy", "8809968130529", 5),
                ("#507 Playful", "8809968130536", 3),
                ("#510 Breezy", "8809968130567", 4),
                ("#512 Sizzling", "8809968130581", 5)]),

    "laka-jelling-nude-gloss": dict(
        title="Laka Jelling Nude Gloss 果凍裸色唇蜜", type="唇彩", tags=T_LIP + ", lipgloss",
        price=98, specs=SPECS,
        hook="裸色唇蜜，唔會顯到唇色蒼白。",
        lede="一般裸色唇蜜搽完會令人望落冇精神。Jelling 每隻色都帶少少暖調底色，所以提亮之餘仲有氣色——單搽得，疊喺唇膏上都得。",
        bullets=[("果凍水光", "光澤度高但唔黐。"),
                 ("裸調有氣色", "唔會令唇色顯得蒼白。"),
                 ("可單搽可疊", "疊喺唇膏上即刻變水光妝。"),
                 ("八色可選", "無花果、葡萄、蜜桃、玫瑰等調子。")],
        how="單搽於唇部；或疊喺唇膏上，集中點唇中央。",
        shades=[("#301 Fig Ring", "8809611862012", 4),
                ("#302 Grape Ring", "8809611862036", 4),
                ("#303 Peach Ring", "8809611862043", 3),
                ("#304 Ginger Ring", "8809611862050", 4),
                ("#306 Angel Ring", "8809611862371", 4),
                ("#307 Coco Ring", "8809611862746", 2),
                ("#308 Rosa Ring", "8809611862753", 4),
                ("#310 Melba Ring", "8809611862777", 2)]),

    "laka-mono-eyeshadow": dict(
        title="Laka Mono Eyeshadow 單色眼影", type="眼影", tags=T_EYE + ", eyeshadow",
        price=55, specs=SPECS,
        hook="八隻灰調色，點溝都唔會撞。",
        lede="Laka 嘅眼影全部係低飽和灰調，所以任何兩隻夾埋都夾得住——唔使睇配色表，隨手揀兩隻就已經係一個完整眼妝。",
        bullets=[("低飽和灰調", "任意組合都夾，唔會撞色。"),
                 ("粉質細滑", "唔飛粉，唔會落喺眼底。"),
                 ("啞光＋珠光", "同一系列兩種質地。"),
                 ("補色化算", "單色裝，用完換一隻就得。")],
        how="淺色打底整個眼窩，深色壓眼尾，珠光點喺眼中央。",
        shades=[("#902 Earth", "8809611862234", 1),
                ("#906 Tawny", "8809611862180", 3),
                ("#910 Fog", "8809611862340", 3),
                ("#911 Terrapeach", "8809611862173", 3),
                ("#914 Cocoa", "8809611862227", 4),
                ("#921 Allure", "8809611862388", 3),
                ("#924 Cliff", "8809611862418", 5),
                ("#926 Liberty", "8809611862432", 4)]),

    "laka-forever-6-eye-palette": dict(
        title="Laka Forever 6 六色眼影盤", type="眼影", tags=T_EYE + ", eyeshadow, palette",
        price=158, specs=SPECS,
        hook="六格，冇一格係多餘。",
        lede="大盤最浪費係嗰幾格永遠唔會用。Forever 6 只有六格，全部係日常會用到嘅色——打底、暈染、加深、閃片，一格都冇嘥。",
        bullets=[("六格全部用得着", "冇裝飾格，冇雞肋色。"),
                 ("灰調配色", "柔和唔搶，返工同約會都夾。"),
                 ("啞光＋珠光", "質地齊全，唔使配第二盤。"),
                 ("四款主題", "由基本裸調到蜜桃棕。")],
        how="由左至右順住用：打底、暈染褶位、壓眼尾、點閃片。",
        shades=[("#01 Beginning", "8809611862609", 4),
                ("#02 Attention", "8809611862616", 3),
                ("#03 Prim Rose", "8809611862814", 4),
                ("#04 Tan Peach", "8809611862821", 2)]),

    "laka-love-silk-blush": dict(
        title="Laka Love Silk Blush 絲滑胭脂", type="胭脂", tags=T_CHEEK + ", blush",
        price=98, specs=SPECS,
        hook="唔會搽到成塊面紅晒。",
        lede="Laka 嘅胭脂顯色慢得好誇張，即係話你好難落錯手。粉體幼滑到似絲，掃上面會融入底妝，唔會浮成一撻。",
        bullets=[("極易控色", "顯色慢，逐層疊到啱為止。"),
                 ("絲滑粉質", "融入底妝，唔會浮。"),
                 ("柔調配色", "唔會突兀，膚色都夾。"),
                 ("持妝力強", "貼膚唔飛粉。")],
        how="以胭脂掃沾取，喺手背拍走多餘粉量，由笑肌向太陽穴輕掃。",
        shades=[("#705 Angel", "8809611862111", 1),
                ("#706 Lover", "8809611862128", 2),
                ("#707 Sweet", "8809611862135", 4),
                ("#708 Poem", "8809611862142", 5)]),

    "laka-fixi-brow-cara": dict(
        title="Laka Fixi Brow Cara 定型染眉膏", type="眉筆", tags=T_EYE + ", brow",
        price=89, specs=SPECS,
        hook="染色同定型，一支做齊。",
        lede="眉毛亂又同髮色唔夾，畫眉都救唔到。Fixi 一邊上色一邊定型，刷完毛流順晒而且企得住，全日唔會塌返落嚟。",
        bullets=[("上色＋定型", "唔使另外用眉膠。"),
                 ("防水防汗", "全日唔甩色唔塌毛。"),
                 ("幼細刷頭", "唔會沾到皮膚。"),
                 ("四色可選", "由花生棕、灰棕到玫瑰酒紅。")],
        how="順住毛流由眉頭刷向眉尾，稀疏位多刷一次。",
        shades=[("#01 Peanut Brown", "8809611863491", 3),
                ("#04 Smoky Pink", "8809611863521", 2),
                ("#05 Ash Brown", "8809611863538", 0),
                ("#06 Rose Burgundy", "8809611863545", 3)]),

    "laka-dreambeam-highlighter": dict(
        title="Laka Dreambeam Highlighter 高光", type="高光", tags=T_CHEEK + ", highlighter",
        price=115, specs=SPECS,
        hook="唔閃，只係光。",
        lede="高光一唔小心就變閃粉。Dreambeam 珠光細到睇唔見顆粒，掃上顴骨只會令輪廓浮起，返工同見長輩都用得。",
        bullets=[("微米珠光", "唔見閃片，只見光澤。"),
                 ("唔卡乾紋", "細滑貼膚，唔會突顯細紋。"),
                 ("可疊加", "薄一層氣色，多兩層打卡妝。"),
                 ("三色可選", "自然、粉調同水感光。")],
        how="以扇形掃由顴骨最高點向太陽穴輕掃；鼻樑同唇珠可點少量。",
        shades=[("#01 Natural Beam", "8809611862579", 5),
                ("#02 pink beam", "8809611862586", 4),
                ("#03 Water Beam", "8809611862593", 4)]),

    # Not on laka.co.kr — published as drafts until we source art.
    "laka-bulky-matte-lipstick": dict(
        title="Laka Bulky Matte Lipstick 霧面唇膏", type="唇膏", tags=T_LIP + ", lipstick",
        price=108, specs=SPECS,
        hook="霧面唇膏，但係唔會乾。",
        lede="膏體豐潤，上唇即刻霧化唇紋，同時保留潤度——即係話唔使先搽潤唇膏打底。Laka 一貫嘅低飽和色調，日常返工都用得。",
        bullets=[("豐潤霧感", "柔霧但唔乾，唔會起皮。"),
                 ("一塗即勻", "唔使唇刷，唔會結塊。"),
                 ("柔調配色", "唔會過艷，唔會突兀。"),
                 ("五色可選", "由玫瑰、無花果到莓紅。")],
        how="由唇中央向外塗抹，再以指腹輕拍邊緣。",
        shades=[("#402 To Rose", "8809611863019", 6),
                ("#403 Fig Sounds", "8809611863026", 0),
                ("#404 Off Salmon", "8809611863033", 5),
                ("#405 So Peach", "8809611863040", 1),
                ("#410 Bold Berry", "8809611863095", 4)]),

    "laka-maxi-glayer-tint": dict(
        title="Laka Maxi Glayer Tint 多層次唇釉", type="唇釉", tags=T_LIP + ", liptint",
        price=115, specs=SPECS,
        hook="一支做到三種厚度。",
        lede="薄搽係裸唇、中等係日常、厚搽係正式妝——Maxi Glayer 嘅顯色隨層數遞增得好線性，所以同一支可以應付晒唔同場合。",
        bullets=[("層次分明", "疊幾多層就有幾深，好易控。"),
                 ("貼唇唔黐", "水潤但唔黏。"),
                 ("裸調為主", "亞麻、膚色、楓木等中性調。"),
                 ("八色可選", "全部係日常用得着嘅色。")],
        how="薄塗一層做裸唇；想飽和就等半乾後再疊。",
        shades=[("#601 Linen", "8809611864214", 4),
                ("#602 Bunny", "8809611864221", 3),
                ("#603 Bibi", "8809611864238", 4),
                ("#604 Misty", "8809611864245", 2),
                ("#605 Skin", "8809611864252", 4),
                ("#609 Classy", "8809611864290", 5),
                ("#612 Contour", "8809611864320", 5),
                ("#616 Maple", "8809611864368", 4)]),

    "laka-fruity-glam-tint-mini-duo": dict(
        title="Laka Fruity Glam Tint 迷你雙支禮盒", type="唇釉", tags=T_LIP + ", liptint, gift",
        price=108, specs=SPECS,
        hook="兩支迷你裝，襯好色調嘅禮盒。",
        lede="想試 Fruity Glam 又唔知揀邊隻色？呢個禮盒每盒兩支迷你裝，色調事先夾好——送人或者自己試色都啱。",
        bullets=[("兩支一盒", "色調已配好，唔使自己揀。"),
                 ("迷你裝", "隨身補妝唔佔位。"),
                 ("同正裝配方", "分量細，質感一樣。"),
                 ("五款主題", "由夏、秋、冬到堅果同玫瑰調。")],
        how="沿唇形塗抹；兩支可疊用做漸層唇。",
        shades=[("Autumn Tone Edition", "8809611862852", 2),
                ("Nutty Edition", "8809611862968", 4),
                ("Rosy Edition", "8809611862951", 4),
                ("Summer Tone Edition", "8809611862845", 0),
                ("Winter Tone Edition", "8809611862869", 1)]),
}

run(__name__, VENDOR, P, "laka")
