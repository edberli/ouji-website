# Skincare brand section identities

Updated 2026-10-16. Scope: wide brand headings in `category.html` only. The white pill navigation keeps its separately calibrated logos. Product data and cards are unchanged. This documents the current source tree; it does not assert that these latest source changes are public/live or owner-accepted.

## Artwork and colour interpretation

- 53 named skincare vendors have their own profile. The generic “其他” group keeps its text heading.
- Original artwork is used. SVG paths and raster shapes are not recreated with fonts. Current official FIF, THE WHOO and Anua marks can differ from older product packaging.
- Dark backgrounds use a white knockout only for monochrome artwork. APRILSKIN, Acnes Labo and other multicolour marks retain their native details.
- Each brand has an individual CSS width and maximum height. Images retain their intrinsic proportions with `height: auto` and `object-fit: contain`; no logo is stretched. The table below lists each desktop box and the proportionally contained image size. Mobile scales both limits to 80%; a narrower plate can further reduce the available width. Header heights remain 88px desktop and 64px mobile.
- Transparent outer margins were trimmed from BOH, Bring Green, Round Lab, Some By Mi, mixsoon, NACIFIC, WELLAGE, MEDIHEAL and SUNGBOON EDITOR. Source artwork is intact.
- Curesys is cropped from the official Linktree avatar, retaining its tagline. Loshi is cropped from the isolated wordmark on the manufacturer’s brand visual. Loshi uses CSS brightness/contrast plus multiply blending to remove the photographed paper rectangle; its letter shapes are unchanged.
- Raster source resolution varies by asset. The higher-resolution replacements improve the named marks, but this does not mean every raster logo has 2×/retina pixel density. The named replacements use sourced original artwork rather than a vector redraw or AI upscale.


## Generic `其他` label typography

Only the generic skincare `其他` wordmark uses the embedded Noto Sans TC 600 subset: 28px on desktop and 24px on mobile. The 1,180-byte WOFF2 subset covers only `其` and `他`; its SIL Open Font License 1.1 text is included at `assets/fonts/noto-sans-tc-OFL.txt`. The CSS selector targets `.brand-plate--other .brand-plate__wordmark`, so product text and global typography are unchanged.

## Individual desktop logo dimensions

Values are pixels. “Box” is the per-brand CSS width × maximum height from `skincare-brand-headers.js`; “contained image” is the resulting image canvas size when constrained to that box, preserving the source aspect ratio. On mobile, both box limits are 80% of these values. The browser can further reduce width when the available plate is narrower.

| Brand | Desktop box W×H | Contained image W×H |
|---|---:|---:|
| Torriden | 160×38 | 160×30.6 |
| SKIN1004 | 264×38 | 264×21.6 |
| Round Lab | 220×34 | 220×21.8 |
| Anua | 148×40 | 148×35.5 |
| Beauty of Joseon | 240×34 | 240×22.6 |
| Abib | 110×40 | 110×34.2 |
| COSRX | 150×38 | 150×30.9 |
| VT Cosmetics | 205×38 | 205×32.3 |
| Some By Mi | 185×38 | 185×25.8 |
| BIOHEAL BOH | 104×46 | 104×42.9 |
| mixsoon | 155×40 | 155×31.4 |
| beplain | 130×40 | 130×37.1 |
| Skinfood | 180×38 | 180×26.4 |
| Goodal | 120×40 | 108.6×40 |
| PURITO SEOUL | 100×48 | 100×46.6 |
| ma:nyo | 150×40 | 150×35.2 |
| Bring Green | 242×36 | 242×21.1 |
| SO'NATURAL | 165×40 | 165×36.8 |
| Haruharu WONDER | 246×36 | 246×24.6 |
| TOCOBO | 150×40 | 150×27.1 |
| SUNGBOON EDITOR | 270×36 | 270×20.8 |
| Arencia | 155×40 | 155×35.2 |
| KSECRET | 200×46 | 200×43.8 |
| Needly | 195×38 | 195×25.2 |
| TIRTIR | 165×38 | 165×30.3 |
| Dr. Melaxin | 195×38 | 195×32.2 |
| ILSO | 100×42 | 87.2×42 |
| APRILSKIN | 170×40 | 170×21.8 |
| LINDSAY | 150×42 | 150×39.6 |
| OOTD | 105×48 | 105×45.5 |
| AKARAN | 175×40 | 175×31.2 |
| The History of Whoo | 210×38 | 210×28 |
| ongredients | 180×38 | 180×29 |
| numbuzin | 180×38 | 180×27.7 |
| d'Alba | 150×40 | 150×36.1 |
| NACIFIC | 181×54 | 180.9×54 canvas (~145×31 visible) |
| MENOKIN | 180×38 | 180×31.2 |
| Dr.Jart+ | 155×40 | 155×30.8 |
| Dr.G | 90×46 | 90×43.6 |
| Acnes Labo | 215×44 | 215×38.3 |
| MEDIHEAL | 190×38 | 190×27.6 |
| ELIZAVECCA | 150×38 | 150×33.2 |
| WELLAGE | 155×38 | 155×28 |
| FATION | 160×38 | 160×28.8 |
| Country & Stream | 240×38 | 240×27.5 |
| Cell Fusion C | 195×38 | 195×28.3 |
| Karte Made | 180×40 | 180×30.8 |
| FRUDIA | 145×38 | 145×22.3 |
| FARMSTAY | 165×40 | 165×33.3 |
| Curesys | 190×46 | 130.2×46 |
| Loshi | 140×50 | 116.1×50 |
| Faith in Face | 85×46 | 75.9×46 |
| innisfree | 205×38 | 205×26.6 |

