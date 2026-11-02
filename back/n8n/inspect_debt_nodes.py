import json
with open(r"c:\Users\Aziz\Desktop\med\backend\n8n\workflows\debt-reminders-with-notifications.json", encoding="utf-8") as f:
    data = json.load(f)
for n in data["nodes"]:
    nm = n["name"]
    if nm in ("Get Patient Payments", "Get Patient", "Create Patient Notification", "Get Upcoming Appointments"):
        print(f"=== {nm} ===")
        params = n.get("parameters", {})
        for k in ("url", "method", "jsonBody"):
            if k in params:
                print(f"{k}: {params[k]}")
        print()
