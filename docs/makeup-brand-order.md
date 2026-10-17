# Makeup brand display order

Snapshot: 2026-10-17 (Hong Kong). Applies to the makeup page's brand rail,
brand sections, and brand-grouped recommended/brand sorts. Product ranking
within a brand and explicit price, newest, award and name sorts retain their
existing rules. Other category pages retain their existing brand rules.

## Owner requirements

- Korean cosmetic brands first, informed by popularity.
- Japanese brands and beauty-tool brands later; Maybelline last among
  non-nail brands.
- Latest owner override: nail products go below all other makeup/tool brands.
  The current nail-brand range is ohora, so its section and rail item are last,
  after Maybelline. This supersedes the earlier Maybelline-last-overall rule.
- This correction puts rom&nd first; catalogue depth does not determine its position.
- WAKEMAKE is deliberately lower for the owner's commercial reason. No margin
  figures were queried, inferred or changed for this display update.

The frozen `OUJI_MAKEUP_BRAND_ORDER` in `makeup-brand-headers.js` is the single
order consumed by `catalog.js`. It prevents changes in product counts, reviews
or ratings from silently changing the requested merchandising order. New brands
fall immediately before the generic other group until reviewed.

## Identity correction and current reference — 2026-10-17

The display decision for this correction moves **rom&nd from third to first**:
`rom&nd, Peripera, OBgE, CLIO, ...`. Every other pairwise brand position and
commercial group is retained. WAKEMAKE remains the final Korean cosmetic
label, and ohora remains the final label overall. The result is a fixed
merchandising order informed by search interest and owner conditions.

