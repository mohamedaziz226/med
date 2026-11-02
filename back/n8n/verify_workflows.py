"""Verify the updated workflows."""
import json

def verify_workflow(path, name):
    print(f"\n=== {name} ===")
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print(f"Nodes: {len(data['nodes'])}")
    for node in data['nodes']:
        print(f"  - {node['name']}: {node['type']}")
    
    # Check for Gmail OAuth2 credentials
    has_gmail = False
    for node in data['nodes']:
        if 'credentials' in node:
            creds = node['credentials']
            if 'gmailOAuth2' in creds:
                has_gmail = True
                print(f"  ✓ Gmail OAuth2 configured on: {node['name']}")
    
    if not has_gmail:
        print("  ✗ No Gmail OAuth2 credentials found")
    
    return data

# Verify appointment workflow
appt = verify_workflow(
    r'c:\Users\Aziz\Desktop\med\backend\n8n\workflows\appointment-reminders-with-notifications.json',
    'Appointment Reminders Workflow'
)

# Verify debt workflow
debt = verify_workflow(
    r'c:\Users\Aziz\Desktop\med\backend\n8n\workflows\debt-reminders-with-notifications.json',
    'Debt Reminders Workflow'
)

# Check for dedup_key in notification creation
print("\n=== Anti-duplicate Check ===")
for node in appt['nodes']:
    if node['name'] == 'Create Patient Notification':
        if 'dedup_key' in node['parameters'].get('jsonBody', ''):
            print("✓ Appointment workflow has dedup_key")
        else:
            print("✗ Appointment workflow missing dedup_key")

for node in debt['nodes']:
    if node['name'] == 'Create Patient Notification':
        if 'dedup_key' in node['parameters'].get('jsonBody', ''):
            print("✓ Debt workflow has dedup_key")
        else:
            print("✗ Debt workflow missing dedup_key")
