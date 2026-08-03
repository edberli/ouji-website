#!/usr/bin/env python3
"""
One-off: exchange a Shopify OAuth code for a permanent Admin API token.

This store no longer offers legacy in-admin custom apps, so "OUJI Bulk
Import" lives in the Dev Dashboard with the legacy install flow enabled
and http://localhost:8787/callback as its redirect. This serves that
callback, captures the code, swaps it for a token, and appends the token
to .env (gitignored).

    SHOPIFY_CLIENT_SECRET=shpss_... python3 scripts/shopify_oauth.py

Then open the printed URL in the browser and approve.
"""
import http.server
import json
import os
import urllib.parse
import urllib.request

SHOP = "5rerjn-mt.myshopify.com"
CLIENT_ID = "9fc605c8b834aeee903a478a9a2da336"
SCOPES = ("read_products,write_products,read_inventory,write_inventory,"
          "read_locations,write_files,read_publications,write_publications")
REDIRECT = "http://localhost:8787/callback"
PORT = 8787

AUTH_URL = (
    f"https://{SHOP}/admin/oauth/authorize?client_id={CLIENT_ID}"
    f"&scope={urllib.parse.quote(SCOPES)}"
    f"&redirect_uri={urllib.parse.quote(REDIRECT)}&state=ouji"
)


def exchange(code, secret):
    body = json.dumps({
        "client_id": CLIENT_ID,
        "client_secret": secret,
        "code": code,
    }).encode()
    req = urllib.request.Request(
        f"https://{SHOP}/admin/oauth/access_token",
        data=body,
        headers={"Content-Type": "application/json"},
    )
    return json.load(urllib.request.urlopen(req, timeout=30))["access_token"]


class Handler(http.server.BaseHTTPRequestHandler):
    token = None

    def do_GET(self):
        q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        code = (q.get("code") or [None])[0]
        if not code:
            self.send_response(404)
            self.end_headers()
            return
        try:
            Handler.token = exchange(code, os.environ["SHOPIFY_CLIENT_SECRET"])
            msg = "<h1>OK — 可以閂咗呢版</h1>"
        except Exception as e:
            msg = f"<h1>失敗</h1><pre>{e}</pre>"
            print("exchange failed:", e, flush=True)
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(msg.encode())

    def log_message(self, *a):
        pass


def main():
    if not os.environ.get("SHOPIFY_CLIENT_SECRET"):
        raise SystemExit("set SHOPIFY_CLIENT_SECRET first")
    print("AUTH_URL " + AUTH_URL, flush=True)
    srv = http.server.HTTPServer(("127.0.0.1", PORT), Handler)
    while Handler.token is None:
        srv.handle_request()
    with open(".env", "a") as f:
        f.write(f"SHOPIFY_ADMIN_TOKEN={Handler.token}\n")
    print("token written to .env", flush=True)


if __name__ == "__main__":
    main()
