# Category brand-header extension — source audit

Snapshot: 2026-10-17. This note describes the repository source and local evidence manifests. It makes no claim about deployment, public availability, or owner acceptance. The composed lookup is in [`category-brand-headers.js`](../category-brand-headers.js); the source inputs are [`skincare-brand-headers.js`](../skincare-brand-headers.js), [`makeup-brand-headers.js`](../makeup-brand-headers.js), and the evidence folder linked below.

## Colour and identity evidence

`tint` is the display field behind a section logo. Its presence in JavaScript does not by itself establish an official brand colour.

| Evidence label | Meaning in this audit |
|---|---|
| Exact official CSS | A value copied from an identified official CSS selector or token. The selector’s use still limits the claim: a story section or page theme is not automatically a universal brand palette. |
| Logo-native ink | A fill explicitly present in an official SVG, or a colour sampled from an unchanged official raster. It describes the mark, not a CSS background. |
| Derived display field | A local plate colour or white knockout chosen to present the mark. It is an OUJI display adaptation unless the row says an exact official CSS field is being reused. |
| Unverified / review pending | The exact mark, vendor-to-mark relationship, colour, or source review is unresolved. A plausible colour, parent mark, package crop, or missing file is not substituted. |

The source manifests retain the per-brand evidence and limits: [`skincare-palette-audit.json`](../../evidence/brand-colors-all-20261017/skincare-palette-audit.json), [`makeup-palette-audit.json`](../../evidence/brand-colors-all-20261017/makeup-palette-audit.json), and [`integration-profiles.json`](../../evidence/brand-colors-all-20261017/integration-profiles.json).

## Skincare palette update

There are 53 named skincare profiles. The integration manifest has eight skincare override entries: seven change `tint`; d'Alba is optical-only and does not change its existing tint. This does not recolour all 53. Existing profile values remain, including white where the available evidence supports a monochrome mark but no chromatic identity field.

