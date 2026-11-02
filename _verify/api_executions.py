"""Check latest n8n executions via REST API."""
import json
import urllib.request


def api(path):
    req = urllib.request.Request(f"http://localhost:5678/api/v1{path}")
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode())


try:
    data = api("/executions?limit=6")
    for ex in data.get("data", []):
        print(f"id={ex.get('id')} wf={ex.get('workflowId')} status={ex.get('status')} "
              f"mode={ex.get('mode')} started={ex.get('startedAt')} stopped={ex.get('stoppedAt')}")
except Exception as e:
    print("API error:", e)
