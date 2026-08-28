"""用中→英詞表，將 POS 未上線嘅貨夾去 lilabeauty 個目錄。"""
import json, re, csv, collections, sys

LEX = {
 '積雪草':'centella','魚腥草':'heartleaf','水楊酸':'salicylic','壬二酸':'azelaic',
 '透明質酸':'hyaluron','玻尿酸':'hyaluron','煙酰胺':'niacinamide','維他命':'vitamin',
 '膠原':'collagen','神經醯胺':'ceramide','益生菌':'probiotic','蘆薈':'aloe',
 '茶樹':'tea tree','竹':'bamboo','白樺':'birch','米':'rice','大米':'rice',
 '桃':'peach','檸檬':'lemon','柚子':'yuja','胡蘿蔔':'carrot','綠茶':'green tea',
 '艾草':'artemisia','薰衣草':'lavender','迷迭香':'rosemary','薄荷':'mint',
 '精華':'serum','安瓶':'ampoule','面霜':'cream','乳霜':'cream','乳液':'lotion',
 '爽膚水':'toner','化妝水':'toner','棉片':'pad','爽膚棉':'pad','面膜':'mask',
 '潔面':'cleans','卸妝':'cleansing','洗面':'cleans','防曬':'sun','唇':'lip',
 '眼':'eye','身體':'body','護手':'hand','頭皮':'scalp','洗髮':'shampoo',
 '護髮':'conditioner','噴霧':'mist','啫喱':'gel','凝膠':'gel','泡沫':'foam',
 '油':'oil','水凝':'water','保濕':'moistur','舒緩':'sooth','鎮靜':'calm',
 '修復':'repair','亮白':'brighten','美白':'brighten','抗痘':'acne','祛痘':'acne',
 '毛孔':'pore','角質':'exfoli','去角質':'peel','睡眠':'sleep','貼':'patch',
 '刮痧':'gua sha','按摩':'massage','套裝':'set','旅行':'travel','迷你':'mini',
 '泛酸':'pantothenic','維生素b5':'pantothenic','b5':'b5','竹炭':'charcoal','泥膜':'clay',
 '卸妝膏':'balm','安瓶':'ampoule','精華液':'essence','爽膚棉':'toner pad','眼霜':'eye cream',
 '唇膜':'lip','果凍':'jelly','微針':'microneedle','蜂蜜':'honey','燕窩':'swallow',
 '洗面奶':'cleanser','泡泡':'bubble','蜜粉':'powder','氣墊':'cushion','粉底':'foundation',
 '遮瑕':'concealer','眼影':'eyeshadow','唇釉':'tint','唇膏':'lipstick','胭脂':'blush',
 '睫毛':'mascara','眼線':'liner','眉':'brow','高光':'highlight','修容':'contour',
 '玫瑰':'rose','洋甘菊':'chamomile','綠豆':'mung','石榴':'pomegranate','無花果':'fig',
 '黑糖':'brown sugar','海洋':'marine','深層':'deep','日常':'daily','強效':'intensive',
 '溫和':'mild','清爽':'fresh','水潤':'hydra','緊緻':'firming','抗皺':'wrinkle',
 '毛孔':'pore','控油':'sebum','去黃':'yellow','淡斑':'spot','屏障':'barrier',
 '三合一':'3-in-1','護理液':'treatment','髮根':'scalp serum','增強劑':'enhancer',
 '棉片':'pad','搗磨':'peeled','告別痘痘':'acne','嫩白':'origin',
}

# numbuzin 呢類「No.N」牌子，型號本身就係身份。夾錯 No. 就一定係第二件貨。
NO = re.compile(r'no\.?\s*(\d+)', re.I)
def no_of(t):
    m = NO.search((t or '').replace('　',' '))
    return m.group(1) if m else None
UNIT={'毫升':'ml','ml':'ml','克':'g','g':'g','片':'pcs','pcs':'pcs','ea':'pcs',
      '包':'pcs','條':'pcs','支':'pcs','入':'pcs','枚':'pcs','sheet':'pcs','sheets':'pcs'}
