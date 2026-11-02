"""Check n8n API for active workflows and webhooks."""
import json
import urllib.request

N8N_API = "http://localhost:5678/api/v1"

# List active workflows
req = urllib.request.Request(f"{N8N_API}/workflows?active=true")
try:
    resp = urllib.request.urlopen(req, timeout=10)
    data = json.loads(resp.read())
    print("=== Active Workflows ===")
    for w in data.get("data", []):
        name = w.get("name", "")
        wid = w.get("id", "")
        active = w.get("active", False)
        print(f"  {name} (id={wid}, active={active})")
except Exception as e:
    print(f"Workflows API error: {e}")

# List webhooks
req = urllib.request.Request(f"{N8N_API}/workflows")
try:
    resp = urllib.request.urlopen(req, timeout=10)
    data = json.loads(resp.read())
    print("\n=== Webhook paths (from active workflows) ===")
    for w in data.get("data", []):
        if w.get("active"):
            name = w.get("name", "")
            print(f"  Workflow: {name}")
            # Check nodes for webhook
            for node in w.get("nodes", []):
                if "webhook" in node.get("type", "").lower() or "webhook" in node.get("name", "").lower():
                    params = node.get("parameters", {})
                    path = params.get("path", "")
                    method = params.get("httpMethod", "GET")
                    print(f"    Webhook: {method} /webhook/{path}")
except Exception as e:
    print(f"Webhooks API error: {e}")