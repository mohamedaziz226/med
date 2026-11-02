"""Print the JS code of all code/if nodes in a dumped workflow (UTF-8 stdout)."""
import json
import sys

path = sys.argv[1]
with open(path, "r", encoding="utf-8") as f:
    wf = json.load(f)
for n in wf["nodes"]:
    t = n.get("type", "")
    name = n.get("name", "")
    p = n.get("parameters", {})
    if "jsCode" in p:
        print(f"\n===== CODE NODE: {name} =====")
        print(p["jsCode"])
    elif "jsonBody" in p and n.get("id", "").startswith("create-notif"):
        print(f"\n===== HTTP NODE: {name} =====")
        print("url:", p.get("url"))
        print("jsonBody:", p["jsonBody"])
        print("method:", p.get("method"))