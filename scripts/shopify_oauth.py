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
import sys
import urllib.parse
import urllib.request

SHOP = "5rerjn-mt.myshopify.com"
CLIENT_ID = "9fc605c8b834aeee903a478a9a2da336"
SCOPES = (
    "read_products,write_products,read_inventory,write_inventory,"
    "read_locations,write_files,read_files,read_publications,write_publications,"
    "read_orders,read_locales,write_locales,read_translations,write_translations,"
    "read_markets,write_markets,read_all_orders,read_customers,read_draft_orders,"
    "read_returns,read_fulfillments,read_order_edits,read_themes,read_content,"
    "read_online_store_pages,read_online_store_navigation,read_discounts,"
    "read_price_rules,read_shipping,read_legal_policies,read_metaobjects,"
    "read_metaobject_definitions,read_gift_cards,read_gift_card_transactions,"
    "read_store_credit_accounts,read_store_credit_account_transactions,"
    "read_pixels,read_script_tags,read_privacy_settings,read_marketing_events,"
    "read_packing_slip_templates,read_checkout_branding_settings"
)
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
    secret = None

    def do_GET(self):
        q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        code = (q.get("code") or [None])[0]
        if not code:
            self.send_response(404)
            self.end_headers()
            return
        try:
            Handler.token = exchange(code, Handler.secret)
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
    secret = os.environ.get("SHOPIFY_CLIENT_SECRET")
    if not secret and len(sys.argv) > 1:
        with open(sys.argv[1]) as fh:
            secret = fh.read().strip()
    if not secret:
        raise SystemExit("set SHOPIFY_CLIENT_SECRET or pass a file containing it")
    Handler.secret = secret
    print("AUTH_URL " + AUTH_URL, flush=True)
    srv = http.server.HTTPServer(("127.0.0.1", PORT), Handler)
    while Handler.token is None:
        srv.handle_request()
    # Replace any existing token: shopify_admin.py reads the first match, so a
    # stale earlier line would otherwise keep being used.
    lines = []
    if os.path.exists(".env"):
        with open(".env") as f:
            lines = [ln for ln in f if not ln.startswith("SHOPIFY_ADMIN_TOKEN")]
    with open(".env", "w") as f:
        f.writelines(lines)
        f.write(f"SHOPIFY_ADMIN_TOKEN={Handler.token}\n")
    print("token written to .env", flush=True)


if __name__ == "__main__":
    main()
