"""Local CORS proxy in front of the live Modal API.

The deployed API only sends Access-Control-Allow-Origin for the origins in its
CORS_ALLOW_ORIGINS secret, so a browser on localhost is refused. Rather than
widen production CORS just to develop, forward through this:

    python tools/dev-proxy.py
    # then in main.js, temporarily:  var API = "http://127.0.0.1:5199";

It proxies any path straight through and adds permissive CORS on the way back.
Development only. Never deploy this.
"""
import urllib.request
import urllib.error
from http.server import BaseHTTPRequestHandler, HTTPServer

UPSTREAM = "https://hanooodaey--fakereasoning-api-fastapi-app.modal.run"


class Proxy(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Max-Age", "600")

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def _forward(self, method):
        length = int(self.headers.get("Content-Length") or 0)
        payload = self.rfile.read(length) if length else None
        req = urllib.request.Request(UPSTREAM + self.path, data=payload, method=method)
        ct = self.headers.get("Content-Type")
        if ct:
            req.add_header("Content-Type", ct)
        try:
            with urllib.request.urlopen(req, timeout=300) as r:
                body, code, ctype = r.read(), r.status, r.headers.get("Content-Type", "application/json")
        except urllib.error.HTTPError as e:
            body, code, ctype = e.read(), e.code, e.headers.get("Content-Type", "application/json")
        except Exception as e:
            body, code, ctype = str(e).encode(), 502, "text/plain"

        print("  %s %s -> %s (%d bytes)" % (method, self.path, code, len(body)), flush=True)
        self.send_response(code)
        self._cors()
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        self._forward("POST")

    def do_GET(self):
        self._forward("GET")

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    print("dev proxy on http://127.0.0.1:5199 -> " + UPSTREAM, flush=True)
    HTTPServer(("127.0.0.1", 5199), Proxy).serve_forever()