| Brand | Active display field | Provenance and limit |
|---|---|---|
| Goodal | `#fff586` | Exact official CSS in `.brand-goodal .brand-story`; a story-section field, not a universal palette claim. See [official CSS](https://cliocosmetic.com/css/style.css?v=20260514b). |
| WELLAGE | `#ccdcff` | Exact official `--point-bg` token recorded in the My WELLAGE stylesheet; the manifest records both `--point-color: #00226E` and `--point-bg: #CCDCFF`. |
| FARMSTAY | `#2130a0` | Exact official `--main-color` and `--foot-bg-color`; the white logo treatment is separately supported by the official hero styling. Evidence is recorded in the skincare audit. |
| Arencia | `#b8db8b` | Exact value repeated in official UI accent tokens from [Arencia](https://arencia.com/ko/); not described as a published brand-manual palette. |
| TOCOBO | `#dc272d` | Exact red fill in the official single-colour SVG mark from [TOCOBO](https://tocobo.us/), reused as a display field. The white knockout is an adaptation; an official red-field/white-mark pairing was not verified. |
| SO'NATURAL | `#303030` | Exact official `.brand-story-banner` background with white text. This is an editorial story treatment, not a universal palette. Its source logo is monochrome `#231f20`. |
| Cell Fusion C | `#fae9ec` | Derived display field. The official [SVG mark](https://cellfusionc.co.kr/web/upload/logo.svg) has native fills `#b3282d`, `#cf0a2c`, `#9fa0a0`, and `#c9caca`; no matching official background token was established. |

d'Alba is the eighth manifest override, for optical sizing only: 225 px width plus a crop around the existing visible path. It has no `tint` key, so it is not an eighth colour change.

The previous skincare-only audit recorded SO'NATURAL as white because it had inspected the logo but not the later-found brand-story CSS. The makeup palette audit contains that CSS evidence; the current charcoal value is scoped to the story treatment. For beplain, the main assistant verified the official [primary-logo identity guide](https://beplain.design/identity/primary-logo) and its black/white mark through live web research on 2026-10-17. The separate [mungbean colour page](https://beplain.design/color/mungbean) is line-specific; the active header keeps its white field. This provenance is from the main assistant, not user verification; the static validator does not fetch either page.

## Refined and parent marks

The current [`refined-artwork.json`](../../evidence/brand-colors-all-20261017/refined-artwork.json) records the original SHISEIDO white SVG, the current FINE GROUP consumer-storefront mark after the July 2026 rebrand, the matching KOSÉ consumer-site lockup, and the JUNGWONSAM and TIARERA original marks. Main verified the FINE GROUP storefront header and rebrand announcement; the previous quality-logo note rejecting a corporate-only substitute is historical and is superseded for this current consumer identity. The FINE JAPAN display field `#e6e8f4` remains an OUJI-derived plate colour. The TIARERA source is a combined TIARERA/TIARERA+ banner; its active profile clips to the main wordmark, leaving the source image unchanged.

On the category rail, the active profile crop is applied only when `brandLogo(vendor)` has no existing original-logo mapping and the crop geometry passes the same bounds validation used by section headings. The rail displays that crop at its source aspect ratio within a maximum 78×26 px box; CSS clips the original image without altering it. Existing original-logo rail entries retain their direct image markup and sizing behavior. If a cropped image fails to load, its wrapper is hidden and the vendor text fallback inside the link is shown.

SHISEIDO uses the standalone white SVG from its official homepage. Its `#d6001c` field is an exact value in the official CSS evidence, observed on menu-utility separators; that selector context does not establish a universal brand palette. BOTO retains its original multicolour image on the derived `#feede5` field with normal blend. MOEV's original rendered-header image is displayed with normal blend; the active crop clips blank margins through CSS and leaves the source bytes untouched. BOUQUET GARNI's SVG source dimensions remain the fractional `viewBox` size 523.01×121.13; its active crop starts at y=42 with height 46 to include the visible path through y=86.14. The validator checks SVG crop coordinates against `viewBoxSize`, without rounding or modifying the original asset.

Main reviewed the parent-artwork marks for Mentholatum, DHC, FANCL, KOSÉ, Kao, Bioré, ANESSA, ROHTO, Fiancee, FURRIKY, WELLP, John's Blend, SEVENTEEN, ILLIT, and IVE in the desktop-rendered fixture. No broken or incorrect mark was seen. The review is recorded separately in [`parent-artwork-review.json`](../../evidence/brand-colors-all-20261017/parent-artwork-review.json); the inspected screenshot is not yet saved as a file. KOSÉ's consumer [beauty information site](https://www.kose.co.jp/kose/) uses the same two-shape lockup as the reviewed holding-company SVG. The old `downloaded-review-needed` entries remain in `parent-artwork.json` as history; the separate review record is the active resolution.

Twelve unused source originals were moved out of `site/logos/category-headers/` into `evidence/brand-colors-all-20261017/unused-source-originals/`; their former paths are listed in [`excluded-source-assets.json`](../../evidence/brand-colors-all-20261017/excluded-source-assets.json). Historical audit records may retain those paths as provenance. The validator checks release files referenced by active profiles only and does not require or restore archived originals.

## Additional profiles in the composed lookup

The validation snapshot has 155 active composed category profiles; 67 are entries from the integration manifest's `extra` map. These are profile counts, not product counts. The separate skincare and makeup profile files contain 53 and 38 entries respectively.

| Brand | Active field and mark evidence |
|---|---|
| MOEV | `#edeae7` is a derived warm-neutral field; the official rendered header mark is retained as `resolved-moev.png` (797×147) with normal blend. The active CSS crop removes blank margins without changing the original image. The source URL has a `.jpg` suffix; the local asset uses the corrected `.png` suffix. |
| BOUQUET GARNI | `#f1e9e1` is a derived neutral; the official header SVG retains native ink `#231815`. |
| Ariul | `#f7f3ed` is a derived neutral for the unchanged official monochrome PNG; the mark’s sampled ink is `#353333`, not an official palette token. |
| Hada Labo | `#eaf7ff` is an exact Hada Labo page-theme colour recorded in the official-source manifest. The original Hada Labo-specific multicolour GIF remains unchanged; the page-theme colour is not logo ink. |
| TO BE FRESH | `#e9f1e9` is derived; the official SVG’s native colours are `#009841` and `#231815`. No official background CSS was established. |
| Kao | `#e1f3ee` is derived. The original official Kao mark crop is `584×175` pixels, 8,445 bytes, with native green `#00b48c`; the field is not claimed as an official token. |
| BOTO | `#feede5` is derived. Its original multicolour BOTO image remains intact and uses normal blend; the background is not sampled from the mark. |
| MASCLUB | `#fbe7ed` is a derived field. The active profile uses the official 1173×156 JPEG with multiply blend, cropped at `(86,23)` to `451×54` and displayed at 180 px wide / 36 px max height; this isolates MASCLUB and excludes the Japanese partner/wholesale footer artwork. The original file remains unchanged. |
| SHISEIDO | `#d6001c` is an exact official CSS value used in a menu-utility separator; the official standalone white SVG is recorded in `refined-artwork.json`. The selector scope is retained, so this is not presented as a universal palette. |
| FINE JAPAN | `#e6e8f4` is derived. The active mark is the current FINE GROUP consumer-storefront identity, supported by the official rebrand announcement and current consumer header in `refined-artwork.json`. |
| emplir | `#eeeae7` is derived. The official homepage header contains the original inline SVG with native ink `#403D3C`; no brand-specific background CSS was established. |
| oneTONE | `#f6f3ef` is package-derived. The asset is an exact crop of the printed wordmark on the first exact-vendor catalog product package photo, not an independently official logo; no manufacturer palette is claimed. |

The corresponding source records are [`rendered-resolved.json`](../../evidence/brand-colors-all-20261017/rendered-resolved.json), [`shop-extra.json`](../../evidence/brand-colors-all-20261017/shop-extra.json), [`extra-care-official.json`](../../evidence/brand-colors-all-20261017/extra-care-official.json), [`final-care-tools.json`](../../evidence/brand-colors-all-20261017/final-care-tools.json), [`final-season-health.json`](../../evidence/brand-colors-all-20261017/final-season-health.json), [`refined-artwork.json`](../../evidence/brand-colors-all-20261017/refined-artwork.json), [`other-lifestyle.json`](../../evidence/brand-colors-all-20261017/other-lifestyle.json), and [`quality-logos.json`](../../evidence/brand-colors-all-20261017/quality-logos.json). PLU, Menturm, JUNGWONSAM, and Tiarera have source-resolved originals and active profiles. Those records document provenance; the static validator makes no network requests.

## Remaining source and coverage gaps

The final source pass left four identities unresolved, with no active profiles: Race (official company/product identity matched, but its original header mark could not be retrieved), KWAILNARA (the official WELCOS page confirms the consumer brand, but reviewed assets contain no standalone wordmark), NADESHIA (identity evidence exists, but no usable official standalone logo was verified), and 優之源 (the official Fine Japan shop lockup is a retail identity, not a verified standalone product-brand mark). The exact evidence and limits are in [`final-missing-source-followup.json`](../../evidence/brand-colors-all-20261017/final-missing-source-followup.json), [`final-care-tools.json`](../../evidence/brand-colors-all-20261017/final-care-tools.json), and [`final-season-health.json`](../../evidence/brand-colors-all-20261017/final-season-health.json). Earlier unresolved rows for PLU, Menturm, JUNGWONSAM, and Tiarera remain historical and are superseded by newer source records. The validation report separately retains 14 unresolved palette-evidence records; these may overlap the four identity gaps and are not treated as accepted colours.

Static local-source coverage, grouped using the catalog's minimum three-products-per-vendor rule (2,171 products in this snapshot):

| Listing page | Profile-backed / rendered vendor groups | Remaining groups |
|---|---:|---|
| Skincare | 50 / 50 | — |
| Makeup | 38 / 38 | — |
| Seasonal | 36 / 38 | Race, Sanrio |
| Bath | 39 / 40 | KWAILNARA |
| Tools | 7 / 8 | NADESHIA |
| Fragrance | 9 / 9 | — |
| Lens | 5 / 5 | — |
| K-pop | 4 / 4 | — |
| Toys | 1 / 9 | Eight existing illustrated banner groups; they are outside the shared wordmark profiles |
| Health | 17 / 18 | 優之源 |
| Supports | 2 / 2 | — |
| All products | 154 / 167 | 13 catalog groups lack shared profiles: the four unresolved identities above, eight toy-banner vendors, and OUJI |

The Toys grouping folds OUJI into “其他”; the All-products grouping still exposes it as an unprofiled vendor. These counts describe local source grouping, not browser rendering.

## Static validation

From the `site` repository root, run `python3 ../evidence/brand-colors-all-20261017/validate.py`; evidence is a sibling directory. The 2026-10-17 22:35 HKT run recorded `pass_with_unresolved`, zero failures, 155 active composed profiles, 67 extras, eight skincare override entries (seven tint changes and one d'Alba optical-only change), zero active profiles pending source review, four unresolved identities, and 14 unresolved palette-evidence records. It runs `node --check`, evaluates the three profile scripts in a Node VM, calls the real `shopify.js` section matcher and `catalog.js` vendor-grouping functions, checks all 12 HTML script orders, and inspects each active profile-referenced local asset's image content type, dimensions, and byte size. It validates active CSS crop bounds against raster dimensions or SVG `viewBoxSize`, preserving fractional SVG dimensions, and reports source bytes without modifying assets. Historical manifest paths are provenance only; archived originals are not release dependencies. Source-resolution logic retains historical unresolved rows while applying later verified source records and the parent visual/source review. The script writes `../evidence/brand-colors-all-20261017/static-validation.json`; unresolved identities and palette evidence remain separate instead of being guessed.

This is static local-source validation only. It does not test browser rendering, remote image serving, deployment, or public/live status; no deployment claim is made.