The earlier single-English-term method omitted officially evidenced spellings.
The [rom&nd official site](https://romand.co.kr/) uses `rom&nd`, `romand` and
`롬앤`. A `romand`-only query therefore did not represent the checked identity
set. The old evidence is insufficient to support a claim that Peripera is
Hong Kong's number-one makeup brand. This correction also does not establish
a scientific overall brand ranking or prove that rom&nd is number one.

### Official identity registry and CLIO disambiguation

The [21-label identity registry](makeup-brand-query-identities.json) records
canonical spelling, explicitly evidenced aliases, official source URLs and
unknowns. Its labels cover exactly the Korean cosmetic group below; it is
not an exhaustive alias dictionary. Catalogue keys are kept separate from
official marks, including `2aN` / `2ªN`, `Heart Percent` / `HEARTPERCENT` and
`KSECRET` / `K-SECRET`. No Chinese brand names are invented. AMUSE has no
separate localized brand alias verified in this bounded pass. An operator's
company name alone is not accepted as a brand alias. Unsupported speculation
about generic word components is omitted from the compact registry.

For CLIO, the main agent's UI review of the bare `CLIO` term under Hong Kong,
12 months, Beauty & Fitness found all 15 displayed Top related searches to be
makeup queries: eyeshadow, cushion, eyeliner and other cosmetics. See
[the captured Top 15](../../evidence/popularity-identity-20261017/clio-top-related-searches.txt).
No automotive query was observed in that list. This is the main agent's
observation, not an owner/user confirmation, and does not prove that every
possible unrelated use has been excluded.

The saved [CLIO suggestions](../../evidence/popularity-identity-20261017/clio-autocomplete.json)
include Renault Clio and a Clio software-company topic; neither identifies
the CLIO makeup brand. The [company suggestions](../../evidence/popularity-identity-20261017/autocomplete-core.json)
also include a Clio Cosmetics company topic. The
[official company portal](https://www.cliocosmetic.com/) lists
[CLIO](https://cliocosmetic.com/clio_en.html) and
[peripera](https://cliocosmetic.com/peripera.html) as distinct brands.
The parent-company topic cannot stand in for CLIO alone because its scope
also includes Peripera. These entity distinctions are not evidence that cars
contaminated the observed Hong Kong beauty chart.

### Current chart snapshots and limits

The main agent captured the public chart tables on **2026-10-17**, using
**Hong Kong, past 12 months, Beauty & Fitness (category 44), Web Search**.
The short-window sensitivity capture uses the same geography/category/search
type and `today 3-m` (the requested 90-day check). The saved files, including
their exact terms and settings, are the review record; live replay URLs and
samples may change.

| Core query | 12-month displayed average | 90-day displayed average |
|---|---:|---:|
| `romand + rom&nd + 롬앤` | 37 | 1 |
| `Peripera + 페리페라` | 17 | 2 |
| `CLIO + 클리오` | 14 | 2* |
| `fwee + 퓌` | 8 | 1 |
| `dasique + 데이지크` | 1 | 0 |

Sources: [12-month core](../../evidence/popularity-identity-20261017/hk-core-all-aliases-12m.json)
and [90-day sensitivity](../../evidence/popularity-identity-20261017/hk-alias-core-90d.json).
**\* The saved 90-day chart used bare `CLIO`, not `CLIO + 클리오`.** Its 2
therefore has a different query definition; this is not a fully matched
sensitivity test. The earlier intermediate
[`hk-alias-core-12m.json`](../../evidence/popularity-identity-20261017/hk-alias-core-12m.json)
also used bare CLIO and is superseded by the alias-expanded 12-month core.
Each chart has its own normalized scale; the two windows' index levels are
not a direct measurement of growth or decline.

The 12-month core has 53 time points: the five series contain respectively
25, 38, 40, 46 and 51 zeroes. The short window has 93 daily points, with
80, 82, 81, 83 and 87 zeroes respectively. These sparse signals do not support
precise positions or a stable quarterly popularity league table. A displayed
zero or rounded zero average does not show absence of demand.

In the [same-chart spelling control](../../evidence/popularity-identity-20261017/hk-romand-spelling-control-12m.json),
the displayed 12-month averages were:

| Query | Displayed average |
|---|---:|
| `romand` | 14 |
| `rom&nd` | 4 |
| `롬앤` | 0 |
| `romand + rom&nd + 롬앤` | 37 |
| `Peripera + 페리페라` | 17 |

The union's 37 is not `14 + 4 + 0`. The non-additive result is consistent
with low-volume filtering, sampling and the limits of the displayed indices;
it does not reveal a missing absolute search count. **37/17 must not be
reported as a real 2.18-times search-volume or popularity advantage.** The
control demonstrates why single spellings and a simple sum of displayed
indices cannot substitute for a checked query definition.

The remaining 12-month captures use the same `romand + rom&nd + 롬앤` anchor:

| Evidence | Other four query definitions, in file order | Displayed averages, including anchor first |
|---|---|---|
| [Cohort B](../../evidence/popularity-identity-20261017/hk-alias-cohort-b-12m.json) | `OBgE`; `hince + 힌스`; `TIRTIR + 티르티르`; `Laka + 라카` | 37, 18, 1, 0, 0 |
| [Cohort C](../../evidence/popularity-identity-20261017/hk-alias-cohort-c-12m.json) | `lilybyred + 릴리바이레드 + 릴바레`; `2aN + 2ªN + 투에이엔`; `Heart Percent + HEARTPERCENT + 하트퍼센트`; `AMUSE` | 37, 2, 1, 0, 0 |
| [Cohort D](../../evidence/popularity-identity-20261017/hk-alias-cohort-d-12m.json) | `Glint + 글린트`; `BRAYE + 브레이`; `WAKEMAKE + 웨이크메이크`; `UNLEASHIA + 언리시아` | 37, 0, 0, 3, 0 |
| [Cohort E](../../evidence/popularity-identity-20261017/hk-alias-cohort-e-12m.json) | `SO'NATURAL + 쏘내추럴`; `KSECRET + "K-SECRET" + 케이시크릿`; `Coralhaze + 코랄헤이즈`; `CORINGCO + 코링코` | 37, 0, 0, 0, 0 |

These are separate sparse comparisons, not a merged ranking. OBgE remained a
single spelling in cohort B despite other aliases in the registry; AMUSE
remained a single spelling with localized aliases unverified. SO'NATURAL's
curly-apostrophe spelling was not separately included. Alias expansion is
therefore partial, and punctuation handling adds uncertainty. Even a shared
anchor cannot repair missing identities, filtering or sparse observations.
None of these captures changes the retained order of the other brands.

### Google primary documentation and interpretation

Google's [search tips](https://support.google.com/trends/answer/4359582?hl=en)
explain that search terms do not automatically include spelling variations
or synonyms, and `+` combines alternative searches with OR. Its
[terms and topics guide](https://support.google.com/trends/answer/17309543?hl=en)
explains that topics group a real-world entity across terms/languages; the
suggestion's description must identify the intended entity. An unrelated
car/software topic or a multi-brand parent-company topic is unsuitable here.
Official aliases help define a term comparison but do not certify every
Google topic mapping.

Google's [data FAQ](https://support.google.com/trends/answer/4365533?hl=en)
explains sampling, normalization to 0–100, low-volume zeroes, filtering of
apostrophes/special characters, and statistical noise that can be prominent
for low-interest terms. Trends is not a scientific poll. These indices are
one search-interest reference; they do not measure sales, market share,
absolute searches or a precise overall brand rank. There is no automatic
reranking. The research detail stays in internal docs rather than customer UI.

All raw evidence for this correction is outside the published site, at
`../evidence/popularity-identity-20261017/` relative to the `site/` root
([directory from this document](../../evidence/popularity-identity-20261017/)).
It includes the original official-source
[identity evidence](../../evidence/popularity-identity-20261017/brand-query-identities.json)
and the main agent's [chart audit](../../evidence/popularity-identity-20261017/research-audit.json).
The compact registry omits unsupported risk speculation from the raw research;
the CLIO observation's attribution above supersedes any earlier raw wording
that attributed it to the user.

### Superseded — five single-English-term comparisons, 2026-10-17

**Historical method only; superseded by the identity correction above.**
The five earlier 12-month HK/category-44/Web comparisons shared bare `romand`
as an anchor and used one English spelling per other label:

1. [CLIO, TIRTIR, fwee, hince](https://trends.google.com/trends/explore?geo=HK&date=today%2012-m&cat=44&q=romand,CLIO,TIRTIR,fwee,hince)
2. [dasique, Peripera, AMUSE, Laka](https://trends.google.com/trends/explore?geo=HK&date=today%2012-m&cat=44&q=romand,dasique,Peripera,AMUSE,Laka)
3. [lilybyred, UNLEASHIA, 2aN, Heart Percent](https://trends.google.com/trends/explore?geo=HK&date=today%2012-m&cat=44&q=romand,lilybyred,UNLEASHIA,2aN,Heart%20Percent)
4. [Glint, Coralhaze, BRAYE, WAKEMAKE](https://trends.google.com/trends/explore?geo=HK&date=today%2012-m&cat=44&q=romand,Glint,Coralhaze,BRAYE,WAKEMAKE)
5. [KSECRET, SO'NATURAL, OBgE, ohora](https://trends.google.com/trends/explore?geo=HK&date=today%2012-m&cat=44&q=romand,KSECRET,SO%27NATURAL,OBgE,ohora)

That method divided each term's summed weekly indices by the anchor's sum
within its chart. This avoided directly comparing independent 0–100 scales,
but could not correct omitted aliases or low-volume filtering. Its derived
signals are not current support for a Peripera-first claim or for the frozen
order below. The dated legacy tables remain historical material at
`../evidence/brand-order-20261017/google-trends-*.json` relative to `site/`;
no legacy values are promoted to a current full-brand ranking.

## Frozen order

| Group | Order |
|---|---|
| Korean cosmetics | rom&nd, Peripera, OBgE, CLIO, fwee, dasique, 2aN, lilybyred, hince, Laka, TIRTIR, Heart Percent, AMUSE, Glint, UNLEASHIA, SO'NATURAL, KSECRET, Coralhaze, BRAYE, CORINGCO, WAKEMAKE |
| Other cosmetic brands | Flower Knows, CEZANNE, Kiss Me, SANA, Love Liner, K-Palette, BCL, AN' BLESS, miru miru |
| Tools and accessories | fillimilli, STUDIO 17, ROSY ROSA, MAPEPE, Beauty World, Felicera |
| Tail | 其他, MAYBELLINE |
| Nails — final section | ohora |

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
