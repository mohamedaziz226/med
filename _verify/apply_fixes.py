"""Applique les corrections restantes au workflow de production debt-reminders.

Fixes:
1. Generate Debt Reminder Message -> toujours renvoyer un item (reminder_type: null hors seuil)
2. Ajoute un nœud IF Eligible Reminder après Generate pour filtrer
3. Crée Patient Notification -> jsonBody via JSON.stringify() (évite les JSON invalides)
4. Le nœud Gmail garde sa référence de credential (placeholder, à configurer OAuth2 manuellement)
"""
import json

SRC = r"C:\Users\Aziz\Desktop\med\backend\n8n\workflows\debt-reminders-with-notifications.json"

with open(SRC, encoding="utf-8") as f:
    wf = json.load(f)

nodes = wf["nodes"]
conns = wf["connections"]

# --- Fix 1: Generate Debt Reminder Message -> always return item ---
NEW_GENERATE_JS = """// Calcule le jour du rappel J-15 / J-10 et génère le message.
// TOUJOURS renvoyer un item (même si hors seuil) pour ne pas casser la
// boucle splitInBatches : reminder_type=null → l'IF suivant rebouclera.
const item = $json;

const now = new Date();
now.setHours(0, 0, 0, 0);
const d = new Date(item.appointment_scheduled_at);
d.setHours(0, 0, 0, 0);
const daysUntil = Math.round((d - now) / 86400000);

let reminder_type = null;
if (daysUntil === 15) reminder_type = 'j15';
else if (daysUntil === 10) reminder_type = 'j10';

// Hors seuil : on renvoie quand même l'item avec reminder_type=null.
// Le nœud IF Eligible Reminder filtrera et rebouclera vers Loop Appointments.
if (!reminder_type) {
  return [{ json: { ...item, reminder_type: null } }];
}

const dateStr = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const debtStr = Number(item.debt).toFixed(2);
const title = 'Rappel de paiement';
const message = `Bonjour ${item.patient_name}, nous vous informons qu'un montant de ${debtStr} DT reste à régler sur votre dossier. Votre prochain rendez-vous est prévu le ${dateStr}. Nous vous invitons à régulariser votre situation avant cette date.`;

return [{
  json: {
    ...item,
    reminder_type,
    appointment_date: dateStr,
    title,
    message,
    gmail_html: `<p>Bonjour ${item.patient_name},</p><p>Nous vous informons qu'un montant de <strong>${debtStr} DT</strong> reste à régler sur votre dossier.</p><p>Votre prochain rendez-vous est prévu le <strong>${dateStr}</strong>.</p><p>Nous vous invitons à régulariser votre situation avant cette date.</p><p>Cordialement,<br/>MedSecretariat</p>`
  }
}]"""

for n in nodes:
    if n["name"] == "Generate Debt Reminder Message":
        n["parameters"]["jsCode"] = NEW_GENERATE_JS
        print("✓ Fix 1: Generate Debt Reminder Message jsCode mis à jour (always returns item)")

# --- Fix 2: Ajoute le nœud IF Eligible Reminder ---
if_node = {
    "parameters": {
        "conditions": {
            "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "loose"},
            "conditions": [
                {
                    "id": "if-eligible-1",
                    "leftValue": "={{ $json.reminder_type }}",
                    "rightValue": "",
                    "operator": {"type": "string", "operation": "isNotEmpty"},
                }
            ],
        },
        "options": {"output": {"true": "main", "false": "main"}},
    },
    "id": "if-eligible",
    "name": "IF Eligible Reminder",
    "type": "n8n-nodes-base.if",
    "typeVersion": 2.2,
    "position": [870, 0],
}

# Vérifie qu'il n'est pas déjà présent
existing_names = [n["name"] for n in nodes]
if "IF Eligible Reminder" not in existing_names:
    nodes.append(if_node)
    print("✓ Fix 2: Nœud IF Eligible Reminder ajouté (position [870, 0])")

# --- Fix 2b: Update connections ---
# Generate Debt Reminder Message -> IF Eligible Reminder (was -> Send Debt Reminder Email)
conns["Generate Debt Reminder Message"] = {
    "main": [[{"node": "IF Eligible Reminder", "type": "main", "index": 0}]]
}

# IF Eligible Reminder:
#   true (output 0) -> Send Debt Reminder Email
#   false (output 1) -> Loop Appointments (rebouclage)
conns["IF Eligible Reminder"] = {
    "main": [
        [{"node": "Send Debt Reminder Email", "type": "main", "index": 0}],   # true
        [{"node": "Loop Appointments", "type": "main", "index": 0}],           # false
    ]
}
print("✓ Fix 2b: Connexions mises à jour (Generate -> IF Eligible -> [Send Email | Loop])")

# --- Fix 3: jsonBody via JSON.stringify ---
for n in nodes:
    if n["name"] == "Create Patient Notification":
        # JSON.stringify() échappe proprement newlines/quotes dans message & title
        new_json_body = (
            "={\n"
            '  "patient_id": {{ $json.patient_id }},\n'
            '  "title": {{ JSON.stringify($json.title) }},\n'
            '  "message": {{ JSON.stringify($json.message) }},\n'
            '  "type": "debt_reminder",\n'
            '  "related_entity_id": {{ $json.appointment_id }},\n'
            '  "related_entity_type": "appointment",\n'
            '  "reminder_type": {{ JSON.stringify($json.reminder_type) }}\n'
            "}"
        )
        n["parameters"]["jsonBody"] = new_json_body
        print("✓ Fix 3: jsonBody corrigé avec JSON.stringify() pour title, message, reminder_type")

# --- Fix 4: Vérifier le credential Gmail ---
for n in nodes:
    if n["name"] == "Send Debt Reminder Email":
        creds = n.get("credentials", {})
        print(f"\n✓ Fix 4: Send Debt Reminder Email (Gmail) garde credential placeholder:")
        print(f"    credentials: {json.dumps(creds)}")
        print(f"    → AUCUN credential Gmail OAuth2 n'existe dans n8n (nécessite configuration manuelle)")

with open(SRC, "w", encoding="utf-8") as f:
    json.dump(wf, f, ensure_ascii=False, indent=2)

print(f"\n✅ Workflow modifié: {SRC}")
print(f"   Nodes: {len(nodes)} | Connections: {len(conns)}")