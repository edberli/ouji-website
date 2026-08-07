#!/usr/bin/env python3
"""
Build the data the shop needs to answer "which one is right for me".

Three things a K-beauty shopper cannot get anywhere in Hong Kong today,
and all three are already sitting in data we hold:

  * what a product costs per 100ml, so 43 serums can be ranked honestly
  * whether it contains alcohol, fragrance or essential oils, which is
    the first question anyone with reactive skin asks
  * which active it is built on and at what strength, so two centella
    creams can be told apart, and so a cart holding retinol and an acid
    can say so

Output is ingredients.json, keyed by product handle, loaded by the site
the same way featured.json is. No API call at page load, nothing to go
wrong in front of a customer.

    python3 scripts/build_ingredients.py

Every flag is read from the brand's own ingredient list. A product whose
list we do not hold is marked `inci: false` and shows "未有成分資料" —
never "safe". An unlabelled product read as clean is worse than no label
at all.
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from shopify_admin import ROOT, gql  # noqa: E402
from skincare_data import load  # noqa: E402

COPY = "/tmp/skin/copy.json"
OUT = os.path.join(ROOT, "ingredients.json")

PRODUCTS = """
query($after: String) {
  products(first: 150, after: $after) {
    pageInfo { hasNextPage endCursor }
    edges { node { handle title vendor productType status
      priceRange: variants(first: 1) { edges { node { price barcode } } } } }
  }
}
"""

# An INCI list is comma-separated entries, so read it as entries rather
# than as prose. Substring matching on "alcohol" flags Cetearyl Alcohol
# (an emollient), Polyvinyl Alcohol (a film former), and the sentence
# "Free of Silicones and Drying Alcohol" — which advertises its absence.
DRYING_ALCOHOLS = {
    "alcohol", "alcohol denat", "alcohol denat.", "denatured alcohol",
    "ethanol", "ethyl alcohol", "isopropyl alcohol", "sd alcohol",
    "sd alcohol 40", "sd alcohol 40-b",
}
FRAGRANCE = {"fragrance", "parfum", "perfume", "aroma", "香料"}

ESSENTIAL_OILS = (
    "lavandula", "citrus limon", "citrus aurantium", "mentha", "eucalyptus",
    "rosmarinus", "melaleuca", "pelargonium", "cananga", "jasminum",
    "cymbopogon", "pogostemon", "santalum", "peppermint oil", "lemon oil",
    "bergamot", "ylang", "geranium oil", "clove oil", "cinnamomum",
)

# What the product is built on. The number matters as much as the name —
# "niacinamide" is a different product at 2% and at 15%.
ACTIVES = [
    ("視黃醇", r"retinol|retinal|retinyl|레티놀|레티날|視黃醇|視黃醛|a\s*醇|a\s*醛"),
    ("維他命C", r"ascorbic acid|ascorbyl|vitamin c|비타민 ?c|維他命 ?c|維生素 ?c"),
    ("煙酰胺", r"niacinamide|나이아신아마이드|煙.胺|菸鹼醯胺|煙鹼醯胺"),
    ("AHA/BHA", r"glycolic acid|lactic acid|salicylic acid|mandelic acid|"
                r"\baha\b|\bbha\b|\bpha\b|果酸|水楊酸"),
    ("PDRN", r"\bpdrn\b|polydeoxyribonucleotide"),
    ("胜肽", r"peptide|펩타이드|胜.|勝肽"),
    ("透明質酸", r"hyaluron|히알루론|透明質酸|玻尿酸"),
    ("積雪草", r"centella|madecass|asiaticoside|센텔라|積雪草"),
    ("神經醯胺", r"ceramide|세라마이드|神經醯胺|神經酰胺"),
    ("泛醇", r"panthenol|판테놀|泛醇"),
    ("曲酸／傳明酸", r"kojic acid|tranexamic|arbutin|알부틴|曲酸|傳明酸|熊果"),
]

STRENGTH = re.compile(
    r"(retinol|retinal|niacinamide|vitamin ?c|ascorbic|pdrn|aha|bha|pha|"
    r"視黃醇|視黃醛|煙.胺|維他命 ?c)\D{0,12}?(\d+(?:\.\d+)?)\s*%", re.I)


def volume(text):
    """Millilitres, grams or sheet count — whichever the pack is sold in."""
    for pat, unit in ((r"([\d.]+)\s*(?:ml|毫升)", "ml"),
                      (r"([\d.]+)\s*(?:g|克)(?![a-z])", "g"),
                      (r"([\d.]+)\s*(?:片|枚|매|ea|pcs|入)", "片")):
        m = re.search(pat, text or "", re.I)
        if m:
            try:
                n = float(m.group(1))
            except ValueError:
                continue
            if n > 0:
                return n, unit
    return None, None


def entries(inci):
    """The list as the label prints it: one entry per comma, trimmed of
    the percentages and asterisks brands add."""
    out = []
    for raw in re.split(r"[,、/]|\n", inci):
        e = re.sub(r"\([^)]*\)", " ", raw)
        e = re.sub(r"[\d.]+\s*%|\*|\[|\]", " ", e)
        e = re.sub(r"\s+", " ", e).strip(" .;:-").lower()
        if 2 < len(e) < 60:
            out.append(e)
    return out


def flags(inci):
    out = []
    items = entries(inci)
    if any(e in DRYING_ALCOHOLS for e in items):
        out.append("酒精")
    if any(e in FRAGRANCE for e in items):
        out.append("香料")
    if any(any(o in e for o in ESSENTIAL_OILS) for e in items):
        out.append("精油")
    return out


def actives_of(text):
    found = []
    for name, pat in ACTIVES:
        if re.search(pat, text, re.I):
            found.append(name)
    return found


def strength_of(title):
    out = {}
    for what, num in STRENGTH.findall(title):
        out[what.lower()] = float(num)
    return out


def inci_of(text):
    """The ingredient list, if the source published one. A paragraph that
    merely mentions an ingredient is not a list — require the solvent
    every list starts with, plus enough commas to be one."""
    low = text.lower()
    i = low.find("ingredient")
    chunk = text[i:i + 3000] if i >= 0 else text
    if re.search(r"\b(water|aqua)\b", chunk, re.I) and chunk.count(",") >= 15:
        return chunk
    return ""


def main():
    copy = json.load(open(COPY)) if os.path.exists(COPY) else {}
    sizes = {r["barcode"]: (r["size"], r["title"]) for r in load()}

    after, out = None, {}
    while True:
        page = gql(PRODUCTS, {"after": after})["products"]
        for e in page["edges"]:
            p = e["node"]
            if p["status"] != "ACTIVE":
                continue
            v = p["priceRange"]["edges"]
            if not v:
                continue
            price = float(v[0]["node"]["price"])
            barcode = (v[0]["node"]["barcode"] or "").strip()
            size, sheet_title = sizes.get(barcode, ("", ""))

            n, unit = volume(size)
            if n is None:
                n, unit = volume(p["title"])
            if n is None:
                n, unit = volume(sheet_title)

            src = copy.get(barcode, {})
            text = src.get("text", "")
            inci = inci_of(text)
            hay = f'{p["title"]} {text[:1500]}'

            rec = {"type": p["productType"], "vendor": p["vendor"],
                   "price": price, "inci": bool(inci)}
            if n:
                rec["size"] = n
                rec["unit"] = unit
                # per 100ml/100g, per 10 sheets — numbers a person can hold
                per = 100 if unit in ("ml", "g") else 10
                rec["unitPrice"] = round(price / n * per, 1)
                rec["per"] = per
            if inci:
                rec["flags"] = flags(inci)
            act = actives_of(hay)
            if act:
                rec["actives"] = act
            # What the product is *sold as*, which is what the title says.
            # A moisturiser with a trace of salicylic acid deep in its list
            # should not warn a shopper away from their retinol; a product
            # called "AHA 7 Whitehead Power Liquid" should.
            head = actives_of(p["title"])
            if head:
                rec["head"] = head
            st = strength_of(p["title"])
            if st:
                rec["strength"] = st
            out[p["handle"]] = rec
        if not page["pageInfo"]["hasNextPage"]:
            break
        after = page["pageInfo"]["endCursor"]

    with open(OUT, "w") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))

    have_price = sum(1 for r in out.values() if "unitPrice" in r)
    have_inci = sum(1 for r in out.values() if r["inci"])
    flagged = sum(1 for r in out.values() if r.get("flags"))
    print(f"{len(out)} 件上架產品 → {OUT}")
    print(f"  有單價: {have_price}")
    print(f"  有全成分表: {have_inci}（其中 {flagged} 件有酒精／香料／精油）")
    print(f"  有活性成分標籤: {sum(1 for r in out.values() if r.get('actives'))}")


if __name__ == "__main__":
    main()
