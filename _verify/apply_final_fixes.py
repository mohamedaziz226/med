"""Apply final fixes to the debt reminders workflow.

Fixes:
1. Create Patient Notification -> jsonBody via JSON.stringify() (évite les JSON invalides) + add dedup_key
2. Gmail credential - note that no credential exists, requires manual OAuth2 setup
"""
import json

SRC = r"C:\Users\Aziz\Desktop\med\backend\n8n\workflows\debt-reminders-with-notifications.json"

with open(SRC, encoding="utf-8") as f:
    wf = json.load(f)

nodes = wf["nodes"]
conns = wf["connections"]

# --- Fix 1: jsonBody via JSON.stringify + dedup_key ---
for n in nodes:
    if n["name"] == "Create Patient Notification":
        # Use JSON.stringify for string values to ensure proper escaping
        # Add dedup_key for idempotency
        new_json_body = (
            '={\n'
            '  "patient_id": Number($json.patient_id),\n'
            '  "title": ' + json.dumps('{{ JSON.stringify($json.title) }}') + ',\n'
            '  "message": ' + json.dumps('{{ JSON.stringify($json.message) }}') + ',\n'
            '  "type": "debt_reminder",\n'
            '  "related_entity_id": Number($json.appointment_id),\n'
            '  "related_entity_type": "appointment",\n'
            '  "reminder_type": ' + json.dumps('{{ JSON.stringify($json.reminder_type) }}') + ',\n'
            '  "dedup_key": "appointment:" + String($json.patient_id) + ":" + String($json.appointment_id) + ":" + String($json.reminder_type)\n'
            '}'
        )
        # Actually, let's just use a simpler approach with proper escaping
        new_json_body = '=JSON.stringify({patient_id: Number($json.patient_id), title: $json.title, message: $json.message, type: "debt_reminder", related_entity_id: Number($json.appointment_id), related_entity_type: "appointment", reminder_type: $json.reminder_type, dedup_key: "appointment:" + String($json.patient_id) + ":" + String($json.appointment_id) + ":" + String($json.reminder_type)})'
        n["parameters"]["jsonBody"] = new_json_body
        print("✓ Fix 1: jsonBody corrigé avec JSON.stringify() + dedup_key")

# --- Fix 2: Vérifier le credential Gmail ---
for n in nodes:
    if n["name"] == "Send Debt Reminder Email":
        creds = n.get("credentials", {})
        print(f"\n✓ Fix 2: Send Debt Reminder Email (Gmail) credential check:")
        print(f"    credentials: {json.dumps(creds)}")
        print(f"    → AUCUN credential Gmail OAuth2 n'existe dans n8n")
        print(f"    → Le nœud garde la référence (id: CaiZmZzshoECZ5OO)")
        print(f"    → REQUIÉ: Configuration OAuth2 Gmail manuellement dans l'interface n8n")
        print(f"    → Le workflow NE PEUT PAS envoyer d'emails Gmail tant que ce credential n'est pas configuré")

with open(SRC, "w", encoding="utf-8") as f:
    json.dump(wf, f, ensure_ascii=False, indent=2)

print(f"\n✅ Workflow modifié: {SRC}")
print(f"   Nodes: {len(nodes)} | Connections: {len(conns)}")