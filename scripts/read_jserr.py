#!/usr/bin/env python3
"""睇客嗰邊報返嚟嘅前端錯誤（白畫面／JS 拋錯）。

由 `api/jserr.js` 寫入 shop metafield `ouji.jserr`，只留最近 30 條。
成因見 script.js 個看門狗嗰段註解。

    python3 scripts/read_jserr.py
    python3 scripts/read_jserr.py --clear     # 睇完清走
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from shopify_admin import gql, user_errors  # noqa: E402

Q = 'query{ shop{ id metafield(namespace:"ouji", key:"jserr"){ value } } }'
SET = ('mutation($m:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$m)'
       '{ userErrors{ message } } }')


def main():
    shop = gql(Q)["shop"]
    try:
        rows = json.loads((shop.get("metafield") or {}).get("value") or "[]")
    except Exception:
        rows = []
    if not rows:
        print("暫時冇報告 —— 即係冇人撞到白畫面，或者仲未撞到。")
        return
    print(f"{len(rows)} 條（最新喺上面）\n")
    for r in rows:
        print(f"  {r.get('t','')[:19]}  {r.get('kind',''):<12} {r.get('page','')[:34]:<36} "
              f"main={r.get('mainH',0):>6}px  字體={r.get('fonts','')}")
        if r.get("msg"):
            print(f"      {r['msg'][:110]}")
        if r.get("ua"):
            print(f"      {r['ua'][:110]}")
    if "--clear" in sys.argv:
        user_errors(gql(SET, {"m": [{"ownerId": shop["id"], "namespace": "ouji",
                                     "key": "jserr", "type": "json", "value": "[]"}]}),
                    "metafieldsSet")
        print("\n清走咗。")


if __name__ == "__main__":
    main()
