"""Check backend API: login, upcoming appointments, notification count."""
import json
import urllib.request

BASE = "http://localhost:8080/api/v1"

# Login
data = json.dumps({"email": "admin@med.com", "password": "admin123"}).encode()
req = urllib.request.Request(f"{BASE}/auth/login", data=data, method="POST")
req.add_header("Content-Type", "application/json")
resp = urllib.request.urlopen(req, timeout=10)
token = json.loads(resp.read())["access_token"]
print(f"Login OK, token: {token[:20]}...")

# Get upcoming appointments
req2 = urllib.request.Request(f"{BASE}/appointments/upcoming")
req2.add_header("Authorization", f"Bearer {token}")
resp2 = urllib.request.urlopen(req2, timeout=10)
appts = json.loads(resp2.read())
print(f"\nUpcoming appointments: {len(appts)}")
for a in appts:
    print(f"  id={a['id']} patient_id={a['patient_id']} status={a['status']} scheduled_at={a['scheduled_at']}")

# Get notifications count before
req3 = urllib.request.Request(f"{BASE}/notifications/unread/count")
req3.add_header("Authorization", f"Bearer {token}")
resp3 = urllib.request.urlopen(req3, timeout=10)
count = json.loads(resp3.read())
print(f"\nUnread notifications for admin: {count}")

# Get all notifications
req4 = urllib.request.Request(f"{BASE}/notifications")
req4.add_header("Authorization", f"Bearer {token}")
resp4 = urllib.request.urlopen(req4, timeout=10)
notifs = json.loads(resp4.read())
print(f"Total notifications: {len(notifs)}")
for n in notifs:
    print(f"  id={n['id']} patient_id={n['patient_id']} type={n['type']} reminder_type={n.get('reminder_type')} is_read={n['is_read']} dedup_key={n.get('dedup_key')}")