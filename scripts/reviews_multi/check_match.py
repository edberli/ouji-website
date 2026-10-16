"""核對配對結果：python3 check_match.py oy|cosme
類型閘（沿用 scripts/check_oy_match.py）＋出對照表 work/review-<mode>.txt 畀人手逐行睇。
→ work/match-<mode>.json  [{h, no|id, name, conf}]"""
import glob, json, os, sys, collections
W = os.environ.get('REVIEWS_WORK', '/Volumes/core/AI-Workspace/Claude/ouji-reviews-fill-20261016/work')
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from check_oy_match import types_of, clashes  # noqa
MODE = sys.argv[1]
KEY = {'oy': 'i', 'cosme': 'j', 'ys': 'k'}[MODE]
POOL = {'oy': 'oliveyoung', 'cosme': 'cosme', 'ys': 'yesstyle'}[MODE]
reject = set(json.load(open(f'{W}/reject-{MODE}.json'))) if os.path.exists(f'{W}/reject-{MODE}.json') else set()
out, lines, st = [], [], collections.Counter()
for fin in sorted(glob.glob(f'{W}/match-in-{MODE}/*.json')):
    fo = f'{W}/match-out-{MODE}/' + os.path.basename(fin)
    job = json.load(open(fin))
    if not os.path.exists(fo): st['未有輸出'] += len(job['ours']); continue
    try: rows = json.load(open(fo))
    except Exception: st['JSON 壞'] += len(job['ours']); continue
    ours = {p['h']: p for p in job['ours']}
    pool = job[POOL]
    for r in rows:
        h = r.get('h'); k = r.get(KEY); conf = r.get('confidence', 'none')
        if h not in ours: st['handle 唔存在'] += 1; continue
        if k is None or conf == 'none': st['配唔到'] += 1; continue
        if not isinstance(k, int) or not 0 <= k < len(pool): st['index 出界'] += 1; continue
        c = pool[k]
        mt = types_of(ours[h]['title']) | types_of(ours[h]['type'])
        ot = types_of(c['name']) | types_of(' '.join(c.get('cats') or []))
        if clashes(mt, ot): st['類型閘剷走'] += 1; lines.append(f'✗TYPE  {ours[h]["title"][:50]}  ≠  {c["name"][:60]}'); continue
        if h in reject: st['人手剷走'] += 1; continue
        ref = c.get('no') or c.get('id') or c.get('pid')
        out.append({'h': h, {'oy': 'no', 'cosme': 'id', 'ys': 'pid'}[MODE]: ref, 'name': c['name'], 'conf': conf})
        st['收貨'] += 1
        lines.append(f'{conf[0]}  {h}\n     我哋：{ours[h]["title"][:70]}  [{ours[h]["type"]}]\n     對方：{c["name"][:90]}  ({c.get("reviews")})')
json.dump(out, open(f'{W}/match-{MODE}.json', 'w'), ensure_ascii=False, indent=0)
open(f'{W}/review-{MODE}.txt', 'w').write('\n'.join(lines))
print(dict(st))
