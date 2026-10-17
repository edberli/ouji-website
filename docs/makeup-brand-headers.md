# Makeup brand section identities

Updated 2026-10-17T01:00:42+08:00. Scope: **wide makeup brand section headers only** in `makeup.html`, with 38 named profiles from `makeup-brand-headers.js`. The generic `其他` group uses the shared section-label treatment. This records the current source tree; browser visual QA is owned by the main agent, and this document does not assert deployment, public/live status or owner acceptance.

## Sizing and artwork treatment

- Section headers stay **88px desktop / 64px mobile**. Each brand has an independent optical width and maximum height; equal box dimensions are not imposed across marks.
- At the shared CSS breakpoint of 760px and below, both per-brand limits scale to **80%**. `height: auto` and `object-fit: contain` preserve proportions; the available plate width can constrain the image further.
- The source table lists the asset path used by the current integration, not proof that this version is deployed. These paths are separate from the pill/navigation artwork.
- Original path artwork or original raster pixels are retained. Profiles with `dark: true` receive the existing CSS white knockout (`brightness(0) invert(1)`). Multicolour K-Palette, SANA, AN' BLESS and the gold Felicela mark retain their native details. SANA uses multiply blending; Felicela uses lighten blending.
- Raster resolution varies. Small native artwork is intentional where the available original is small; no font recreation, tracing, AI enlargement or uniform 2×/retina claim is made. The dimensions below distinguish source pixels from final file pixels.

## Final-source precedence and deliberate crops

The final integration deltas in `official-logos-main.json` override the earlier variants/statuses in `official-logos-worker.json` and `official-logos-extra.json` in `../evidence/makeup-brand-headers-20261017/`:

- **SANA:** 312×37 manufacturer GIF → complete SANA mainmark crop `[0,0,129,37]`, output 129×37. The Japanese company descriptor is excluded; the original opaque white background stays.
- **Glint:** the 1769×375 official two-brand header → `[159,100,546,280]`, output 387×180. The complete **Glint by VDIVOV** mark stays; the adjacent multiplication sign and separate code glökolor mark are excluded. The worker's earlier standalone-unavailable status describes its original selection, not the final integration.
- **Felicela:** the 1000×400 official manufacturer banner → `[40,48,282,138]`, output 242×90. The full gold wordmark **and feather motif** stay on the original dark field. The catalogue key remains `Felicera`; the artwork is the manufacturer's `Felicela` spelling. The extra manifest's earlier clean-logo-unavailable status is superseded by this final crop.
- **AMUSE:** transparent margins only, `[22,0,247,40]`, 270×40 → 225×40. **rom&nd:** transparent margins only, `[0,14,356,97]`, 356×110 → 356×83.
- **fwee:** the original vertical 80×300 navigation artwork is cropped `[16,72,64,228]`, then rotated **90° clockwise by exact pixel transpose**, output 156×48. No resampling; the 133×50 footer variant is not the active file.

## Named-brand artwork sources

Dimensions are source → current file. Raster values are pixels; SVG values are viewBox/user-unit dimensions. URLs are recorded official-source provenance from the local manifests, not a new network availability check. For inline BRAYE artwork, the original source is the homepage SVG (`a[href="/"] > svg`, viewBox `0 0 524 79`).

