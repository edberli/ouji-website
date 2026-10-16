"""譯文對照：用原文內容（sha1）做鎖匙，唔用「第幾則」—— 篩選一改，次序就變，用位置做鎖匙會配錯原文。
舊批次（id 係 src-ref-i）經 tr-in 嘅原文對返。"""
import os
import glob, hashlib, json
W = os.environ.get('REVIEWS_WORK', '/Volumes/core/AI-Workspace/Claude/ouji-reviews-fill-20261016/work')


def key(text):
    return 'h' + hashlib.sha1(text.strip().encode()).hexdigest()[:16]


def load():
    src = {}
    for f in glob.glob(f'{W}/tr-in/*.json'):
        for x in json.load(open(f)): src[x['id']] = x['text']
    out = {}
    for f in glob.glob(f'{W}/tr-out/*.json'):
        try:
            rows = json.load(open(f))
        except Exception as e:
            print('  ⚠️ 讀唔到', f, e); continue
        for x in rows:
            if not (x.get('id') and x.get('zh')): continue
            t = src.get(x['id'])
            k = key(t) if t is not None else (x['id'] if x['id'].startswith('h') else None)
            if k: out[k] = {'zh': x['zh'], 'lang': x.get('lang') or ''}
    return out
