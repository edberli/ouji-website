"""YesStyle 配對 job：Olive Young／@cosme 都未配到嘅產品 vs YesStyle 同品牌目錄（有評論嘅）。
→ work/match-in-ys/<slug>.json"""
import glob, json, os, re, collections
W = os.environ.get('REVIEWS_WORK', '/Volumes/core/AI-Workspace/Claude/ouji-reviews-fill-20261016/work')
done = set()
for f in ('match-oy.json', 'match-cosme.json'):
    if os.path.exists(f'{W}/{f}'): done |= {m['h'] for m in json.load(open(f'{W}/{f}'))}
U = [p for p in json.load(open(f'{W}/unrated.json')) if p['h'] not in done]
IN = f'{W}/match-in-ys'; os.makedirs(IN, exist_ok=True)
for f in glob.glob(f'{IN}/*.json'): os.remove(f)
by = collections.defaultdict(list)
for p in U: by[p['v']].append(p)
st = collections.Counter()
for vendor, items in by.items():
    slug = re.sub(r'[^A-Za-z0-9]+', '-', vendor).strip('-').lower() or 'x'
    fn = f'{W}/ys-cat/{slug}.json'
    pool = [x for x in (json.load(open(fn)) if os.path.exists(fn) else []) if x.get('reviews')]
    if not pool: st['no pool'] += len(items); continue
    job = {'brand': vendor,
           'ours': [{'h': p['h'], 'title': p['t'], 'type': p['ty'], 'variants': p['variants'][:8]} for p in items],
           'yesstyle': [{'k': k, 'pid': x['pid'], 'name': x['name'], 'reviews': x['reviews']} for k, x in enumerate(pool)]}
    json.dump(job, open(f'{IN}/{slug}.json', 'w'), ensure_ascii=False, indent=0)
    st['jobs'] += 1; st['products'] += len(items)
print(len(U), dict(st))
