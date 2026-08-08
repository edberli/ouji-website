"""Local dev server that mirrors vercel.json.

The old version was a bare SimpleHTTPRequestHandler, which meant every
/products/<handle> link — that is, every product card on the site — 404'd
locally while working fine in production. Previewing a shop whose product
pages cannot be opened is not previewing the shop, so the rewrite rules
live here too, read from vercel.json rather than copied out of it.

    python3 _serve.py [port]
"""
import functools
import http.server
import json
import os
import re
import sys
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode

ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(ROOT)

with open("vercel.json") as fh:
    CONF = json.load(fh)
CLEAN_URLS = CONF.get("cleanUrls", False)


def compile_rule(rule):
    """`/products/:handle` → a regex, plus the destination template."""
    parts = []
    for chunk in re.split(r"(:[A-Za-z_]\w*)", rule["source"]):
        parts.append(f"(?P<{chunk[1:]}>[^/]+)" if chunk.startswith(":")
                     else re.escape(chunk))
    return re.compile("^" + "".join(parts) + "$"), rule["destination"]


RULES = [compile_rule(r) for r in CONF.get("rewrites", [])]


def rewrite(path, query):
    for rx, dest in RULES:
        m = rx.match(path)
        if not m:
            continue
        out = dest
        for k, v in m.groupdict().items():
            out = out.replace(f":{k}", v)
        p, _, q = out.partition("?")
        # Whatever the visitor already had in the query string wins — the
        # rule supplies the handle, it does not get to drop ?variant=.
        merged = dict(parse_qsl(q)) | dict(parse_qsl(query))
        return p, urlencode(merged)
    return path, query


class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        self.path = self.resolve(self.path)
        super().do_GET()

    def do_HEAD(self):
        self.path = self.resolve(self.path)
        super().do_HEAD()

    def resolve(self, raw):
        parts = urlsplit(raw)
        path, query = rewrite(parts.path, parts.query)
        # cleanUrls: /product is served by product.html.
        if CLEAN_URLS and not os.path.splitext(path)[1]:
            if os.path.isfile(ROOT + path + ".html"):
                path += ".html"
        return urlunsplit(("", "", path, query, parts.fragment))

    def log_message(self, fmt, *a):        # one line per request, no noise
        sys.stderr.write("%s %s\n" % (self.address_string(), fmt % a))


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    print(f"OUJI dev server → http://localhost:{port}  "
          f"({len(RULES)} rewrite 規則, cleanUrls={CLEAN_URLS})")
    http.server.HTTPServer(("", port), Handler).serve_forever()
