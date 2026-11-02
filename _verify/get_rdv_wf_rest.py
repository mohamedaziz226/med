"""Fetch current RDV workflow via n8n REST, and check API key options."""
import http.cookiejar
import json
import sqlite3
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
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:400]


# Owner login
status, login = api("POST", "/rest/login", {
    "emailOrLdapLoginId": "admin@med.com",
    "password": "Admin123!",
})
print("login:", status)

status, wf = api("GET", "/rest/workflows/TuKvVdtren4w6HHM")
print("GET workflow:", status)
if status == 200:
    data = wf.get("data", {})
    print("  name:", data.get("name"), " active:", data.get("active"))
    print("  nodes:", [n.get("name") for n in data.get("nodes", [])])
    # Save for patch use
    with open("_verify\\rdv_wf_rest.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("  saved _verify\\rdv_wf_rest.json")

print("\n=== API keys ===")
conn = sqlite3.connect("c:\\Users\\Aziz\\Desktop\\med\\_verify\\n8n_container.sqlite")
cur = conn.cursor()
try:
    cols = [d[1] for d in cur.execute("PRAGMA table_info(user_api_keys)")]
    print(" cols:", cols)
    for r in cur.execute("SELECT * FROM user_api_keys"):
        print(" row:", r)
except Exception as exc:
    print(" error:", exc)
conn.close()