SIZE=re.compile(r'(\d+(?:\.\d+)?)\s*(毫升|ml|克|g|片|pcs|ea|包|條|支|入|枚|sheets?)',re.I)

def sizes(s):
    return {f"{float(a):g}{UNIT.get(b.lower(),b.lower())}" for a,b in SIZE.findall(s or '')}

def brand_of(n):
    n=(n or '').lower()
    for b in ['numbuzin','numbuz','aromatica','menokin','nacific','round lab','roundlab',
              'some by mi','somebymi','tocobo','purito','skin1004','torriden','anua','cosrx',
              'beauty of joseon','abib','fwee','laka','coringco','frudia','2an','2aN']:
        if b in n: return b.replace('numbuz','numbuzin').replace('roundlab','round lab').replace('somebymi','some by mi')
    return None

def lex(zh_name):
    return {en for zh,en in LEX.items() if zh in zh_name}

def score(pos_name, title):
    ps, ts = sizes(pos_name), sizes(title)
    if not (ps & ts): return 0,0,0
    pno, tno = no_of(pos_name), no_of(title)
    if pno and tno and pno != tno:
        return 0,0,9          # No.1 對 No.4 —— 一定係第二件貨
    tl = (title or '').lower()
    hits = {en for en in lex(pos_name) if en in tl}
    # 英文名有嘅成分詞，但 POS 名冇 → 對立
    clash = 0
    for zh,en in LEX.items():
        if en in tl and zh not in pos_name and en in ('centella','heartleaf','rosemary','tea tree',
              'lavender','mint','birch','rice','peach','lemon','yuja','carrot','bamboo','aloe',
              'artemisia','collagen','niacinamide','salicylic','azelaic','ceramide','hyaluron'):
            clash += 1
    return (0.5 + 0.25*min(len(hits),3)), len(hits), clash

pos=[r for r in csv.DictReader(open('/Volumes/core/ouji-pos/raw/Ouji_KT_skus_prince.csv',encoding='utf-8-sig'))]
want=set()
for l in open('/tmp/sup_gap.txt',encoding='utf-8'):
    m=re.match(r'\s+(\d+)\s',l)
    if m: want.add(m.group(1))
lila=json.load(open('lila_all.json'))
byb=collections.defaultdict(list)
for p in lila:
    b=brand_of((p.get('vendor','')+' '+p.get('title','')))
    if b: byb[b].append(p)

out=[]
for r in pos:
    bc=(r['barcode'] or '').strip()
    if bc not in want or float(r['stock_qty'] or 0)<=0: continue
    b=brand_of(r['name'])
    if not b or b not in byb: continue
    best=None
    for p in byb[b]:
        sc,h,cl=score(r['name'], p['title'])
        no_ok = no_of(r['name']) and no_of(p['title']) and no_of(r['name'])==no_of(p['title'])
        if sc and p.get('images') and ((h>=2 and cl==0) or (h>=3 and cl<=1) or (no_ok and h>=1 and cl==0)):
            if not best or sc>best[0]: best=(sc,h,p)
    if best: out.append((best[0],best[1],r,best[2]))
out.sort(key=lambda x:-x[0])
seen=set(); uniq=[]
for sc,h,r,p in out:
    if p['id'] in seen: continue
    seen.add(p['id']); uniq.append((sc,h,r,p))
print(f'夾到 {len(uniq)} 件')
for sc,h,r,p in uniq[:40]:
    print(f'  {sc:.2f}/{h} {r["name"][:40]:<42}→ {p["title"][:52]}')
json.dump([{'bc':r['barcode'],'pos':r['name'],'title':p['title'],
            'img':[i['src'] for i in p.get('images',[])][:6],'score':sc}
           for sc,h,r,p in uniq], open('lila_match.json','w'), ensure_ascii=False, indent=1)
