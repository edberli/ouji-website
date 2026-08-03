#!/usr/bin/env python3
"""
Build and publish the lilybyred range.

lilybyred has no Hong Kong site, so unlike CLIO there is no ready
Traditional Chinese copy to reuse — the body text here is written for the
OUJI shopper and leads on the problem each product solves. Imagery comes
from lilybyred.co.kr via fetch_cafe24.py; titles, shades, prices and
stock come from our own supplier list.

    python3 scripts/build_lilybyred.py mirror
    python3 scripts/build_lilybyred.py publish [--dry-run]
"""
import argparse
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from publish import publish  # noqa: E402

BASE = "https://oujikbeauty.com/brands/lilybyred"
VENDOR = "lilybyred"

T_EYE = "lilybyred, K-Beauty, 彩妝, 眼妝, makeup, eye"
T_LIP = "lilybyred, K-Beauty, 彩妝, 唇妝, makeup, lip"
T_CHEEK = "lilybyred, K-Beauty, 彩妝, 修容, makeup, cheek"

# slug: dict(title, type, tags, price, hook, lede, bullets, how, shades)
# Anything without mirrored imagery publishes as a draft.
P = {
    "lilybyred-infinite-mascara": dict(
        title="LILYBYRED Am9 to Pm9 無限捲翹睫毛膏", type="睫毛膏", tags=T_EYE + ", mascara", price=95,
        hook="早上九點夾好，晚上九點仲喺度。",
        lede="睫毛膏最無奈係中午就冧返落嚟。Am9 to Pm9 用輕量定型配方，捲度由根部撐住成日，唔會愈戴愈重、愈戴愈跌。",
        bullets=[("全日定捲", "撐得住濕度同油分，唔使中途補夾。"),
                 ("唔暈唔跌粉", "眼底唔會出現黑影。"),
                 ("刷頭夠幼", "下睫毛同眼頭都刷得到。"),
                 ("溫水易卸", "唔使死拉硬扯，減少甩睫毛。")],
        how="Z 字形由睫毛根部向外刷，重點加強眼中位置。",
        shades=[("02 Volume & Curl", "8809393727776", 1)]),

    "lilybyred-survival-colorcara": dict(
        title="LILYBYRED Am9 to Pm9 生存彩色睫毛膏", type="睫毛膏", tags=T_EYE + ", mascara", price=79,
        hook="唔想眼妝太重，但又想有變化。",
        lede="黑色睫毛膏有時太搶。啡調 Colorcara 令眼神柔和，妝感自然啲，但同樣防水防油——韓國女生返工日常最常用嗰種。",
        bullets=[("柔和啡調", "比黑色溫柔，適合日常同淡妝。"),
                 ("防水防汗", "夏天同戴口罩都唔怕暈。"),
                 ("纖細刷頭", "根根分明，唔會結塊。"),
                 ("三色可選", "由朱古力啡到黑啡，深淺自選。")],
        how="先夾睫毛，再由根部向上刷兩下。",
        shades=[("01 Choco Brown", "8809393724386", 7),
                ("04 Mocha Brown", "8809393724416", 8),
                ("05 Black Brown", "8809393724423", 7)]),

    "lilybyred-survival-penliner": dict(
        title="LILYBYRED Am9 to Pm9 生存眼線液筆", type="眼線", tags=T_EYE + ", eyeliner", price=89,
        hook="畫完就唔使再理。",
        lede="眼線最怕係眼皮出油之後印上眼窩。呢支成膜快、附著力強，眨極都唔會轉印，落妝前佢都仲喺原位。",
        bullets=[("超防暈", "出油、流汗、戴口罩都唔印。"),
                 ("極細筆尖", "0.1mm 級數，內眼線同眼尾都畫得準。"),
                 ("一筆到底", "唔會斷墨，唔使重複描。"),
                 ("三色可選", "純黑、霧啡同櫻桃啡。")],
        how="沿睫毛根部由眼頭畫向眼尾，尾段輕輕拉長。",
        shades=[("01 Matt Black", "8809393724355", 5),
                ("02 Matt Brown", "8809393724362", 0),
                ("04 Cherry Brown", "8809716944408", 6)]),

    "lilybyred-bloody-liar-coating-tint": dict(
        title="LILYBYRED Bloody Liar 鏡面鎖色唇釉", type="唇釉", tags=T_LIP + ", liptint", price=89,
        hook="似啱啱食完車厘子。",
        lede="唇釉要夠亮就通常好黐。Bloody Liar 上唇成一層薄鏡面，光澤度夠但唔黐頭髮，顏色沉落唇部之後即使光澤退咗，色都仲喺度。",
        bullets=[("鏡面光澤", "唇部即刻立體，唔使再疊唇蜜。"),
                 ("唔黐笠", "風吹過唔會黐住面。"),
                 ("鎖色配方", "光澤淡出後仍然有色。"),
                 ("車厘子色調", "由冷調正紅到柔和莓紅。")],
        how="以刷頭沿唇形塗一層，想更飽和就等乾後再疊。",
        shades=[("19 Calm Cherry", "8809716944330", 1),
                ("20 Something Cherry", "8809716944903", 0)]),

    "lilybyred-dewy-fit-palette": dict(
        title="LILYBYRED Dewy Fit 水光修容盤", type="修容", tags=T_CHEEK + ", palette", price=198,
        hook="一盒搞掂胭脂、修容、高光。",
        lede="出門化妝最花時間係開三個盒。Dewy Fit 把修容、腮紅同高光放埋一盤，色調事先夾好，唔使自己諗點配。",
        bullets=[("一盤四用", "修容、腮紅、高光、眼影都用得。"),
                 ("色調已配好", "同一盤內互相夾，新手唔會撞色。"),
                 ("水光質感", "唔會粉感，唔會卡紋。"),
                 ("旅行啱用", "一個盒頂三個，行李慳位。")],
        how="先用深色收修輪廓，再上腮紅，最後點高光於顴骨最高點。",
        shades=[("01 Peach Cream", "8809716944842", 9),
                ("02 Pink Milk Tea", "8809716944859", 8),
                ("03 Oatmeal", "8809716944866", 7),
                ("05 Almond Milk", "8809716945597", 5)]),

    "lilybyred-luv-beam-blur-cheek": dict(
        title="LILYBYRED Luv Beam 霧感胭脂", type="胭脂", tags=T_CHEEK + ", blush", price=89,
        hook="唔會一撲就變猴屁股。",
        lede="霧面胭脂最易落錯手。Blur Cheek 粉體極細、顯色慢，掃三下同掃一下嘅分別好細——即係話你好難搞砸。",
        bullets=[("超易控色", "逐層疊加，深淺自己話事。"),
                 ("模糊毛孔", "細粉體同時柔化面部紋理。"),
                 ("霧面唔乾", "唔會有粉感或緊繃。"),
                 ("持妝到收工", "貼膚力強，唔會中途消失。")],
        how="以胭脂掃沾取，喺手背拍走多餘粉量，再由顴骨向太陽穴輕掃。",
        shades=[("01 Blurry Cherry", "8809716941582", 8),
                ("02 Blurry Peach", "8809716941599", 6)]),

    "lilybyred-luv-beam-cheek-mousse": dict(
        title="LILYBYRED Luv Beam 慕絲胭脂", type="胭脂", tags=T_CHEEK + ", blush", price=89,
        hook="用手指就得，唔使帶刷。",
        lede="慕絲質地一觸即化，指腹輕拍就融入底妝，唔會浮喺粉底上面——望落似由皮膚透出嚟嘅血色，唔似搽咗嘢。",
        bullets=[("融入底妝", "唔會推花粉底，唔會結塊。"),
                 ("免工具", "手指拍兩下就完成。"),
                 ("持久貼服", "定妝後唔會被口罩擦走。"),
                 ("素顏都用得", "唔化底妝都自然。")],
        how="指腹沾取米粒大小，點於顴骨後由內向外輕拍暈開。",
        shades=[("01 Apricot Mousse", "8809716945368", 1),
                ("02 Cherry Mousse", "8809716945375", 0),
                ("03 Pomelo Mousse", "8809716945382", 1)]),

    "lilybyred-luv-beam-glow-veil": dict(
        title="LILYBYRED Luv Beam 微光高光", type="高光", tags=T_CHEEK + ", highlighter", price=89,
        hook="行近先發現你係「好皮膚」，唔係「搽咗高光」。",
        lede="高光一唔小心就變閃粉。Glow Veil 珠光細到近乎睇唔見顆粒，光係流動嘅而唔係閃爍嘅，返工同見長輩都用得。",
        bullets=[("微米珠光", "唔見閃片，只見光澤。"),
                 ("唔卡乾紋", "乾肌都唔會突顯細紋。"),
                 ("可疊加", "薄一層係氣色，多兩層係打卡妝。"),
                 ("一物多用", "顴骨、眉骨、唇珠、鎖骨都用得。")],
        how="輕點於顴骨最高點、眉骨同鼻樑，再向外推開。",
        shades=[("01 Dreamy Beam", "8809716941810", 4),
                ("02 Holy Beam", "8809716941827", 6),
                ("03 Sugar Beam", "8809716942879", 4)]),

    "lilybyred-luv-beam-sherbet-cheek": dict(
        title="LILYBYRED Luv Beam 雪葩胭脂", type="胭脂", tags=T_CHEEK + ", blush", price=89,
        hook="七隻色，總有一隻夾你膚色。",
        lede="雪葩質地介乎粉同膏之間，上臉即刻化開變成薄薄一層，唔會有邊界。七隻色由杏、栗、桃到莓同葡萄，冷暖膚色都搵到位。",
        bullets=[("入口即化質地", "遇溫融開，貼膚唔浮。"),
                 ("自然邊界", "唔使刻意暈染都冇界線。"),
                 ("七色最闊", "全線色域最齊，配得起唔同膚調。"),
                 ("薄透可疊", "由裸感到打卡妝一支搞掂。")],
        how="以指腹或胭脂掃沾取，由笑肌向外輕拍。",
        shades=[("01 Apricot Topping", "8809716944613", 7),
                ("02 Sweet Chestnut Topping", "8809716944620", 6),
                ("03 Peach Topping", "8809716944637", 4),
                ("04 Grapefruit Topping", "8809716944644", 4),
                ("05 Strawberry Milk Topping", "8809716944651", 0),
                ("06 Raspberry Topping", "8809716944668", 4),
                ("07 Grape Topping", "8809716944675", 3)]),

    "lilybyred-milky-blur-fondue-bar": dict(
        title="LILYBYRED Milky Blur 奶霧唇膏棒", type="唇膏", tags=T_LIP + ", lipstick", price=89,
        hook="霧面唇膏，但係唔會乾到起皮。",
        lede="想要奶霧感又怕乾唇？Fondue Bar 膏體加入奶油成分，上唇即刻霧化唇紋，但保留潤度——即係話唔使先搽潤唇膏打底。",
        bullets=[("奶霧質地", "柔霧但唔乾，唔會起皮。"),
                 ("模糊唇紋", "唇部即刻平滑，唔使遮瑕。"),
                 ("一塗即勻", "唔使借助唇刷。"),
                 ("甜品色調", "花生醬、朱古力、糖漬桑莓等調子。")],
        how="由唇中央向外塗抹，再用指腹輕拍邊緣。",
        shades=[("01 Apricot in Peanut Butter", "8809716944088", 7),
                ("02 Strawberry in Whipped Cream", "8809716944095", 0),
                ("05 Pomegranate in Chocolate", "8809716944125", 8),
                ("06 Mulberry in Sugar", "8809716944132", 8)]),

    "lilybyred-mood-it-palette": dict(
        title="LILYBYRED Mood It 眼影盤", type="眼影", tags=T_EYE + ", eyeshadow, palette", price=95,
        hook="一盤一種心情，唔使諗點配色。",
        lede="眼影盤買咗成日淨係用得兩格。Mood It 每盤圍繞一個主題配好色——打底、加深、閃片全部夾得住，照住個次序落就已經係完整妝容。",
        bullets=[("配色已諗好", "由淺到深順住用就得。"),
                 ("啞光＋珠光", "同一盤內質地齊全。"),
                 ("粉質細滑", "唔飛粉，唔會落喺眼底。"),
                 ("四種調子", "清新、日常、大地、深邃各一。")],
        how="淺色打底整個眼窩，中間色暈染雙眼皮褶，深色壓眼尾，最後點閃片於眼中。",
        shades=[("01 Fresh It", "8809716943869", 4),
                ("02 Like It", "8809716943876", 7),
                ("03 Neutral It", "8809716943845", 3),
                ("04 Attention It", "8809716943838", 7)]),

    "lilybyred-skinny-mes-brow-pencil": dict(
        title="LILYBYRED Skinny Mes 極細眉筆", type="眉筆", tags=T_EYE + ", brow", price=75,
        hook="1.5mm 筆芯，畫得出一條眉毛。",
        lede="粗筆芯只可以填色，畫唔到毛流。呢支筆芯得 1.5mm，可以一條一條咁描，眉頭稀疏位補完之後睇唔出係畫嘅。",
        bullets=[("1.5mm 超細筆芯", "描得出單根毛流。"),
                 ("防水防汗", "全日唔會甩色。"),
                 ("附螺旋刷", "梳順毛流，柔化痕跡。"),
                 ("五色貼近髮色", "由淺啡到灰啡，染髮都夾。")],
        how="順住毛流一條一條輕描，最後用螺旋刷梳勻。",
        shades=[("01 Light Brown", "8809393722689", 7),
                ("02 Medium Brown", "8809393722696", 8),
                ("03 Dark Brown", "8809393722702", 0),
                ("04 Gray Brown", "8809393728520", 4),
                ("05 Taupe Brown", "8809716941285", 9)]),

    "lilybyred-smiley-lip-blending-stick": dict(
        title="LILYBYRED Smiley 唇頰暈染棒", type="唇膏", tags=T_LIP + ", lipstick", price=85,
        hook="唇同頰用同一支，妝感自然統一。",
        lede="唇色同腮紅唔夾，成個妝就會怪。Smiley 一支通用，點唇之後順手掃兩下喺頰，色調自動統一——出門淨係帶一支就夠。",
        bullets=[("唇頰兩用", "一支搞掂全臉氣色。"),
                 ("順滑易推", "膏體軟滑，喺頰上唔會拉扯。"),
                 ("柔霧收尾", "唔會油亮，唔會過分啞。"),
                 ("六色可選", "由日常裸調到明亮珊瑚。")],
        how="直接點於唇中央推開；點頰時輕點三下再以指腹拍散。",
        shades=[("01 Grin With Me", "8809716941759", 9),
                ("02 Laugh With Me", "8809716941766", 8),
                ("03 Be Happy With Me", "8809716941773", 9),
                ("04 Giggle With Me", "8809716941780", 9),
                ("05 Smile With Me", "8809716942893", 3),
                ("06 Chuckle With Me", "8809716943081", 6)]),

    "lilybyred-starry-eyes-gel-eyeliner": dict(
        title="LILYBYRED Starry Eyes Am9 to Pm9 眼線膠筆", type="眼線", tags=T_EYE + ", eyeliner", price=65,
        hook="臥蠶、眼頭、下眼線，一支通殺。",
        lede="膠筆質地介乎眼線同眼影之間：畫得出線條，又推得開變成暈染。珠光色可以做臥蠶提亮，啞光色可以壓下眼尾——一支頂兩件。",
        bullets=[("可畫可暈", "落筆三十秒內都推得開。"),
                 ("防水定型", "定妝後唔會印上眼窩。"),
                 ("珠光＋啞光", "提亮同加深都做到。"),
                 ("六色可選", "由摩卡、金粉到霧感無花果。")],
        how="沿下眼瞼中央輕畫一條做臥蠶，或於上眼線後輕輕暈開。",
        shades=[("02 Glam Mocha", "8809393722764", 0),
                ("04 Gold Pink", "8809393722788", 6),
                ("05 Mellow Coral", "8809393722795", 7),
                ("10 Shine Gold", "8809393722849", 9),
                ("17 Sheer Pink", "8809716941797", 4),
                ("19 Misty Fig", "8809716942435", 0)]),

    "lilybyred-sugar-wrapping-tint-gloss": dict(
        title="LILYBYRED Sugar Wrapping 迷你糖霜唇釉", type="唇釉", tags=T_LIP + ", lipgloss", price=58,
        hook="細細支，袋住補妝最方便。",
        lede="2.5g 迷你裝，掉喺褸袋或者化妝袋都唔佔位。糖霜質地薄透水潤，補妝唔使照鏡都塗得均勻。",
        bullets=[("2.5g 隨身裝", "銀包大細嘅袋都放得落。"),
                 ("水潤唔黐", "戴口罩都冇咁易印。"),
                 ("薄透自然", "疊喺唇膏上即刻變水光唇。"),
                 ("六色甜調", "蜜桃、無花果、提子、蜜蕃茄等。")],
        how="直接塗於唇部；想有層次就只點唇中央。",
        shades=[("01 Peach Syrup", "8809716945962", 6),
                ("02 Fig Caramel", "8809716945979", 1),
                ("03 Grape Sweets", "8809716945986", 5),
                ("04 Honey Tomato", "8809716945993", 5),
                ("05 Cherry Candy", "8809716946006", 4),
                ("06 Pomegranate Black Sugar", "8809716946013", 7)]),
}


