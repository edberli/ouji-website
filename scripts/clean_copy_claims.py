#!/usr/bin/env python3
"""清走產品文案入面嘅醫療字眼、無出處嘅銷量講法同即效誇大。

規矩來源：`~/Documents/ouji-website/PRODUCT.md` 同 `~/ouji/topics/website.md`
—— 唔准醫療字眼（香港廣告條例）、冇數據就唔准講熱賣／排名、唔准誇大即效。
Merchant Center 對呢三類都有政策，會拖低甚至拒批廣告。

做法：逐個詞用固定替換，唔叫模型重寫成段 —— 改得少、對得返、驗得到。
"""
import re, sys, os
sys.path.insert(0, os.path.expanduser("~/Documents/ouji-website/scripts"))
from shopify_admin import all_products, update_product

# (pattern, replacement, why)
RULES = [
    # ── 醫療字眼 ──
    (r"貼喺初起暗瘡患處", "貼喺想重點照顧嗰笪位", "醫療"),
    (r"保濕患處肌膚", "保濕嗰笪位嘅肌膚", "醫療"),
    (r"保護患處避免再受刺激", "保護嗰笪位避免再受刺激", "醫療"),
    (r"喺患處打圈按摩", "喺嗰笪位打圈按摩", "醫療"),
    (r"患處", "嗰笪位", "醫療"),
    (r"抗菌同抗炎功效", "清爽潔淨感", "醫療"),
    (r"抗菌抗炎", "清爽潔淨", "醫療"),
    (r"抗炎", "舒緩", "醫療"),
    (r"消炎", "舒緩", "醫療"),
    (r"抗菌", "清爽潔淨", "醫療"),
    (r"藥用", "專用", "醫療"),
    (r"療效", "使用感", "醫療"),
    (r"治療", "護理", "醫療"),
    # ── 無出處嘅銷量講法 ──
    (r"、Olive Young 彩妝銷量第一——韓國女生揀嚟揀去，最後都返返嚟呢", "——韓國女生揀嚟揀去，最後都返返嚟呢", "銷量"),
    (r"賣咗十年都仲係銷量第一。", "賣咗十年。", "銷量"),
    (r"皆為銷量冠軍——各自都係熱賣款。", "兩件都係同系列嘅基本款。", "銷量"),
    (r"銷量第一", "", "銷量"),
    (r"熱賣款", "基本款", "銷量"),
    # ── 即效誇大 ──
    (r"唔使刷、唔使鏡，三秒還你剛睡飽的臉。", "唔使刷、唔使鏡，出門前補一補。", "誇大"),
    (r"唇膏擦花咗，一秒救返。", "唇膏擦花咗，隨手執返。", "誇大"),
    (r"三秒畫出韓國女團同款臥蠶。", "畫出韓國女團同款臥蠶。", "誇大"),
    (r"日常妝三秒變派對妝", "日常妝轉派對妝", "誇大"),
    (r"疊喺唇膏上即刻變水光唇", "疊喺唇膏上轉水光唇", "誇大"),
    (r"疊喺唇膏上即刻變水光妝", "疊喺唇膏上轉水光妝", "誇大"),
    (r"空姐、化妝師隨身嗰支，就係佢。", "袋得落、補得快，就係咁簡單。", "誇大"),
    (r"空姐、化妝師隨身嗰支", "袋得落、補得快", "誇大"),
    (r"輕盈雲朵肌零毛孔霧面粉底氣墊", "輕盈雲朵肌霧面粉底氣墊", "誇大"),
    (r"零毛孔", "細緻膚感", "誇大"),
    (r"三秒", "", "誇大"),
    (r"一秒", "", "誇大"),
    (r"瞬間", "", "誇大"),
]

def fix(html):
    """替換前先遮住 alt="..." —— 嗰啲好多時係產品原名（例：fwee 瞬間水潤唇部
    精華），改咗就變咗改人哋個貨名，唔係清文案。"""
    masks = []
    def mask(m):
        masks.append(m.group(0))
        return f"\x00{len(masks)-1}\x00"
    out = re.sub(r'alt="[^"]*"', mask, html)
    why = set()
    for pat, rep, tag in RULES:
        new = re.sub(pat, rep, out)
        if new != out:
            why.add(tag)
            out = new
    out = re.sub(r"，，+", "，", out)
    out = re.sub(r"。。+", "。", out)
    out = re.sub(r"\x00(\d+)\x00", lambda m: masks[int(m.group(1))], out)
    return out, why

def main(apply=False):
    changed = []
    for p in all_products():
        html = p.get("descriptionHtml") or ""
        new, why = fix(html)
        if new != html:
            changed.append((p, html, new, why))
    print(f"要改：{len(changed)} 件\n")
    for p, old, new, why in changed:
        print(f"— {p['handle']}  ({'／'.join(sorted(why))})")
        for pat, rep, tag in RULES:
            for m in re.finditer(pat, old):
                seg = old[max(0, m.start()-14):m.end()+14].replace("\n", " ")
                print(f"    「…{seg}…」 → 「{rep or '（刪走）'}」")
                break
    if apply:
        for p, old, new, why in changed:
            update_product(p["id"], descriptionHtml=new)
            print("寫咗", p["handle"])
        print(f"\n完成：{len(changed)} 件已更新")

if __name__ == "__main__":
    main(apply="--apply" in sys.argv)
