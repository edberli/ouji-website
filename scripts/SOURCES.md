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
| fwee | 98 | `fwee.co.kr` did not resolve — needs a re-probe |
| TIR TIR | 55 | `tirtir.com` is a parked domain — find the real one |
| MAYBELLINE | 53 | Global brand; HK site likely has zh-Hant copy |
| 花知曉 Flower Knows | 37 | Chinese brand, so Chinese copy exists |
| dasique | 68 | `dasique.co.kr` blocks HK IPs |
| wakemake | 44 | **`www.wakemake.hk` exists** — see below |

### wakemake.hk
An official HK store on **SHOPLINE** (not Shopify, so `products.json`
returns HTML, not JSON). Listings live at `/products` (24 per page) and
`/categories/<eye|lip|face>`; product pages at `/products/<handle>`.
Imagery is on `img.shoplineapp.com` and the copy is Traditional Chinese.
Needs a small parser of its own — the title is not in `<title>` and the
shades sit in embedded page data rather than markup.
