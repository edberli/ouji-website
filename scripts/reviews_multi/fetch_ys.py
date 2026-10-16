"""攞 YesStyle 評分＋評論原文。python3 fetch_ys.py work/match-ys.json  # [{h, pid}] → work/raw-ys/<pid>.json"""
import json, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ys
W = os.environ.get('REVIEWS_WORK', '/Volumes/core/AI-Workspace/Claude/ouji-reviews-fill-20261016/work')
OUT = f'{W}/raw-ys'; os.makedirs(OUT, exist_ok=True)
jobs = [p for p in dict.fromkeys(str(m['pid']) for m in json.load(open(sys.argv[1])) if m.get('pid'))
        if not os.path.exists(f'{OUT}/{p}.json')]
print(len(jobs), 'to fetch', flush=True)
for pid in jobs:
    try:
        d = ys.reviews(pid, 1)
        revs = list((d.get('reviewerReviewsData') or {}).get('reviewerReviews') or [])
        for page in (2, 3):
            if not (d.get('reviewerReviewsData') or {}).get('hasNext'): break
            time.sleep(1.2)
            d2 = ys.reviews(pid, page)
            revs += (d2.get('reviewerReviewsData') or {}).get('reviewerReviews') or []
            d['reviewerReviewsData']['hasNext'] = (d2.get('reviewerReviewsData') or {}).get('hasNext')
        ga = ((d.get('ga4ReviewViewData') or {}).get('ga4_items') or [{}])[0]
        json.dump({'pid': pid, 'overall': d.get('customerReviewOverallData'), 'rating': ga.get('review_rating'),
                   'name': ga.get('item_name'), 'brand': ga.get('item_brand'), 'reviews': revs},
                  open(f'{OUT}/{pid}.json', 'w'), ensure_ascii=False)
        print('ok', pid, ga.get('review_rating'), len(revs), flush=True)
    except Exception as e:
        print('err', pid, str(e)[:100], flush=True); time.sleep(5)
    time.sleep(1.2)
print('DONE')
