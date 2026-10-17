# Makeup brand display order

Snapshot: 2026-10-17 (Hong Kong). Applies to the makeup page's brand rail,
brand sections, and brand-grouped recommended/brand sorts. Product ranking
within a brand and explicit price, newest, award and name sorts retain their
existing rules. Other category pages retain their existing brand rules.

## Owner requirements

- Korean cosmetic brands first, informed by popularity.
- Japanese brands and beauty-tool brands later; Maybelline last.
- rom&nd belongs near the front, rather than being demoted by catalogue depth.
- WAKEMAKE is deliberately lower for the owner's commercial reason. No margin
  figures were queried, inferred or changed for this display update.

The frozen `OUJI_MAKEUP_BRAND_ORDER` in `makeup-brand-headers.js` is the single
order consumed by `catalog.js`. It prevents changes in product counts, reviews
or ratings from silently changing the requested merchandising order. New brands
fall immediately before the generic other group until reviewed.

## Google Trends reference and limits

Read Google Trends' public chart tables on 2026-10-17, using Hong Kong, the past
12 months, Beauty & Fitness (category 44), and web searches. Five comparisons
share the search term `romand` as an anchor:

1. [CLIO, TIRTIR, fwee, hince](https://trends.google.com/trends/explore?geo=HK&date=today%2012-m&cat=44&q=romand,CLIO,TIRTIR,fwee,hince)
2. [dasique, Peripera, AMUSE, Laka](https://trends.google.com/trends/explore?geo=HK&date=today%2012-m&cat=44&q=romand,dasique,Peripera,AMUSE,Laka)
3. [lilybyred, UNLEASHIA, 2aN, Heart Percent](https://trends.google.com/trends/explore?geo=HK&date=today%2012-m&cat=44&q=romand,lilybyred,UNLEASHIA,2aN,Heart%20Percent)
4. [Glint, Coralhaze, BRAYE, WAKEMAKE](https://trends.google.com/trends/explore?geo=HK&date=today%2012-m&cat=44&q=romand,Glint,Coralhaze,BRAYE,WAKEMAKE)
5. [KSECRET, SO'NATURAL, OBgE, ohora](https://trends.google.com/trends/explore?geo=HK&date=today%2012-m&cat=44&q=romand,KSECRET,SO%27NATURAL,OBgE,ohora)

The sum of the displayed weekly indices for a term is divided by the sum for
the anchor within the same comparison. Raw 0–100 indices from independently
scaled charts are not compared directly. These are sampled relative search
signals, not absolute search counts, sales, or an authoritative brand ranking.
Exact terms do not cover all spellings or languages and were not brand topics.
Google filters some special characters; low-volume brands and apostrophe terms
are especially uncertain. No apparent zero is treated as proof of no demand.

The broad leading group is informed by the observed signal for Peripera, OBgE,
romand, CLIO, fwee and dasique. Smaller sparse signals do not support a precise
statistical ranking. Their stable merchandising order, the geographic/tool
grouping, and the owner's overrides complete the list. CORINGCO was not in the
Trends comparisons; its placement is a Korean-brand grouping decision.

Google's [data FAQ](https://support.google.com/trends/answer/4365533?hl=en)
explains sampling, normalization, low-volume zeroes and statistical noise, and
states that Trends is not a scientific poll. Use this as one reference, not a
customer-facing popularity league table. There is no live automatic reranking.

Raw tables and the derived relative signal are stored outside the published
site in `../evidence/brand-order-20261017/google-trends-*.json`.

## Frozen order

| Group | Order |
|---|---|
| Korean cosmetics and nails | Peripera, OBgE, rom&nd, CLIO, fwee, dasique, 2aN, lilybyred, ohora, hince, Laka, TIRTIR, Heart Percent, AMUSE, Glint, UNLEASHIA, SO'NATURAL, KSECRET, Coralhaze, BRAYE, CORINGCO, WAKEMAKE |
| Other cosmetic brands | Flower Knows, CEZANNE, Kiss Me, SANA, Love Liner, K-Palette, BCL, AN' BLESS, miru miru |
| Tools and accessories | fillimilli, STUDIO 17, ROSY ROSA, MAPEPE, Beauty World, Felicera |
| Tail | 其他, MAYBELLINE |

Group classification is merchandising, not manufacturing origin. Official
company/brand sources were checked for ambiguous labels. Flower Knows is
Chinese; OBgE, KSECRET and ohora are Korean. Korean tool labels fillimilli and
STUDIO 17 sit in the later tool group. CORINGCO also sells makeup and appears
here with its Korean cosmetics peers; the current OUJI range is lashes.
miru miru is Japanese makeup and is not classified as tools. Beauty World's
makeup-page range is primarily eyelid tape/brushes; the company itself spans
several beauty categories. The catalogue key `Felicera` retains the official
Felicela identity artwork.

Representative official sources: [OBgE](https://www.obge.co.kr/shopinfo/company.html),
[ohora](https://ohora.kr/shopinfo/company.html),
[CORINGCO](https://www.coringco.com/shopinfo/company.html),
[fillimilli](https://corp.oliveyoung.com/en/business/brand/fillimilli),
[miru miru / Cosmebank](https://cosmebank.com/company/),
[Beauty World](https://beautyworld.jp/company/company_gaiyou/).

Existing brand artwork, optical sizing, backgrounds and product-card styling
are unchanged by this order update. Existing small-brand grouping rules still
determine which sections exist for a particular product set.
