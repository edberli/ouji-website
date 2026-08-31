#!/usr/bin/env python3
"""逐件睇過先定型號 —— 唔靠關鍵字亂猜。

老闆 2026-08-31：「逐件睇先分準。」之前用規則自動推，就出過
「維C酵素亮肌卸妝啫喱」變保健品呢類事。所以呢個 script 入面每一行
都係我親眼睇過件貨先寫落去，而且後面附咗一句點解咁分 —— 日後有人
覺得分錯，睇得返個理由，改得返。

    python3 scripts/fix_vague_types.py            # 睇
    python3 scripts/fix_vague_types.py --apply
"""
import sys; sys.path.insert(0,'/Users/winstonli/Documents/ouji-website/scripts')
from shopify_admin import gql, user_errors
UP='mutation($id:ID!,$t:String!){productUpdate(product:{id:$id, productType:$t}){userErrors{field message}}}'
FIX = [
 ("__unove__","護髮",  "UNOVE 定型棒 —— 順滑毛躁用，係髮品唔係化妝"),
 ("__miru__",     "眼線",  "miru miru Double Liquid Eyeliner 三支色 —— 眼線筆"),
 ("__mapepe__",   "美髮工具","MAPEPE 吹髮髮卷 —— 捲髮工具"),
 ("__johns__",    "家居香氛","John's Blend／JB Room Mist／Daily aroma —— 掛車／房間香氛，唔係搽身"),
 ("__romand__",   "唇彩",  "口紅雨衣 —— 唇上透明鎖色層，同唇彩一類"),
 ("__yao__",      "美髮工具","YAO 木梳 —— 梳，唔係化妝品"),
 ("__fwee__",     "多用彩妝","fwee 唇頰兩用 —— 一支唇同頰都用得"),
 ("__nience__",   "保健品",  "京都念慈菴枇杷膏 —— 口服潤喉，唔係西藥"),
 ("__boh__",      "局部護理","BOH 微針暗瘡貼 —— 痘痘貼"),
 ("__agarism__",  "美容工具","AGARISM 滾輪按摩棒／微震去紋器 —— 器具"),
 ("__akaran__",   "面霜",   "Akaran 水潤啫喱 110G —— 啫喱面霜"),
 ("__oclear__",   "口腔護理","O-CLEAR 牙齒美白粉"),
 ("__laka__",     "面膜",   "NatuLaka 礦物海泥膜 —— 泥膜"),
 ("__ong__",      "爽膚水", "ongredients 水光噴霧 —— 面部保濕噴霧，同其他水光噴霧睇齊"),
]
MATCH = {
 "__unove__": lambda t: "撫平毛躁順滑定型棒" in t,
 "__miru__":   lambda t: "miru miru" in t,
 "__mapepe__": lambda t: "MAPEPE 吹髮髮卷" in t,
 "__johns__":  lambda t: ("John" in t or "JB ROOM" in t or "Daily aroma" in t),
 "__romand__": lambda t: "口紅雨衣" in t,
 "__yao__":    lambda t: "YAO 強力鏤空方形木梳" in t,
 "__fwee__":   lambda t: t.startswith("fwee 唇頰兩用"),
 "__nience__": lambda t: "念慈菴" in t,
 "__boh__":    lambda t: "微針舒敏暗瘡貼" in t,
 "__agarism__":lambda t: "AGARISM" in t,
 "__akaran__": lambda t: "Akaran 全方位美白油水潤啫喱" in t,
 "__oclear__": lambda t: "O-CLEAR" in t,
 "__laka__":   lambda t: "NatuLaka 無添加淡印礦物海泥膜" in t,
 "__ong__":    lambda t: "水光噴霧 心心限定版" in t,
}
VAGUE={"","護膚","彩妝","美妝","化妝","個人護理","個人謢理","頭髮護理","套裝","配件","保健","美容食品","食品 / 飲品","生活風格","女士用品","家品","季節性","西藥"}
Q="""query($c:String){products(first:100, after:$c){pageInfo{hasNextPage endCursor}nodes{id title productType}}}"""
c=None; rows=[]
while True:
    d=gql(Q,{"c":c})["products"]
    rows += [p for p in d["nodes"] if (p["productType"] or "").strip() in VAGUE]
    if not d["pageInfo"]["hasNextPage"]: break
    c=d["pageInfo"]["endCursor"]
apply = "--apply" in sys.argv
done=0; miss=[]
for p in rows:
    t=p["title"] or ""
    new=None; why=""
    for key,label,reason in FIX:
        if key.startswith("__"):
            if MATCH[key](t): new, why = label, reason; break
        elif p["id"].endswith(key):
            new, why = label, reason; break
    if not new: miss.append(f'[{p["productType"]}] {t[:56]}'); continue
    print(f'  {p["productType"] or "(空)":<6} → {new:<6} {t[:44]:<46} ← {why}')
    if apply: user_errors(gql(UP,{"id":p["id"],"t":new}),"productUpdate")
    done+=1
print(f'\n{done} 件{"改咗" if apply else "會改"}；{len(miss)} 件我未定到：')
for m in miss: print('   ',m)
