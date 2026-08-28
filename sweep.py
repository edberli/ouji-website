"""將 171 件未上線貨，喺全部零售 feed 度搵候選，逐件印出嚟畀人讀。

唔出分數判生死 —— 分數只係排序。真正決定係人睇。
"""
import json, re, sys
from pathlib import Path

FEEDS = ['lila_all.json','kbw_all.json','seoulmills_all.json','hikoco_all.json',
         'nudieglow_all.json','sokoglam_all.json','ellielovemom_all.json',
         'kiokii_all.json','boozyshop_all.json','olivekollection_all.json',
         'mikaela-beauty_all.json','limese_all.json']

# 中文 → 英文關鍵詞。POS 標題係「牌子 ＋ 中文描述 ＋ [規格]」，
# 英文 feed 夾唔到中文，所以要有呢張表先有 recall。
LEX = {
 '護手霜':'hand cream','沐浴露':'body wash','身體乳':'body lotion','洗髮':'shampoo',
 '護髮素':'treatment','護髮油':'hair oil','安瓶':'ampoule','精華':'serum','面膜':'mask',
 '面霜':'cream','乳霜':'cream','爽膚水':'toner','化妝水':'toner','潔面':'cleanser',
 '泡沫':'foam','卸妝油':'cleansing oil','卸妝膏':'cleansing balm','防曬':'sun',
 '眼霜':'eye cream','眼部精華':'eye serum','去角質':'peeling','磨砂':'scrub',
 '唇膏':'lip balm','唇釉':'lip tint','氣墊':'cushion','粉底':'foundation',
 '睫毛':'eyelash','益生菌':'probiotics','膠原蛋白':'collagen','維他命':'vitamin',
 '康普茶':'kombucha','紅參':'red ginseng','乳酸菌':'lactobacillus','鋅':'zinc',
 '毛孔':'pore','保濕':'moisture','美白':'whitening','舒緩':'soothing','屏障':'barrier',
 '積雪草':'centella','魚腥草':'heartleaf','青梅':'green plum','奇異果':'kiwi',
 '神經醯胺':'ceramide','蘆薈':'aloe','牛油果':'avocado','橄欖':'olive','蜂蜜':'honey',
 '仙人掌':'cactus','木瓜':'papaya','覆盆子':'raspberry','山竹':'mangosteen',
 '乳木果':'shea','芒果':'mango','百香果':'passion fruit','水蜜桃':'peach','石榴':'pomegranate',
 '薰衣草':'lavender','玫瑰':'rose','櫻花':'cherry blossom','白麝香':'white musk',
 '茶樹':'tea tree','迷迭香':'rosemary','藜麥':'quinoa','麻糬':'mochi','禮盒':'set',
 '套裝':'set','鎮靜':'calming','緊緻':'firming','抗皺':'wrinkle','消腫':'depuff',
}

def toks(s):
    return set(re.findall(r'[a-z0-9]+', s.lower()))

def main():
    feeds=[]
    for f in FEEDS:
        try: feeds += [dict(p, _src=f.split('_')[0]) for p in json.loads(Path(f).read_text())]
        except Exception: pass
    print(f'候選庫 {len(feeds)} 件', file=sys.stderr)
    gap=json.load(open('/tmp/gap171.json'))
    out=[]
    for r in gap:
        n=r['name']
        brand=(re.match(r'[（(]?[A-Za-z][A-Za-z&:.\' ]{1,20}', n.strip()) or [''])
        brand=(brand.group(0).strip() if hasattr(brand,'group') else '').lower()
        want=toks(n)
        for zh,en in LEX.items():
            if zh in n: want |= toks(en)
        want -= {'ml','g','x','pcs'}
        cands=[]
        for p in feeds:
            hay=(p['title']+' '+(p.get('vendor') or '')).lower()
            if brand and brand.split()[0] not in hay: continue
            sc=len(want & toks(hay))
            if sc>=2: cands.append((sc,p))
        cands.sort(key=lambda x:-x[0])
        if cands:
            out.append({'bc':r['barcode'].strip(),'pos':n,
                        'cands':[{'sc':s,'t':p['title'],'src':p['_src'],
                                  'img':p['images'],'url':p.get('url','')} for s,p in cands[:3]]})
    Path('/tmp/sweep.json').write_text(json.dumps(out,ensure_ascii=False,indent=1))
    print(f'有候選 {len(out)} / {len(gap)}', file=sys.stderr)
    for x in out:
        print(f"\n{x['bc']} {x['pos'][:52]}")
        for c in x['cands']:
            print(f"   {c['sc']}  [{c['src'][:5]}] {c['t'][:62]}")

main()
