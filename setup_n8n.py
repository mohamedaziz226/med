import urllib.request, json, urllib.error, http.cookiejar

BASE = "http://localhost:5678"
cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

def api(method, path, data=None):
    url = f"{BASE}{path}"
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, method=method)
    req.add_header("Content-Type", "application/json")
    try:
        resp = opener.open(req, timeout=15)
        return resp.status, resp.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()
    except Exception as e:
        return 500, str(e)

# Setup owner (needs uppercase in password)
print("=== Setting up owner ===")
status, body = api("POST", "/rest/owner/setup", {
    "email": "admin@med.com",
    "firstName": "Admin",
    "lastName": "System",
    "password": "Admin123!"
})
print(f"  Status: {status}")
print(f"  Body: {body[:300]}")

# Login
print("\n=== Login ===")
status, body = api("POST", "/rest/login", {
    "emailOrLdapLoginId": "admin@med.com",
    "password": "Admin123!"
})
print(f"  Status: {status}")
print(f"  Body: {body[:300]}")

# Check workflows via REST
print("\n=== Workflows (via REST) ===")
status, body = api("GET", "/rest/workflows")
print(f"  Status: {status}")
try:
    data = json.loads(body)
    for wf in data.get("data", []):
        print(f"  id={wf.get('id')}, name={wf.get('name')}, active={wf.get('active')}")
except Exception as e:
    print(f"  Parse error: {e}")
    print(f"  Body: {body[:500]}")

# Activate workflows via REST
for wf_id in ["cIIOrjdhNGTPjwfJ", "TESTdebtWF0001"]:
    print(f"\n=== Activating {wf_id} ===")
    status, body = api("PATCH", f"/rest/workflows/{wf_id}", {"active": True})
    print(f"  Status: {status}")
    print(f"  Body: {body[:200]}")

# Verify
print("\n=== Verify workflows after activation ===")
status, body = api("GET", "/rest/workflows")
try:
    data = json.loads(body)
    for wf in data.get("data", []):
        print(f"  id={wf.get('id')}, active={wf.get('active')}")
except Exception:
    pass