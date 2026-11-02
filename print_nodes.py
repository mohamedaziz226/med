import json

with open(r"C:\Users\Aziz\Desktop\med\backend\n8n\workflows\debt-reminders-with-notifications.json", encoding="utf-8") as f:
    wf = json.load(f)

# Print full jsCode for Generate Debt Reminder Message
for n in wf["nodes"]:
    if n["name"] == "Generate Debt Reminder Message":
        print("=== FULL jsCode ===")
        print(n["parameters"]["jsCode"])
        break

# Print full jsCode for Calculate Debt
for n in wf["nodes"]:
    if n["name"] == "Calculate Debt":
        print("\n=== Calculate Debt FULL jsCode ===")
        print(n["parameters"]["jsCode"])
        break

# Print full Create Patient Notification
for n in wf["nodes"]:
    if n["name"] == "Create Patient Notification":
        print("\n=== Create Patient Notification ===")
        print(json.dumps(n["parameters"], indent=2))
        break

# Print full Send Debt Reminder Email
for n in wf["nodes"]:
    if n["name"] == "Send Debt Reminder Email":
        print("\n=== Send Debt Reminder Email ===")
        print(json.dumps(n, indent=2))
        break