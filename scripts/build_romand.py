#!/usr/bin/env python3
"""
Build and publish the rom&nd range.

rom&nd's pull is shade curation — the Juicy Lasting Tint alone runs to
ten colours we stock, all named after fruit — so the copy leads on
finish and wear rather than repeating the shade list, which the variant
picker already shows.

Three lines (Juicy Roll Cheek, Twinkle Pen Liner, Better Than Cheek) are
gone from romand.co.kr, so they publish as drafts until we source art.

    python3 scripts/build_romand.py mirror
    python3 scripts/build_romand.py publish [--dry-run]
"""
from brand_build import run

VENDOR = "rom&nd"

T_EYE = "rom&nd, K-Beauty, 彩妝, 眼妝, makeup, eye"
T_LIP = "rom&nd, K-Beauty, 彩妝, 唇妝, makeup, lip"
T_CHEEK = "rom&nd, K-Beauty, 彩妝, 修容, makeup, cheek"

P = {
    "romand-juicy-lasting-tint": dict(
        title="rom&nd The Juicy Lasting Tint 果汁鎖色唇釉", type="唇釉", tags=T_LIP + ", liptint",
        price=78,
        hook="韓國賣到斷貨嗰支果汁唇釉。",
        lede="唇釉最惱人係食完飯淨返一圈唇線。Juicy Lasting 成膜後色素鎖喺唇上，中間淡出得均勻，即使光澤退咗，個色仲喺原位——所以先叫「Lasting」。",
        bullets=[("果汁水光", "似咬咗一啖水果，唔係一層厚膠。"),
                 ("鎖色唔斑駁", "淡出均勻，唔會出現唇線圈。"),
                 ("唔黐頭髮", "水潤但唔黏，風大都唔怕。"),
                 ("十隻果調", "由柚子、無花果、紅棗到蘋果啡，冷暖都有。")],
        how="以刷頭沿唇形塗一層，抿唇令顏色均勻；想更飽和就等成膜後再疊。",
        shades=[("#01 Pomelo Skin", "8800258080043", 1),
                ("#03 Bare Grape", "8800258080074", 0),
                ("#04 Fig Fig", "8800258080081", 8),
                ("#05 Jujube", "8800258080098", 2),
                ("#07 Cherry Bomb", "8800258080111", 1),
                ("#08 Pink Pumpkin", "8800258080135", 2),
                ("#12 Apple Brown", "8800258080197", 5),
                ("#14 Almond Rose", "8800258080159", 2),
                ("#21 Grape Bomb", "8800258080678", 5),
                ("#23 Peach Peach Me", "8800258080692", 3)]),

    "romand-blur-fudge-tint": dict(
        title="rom&nd Blur Fudge Tint 霧感軟糖唇釉", type="唇釉", tags=T_LIP + ", liptint",
        price=75,
        hook="霧面，但唔會扯到唇乾。",
        lede="一般霧面唇釉靠揮發做啞光，代價就係乾。Blur Fudge 用軟糖質地，上唇即刻霧化唇紋，同時留住潤度——即係話唔使先搽潤唇膏打底。",
        bullets=[("軟糖霧感", "柔霧唔乾，唔會起皮。"),
                 ("模糊唇紋", "唇部即刻平滑，唔使遮瑕。"),
                 ("一塗即勻", "唔會結塊，唔使唇刷。"),
                 ("柔調色域", "玫瑰、莓紫、暖調粉，日常同約會都夾。")],
        how="由唇中央向外塗抹，再以指腹輕拍邊緣做自然過渡。",
        shades=[("#02 Rosiental", "8809625244460", 3),
                ("#03 Musky", "8809625244477", 3),
                ("#05 Bibi Candy", "8809625244491", 3),
                ("#07 Cool Rose Up", "8809625244514", 4),
                ("#11 Fuchsia Vibe", "8809625245269", 3),
                ("#12 Warming Up", "8809625247218", 3),
                ("#13 Cooling Up", "8809625247225", 1)]),

    "romand-lip-mate-pencil": dict(
        title="rom&nd Lip Mate Pencil 唇線筆", type="唇線筆", tags=T_LIP + ", lip pencil",
        price=75,
        hook="唔止畫線，可以填滿全唇。",
        lede="唇線筆通常淨係用嚟描邊。Lip Mate 質地夠軟，可以直接填滿全唇當一支霧面唇膏用，亦可以打底令唇膏更持久。",
        bullets=[("一筆兩用", "描唇線或填滿全唇都得。"),
                 ("唔拉扯唇部", "乾唇都唔會刮。"),
                 ("防走位", "定型後唇膏唔會溢出唇緣。"),
                 ("六色裸調", "由蜜桃、豆沙到無花果棕。")],
        how="由唇峰向唇角描出輪廓，再填滿全唇；或作唇膏打底。",
        shades=[("#01 Tenderly Peach", "8809625247270", 4),
                ("#02 Dovey Pink", "8809625247287", 3),
                ("#03 Kaya Beige", "8809625247294", 5),
                ("#04 Fig Breeze", "8809625247300", 4),
                ("#05 Taupey Shade", "8809625247317", 2),
                ("#06 Under Chili", "8809625247324", 5)]),

    "romand-slide-in-single-matte": dict(
        title="rom&nd Slide In Single 單色眼影（啞光）", type="眼影", tags=T_EYE + ", eyeshadow",
        price=55,
        hook="自己砌盤，唔使買成盒淨用兩格。",
        lede="眼影盤永遠有幾格用唔着。Slide In 係單色，揀啱嗰幾隻插入盤入面，就係一個百分百屬於你嘅配色——而且補色只需要換一格。",
        bullets=[("可自由組盤", "揀啱嘅色，砌自己嘅盤。"),
                 ("啞光細滑", "唔飛粉，唔會落喺眼底。"),
                 ("顯色但易控", "薄塗自然，疊層夠深。"),
                 ("補色化算", "用完換一格，唔使成盤再買。")],
        how="淺色打底整個眼窩，中間色暈染雙眼皮褶，深色壓眼尾。",
        shades=[("M01 Warm Volumer", "8800258081248", 2),
                ("M06 Soda Pop", "8800258081347", 3),
                ("M15 Nothing Peach", "8800258081491", 5),
                ("M19 Mauve Dough", "8800258081569", 5),
                ("M22 Mid Marron", "8800258081613", 3),
                ("M23 Red Beans", "8800258081620", 5)]),

    "romand-slide-in-single-shimmer": dict(
        title="rom&nd Slide In Single 單色眼影（珠光）", type="眼影", tags=T_EYE + ", eyeshadow",
        price=55,
        hook="一格閃片，成個眼妝生晒。",
        lede="啞光打好底之後，差嘅就係中央嗰一點光。珠光格顆粒細、貼膚力強，用指腹拍上眼中央就有立體感，唔會跌落眼底。",
        bullets=[("細緻珠光", "有光澤但唔會一粒粒。"),
                 ("唔跌粉", "貼膚力強，唔會落喺顴骨。"),
                 ("可自由組盤", "同啞光格配成自己嘅盤。"),
                 ("六色可選", "由透明光澤到葡萄柚、紫羅蘭。")],
        how="以指腹沾取，輕拍於眼皮中央或臥蠶位置。",
        shades=[("S01 Glaze", "8800258081217", 5),
                ("S04 Bare Taro", "8800258081255", 5),
                ("S08 Pink Sha", "8800258081330", 3),
                ("S10 Jambon Pink", "8800258081385", 4),
                ("S11 Mashed Grapefruit", "8800258081408", 5),
                ("S12 Capri Violet", "8800258081439", 5)]),

    "romand-better-than-palette": dict(
        title="rom&nd Better Than Palette 眼影盤", type="眼影", tags=T_EYE + ", eyeshadow, palette",
        price=159,
        hook="韓國賣得最好嗰隻眼影盤。",
        lede="每盤圍繞一個主題配好色，啞光、珠光、閃片齊全，由左至右順住落就係完整妝容。粉質係 rom&nd 最出名嗰種——綿密到唔覺有粉。",
        bullets=[("配色已諗好", "順住格數用，新手都唔會撞色。"),
                 ("三種質地齊全", "啞光、珠光、閃片一盤搞掂。"),
                 ("粉質綿密", "唔飛粉，唔會結塊。"),
                 ("四款主題", "由花園裸調到霧感灰粉。")],
        how="淺色打底整個眼窩，中間色暈染雙眼皮褶，深色壓眼尾，閃片點喺眼中央。",
        shades=[("#04 Dusty Fog Garden", "8809625243128", 2),
                ("#05 Shade & Shadow Garden", "8809625243340", 4),
                ("#06 Peony Nude Garden", "8809625244132", 2),
                ("#11 Cheeky Cheeky Garden", "8809625248208", 1)]),

    "romand-han-all-brow-cara": dict(
        title="rom&nd Han All 染眉膏", type="眉筆", tags=T_EYE + ", brow", price=68,
        hook="眉毛顏色同髮色唔夾，成個妝就唔對路。",
        lede="染完頭髮但眉毛仲係黑色，望落好突兀。Han All 刷兩下就令眉色貼近髮色，同時梳順毛流——唔使畫，只需要染。",
        bullets=[("秒改眉色", "刷兩下就夾返髮色。"),
                 ("幼細刷頭", "唔會沾到皮膚，唔會結塊。"),
                 ("防水防汗", "全日唔甩色。"),
                 ("四色可選", "由灰調、木調到淺金啡。")],
        how="順住毛流由眉頭刷向眉尾，刷完用手指輕輕撥順。",
        shades=[("#01 Grace Taupe", "8809625246662", 0),
                ("#02 Mild Woody", "8809625246679", 0),
                ("#03 Modern Beige", "8809625246686", 6),
                ("#04 Merry Blondy", "8809625246693", 4)]),

    "romand-better-than-eyes-music": dict(
        title="rom&nd Better Than Eyes 眼影盤（Music 系列）", type="眼影",
        tags=T_EYE + ", eyeshadow, palette", price=89,
        hook="四格，一個完整眼妝。",
        lede="唔想帶成個大盤出街？Better Than Eyes 四格已經齊晒打底、加深同閃片，體積細但唔缺嘢——旅行同補妝最啱。",
        bullets=[("四格夠用", "打底、暈染、加深、閃片。"),
                 ("體積細", "化妝袋唔佔位。"),
                 ("粉質細滑", "同大盤同一配方。"),
                 ("乾燥花色調", "柔和自然，日常返工都用得。")],
        how="由左至右順住用：打底、暈染褶位、壓眼尾、點閃片。",
        shades=[("M01 Dry Apple Blossom", "8809625241094", 4)]),

    "romand-glasting-color-gloss": dict(
        title="rom&nd Glasting Color Gloss 玻璃唇釉", type="唇彩", tags=T_LIP + ", lipgloss",
        price=75,
        hook="玻璃一樣嘅光澤。",
        lede="唇彩要夠亮通常代表好黐。Glasting 上唇薄透如玻璃，光澤度極高但唔黏，疊喺唇膏上面即刻把霧面妝變水光妝。",
        bullets=[("玻璃級光澤", "反光度高，唇部即刻立體。"),
                 ("唔黐笠", "唔會黐頭髮。"),
                 ("可單搽可疊", "裸唇或疊喺唇膏上都得。"),
                 ("含護唇成分", "唔會愈搽愈乾。")],
        how="單搽於唇部；或疊喺唇膏上，集中點唇中央做層次。",
        shades=[("04 Grapy Way", "8809625248826", 2)]),

    # Gone from romand.co.kr — publish as drafts until we source art.
    "romand-juicy-roll-cheek": dict(
        title="rom&nd Juicy Roll Cheek 果凍滾珠胭脂", type="胭脂", tags=T_CHEEK + ", blush",
        price=95,
        hook="滾珠上臉，唔使工具。",
        lede="液狀胭脂最怕出量控制唔到。滾珠設計每次只帶出薄薄一層，喺笑肌滾兩下再用指腹拍散，就係由皮膚透出嚟嘅血色。",
        bullets=[("滾珠控量", "唔會一次出太多。"),
                 ("免工具", "手指拍散就完成。"),
                 ("融入底妝", "唔會推花粉底。"),
                 ("果凍水感", "自然透薄，唔似搽咗嘢。")],
        how="喺笑肌滾兩下，再以指腹由內向外輕拍暈開。",
        shades=[("#01 Rare Apple", "8800258084072", 5),
                ("#02 Dragon Berry", "8800258084089", 0),
                ("#04 Apricot Beige", "8800258084102", 0),
                ("#05 Nougat Coco", "8800258084119", 4),
                ("#06 Bare Grape", "8800258084126", 0)]),

    "romand-twinkle-pen-liner": dict(
        title="rom&nd Twinkle Pen Liner 閃亮眼線液筆", type="眼線", tags=T_EYE + ", eyeliner",
        price=78,
        hook="眼線同閃片，一支到底。",
        lede="液體閃片眼線最怕跌粉。呢支成膜快、附著力強，畫喺眼尾或臥蠶都唔會跌落面，日常妝三秒轉場做派對妝。",
        bullets=[("閃片唔跌落", "成膜後牢固，眨眼唔跌粉。"),
                 ("極細筆尖", "眼尾同臥蠶都畫得準。"),
                 ("防水定型", "唔印上眼窩。"),
                 ("五色可選", "由銀、金、玫瑰到午夜灰。")],
        how="沿眼尾或下眼瞼輕畫；亦可疊喺已畫好嘅黑色眼線上。",
        shades=[("#01 Silver Flake", "8809625246884", 8),
                ("#02 Golden Wave", "8809625246891", 9),
                ("#03 Rosy Sparkle", "8809625246907", 6),
                ("#04 Midnight Ash", "8809625246914", 6),
                ("#05 Sunset Hazel", "8809625246921", 13)]),

    "romand-better-than-cheek": dict(
        title="rom&nd Better Than Cheek 胭脂", type="胭脂", tags=T_CHEEK + ", blush", price=65,
        hook="奶調胭脂，唔會過火。",
        lede="Better Than 系列嘅粉質落喺胭脂上——綿密、顯色慢、易控。奶調配色令氣色柔和，唔會一撲就變紅蘋果。",
        bullets=[("超易控色", "顯色慢，逐層疊到啱為止。"),
                 ("粉質綿密", "同眼影盤同一配方。"),
                 ("奶調柔和", "自然氣色，唔會突兀。"),
                 ("冷暖分明", "W 系暖調、N 系中性，跟膚色揀。")],
        how="以胭脂掃沾取，喺手背拍走多餘粉量，由笑肌向太陽穴輕掃。",
        shades=[("W01 Odi Milk", "8809625245832", 5),
                ("W02 Strawberry Milk", "8809625245856", 3),
                ("W03 Apricot Milk", "8809625245863", 0),
                ("N02 Vine Nude", "8809625245894", 1)]),
}

run(__name__, VENDOR, P, "romand")
