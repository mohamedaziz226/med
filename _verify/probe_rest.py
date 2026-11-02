"""Probe n8n REST endpoints for workflow access."""
import http.cookiejar
import json
import urllib.request

BASE = "http://localhost:5678"
cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))


def api(method, path, data=None):
    url = f"{BASE}{path}"
    body = json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request(url, data=body, method=method)
    req.add_header("Content-Type", "application/json")
    try:
        with opener.open(req, timeout=30) as resp:
            raw = resp.read().decode()
            return resp.status, raw[:600]
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:300]


api("POST", "/rest/login", {"emailOrLdapLoginId": "admin@med.com", "password": "Admin123!"})
for path in [
    "/rest/workflows",
    "/rest/workflows?projectId=sUlMDlVRQTlsbGRG",
    "/rest/projects",
    "/rest/workflows/TuKvVdtren4w6HHM?projectId=sUlMDlVRQTlsbGRG",
    "/rest/workflows/TuKvVdtren4w6HHM?includeIds=true",
    "/rest/workflows/TuKvVdtren4w6HHM/version",
]:
    status, body = api("GET", path)
    print(f"GET {path} -> {status}: {body[:180]}")