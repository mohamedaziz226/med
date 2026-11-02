import urllib.request, json, time

time.sleep(5)

# Check n8n API
try:
    req = urllib.request.Request("http://localhost:5678/api/v1/workflows")
    resp = urllib.request.urlopen(req, timeout=15)
    data = json.loads(resp.read().decode())
    print(f"n8n API Status: {resp.status}")
    wfs = data.get("data", [])
    for wf in wfs:
        print(f"  Workflow: {wf['name']} (id={wf['id']}, active={wf.get('active')})")
except urllib.error.HTTPError as e:
    body = e.read().decode()[:300]
    print(f"n8n API Error: {e.code} - {body}")
except Exception as e:
    print(f"Error: {type(e).__name__}: {e}")

# Check backend API
try:
    req = urllib.request.Request("http://localhost:8080/api/v1/appointments/upcoming")
    resp = urllib.request.urlopen(req, timeout=10)
    print(f"\nBackend API Status: {resp.status}")
except urllib.error.HTTPError as e:
    body = e.read().decode()[:200]
    print(f"\nBackend API (expected 401): {e.code} - {body[:100]}")
except Exception as e:
    print(f"\nBackend API Error: {type(e).__name__}: {e}")

# Check Mailpit
try:
    req = urllib.request.Request("http://localhost:8025/api/v2/messages")
    resp = urllib.request.urlopen(req, timeout=10)
    data = json.loads(resp.read().decode())
    print(f"\nMailpit Status: {resp.status}, Total messages: {data.get('total', 0)}")
except urllib.error.HTTPError as e:
    print(f"\nMailpit Error: {e.code}")
except Exception as e:
    print(f"\nMailpit Error: {type(e).__name__}: {e}")