| Brand / catalogue key | Integration asset path | Original artwork URL | Source → current size |
|---|---|---|---|
| CLIO | `logos/makeup-headers/clio.png` | [Original artwork](https://cliocosmetic.com/public/images/logo/clio.png) | 350×86 → 350×86 |
| CEZANNE | `logos/makeup-headers/cezanne.png` | [Original artwork](https://www.cezanne.co.jp/img/nav_logo.png) | 407×111 → 407×111 |
| fwee | `logos/makeup-headers/fwee.png` | [Original artwork](https://www.fwee.kr/_images/nav_logo.png) | 80×300 → 156×48 |
| UNLEASHIA | `logos/makeup-headers/unleashia.png` | [Original artwork](https://www.unleashiacosmetics.com/web/upload/category/editor/2021/11/02/24de4a1e629d7502a66f266f480e3493.png) | 2663×478 → 2663×478 |
| hince | `logos/makeup-headers/hince.svg` | [Original artwork](https://hince.co.kr/images/musign/main/logo_hince.svg) | 87×26 → 87×26 |
| dasique | `logos/makeup-headers/dasique.png` | [Original artwork](https://en.dasique.co.kr/web/upload/ga09/logo.png) | 133×40 → 133×40 |
| MAYBELLINE | `logos/makeup-headers/maybelline.svg` | [Original artwork](https://www.maybelline.com/-/media/project/loreal/brand-sites/mny/master/demo/logos-logo-small.svg?rev=-1) | 155×25 → 155×25 |
| Peripera | `logos/makeup-headers/peripera.png` | [Original artwork](https://cliocosmetic.com/public/images/logo/peripera.png) | 436×101 → 436×101 |
| rom&nd | `logos/makeup-headers/romand.png` | [Original artwork](https://romand.co.kr/web/upload/appfiles/0zdpAngaKBFnlCcCqpCU4A/cb60ebc9bc25388f85503acce16d3d89.png) | 356×110 → 356×83 |
| ROSY ROSA | `logos/makeup-headers/rosy-rosa.png` | [Original artwork](https://www.chantilly.co.jp/brand/rosyrosa/img/logo.png) | 467×72 → 467×72 |
| WAKEMAKE | `logos/makeup-headers/wakemake.svg` | [Original artwork](https://www.wakemake.jp/assets/img/common/wakemake_logo.svg) | 162.323×23.031 → 162.323×23.031 |
| AMUSE | `logos/makeup-headers/amuse.png` | [Original artwork](https://amusemakeup.com/_d1/img/logo.png) | 270×40 → 225×40 |
| TIRTIR | `logos/brand-headers/tirtir.svg` | [Original artwork](https://tirtir.co.kr/custom/logo.svg); [skincare mapping](skincare-brand-headers.md#selected-artwork-sources) | 369.8×68 (reused; SVG) |
| SO'NATURAL | `logos/brand-headers/so-natural.svg` | [Original artwork](https://www.sonatural.co.kr/design/sona6769/images/logo_sonatural.svg); [skincare mapping](skincare-brand-headers.md#selected-artwork-sources) | 677×151 (reused; SVG) |
| lilybyred | `logos/makeup-headers/lilybyred.png` | [Original artwork](https://www.lilybyred.co.kr/web/upload/NNEditor/20220616/dce45e83e8b4ee5d6260ff502db4bc68.png) | 139×36 → 139×36 |
| Laka | `logos/makeup-headers/laka.svg` | [Original artwork](https://laka.co.kr/web/upload/kdesign/logo.svg) | 102×39 → 102×39 |
| 2aN | `logos/makeup-headers/2an.png` | [Original artwork](https://ianfnc1163.imghost.cafe24.com/banner/about/logo.png) | 300×137 → 300×137 |
| Heart Percent | `logos/makeup-headers/heart-percent.webp` | [Original artwork](https://heartpercent.co.kr/web/upload/appfiles/AIFBrluHGdhkEsW6ewuLoA/2407f06556d6ebbeec5e7fa249fd8e79.webp) | 1292×138 → 1292×138 |
| SANA | `logos/makeup-headers/sana.png` | [Original artwork](https://sana.jp/common/images/tmp_header_img_logo_01.gif) | 312×37 → 129×37 |
| STUDIO 17 | `logos/makeup-headers/studio-17.png` | [Original artwork](https://cdn.imweb.me/thumbnail/20261006/9df72416faddb.png) | 627×540 → 517×118 |
| fillimilli | `logos/makeup-headers/fillimilli.png` | [Original artwork](https://corp.oliveyoung.com/img/business/brand_detail_logo_fillimilli-4f00be119d75da6c7da8ad0c49e840d4.png) | 240×99 → 158×43 |
| Flower Knows | `logos/makeup-headers/flower-knows.png` | [Original artwork](https://flowerknows.co/cdn/shop/files/20260204-154143_1c18774a-441f-4678-8404-1938105c4a59.png?v=1770196490) | 1378×956 → 1096×765 |
| CORINGCO | `logos/makeup-headers/coringco.png` | [Original artwork](https://www.coringco.com/web/upload/category/editor/2025/07/29/ff377a55307e63ed5a6682520277b38f.png) | 600×213 → 589×96 |
| Coralhaze | `logos/makeup-headers/coralhaze.png` | [Original artwork](https://coralhaze.cafe24.com/web/upload/img/pc/logo_bk.png) | 271×48 → 271×48 |
| Glint | `logos/makeup-headers/glint.png` | [Original artwork](https://glintbeauty.co.kr/web/upload/category/editor/2023/11/16/a01885f67190f1f2171aa87df30373cf.png) | 1769×375 → 387×180 |
| BRAYE | `logos/makeup-headers/braye.svg` | [Original artwork](https://braye.co.kr/) | 524×79 → 524×79 |
| KSECRET | `logos/ksecret.png` | Existing production artwork; no original file URL newly asserted; [skincare mapping](skincare-brand-headers.md#selected-artwork-sources) | 201×44 (reused; raster) |
| Love Liner | `logos/makeup-headers/love-liner.svg` | [Original artwork](https://sky0538.itembox.cloud/item/images/new/loveliner/memory/img_loveliner.svg) | 349.013×80.018 → 349.013×80.018 |
| OBgE | `logos/makeup-headers/obge.png` | [Original artwork](https://www.obge.co.kr/img/common/logo.png) | 226×84 → 226×84 |
| BCL | `logos/makeup-headers/bcl.png` | [Original artwork](https://www.bcl-brand.jp/img/usr/common/footer_logo.png) | 311×136 → 311×136 |
| AN' BLESS | `logos/makeup-headers/an-bless.png` | [Original artwork](https://ec-force.s3.amazonaws.com/wwwakarancojp/uploads/img/sitetop/brand-logo-anbless.png) | 201×96 → 201×92 |
| MAPEPE | `logos/makeup-headers/mapepe.png` | [Original artwork](https://www.chantilly.co.jp/brand/mapepe/img/logo.png) | 400×62 → 400×62 |
| Beauty World | `logos/makeup-headers/beauty-world.png` | [Original artwork](https://beautyworld.jp/wp-content/uploads/2024/07/logo-bk.png) | 1258×852 → 1258×852 |
| ohora | `logos/makeup-headers/ohora.png` | [Original artwork](https://ohora.kr/ohora/image/ohora_logo_black.png) | 329×104 → 329×104 |
| K-Palette | `logos/makeup-headers/k-palette.png` | [Original artwork](https://cuore-beauty.co.jp/products/img/series/logo_kp_top.png) | 500×260 → 500×113 |
| miru miru | `logos/makeup-headers/miru-miru.png` | [Original artwork](https://cosmebank.com/wp-content/themes/kaei/images/index/logo_mirumiru.png) | 611×117 → 611×117 |
| Felicera | `logos/makeup-headers/felicela.png` | [Original artwork](https://beautyworld.jp/wp-content/uploads/2026/07/BLAND-Felicela.jpg) | 1000×400 → 242×90 |
| Kiss Me | `logos/makeup-headers/kiss-me.svg` | [Original artwork](https://www.isehan.co.jp/wp-content/themes/isehan/common/img/logo.svg) | 185.2×39 → 185.2×39 |

TIRTIR, SO'NATURAL and KSECRET reuse the three existing skincare assets. KSECRET's skincare record retains an existing production raster and its official source page; it does not supply a new original-file URL. Transparent margins are also trimmed from Flower Knows, STUDIO 17, fillimilli, CORINGCO, AN' BLESS and K-Palette as recorded in their original manifests.

## Independent optical sizes

“Box” is the desktop CSS width × maximum height. “Contained canvas” is calculated from the actual file aspect ratio within that box; it is not a browser measurement of the visible ink. Mobile scales each box limit to 80%, with further width restriction possible from the plate.

| Brand / catalogue key | Desktop box | Desktop contained canvas | Mobile box (80%) |
|---|---:|---:|---:|
| CLIO | 170×42 | 170×41.8 | 136×33.6 |
| CEZANNE | 184×51 | 184×50.2 | 147.2×40.8 |
| fwee | 140×44 | 140×43.1 | 112×35.2 |
| UNLEASHIA | 195×36 | 195×35.0 | 156×28.8 |
| hince | 145×44 | 145×43.3 | 116×35.2 |
| dasique | 133×40 | 133×40 | 106.4×32 |
| MAYBELLINE | 218×38 | 218×35.2 | 174.4×30.4 |
| Peripera | 175×41 | 175×40.5 | 140×32.8 |
| rom&nd | 185×44 | 185×43.1 | 148×35.2 |
| ROSY ROSA | 220×35 | 220×33.9 | 176×28 |
| WAKEMAKE | 214×34 | 214×30.4 | 171.2×27.2 |
| AMUSE | 208×38 | 208×37.0 | 166.4×30.4 |
| TIRTIR | 165×38 | 165×30.3 | 132×30.4 |
| SO'NATURAL | 165×40 | 165×36.8 | 132×32 |
| lilybyred | 139×36 | 139×36 | 111.2×28.8 |
| Laka | 116×45 | 116×44.4 | 92.8×36 |
| 2aN | 104×48 | 104×47.5 | 83.2×38.4 |
| Heart Percent | 240×32 | 240×25.6 | 192×25.6 |
| SANA | 129×37 | 129×37 | 103.2×29.6 |
| STUDIO 17 | 188×43 | 188×42.9 | 150.4×34.4 |
| fillimilli | 150×41 | 150×40.8 | 120×32.8 |
| Flower Knows | 84×58 | 83.1×58 | 67.2×46.4 |
| CORINGCO | 220×36 | 220×35.9 | 176×28.8 |
| Coralhaze | 220×39 | 220×39.0 | 176×31.2 |
| Glint | 120×56 | 120×55.8 | 96×44.8 |
| BRAYE | 195×34 | 195×29.4 | 156×27.2 |
| KSECRET | 200×46 | 200×43.8 | 160×36.8 |
| Love Liner | 180×42 | 180×41.3 | 144×33.6 |
| OBgE | 112×44 | 112×41.6 | 89.6×35.2 |
| BCL | 112×49 | 112×49.0 | 89.6×39.2 |
| AN' BLESS | 112×52 | 112×51.3 | 89.6×41.6 |
| MAPEPE | 205×34 | 205×31.8 | 164×27.2 |
| Beauty World | 80×55 | 80×54.2 | 64×44 |
| ohora | 135×44 | 135×42.7 | 108×35.2 |
| K-Palette | 178×41 | 178×40.2 | 142.4×32.8 |
| miru miru | 200×40 | 200×38.3 | 160×32 |
| Felicera | 154×56 | 150.6×56 | 123.2×44.8 |
| Kiss Me | 182×40 | 182×38.3 | 145.6×32 |

## Background provenance

These are implementation colours. Native artwork colours, observed official-site UI context, retained prior OUJI accents and adapted tints are distinguished below. None is presented as a universal published brand guideline. **Neutral white is intentional**, preserving the original mark where a stable signature background has not been established.

| Brand / catalogue key | Current field | Basis | Interpretation |
|---|---|---|---|
| CLIO | `#14110f` | retained prior OUJI accent | Existing near-black section field, retained from before-profiles.json. |
| CEZANNE | `#b42046` | adapted tint | Red field selected for the official white header artwork; no published palette token asserted. |
| fwee | `#0d88d8` | native artwork colour | Original nav artwork blue #0D88D8; used as a field with a white CSS knockout. |
| UNLEASHIA | `#121212` | official site context | Official footer background #121212, recorded in worker manifest. |
| hince | `#a16e72` | native artwork colour | Original SVG fill #A16E72; used as a field with a white CSS knockout. |
| dasique | `#f9eeec` | adapted tint | Light blush field supporting the native brown mark; not a brand-manual hex. |
| MAYBELLINE | `#14110f` | retained prior OUJI accent | Existing near-black section field; original SVG artwork is white. |
| Peripera | `#ff2a71` | native artwork colour | Official owner logo pixels and brand-page accent #FF2A71. |
| rom&nd | `#ffe2ea` | adapted tint | Light pink field supporting the native dark mark. |
| ROSY ROSA | `#cf0025` | native artwork colour | Official red artwork #CF0025, used as a field with a white CSS knockout. |
| WAKEMAKE | `#e10034` | native artwork colour / official site context | Official Japan SVG fill and concept heading #E10034. |
| AMUSE | `#f5bbb4` | adapted tint | Coral-pink field supporting the native dark mark; no exact official palette token asserted. |
| TIRTIR | `#b8172a` | retained prior OUJI accent | Existing red #B8172A retained; provenance is shared with skincare. |
| SO'NATURAL | `#ffffff` | intentional neutral white | Native dark SVG retained; white does not assert a proprietary brand background. |
| lilybyred | `#fff1f2` | adapted tint | Pale pink field supporting the native dark mark. |
| Laka | `#f8f8f8` | official site context | Official site light-primary token --color-primary10: #F8F8F8. |
| 2aN | `#ffffff` | intentional neutral white | Native dark artwork retained; the observed pink membership promotion token is not adopted as a universal palette. |
| Heart Percent | `#ad5a69` | official site context | Official top-banner token --topcolor: #AD5A69. |
| SANA | `#ffffff` | native artwork background / intentional neutral white | Original opaque white field retained behind the complete purple SANA mainmark. |
| STUDIO 17 | `#171717` | adapted tint | Neutral charcoal field for a white CSS knockout of the native black mark. |
| fillimilli | `#b9dedc` | adapted tint | Mint field supporting the native black mark; not an asserted official hex guideline. |
| Flower Knows | `#fff0f0` | official site context | Official global site header background #FFF0F0. |
| CORINGCO | `#f7a1c4` | adapted tint | Pink field supporting the native dark-grey mark; no exact official palette token asserted. |
| Coralhaze | `#ffffff` | official site context / intentional neutral white | Official body background is white; retains the native brown-black wordmark. |
| Glint | `#333333` | official site context | Official global CSS --color-main / --color-black: #333. |
| BRAYE | `#007b83` | official site context | Official homepage section gradient includes #007B83; adapted to a solid header field. |
| KSECRET | `#ffffff` | intentional neutral white | Existing native raster retained; shared source mapping is in the skincare document. |
| Love Liner | `#ffffff` | intentional neutral white | Original brown-black path artwork retained. |
| OBgE | `#202433` | native artwork colour | Original dark-navy artwork #202433, used as a field with a white CSS knockout. |
| BCL | `#002b60` | native artwork colour | Original navy artwork #002B60, used as a field with a white CSS knockout. |
| AN' BLESS | `#ffffff` | intentional neutral white | Original grey signature and dark secondary lettering retained. |
| MAPEPE | `#ffffff` | intentional neutral white | Original near-black mark retained. |
| Beauty World | `#ffffff` | intentional neutral white | Original company mark and wording retained. |
| ohora | `#171717` | adapted tint | Neutral charcoal field for a white CSS knockout of the native black mark. |
| K-Palette | `#ffffff` | intentional neutral white | Original dark lettering, red emblem and tagline retain their colours. |
| miru miru | `#120506` | adapted tint | Near-black field chosen for the native white mark; no recolouring. |
| Felicera | `#0c0603` | adapted tint | Near-black field supports the original gold Felicela wordmark and feather; lighten blending integrates the original dark banner field. |
| Kiss Me | `#ce0037` | native artwork colour | Original SVG stylesheet fill #CE0037, used as a field with a white CSS knockout. |

## Shared `其他` label typography

The makeup `其他` label reuses the existing `skincare-brand-headers.css` rule and the **1,180-byte, two-character Noto Sans TC WOFF2 subset at weight 600** (`assets/fonts/noto-sans-tc-other-600.woff2`; declared characters `其` / `他`, U+5176 / U+4ED6). It is 28px desktop and 24px mobile. The font-family selector is scoped to `.lx-page .brand-plate--other .brand-plate__wordmark`; no global font change is introduced by this integration. Existing font licence: `assets/fonts/noto-sans-tc-OFL.txt`.

## Static evidence and limits

The actual static snapshot is `../evidence/makeup-brand-headers-20261017/static-audit.json`. It records input hashes, node syntax-check exit codes, file decoding/dimensions, the named profile/path inventory, SVG path/text/font element counts and pixel equality for the six final main-manifest crops/rotation. Static source inspection confirms declarations and wiring, not browser layout, navigation behaviour, palette acceptance or public deployment.

At this snapshot, 12 of 29 raster files have less than 2 source pixels per desktop CSS canvas pixel at the configured maximum size. This is a canvas calculation, not a visible-ink sharpness assessment. The affected marks are fwee (156×48), dasique (133×40), rom&nd (356×83), AMUSE (225×40), lilybyred (139×36), SANA (129×37), fillimilli (158×43), Coralhaze (271×48), KSECRET (201×44), AN' BLESS (201×92), MAPEPE (400×62), Felicera (242×90).

The fwee and lilybyred OG candidates (both 1200×628) were inspected and rejected: they do not improve the original logo artwork. The source inventory above is the final selection for this change.

Local visual QA on the actual `makeup.html` page passed at 1440×960 and 375×844: four desktop product columns, two mobile columns, 88px/64px brand headers, no horizontal overflow, and the CEZANNE navigation target displaying the correct red header. The mobile `其他` label uses the loaded `OUJI Section Label` font at 600/24px. Screenshots and readbacks are stored in the external evidence directory. This local check does not assert public deployment or owner acceptance.
