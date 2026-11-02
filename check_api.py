import urllib.request, json

BASE = "http://localhost:5678/api/v1"

# Check auth providers
try:
    req = urllib.request.Request(f"{BASE}/auth/providers")
    resp = urllib.request.urlopen(req, timeout=10)
    print(f"Auth providers - Status: {resp.status}")
    print(f"Body: {resp.read().decode()[:500]}")
except urllib.error.HTTPError as e:
    body = e.read().decode()[:500]
    print(f"Auth providers - HTTP Error: {e.code} - {body}")
except Exception as e:
    print(f"Auth providers - Error: {type(e).__name__}: {e}")

# Check if we can list workflows without auth
try:
    req = urllib.request.Request(f"{BASE}/workflows")
    resp = urllib.request.urlopen(req, timeout=10)
    data = json.loads(resp.read().decode())
    print(f"\nWorkflows - Status: {resp.status}")
    for wf in data.get("data", []):
        print(f"  id={wf.get('id')}, name={wf.get('name')}, active={wf.get('active')}")
except urllib.error.HTTPError as e:
    body = e.read().decode()[:300]
    print(f"\nWorkflows - HTTP Error: {e.code} - {body}")
except Exception as e:
    print(f"\nWorkflows - Error: {type(e).__name__}: {e}")