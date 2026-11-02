"""Check /appointments/upcoming response and J-7 window computation."""
import json
import urllib.request

BASE = "http://localhost:8080/api/v1"

def api(method, path, data=None, token=None):
    url = f"{BASE}{path}"
    body = json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request(url, data=body, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode()
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or "{}")

status, login = api("POST", "/auth/login", {"email": "admin@med.com", "password": "admin123"})
token = login.get("access_token")
print("login:", status)

status, upcoming = api("GET", "/appointments/upcoming?days=30", token=token)
print("upcoming status:", status)
if isinstance(upcoming, list):
    for a in upcoming:
        print(f"  id={a.get('id')} patient={a.get('patientId')} status={a.get('status')} scheduled={a.get('scheduledAt')}")
else:
    print(upcoming)

# Try without days param (as n8n does)
status, upcoming2 = api("GET", "/appointments/upcoming", token=token)
print("\nupcoming (no param) status:", status)
if isinstance(upcoming2, list):
    for a in upcoming2:
        print(f"  id={a.get('id')} patient_id={a.get('patient_id')} status={a.get('status')} scheduled_at={a.get('scheduled_at')}")

print("\nFull JSON of item id=23 (upcoming):")
if isinstance(upcoming2, list):
    for a in upcoming2:
        if a.get("id") == 23:
            print(json.dumps(a, ensure_ascii=False, indent=2, default=str))
            break
print("\nRaw first 2 items:")
for a in (upcoming2 or [])[:2]:
    print(json.dumps(a, ensure_ascii=False, default=str))