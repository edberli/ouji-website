"""爬 vendor-origin-*.json 入面所有 @cosme 品牌嘅產品目錄 → work/cosme-cat/<bid>.json"""
import glob, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cosme
W = os.environ.get('REVIEWS_WORK', '/Volumes/core/AI-Workspace/Claude/ouji-reviews-fill-20261016/work')
os.makedirs(f'{W}/cosme-cat', exist_ok=True)
ids = []
for f in [f'{W}/vendor-origin-all.json']:
    for v in json.load(open(f)):
        ids += [int(x) for x in v.get('cosme_ids') or []]
from concurrent.futures import ThreadPoolExecutor


def one(bid):
    out = f'{W}/cosme-cat/{bid}.json'
    if os.path.exists(out): return
    items = cosme.brand_products(bid, max_pages=80)
    json.dump(items, open(out, 'w'), ensure_ascii=False)
    print(bid, len(items), flush=True)


with ThreadPoolExecutor(1) as ex:
    list(ex.map(one, dict.fromkeys(ids)))
print('DONE')
