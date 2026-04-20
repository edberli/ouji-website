import http.server, os, functools
os.chdir(os.path.dirname(os.path.abspath(__file__)))
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=".")
http.server.HTTPServer(("", 8000), handler).serve_forever()
