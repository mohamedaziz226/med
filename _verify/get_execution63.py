"""List executions via n8n REST and fetch execution 63 details."""
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
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:600]


status, body = api("POST", "/rest/login", {
    "emailOrLdapLoginId": "admin@med.com",
    "password": "Admin123!",
})
print("login:", status, "ok" if status == 200 else body)

status, body = api("GET", "/rest/executions?workflowId=TuKvVdtren4w6HHM&limit=3&includeData=true")
print("\nlist executions:", status)
if status == 200:
    data = body.get("data", {})
    print(json.dumps(body, ensure_ascii=False, default=str)[:3000])