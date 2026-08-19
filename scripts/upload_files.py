#!/usr/bin/env python3
"""
Upload local images straight to Shopify's CDN.

Mirrored brand imagery used to reach Shopify the long way round: commit
it, push ~60 MB to GitHub, wait for Vercel, then hand Shopify the
oujikbeauty.com URL to fetch. That put a multi-minute deploy between
every brand and its product pages, and grew the repo by tens of MB per
brand for files the site itself never serves.

Staged uploads skip all of it — the bytes go to Shopify directly and the
returned resourceUrl is what productSet takes as originalSource.

    from upload_files import upload
    url = upload("brands/lilybyred/gallery/x-01.jpg")
"""
import json
import mimetypes
import os
import sys
import urllib.request
import uuid

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from shopify_admin import gql, user_errors  # noqa: E402

CACHE_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                          "brands", ".uploaded.json")

STAGED = """
mutation($input: [StagedUploadInput!]!) {
  stagedUploadsCreate(input: $input) {
    stagedTargets { url resourceUrl parameters { name value } }
    userErrors { field message }
  }
}
"""


def _cache():
    if os.path.exists(CACHE_PATH):
        with open(CACHE_PATH) as f:
            return json.load(f)
    return {}


def _save(cache):
    # Two brands uploading at once truncate each other: open(..., "w") empties
    # the file, and a shorter write leaves the longer one's tail behind, so the
    # next reader gets "Extra data" and every upload after it dies. Write a
    # temp file and rename it — a rename is atomic, a partial write is not.
    os.makedirs(os.path.dirname(CACHE_PATH), exist_ok=True)
    tmp = f"{CACHE_PATH}.{os.getpid()}.tmp"
    with open(tmp, "w") as f:
        json.dump(cache, f, indent=1)
    os.replace(tmp, CACHE_PATH)


def _multipart(url, fields, filename, blob, mime):
    boundary = uuid.uuid4().hex
    body = b""
    for name, value in fields:
        body += (f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"\r\n\r\n"
                 f"{value}\r\n").encode()
    body += (f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; "
             f"filename=\"{filename}\"\r\nContent-Type: {mime}\r\n\r\n").encode()
    body += blob + f"\r\n--{boundary}--\r\n".encode()
    req = urllib.request.Request(url, data=body, method="POST",
                                 headers={"Content-Type": f"multipart/form-data; boundary={boundary}"})
    urllib.request.urlopen(req, timeout=180).read()


def upload(path, cache=None):
    """Returns a Shopify resourceUrl usable as productSet originalSource.

    Cached by path + size + mtime so re-running a brand build does not
    re-upload the same hundred strips."""
    own = cache is None
    cache = _cache() if own else cache
    st = os.stat(path)
    key = f"{path}:{st.st_size}:{int(st.st_mtime)}"
    if key in cache:
        return cache[key]

    filename = os.path.basename(path)
    mime = mimetypes.guess_type(filename)[0] or "image/jpeg"
    data = gql(STAGED, {"input": [{
        "filename": filename, "mimeType": mime,
        "resource": "IMAGE", "httpMethod": "POST", "fileSize": str(st.st_size),
    }]})
    user_errors(data, "stagedUploadsCreate")
    target = data["stagedUploadsCreate"]["stagedTargets"][0]

    with open(path, "rb") as f:
        blob = f.read()
    _multipart(target["url"], [(p["name"], p["value"]) for p in target["parameters"]],
               filename, blob, mime)

    cache[key] = target["resourceUrl"]
    if own:
        _save(cache)
    return target["resourceUrl"]


FILE_CREATE = """
mutation($files: [FileCreateInput!]!) {
  fileCreate(files: $files) {
    files { id fileStatus ... on MediaImage { image { url } } }
    userErrors { field message }
  }
}
"""

FILE_STATUS = """
query($ids: [ID!]!) {
  nodes(ids: $ids) { ... on MediaImage { id fileStatus image { url } } }
}
"""


def host(paths, alt=""):
    """Permanent cdn.shopify.com URLs, for the detail strips a product
    description hotlinks. A staged upload URL is only good as a
    productSet source — it expires — so those bytes have to be promoted
    into the Files library first."""
    cache = _cache()
    todo = [p for p in paths if f"file:{p}" not in cache]
    for chunk in [todo[i:i + 20] for i in range(0, len(todo), 20)]:
        staged = [upload(p, cache) for p in chunk]
        data = gql(FILE_CREATE, {"files": [
            {"originalSource": s, "contentType": "IMAGE", "alt": alt} for s in staged]})
        user_errors(data, "fileCreate")
        ids = [f["id"] for f in data["fileCreate"]["files"]]
        # Shopify processes asynchronously; the URL is absent until it is READY
        for _ in range(30):
            nodes = gql(FILE_STATUS, {"ids": ids})["nodes"]
            if all(n and n.get("image") and n["image"].get("url") for n in nodes):
                break
            import time
            time.sleep(2)
        for p, n in zip(chunk, nodes):
            if n and n.get("image"):
                cache[f"file:{p}"] = n["image"]["url"]
        _save(cache)
        print(f"    上載咗 {len(chunk)} 張")
    return [cache.get(f"file:{p}") for p in paths]


def upload_all(paths):
    cache = _cache()
    out = []
    for i, p in enumerate(paths, 1):
        out.append(upload(p, cache))
        if i % 20 == 0:
            _save(cache)
            print(f"    ...{i}/{len(paths)}")
    _save(cache)
    return out


if __name__ == "__main__":
    print(upload(sys.argv[1]))
