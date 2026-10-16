"""用法：python3 make_jobs.py oy|cosme
每個品牌一個配對 job：我哋冇評論嘅產品 vs Olive Young／@cosme 候選。
→ work/match-in/<slug>.json；冇候選池嘅品牌列入 work/no-pool.json（之後交 YesStyle）"""
import glob, json, os, re, sys, collections
MODE = sys.argv[1] if len(sys.argv) > 1 else 'oy'
W = os.environ.get('REVIEWS_WORK', '/Volumes/core/AI-Workspace/Claude/ouji-reviews-fill-20261016/work')
flat = lambda s: re.sub(r'[^a-z0-9]', '', (s or '').lower())
ALIAS = {'vtcosmetics': 'vt', 'purito': 'puritoseoul', '花知曉flowerknows': 'flowerknows', 'thefaceshop': 'thefaceshop',
         'banilaco': 'banilaco', 'romand': 'romand', 'dalba': 'dalba'}

U = json.load(open(f'{W}/unrated.json'))
origin = {}
for f in [f'{W}/vendor-origin-all.json']:
    for v in json.load(open(f)): origin[v['vendor']] = v
oy = json.load(open(f'{W}/oy-catalog-full.json'))
oyb = collections.defaultdict(list)
for no, v in oy.items(): oyb[flat(v['b'])].append((no, v))

def oy_pool(vendor):
    k = flat(vendor); k2 = ALIAS.get(k, k)
    for c in (k, k2):
        if c in oyb: return oyb[c]
    for bk, v in oyb.items():
        if len(k) > 3 and len(bk) > 2 and (bk.startswith(k) or k.startswith(bk)): return v
    return []

IN = f'{W}/match-in-{MODE}'
os.makedirs(IN, exist_ok=True)
for f in glob.glob(f'{IN}/*.json'): os.remove(f)
done = set()
if MODE == 'cosme' and os.path.exists(f'{W}/match-oy.json'):
    done = {m['h'] for m in json.load(open(f'{W}/match-oy.json'))}
by = collections.defaultdict(list)
for p in U: by[p['v']].append(p)
nopool, stats = [], collections.Counter()
for vendor, items in by.items():
    items = [p for p in items if p['h'] not in done]
    if not items: continue
    o = origin.get(vendor, {})
    if o.get('kind') == 'nonbeauty':
        stats['nonbeauty'] += len(items); nopool += [{'h': p['h'], 'v': vendor, 'why': 'nonbeauty'} for p in items]; continue
    jp = bool(o.get('cosme_ids') or o.get('cosme_products'))   # 日本牌（@cosme 有頁）留畀 @cosme
    op = sorted(oy_pool(vendor), key=lambda x: -int(x[1].get('c') or 0)) if MODE == 'oy' and not jp else []
    cp = []
    for bid in (o.get('cosme_ids') or []) if MODE == 'cosme' else []:
        fn = f'{W}/cosme-cat/{bid}.json'
        if os.path.exists(fn): cp += json.load(open(fn))
    for pid in (o.get('cosme_products') or []) if MODE == 'cosme' else []:
        cp.append({'id': pid, 'name': o.get('ja_name', vendor), 'cats': [], 'size': '', 'count': 1})
    if not op and not cp:
        stats['no pool'] += len(items); nopool += [{'h': p['h'], 'v': vendor, 'why': 'nopool'} for p in items]; continue
    job = {'brand': vendor, 'origin': o.get('origin'),
           'ours': [{'h': p['h'], 'title': p['t'], 'type': p['ty'], 'variants': p['variants'][:8]} for p in items],
           'oliveyoung': [{'i': i, 'no': no, 'name': v['n'], 'reviews': v.get('c')} for i, (no, v) in enumerate(op)],
           'cosme': [{'j': j, 'id': c['id'], 'name': c['name'], 'cats': c['cats'][:3], 'size': c['size'][:80],
                      'reviews': c['count']} for j, c in enumerate(cp) if c.get('count')]}
    slug = re.sub(r'[^A-Za-z0-9]+', '-', vendor).strip('-').lower() or f'v{abs(hash(vendor)) % 10**6}'
    json.dump(job, open(f'{IN}/{slug}.json', 'w'), ensure_ascii=False, indent=0)
    stats['jobs'] += 1; stats['products in jobs'] += len(items)
json.dump(nopool, open(f'{W}/no-pool-{MODE}.json', 'w'), ensure_ascii=False, indent=0)
print(dict(stats))