## Palette provenance

The hex values below are implementation colours, not a claim that all brands publish those exact values in a brand manual. White is an intentional neutral where no stable signature background was verified.

| Brand | Colour | Basis |
|---|---|---|
| Torriden | `#208cd5` | Sampled from the original design studio’s labelled Torriden Blue identity artwork; JPEG approximation. [Case study](https://studio-d-d.com/en/projects/works-torriden) |
| SKIN1004 | `#a8915f` | Official Korean site footer background. [Source](https://skin1004korea.com/) |
| Anua | `#5c746d` | Adapted from the official site’s green progress indicator accent. [Source](https://anua.kr/) |
| Beauty of Joseon | `#f5f1eb` | Warm neutral adapted to its official dark wordmark; not a published palette token. |
| Abib | `#181818` | Neutral dark field for its existing monochrome mark; not a claimed proprietary hex. |
| VT Cosmetics | `#008e45` | Official Korean site membership/coupon accent. [Source](https://www.vt-cosmetics.com/) |
| Some By Mi | `#222220` | Official site point-theme HSL near-black. [Source](https://somebymi.com/) |
| BIOHEAL BOH | `#583088` | Approximate purple sampled from official owner CJ Olive Young brand visual. [Source](https://corp.oliveyoung.com/en/business/brand/boh) |
| mixsoon | `#517d62` | Official site footer / brand CTA green. [Source](https://mixsoon.co.kr/) |
| Skinfood | `#fdb812` | Official Korean store buy-button accent. [Source](https://theskinfood.com/) |
| PURITO SEOUL | `#133e35` | Official CSS colour token. [Source](https://purito.com/wp-content/themes/purito/css/var.css?ver=1.0.47) |
| ma:nyo | `#ab3e55` | Official navigation hover background. [Source](https://manyo.co.kr/) |
| Bring Green | `#086050` | Approximate green sampled from official owner brand visual. [Source](https://corp.oliveyoung.com/en/business/brand/bringgreen) |
| Needly | `#c8ffc8` | Official `--primary-nedly-green` token. [Source](https://needly.co.kr/) |
| TIRTIR | `#b8172a` | Existing approved red section colour retained; logo replaced with official SVG. |
| ILSO | `#0047bb` | Existing verified blue identity adaptation. [Source](https://ilso.co.kr/) |
| APRILSKIN | `#ff4c00` | Official site navigation accent. [Source](https://aprilskin.com/) |
| AKARAN | `#e8d3c3` | Official site concept block / footer. [Source](https://www.akaran.co.jp/) |
| The History of Whoo | `#4f3528` | Official logo fill and brown UI. [Source](https://thewhoo.com/) |
| ongredients | `#ffed88` | Official brand-story title accent, adapted to header. [Source](https://www.ongredients.com/) |
| MENOKIN | `#daa6a0` | Official header indicator / product visual accent. [Source](https://menokin.co.kr/) |
| Dr.G | `#005031` | Native official logo green, used as background with white knockout. [Source](https://www.dr-g.co.kr/) |
| Acnes Labo | `#292929` | Neutral charcoal to preserve the official white and orange mark. |
| MEDIHEAL | `#1d2088` | Native official logo blue, used as background with white knockout. |
| Country & Stream | `#ffeca4` | Official header background. |
| Loshi | `#eeede6` | Warm neutral adapted from the manufacturer’s paper brand visual. |
| innisfree | `#00bc70` | Official site theme colour. [Source](https://www.innisfree.com/) |
| Remaining profiles | `#ffffff` | Neutral white supporting each brand’s native mark; not an assertion that its brand palette is white. |

## Selected artwork sources

| Brand | Repository asset | Source page | Artwork |
|---|---|---|---|
| Torriden | `logos/torriden.svg` | Existing production asset | Existing production artwork retained; no new external source asserted |
| SKIN1004 | `logos/brand-headers/skin1004.svg` | [Official page](https://skin1004korea.com/) | [Source file](https://skin1004korea.com/web/upload/mosen/logo_b.svg) |
| Round Lab | `logos/brand-headers/round-lab-hd.png` | [Official page](https://roundlab.com/) | [Source file](https://roundlab.com/cdn/shop/files/ROUND_LAB_LOGO.png?v=1772847590); official source 800×153, transparent, cropped to the visible wordmark (756×75) by trimming outer margins only. |
| Anua | `logos/brand-headers/anua.svg` | [Official page](https://anua.kr/) | [Source file](https://anua.kr/anua/online/00_ecmall/logo/anua_logo_2025.svg) |
| Beauty of Joseon | `logos/brand-headers/beauty-of-joseon.png` | [Official page](https://beautyofjoseon.co.kr/) | [Source file](https://beautyofjoseon.co.kr/web/upload/category/editor/2025/04/04/e935378b8ba1805d4427776b0582dff7.png) |
| Abib | `logos/abib.svg` | [Official page](https://www.abib.com/) | Existing production artwork retained; no new external source asserted |
| COSRX | `logos/cosrx.png` | [Official page](https://www.cosrx.com/pages/stores) | Existing production artwork retained; no new external source asserted |
| VT Cosmetics | `logos/vt-cosmetics.png` | [Official page](https://vt-cosmetics.com/shopinfo/about.html) | Existing production artwork retained; no new external source asserted |
| Some By Mi | `logos/brand-headers/some-by-mi.png` | [Official page](https://somebymi.com/) | [Source file](https://somebymi.com/web/upload/category/editor/2025/08/19/35279b3e93f1e77a767fe2d5850a75e0.png) |
| BIOHEAL BOH | `logos/brand-headers/bioheal-boh-hd.png` | [Official Japan page](https://www.biohealboh.jp/) | [Source file](https://www.biohealboh.jp/assets/images/common/logo_white.png); 274×114 official white wordmark. |
| mixsoon | `logos/brand-headers/mixsoon.png` | [Official page](https://mixsoon.co.kr/) | [Source file](https://mixsoon.co.kr/web/upload/images/logo-b.png) |
| beplain | `logos/beplain.png` | [Official page](https://www.beplain.co.kr/) | Existing production artwork retained; no new external source asserted |
| Skinfood | `logos/brand-headers/skinfood.svg` | [Official page](https://theskinfood.com/) | [Source file](https://theskinfood.com/design/skinfood/skinfood/images/wib/PC/common/skinfood_pc_logo.svg) |
| Goodal | `logos/brand-headers/goodal-hd.png` | [Official CLIO Goodal page](https://cliocosmetic.com/goodal_en.html) | [Source file](https://cliocosmetic.com/public/images/logo/goodal.png); 402×148 official transparent PNG. |
| PURITO SEOUL | `logos/brand-headers/purito-seoul.svg` | [Official page](https://purito.com/) | [Source file](https://purito.com/ (inline SVG); https://purito.com/wp-content/themes/purito/css/var.css?ver=1.0.47 (color token)) |
| ma:nyo | `logos/manyo.png` | [Official page](https://www.manyo.co.kr/) | Existing production artwork retained; no new external source asserted |
| Bring Green | `logos/brand-headers/bring-green.png` | [Official page](https://corp.oliveyoung.com/en/business/brand/bringgreen) | [Source file](https://corp.oliveyoung.com/img/business/brand_detail_logo_bringgreen-9054e560faf60d7c0a063b98d158566d.png) |
| SO'NATURAL | `logos/brand-headers/so-natural.svg` | [Official page](https://www.sonatural.co.kr/) | [Source file](https://www.sonatural.co.kr/design/sona6769/images/logo_sonatural.svg) |
| Haruharu WONDER | `logos/haruharu-wonder.png` | [Official page](https://haruharuwonder.com/pages/about-us) | Existing production artwork retained; no new external source asserted |
| TOCOBO | `logos/tocobo.svg` | [Official page](https://tocobo.us/) | Existing production artwork retained; no new external source asserted |
| SUNGBOON EDITOR | `logos/brand-headers/sungboon-editor.png` | [Official page](https://sungboon.com/) | Existing verified raster asset logos/sungboon-editor.png; transparent margins trimmed only |
| Arencia | `logos/arencia.png` | [Official page](https://arencia.com/ko/) | Existing production artwork retained; no new external source asserted |
| KSECRET | `logos/ksecret.png` | [Official page](https://ksecretcosmetics.com/pages/global-seller) | Existing production artwork retained; no new external source asserted |
| Needly | `logos/brand-headers/needly-hd.png` | [Official page](https://needly.co.kr/) | [Footer logo source](https://needly.co.kr/wib/img/ft_logo.png); 217×28. |
| TIRTIR | `logos/brand-headers/tirtir.svg` | [Official page](https://tirtir.co.kr/) | [Source file](https://tirtir.co.kr/custom/logo.svg) |
| Dr. Melaxin | `logos/dr-melaxin.png` | [Official page](https://melaxin.com/) | Existing production artwork retained; no new external source asserted |
| ILSO | `logos/ilso.svg` | [Official page](https://ilso.kr/) | Existing production artwork retained; no new external source asserted |
| APRILSKIN | `logos/april-skin.svg` | [Official page](https://aprilskin.com/) | Existing production artwork retained; no new external source asserted |
| LINDSAY | `logos/lindsay.png` | [Official page](https://www.lindsay.co.kr/) | Existing production artwork retained; no new external source asserted |
| OOTD | `logos/brand-headers/ootd.png` | [Official page](https://ootdbeauty.com/products/overnight-eye-cream-p-m) | [Source file](https://ootdbeauty.com/cdn/shop/files/OOTD_logo_Korean_Vegan_Skin_Care_final_1000px_f4fee6d1-4a8a-457c-ba68-a2e34afa8eae.avif?v=1757893487&width=280) |
| AKARAN | `logos/brand-headers/akaran.png` | [Official page](https://www.akaran.co.jp/) | [Source file](https://ec-force.s3.amazonaws.com/wwwakarancojp/uploads/img/sitetop/brand-logo-akaran.png) |
| The History of Whoo | `logos/brand-headers/the-history-of-whoo.svg` | [Official page](https://thewhoo.com/) | [Source file](https://thewhoo.com/img/mall/thewhoo_logo_mo_brown.svg) |
| ongredients | `logos/brand-headers/ongredients.png` | [Official page](https://www.ongredients.com/) | [Source file](https://ecimg.cafe24img.com/pg1543b76310364036/ongredients/web/upload/free_design/head_logo.png) |
| numbuzin | `logos/brand-headers/numbuzin.svg` | [Official page](https://www.numbuzin.com/about.html) | [Source file](https://ecimg.cafe24img.com/pg1613b12558170092/numbuzin0828/web/upload/appfiles/ZaReJam3QiELznoZeGGkMG/b774cdd19491a8a9b03d85ee42d0ddc3.svg) |
| d'Alba | `logos/brand-headers/d-alba.svg` | [Official page](https://www.dalbaglobal.com/) | [Source file](https://www.dalbaglobal.com/_img/common/logo_final.svg) |
| NACIFIC | `logos/brand-headers/nacific-official.png` | [Official Korean mobile header](https://nacific.com/) | [Original source](https://nacific.com/web/upload/appfiles/ZaReJam3QiELznoZeGGkMG/d67323d9da6fe09135140fbddad24805.png); 201×60 canvas, 161×34 visible. Displayed at 181×54 canvas (about 145×31 visible) on desktop and 80% on mobile; this is not 2×/retina density. |
| MENOKIN | `logos/brand-headers/menokin.png` | [Official page](https://menokin.co.kr/) | [Source file](https://menokin.co.kr/web/img/logo_241017.png) |
| Dr.Jart+ | `logos/dr-jart.svg` | [Official page](https://www.drjart.com/about) | Existing production artwork retained; no new external source asserted |
| Dr.G | `logos/brand-headers/dr-g.png` | [Official page](https://www.dr-g.co.th/) | [Source file](https://www.dr-g.co.th/_ipx/q_80&s_198x96/images/logo.png) |
| Acnes Labo | `logos/brand-headers/acnes-labo.png` | [Official page](https://www.acnes-s.jp/en/) | [Source file](https://www.acnes-s.jp/en/assets/img/common/h_logo@2x.png) |
| MEDIHEAL | `logos/brand-headers/mediheal.png` | [Official page](https://www.mediheal.jp/) | [Source file](https://www.mediheal.jp/morenvyimg/logo_sub.png) |
| ELIZAVECCA | `logos/brand-headers/elizavecca-hd.png` | [Official mobile page](https://www.elizavecca.com/) | [Mobile header logo](https://cdn-saas-web-116-144.cdn-nhncommerce.com/elizavtr0091_godomall_com/data/skin/mobile/moblie_hera/img/mimg/top_logo_m.png); 253×56 RGBA. |
| WELLAGE | `logos/brand-headers/wellage-hd.png` | [Official My WELLAGE store](https://www.mywellage.com/) | [Source file](https://www.mywellage.com/web/upload/logo.png); 575×104 RGBA. |
| FATION | `logos/brand-headers/fation.png` | [Official page](https://m.eng.fation.co.kr/brand/brand.html) | [Source file](https://m.eng.fation.co.kr/_dbook/img/brand_logo.png) |
| Country & Stream | `logos/brand-headers/country-and-stream.png` | [Official page](https://www.idalabo.co.jp/brand/country_and_stream/) | [Source file](https://www.idalabo.co.jp/brand/country_and_stream/img/logo.png) |
| Cell Fusion C | `logos/brand-headers/cell-fusion-c.svg` | [Official page](https://cellfusionc.co.kr/) | [Source file](https://cellfusionc.co.kr/web/upload/logo.svg) |
| Karte Made | `logos/brand-headers/karte-made-mark.png` | [Official page](https://www.aretocore.com/contents/kartemade.php) | [Source banner](https://www.aretocore.com/contents/ex/img/index/brand_bnr_kartemade.png), 2160×416; native wordmark crop to x=374–1787, y=88–330 (1413×242), removing banner frame/outer whitespace only. |
| FRUDIA | `logos/brand-headers/frudia.svg` | Existing production asset | Existing production artwork retained; no new external source asserted |
| FARMSTAY | `logos/brand-headers/farmstay.png` | [Official page](https://en.fscos.com/brand/index.html) | [Source file](https://en.fscos.com/skin_img/logo.png) |
| Curesys | `logos/brand-headers/curesys.jpg` | [Official page](https://linktr.ee/curesys) | [Source file](https://ugc.production.linktr.ee/cc17a594-5833-485b-8fca-2ddaa44367c7_CURESYS-logo-210305.jpeg?io=true&size=avatar-v3_0) |
| Loshi | `logos/brand-headers/loshi.jpg` | [Official page](https://www.c-roland.co.jp/products/) | [Source file](https://www.c-roland.co.jp/assets/images/brand-list/loshi_brand.jpg) |
| Faith in Face | `logos/brand-headers/faith-in-face.png` | [Official page](http://faithinface.co.kr/index.html) | [Source file](https://faithinface.co.kr/design/fixntox/new/pc/img/new_logo.png) |
| innisfree | `logos/brand-headers/innisfree.png` | Existing production asset | Existing production artwork retained; no new external source asserted |

## Verification

- JavaScript syntax checks and all 53 local asset references.
- Actual category-page visual review at 1440px and 375px. Four desktop product columns and two mobile columns remain intact; no horizontal page overflow.
- Representative flat, stacked, wide, multicolour and photograph-sourced marks reviewed on the actual page.
- Final public deployment and owner acceptance are tracked separately from these source changes.
