# Where each brand's product data comes from

Three shapes, cheapest first.

## 1. HK distributor on Shopify — `build_from_kosmetics.py`
`kosmetics.com.hk/collections/<vendor>/products.json` hands over
Traditional Chinese titles, descriptions, shade names and imagery as
structured data, and its images already sit on cdn.shopify.com so our
store fetches them directly. Nothing is mirrored and no deploy is needed.

Covers **Peripera** and **CLIO**. SKUs join on barcode, never on name.

## 2. HK brand site (Traditional Chinese) — `fetch_clio_hk.py`
`clio.com.hk` is a bespoke htmx site whose copy is already written for a
HK shopper. Two traps: category listings page through an htmx partial,
and every `.html` path 308s to its extensionless form, which urllib
raises on rather than follows.

## 3. Korean brand site on Cafe24 — `fetch_cafe24.py`
The default. Gallery under `/web/product/{big,extra/big}/`, detail strips
inside `#prdDetail`. Copy has to be written from scratch.

Covers Coralhaze, Heart Percent, lilybyred, UNLEASHIA, 2aN, rom&nd,
Laka, AMUSE, hince.

---

## Still to do

| Brand | SKUs | Source |
|---|---|---|
| fwee | 98 | **`fwee.kr`** — mapped, ready to mirror |
| TIR TIR | 55 | **`tirtir.co.kr`** — 15 pages mapped, ready to mirror |
| ~~MAYBELLINE~~ | ~~53~~ | Done — `maybelline.com.hk`, Vue-rendered |
| 花知曉 Flower Knows | 37 | `flowerknows.co` / `flower-knows.jp` — Shopify, but our IP is rate-limited; retry later |
| dasique | 68 | **`dasique.com` works in the browser** — 66 products, Shopify |
| ~~wakemake~~ | ~~44~~ | Done — `www.wakemake.hk`, SHOPLINE |

Worth noting: `wakemake.hk`, `fwee.kr` and `tirtir.co.kr` were all
previously written off as unreachable because the first domain guess
failed. Try the www/no-www and .kr/.co.kr variants before concluding a
brand has no site.

### wakemake.hk — handles already matched
All 13 of our lines resolve against its 30 product handles:

| Our line | SKUs | Handle |
|---|---|---|
| Healthy Glow Balm Stick | 5 | `healthy-glow-balm-stick` |
| Soft Blurring Eye Palette | 5 | `soft-blurring-eye-palette-ad` |
| Real Defining Pencil Liner | 5 | `real-defining-pencil-liner` |
| 3 in 1 自然造型眉筆 | 5 | `soft-drawing-slim-brow-n` |
| Over Blurring Pot | 4 | `over-blurring-pot` |
| 輕透無瑕遮瑕膏 | 4 | `defining-cover-concealer-spf30-pa` |
| Seamless Wear Foundation | 3 | `seamless-wear-foundation-spf30-pa` |
| 水光亮感貼肌氣墊 | 3 | `water-glow-coating-cushion` |
| Real Defining Brush Liner | 3 | `real-defining-brush-liner` |
| Stay Fixer Multi Color Powder | 2 | `stay-fixer-multi-color-powder` |
| 輕透無瑕遮瑕修容盤 | 2 | `defining-cover-conceal-fit-palette` |
| Real Defining Lash Mascara | 2 | `real-defining-lash-mascara` |
| 維他命水嫩光感底霜 | 1 | `vitamin-watery-tok-glow-tone-up-lotion` |

### wakemake.hk
An official HK store on **SHOPLINE** (not Shopify, so `products.json`
returns HTML, not JSON). Listings live at `/products` (24 per page) and
`/categories/<eye|lip|face>`; product pages at `/products/<handle>`.
Imagery is on `img.shoplineapp.com` and the copy is Traditional Chinese.
Needs a small parser of its own — the title is not in `<title>` and the
shades sit in embedded page data rather than markup.

### fwee — lines and pages
Its 98 rows carry the shade code inline with no consistent separator, so
they group by price plus series keyword rather than by title prefix.

| Line | ~SKUs | Price | Page |
|---|---|---|---|
| Lip&Cheek Blurry Pudding Pot | 33 | $128 | 154 |
| Lip&Cheek Glowy Jelly Pot | 17 | $118 | 195 |
| 3D Volumizing Glass Tint | 21 | $108 | 244 |
| Glitz Stone Highlighter | 12 | $128 | 206 |
| Pocket Eye Palette | 5 | $148 | 221 |
| Pocket Cheek Palette | 4 | $168 | 222 |
| SPA Glowing UV Tone Up Base | 2 | $138 | 306 |
| One Minute Ready Lip Serum | 1 | $88 | 202 |

### TIR TIR — note
Cushion-heavy: six full-size cushions plus four minis, all Mask Fit
variants that differ only by case colour, so they must stay separate
products rather than becoming shades of one. It is also the first brand
here with real skincare (toner, cream, ampoule, sun care) — worth
tagging skin type and concern into metafields as those go up, since
that is what any future recommendation feature would filter on.

The pink and aura cushions did not surface in the category sweep and
still need their pages found.

### MAYBELLINE — 15 lines, titles already Traditional Chinese
Unlike the Korean brands, every supplier title is already in Traditional
Chinese, so nothing needs translating and the HK site is needed only for
imagery.

| Line | SKUs | Price |
|---|---|---|
| SUPERSTAY 超持久30H空氣感粉底液 | 7 | $135 |
| Cushion 遮瑕筆 | 7 | $79 |
| 專業柔霧造型眉筆 | 6 | $79 |
| Fit Me 柔滑遮瑕遮瑕膏 | 8 | $75–89 |
| 月光小忌廉 30H 氣墊粉底霜 | 4 | $189 |
| 透明質酸「嘟嘟」唇蜜 | 4 | $99 |
| 超銳目極限持久眼線筆 | 3 | $89 |
| 超持久水光唇膏液 | 3 | $89–107 |
| FIT ME! 反孔特霧粉底液 | 2 | $125 |
| 飛天翹防水睫毛膏 | 2 | $119 |
| 眼唇二合一卸妝液 | 2 | $89–119 |
| 超持久24H小奶蓋定妝噴霧 | 2 | $155–189 |
| 瞬盈防水睫毛液 / 無極限濃密睫毛液 / SKY HIGH 組合 | 各 1 | — |

### TIR TIR — pages still missing
Eleven lines published as drafts because their pages were not in the
category sweep: the pink and aura cushions, all four minis, both
fixers, the eye cream, rescue serum and sun cream.

### dasique — reachable, but no barcodes
`dasique.com` refuses curl with a 429 yet loads fine in the browser, and
an in-page fetch of products.json returns all 66 products with images
and variants. The catch: its variant SKUs are text codes
(`JUICY-TINT-08`, `candyrolling_mint`), not barcodes — so unlike
Peripera and CLIO the join to our workbook has to be by product name,
which needs checking rather than trusting.

### Flower Knows
`flowerknows.co` (global) and `flower-knows.jp` are both Shopify. Both
return `local_rate_limited` right now, from curl and the browser alike,
so this is our IP rather than geo-blocking — worth retrying rather than
routing around.
