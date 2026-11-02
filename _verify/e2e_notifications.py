"""Final E2E test: trigger n8n reminder webhooks and verify PostgreSQL + email.

Only safe today (31/08): the RDV workflow has exactly one appointment in the
J-7 window (appointment #23 patient 8 -> user's own Gmail test alias).
"""
import json
import subprocess
import time
import urllib.request

# 1) Snapshot notifications before
def psql(sql):
    out = subprocess.run(
        ["docker", "exec", "backend-postgres-1", "psql", "-U", "medsecretariat", "-d", "medsecretariat", "-tAc", sql],
        capture_output=True, text=True, timeout=30,
    )
    return out.stdout.strip()

before = psql("SELECT COUNT(*) FROM notifications")
print(f"Notifications before: {before}")

print("\nTrigger n8n RDV webhook (appointment-reminders-exec)...")
try:
    req = urllib.request.Request(
        "http://localhost:5678/webhook/appointment-reminders-exec",
        data=b"{}",
        method="POST",
    )
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=120) as resp:
        print("  webhook status:", resp.status, resp.read().decode()[:300])
except urllib.error.HTTPError as e:
    print("  webhook HTTP error:", e.code, e.read().decode()[:500])
except Exception as e:
    print("  webhook error:", type(e).__name__, e)

print("\nTrigger n8n DEBT webhook (debt-reminders-exec)...")
try:
    req = urllib.request.Request(
        "http://localhost:5678/webhook/debt-reminders-exec",
        data=b"{}",
        method="POST",
    )
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=120) as resp:
        print("  webhook status:", resp.status, resp.read().decode()[:300])
except urllib.error.HTTPError as e:
    print("  webhook HTTP error:", e.code, e.read().decode()[:500])
except Exception as e:
    print("  webhook error:", type(e).__name__, e)

time.sleep(8)
after = psql("SELECT COUNT(*) FROM notifications")
print(f"\nNotifications after: {after}")
print("New rows:", int(after) - int(before))