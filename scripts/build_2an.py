#!/usr/bin/env python3
"""
Build and publish the 2aN range.

2aN sells on shade breadth — the Dual Cheek line alone runs to seventeen
colours we stock — so the copy leans on how to choose rather than on
formula claims, and on the two-in-one format that makes the breadth
usable.

Imagery from 2an.co.kr; titles, shades, prices and stock from our own
supplier list.

    python3 scripts/build_2an.py mirror
    python3 scripts/build_2an.py publish [--dry-run]
"""
from brand_build import run

VENDOR = "2aN"

T_EYE = "2aN, K-Beauty, 彩妝, 眼妝, makeup, eye"
T_LIP = "2aN, K-Beauty, 彩妝, 唇妝, makeup, lip"
T_CHEEK = "2aN, K-Beauty, 彩妝, 修容, makeup, cheek"
T_BASE = "2aN, K-Beauty, 彩妝, 底妝, makeup, base"

P = {
    "2an-dual-cheek": dict(
        title="2aN Dual Cheek 雙色胭脂", type="胭脂", tags=T_CHEEK + ", blush", price=95,
        hook="一盒兩格，深淺自己溝。",
        lede="腮紅最難係揀色——淺咗睇唔到，深咗似曬傷。Dual Cheek 每盒都有一深一淺，可以單用、可以疊、可以溝，即係話同一盒喺唔同季節、唔同妝容都用得。",
        bullets=[("兩格一盒", "深淺自由調配，唔使買兩盒。"),
                 ("粉質幼滑", "貼膚唔飛粉，唔會結塊。"),
                 ("十七色可選", "由裸調、蜜桃、珊瑚到莓紫，冷暖膚色都有位。"),
                 ("薄透可疊", "一層係氣色，三層係打卡妝。")],
        how="先用淺色鋪底，再以深色收窄範圍；想自然啲就兩格一齊沾。",
        shades=[("#01 Cotton Candy Violet", "8809657125638", 3),
                ("#02 Love, Rosy", "8809657125645", 1),
                ("#03 Coco Coral", "8809657125652", 8),
                ("#04 Hot Living Coral", "8809657125669", 0),
                ("#05 Mood In Cheek", "8809657126925", 0),
                ("#06 Pink Petal", "8809864754669", 1),
                ("#07 Peach Fizz", "8809864754652", 0),
                ("#08 Nude Haze", "8809864754645", 2),
                ("#09 Heart Balloon", "8800276310450", 4),
                ("#10 Love Potion", "8809968209188", 2),
                ("#11 Juicy Peach", "8809968209973", 2),
                ("#12 Orange Flare", "8809968209980", 2),
                ("#13 Berry Cupid", "8800276315172", 4),
                ("#14 Love, Cupid", "8800276315189", 2),
                ("#15 Mango Berry", "8800276316025", 2),
                ("#16 Pink Tension", "8800276319118", 0),
                ("#17 Bubble Heart", "8800276319125", 1)]),

    "2an-pure-glash-highlighter": dict(
        title="2aN Pure Glash 高光", type="高光", tags=T_CHEEK + ", highlighter", price=78,
        hook="唔止提亮，仲可以校色。",
        lede="除咗常見嘅香檳同珍珠白，呢個系列仲有青檸同檸檬草色——綠調壓泛紅、黃調壓暗沉。即係話佢同時係高光同校色粉。",
        bullets=[("提亮＋校色", "綠調壓面紅，黃調壓暗黃。"),
                 ("極細珠光", "唔見閃片顆粒，只見光澤。"),
                 ("八色可選", "由自然貝殼色到大膽青檸。"),
                 ("唔卡乾紋", "細滑貼膚，唔會突顯細紋。")],
        how="以刷具點於顴骨最高點、眉骨同鼻樑；校色款可先掃泛紅位置再上底妝。",
        shades=[("#ND01 Shell", "8809968204206", 0),
                ("#ND02 Clear", "8809968204213", 1),
                ("#WH01 Frosty", "8809968209164", 0),
                ("#PK02 Pinkbell", "8809968209805", 0),
                ("#OR01 Peach Beam", "8809968209812", 5),
                ("#OR02 Sunny Beam", "8800276316094", 4),
                ("#GN01 Lime Bomb", "8809968209799", 2),
                ("#YL01 Lemongrass", "8809968209829", 4)]),

    "2an-gleaming-tension-pact": dict(
        title="2aN Gleaming Tension 氣墊粉底", type="氣墊粉底", tags=T_BASE + ", cushion", price=148,
        hook="緊緻貼膚，唔會愈搽愈厚。",
        lede="Tension 網面令粉底只出必要嘅份量，所以薄薄一層就夠勻。妝感係緊緻嘅光澤而唔係濕笠笠，出油都唔會脫成一塊塊。",
        bullets=[("張力網面", "出粉量剛好，唔會一撳出一堆。"),
                 ("緊緻光澤", "亮而唔油，唔會似出汗。"),
                 ("六個色階", "由 17 號象牙到 29 號焦糖，深膚色都有位。"),
                 ("持妝唔氧化", "全日唔會變深變黃。")],
        how="以粉撲輕拍上臉，由面中央向外推開；瑕疵位再輕拍一層。",
        shades=[("#17 Pure Ivory", "8809968206545", 2),
                ("#21 Light Beige", "8809968206552", 1),
                ("#23 Natural Beige", "8809968206576", 4),
                ("#25 Sand Beige", "8809968206583", 3),
                ("#27 Soft Amber", "8809968206590", 5),
                ("#29 Caramel Beige", "8809968206606", 5)]),

    "2an-better-me-eye-palette": dict(
        title="2aN Better Me 眼影盤", type="眼影", tags=T_EYE + ", eyeshadow, palette", price=128,
        hook="唔使諗配色，跟住格數落就得。",
        lede="眼影盤買咗淨係用得兩格，通常係因為配色唔夾。Better Me 每盤由淺到深排好，加埋一兩格閃片壓軸——照住次序落，新手都砌到完整眼妝。",
        bullets=[("由淺到深排好", "順住用就係一個完整妝容。"),
                 ("啞光＋珠光＋閃片", "質地齊全，唔使配第二盤。"),
                 ("粉質綿密", "唔飛粉，唔會落喺眼底。"),
                 ("五款調子", "由柔粉、沙粉到夢幻紫。")],
        how="淺色打底整個眼窩，中間色暈染雙眼皮褶，深色壓眼尾，閃片點喺眼中央。",
        shades=[("#02 Fairy", "8809968200819", 0),
                ("#05 Dear Me", "8809968200840", 0),
                ("#09 Dreamcatcher", "8809968209157", 5),
                ("#12 Bubble Gum", "8809968209874", 1),
                ("#13 Sand Pink", "8800276316377", 0)]),

    "2an-color-play-dual-liner": dict(
        title="2aN Color Play 雙頭眼線筆", type="眼線", tags=T_EYE + ", eyeliner", price=118,
        hook="一支兩頭，日常同派對都應付到。",
        lede="一邊係啞光線條、一邊係閃片，即係話返工畫細線，收工加閃片就轉場。唔使帶多支，化妝袋慳位。",
        bullets=[("雙頭設計", "啞光線條＋閃片，一支兩用。"),
                 ("防水定型", "唔印上眼窩，唔跌落眼底。"),
                 ("柔和彩調", "蜜桃、玫瑰、芋紫，比純黑溫柔。"),
                 ("五色可選", "配唔同瞳色同妝容。")],
        how="以線條端沿睫毛根部畫；閃片端點於眼中央或下眼瞼提亮。",
        shades=[("#01 Honey Peach", "8809672512703", 3),
                ("#02 BeBe Pink", "8809672512697", 5),
                ("#03 Taro Bunny", "8888888001581", 5),
                ("#04 Rosy Candy", "8809672512727", 4),
                ("#05 Popping Berry", "8809672512734", 5)]),

    "2an-pocket-cotton-blurring-stick": dict(
        title="2aN Pocket Cotton 霧感唇膏棒", type="唇膏", tags=T_LIP + ", lipstick", price=98,
        hook="細支到放得入褲袋。",
        lede="棉花霧感質地，上唇即刻霧化唇紋，但唔會乾到起皮。支裝細，補妝唔使照鏡都塗得均勻——趕時間嗰啲日子最啱。",
        bullets=[("棉花霧感", "柔霧但唔乾，唔會起皮。"),
                 ("模糊唇紋", "唇部即刻平滑。"),
                 ("隨身尺寸", "褲袋、細銀包都放得落。"),
                 ("六色可選", "由蜜桃、莓奶到奶油紫。")],
        how="由唇中央向外塗，再以指腹輕拍邊緣令過渡自然。",
        shades=[("#01 Baby Peach", "8800276314649", 1),
                ("#02 Cotton Fizz", "8800276314656", 0),
                ("#03 Berry Milk", "8800276314663", 7),
                ("#04 Hug Pink", "8800276314670", 2),
                ("#05 Ruddy Cherry", "8800276314687", 5),
                ("#06 Cream Mauve", "8800276314632", 4)]),

    "2an-glaze-bouncing-tint": dict(
        title="2aN Glaze Bouncing 果凍唇釉", type="唇釉", tags=T_LIP + ", liptint", price=88,
        hook="果凍質地，彈返上嚟嗰種水潤。",
        lede="唇釉要水潤通常代表黐。Glaze Bouncing 上唇有彈性、有光澤，但唔會黐頭髮，飲水食嘢之後色仲喺度，只係光澤退咗。",
        bullets=[("果凍彈潤", "水光感強但唔黐笠。"),
                 ("鎖色唔斑駁", "淡出均勻，唔會淨返一圈唇線。"),
                 ("薄透可疊", "單搽係裸唇，疊層即刻飽和。"),
                 ("六色可選", "由裸調到車厘子紅。")],
        how="沿唇形塗抹，抿唇令顏色均勻；想更飽和就等成膜後再疊一層。",
        shades=[("#03 Lazy", "8800276313475", 7),
                ("#06 Berry Shower", "8800276313505", 1),
                ("#07 Chewy", "8800276313512", 5),
                ("#09 Candy Chew", "8800276313536", 4),
                ("#12 Cherry Juice", "8800276315912", 2),
                ("#15 Peach Bubble", "8800276319132", 3)]),
}

run(__name__, VENDOR, P, "2an")