def files_in(group, slug):
    d = os.path.join("brands", "lilybyred", group)
    if not os.path.isdir(d):
        return []
    return sorted(n for n in os.listdir(d)
                  if re.fullmatch(re.escape(slug) + r"-\d+\.jpg", n))


def urls(group, slug):
    return [f"{BASE}/{group}/{n}" for n in files_in(group, slug)]


def description(slug, d):
    h = [f'<p><strong>{d["hook"]}</strong></p>', f'<p>{d["lede"]}</p>', "<ul>"]
    h += [f"<li><strong>{t}</strong>——{x}</li>" for t, x in d["bullets"]]
    h.append("</ul>")
    h.append(f'<p><strong>用法</strong><br>{d["how"]}</p>')
    h.append("<ul><li>產地：韓國 Made in Korea</li></ul>")
    strips = urls("detail", slug)
    if strips:
        h.append('<div class="product-detail-images">'
                 + "".join(f'<img src="{u}" alt="{d["title"]} 產品介紹" loading="lazy">' for u in strips)
                 + "</div>")
    return "".join(h)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["mirror", "publish"])
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if args.cmd == "mirror":
        subprocess.run([sys.executable, "scripts/fetch_cafe24.py", "lilybyred"], check=True)
        subprocess.run([sys.executable, "scripts/optimise_brand_images.py",
                        "brands/lilybyred"], check=True)
        return

    for slug, d in P.items():
        gallery = urls("gallery", slug)
        draft = not gallery
        p = {
            "handle": slug,
            "title": d["title"],
            "descriptionHtml": description(slug, d),
            "vendor": VENDOR,
            "productType": d["type"],
            "tags": [t.strip() for t in d["tags"].split(",")],
            "status": "DRAFT" if draft else "ACTIVE",
            "option_name": "色號",
            "price": d["price"],
            "images": gallery,
            "shades": [{"name": n, "barcode": b, "qty": q} for n, b, q in d["shades"]],
        }
        flag = "  [草稿：冇圖]" if draft else ""
        print(f'{len(d["shades"]):>2} 色  {len(gallery):>2} 圖  '
              f'{len(urls("detail", slug)):>2} 長圖  {d["title"]}{flag}')
        if not args.dry_run:
            r = publish(p)
            print(f"        -> {r['handle']}  {r['variants']} variants, "
                  f"{r['media']} media, {r['channels']} channels")


if __name__ == "__main__":
    main()
