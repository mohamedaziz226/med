"""Fix the RDV n8n workflow: replace 'return [];' in Prepare Reminders with
fallback items so splitInBatches continues over ALL appointments.

Patches: source JSON + SQLite DB (workflow_entity + workflow_history active version + all history).
"""
import json
import sqlite3
import sys

OLD_PATTERNS = [
    "if (!(st === 'confirmed' || st === 'pending')) return [];",
    "if (!reminder_type) return [];",
]
NEW_LINES = [
    "if (!(st === 'confirmed' || st === 'pending')) { return [{ json: { patient_id: apt.patient_id, appointment_id: apt.id, reminder_type: null, notification_type: null } }]; }",
    "if (!reminder_type) { return [{ json: { patient_id: apt.patient_id, appointment_id: apt.id, reminder_type: null, notification_type: null } }]; }",
]


def fix_js_code(js_code):
    changed = False
    for old, new in zip(OLD_PATTERNS, NEW_LINES):
        if old in js_code:
            js_code = js_code.replace(old, new)
            changed = True
    return js_code, changed


def fix_nodes(nodes):
    count = 0
    for node in nodes:
        params = node.get("parameters", {})
        if "jsCode" in params:
            new_js, changed = fix_js_code(params["jsCode"])
            if changed:
                params["jsCode"] = new_js
                count += 1
    return nodes, count


def patch_json_file(path):
    print(f"\n=== Patching source JSON: {path} ===")
    with open(path, "r", encoding="utf-8") as f:
        wf = json.load(f)
    for node in wf["nodes"]:
        if node.get("id") == "prepare-rdv":
            js = node["parameters"]["jsCode"]
            new_js, changed = fix_js_code(js)
            if changed:
                node["parameters"]["jsCode"] = new_js
                with open(path, "w", encoding="utf-8") as f:
                    json.dump(wf, f, indent=2, ensure_ascii=False)
                print("  ✓ Source JSON fixed and saved.")
            else:
                print("  Already fixed.")
            return changed
    print("  ✗ Node 'prepare-rdv' not found!")
    return False


def patch_sqlite_db(db_path, workflow_id="TuKvVdtren4w6HHM", node_id="prepare-rdv"):
    print(f"\n=== Patching SQLite DB: {db_path} ===")
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    # 1) workflow_entity (draft)
    cur.execute("SELECT nodes FROM workflow_entity WHERE id=?", (workflow_id,))
    row = cur.fetchone()
    if row and row[0]:
        nodes, count = fix_nodes(json.loads(row[0]))
        if count > 0:
            cur.execute("UPDATE workflow_entity SET nodes=? WHERE id=?",
                        (json.dumps(nodes, ensure_ascii=False), workflow_id))
            print(f"  ✓ workflow_entity patched ({count} node(s)).")
        else:
            print("  workflow_entity already clean.")

    # 2) workflow_entity activeVersionId + workflow_history (all versions)
    cur.execute("SELECT activeVersionId FROM workflow_entity WHERE id=?", (workflow_id,))
    av = cur.fetchone()
    active_vid = av[0] if av else None
    print(f"  Active version: {active_vid}")

    cur.execute("SELECT versionId, nodes FROM workflow_history WHERE workflowId=?", (workflow_id,))
    rows = cur.fetchall()
    for vid, nodes_raw in rows:
        if not nodes_raw:
            continue
        nodes, count = fix_nodes(json.loads(nodes_raw))
        if count > 0:
            cur.execute("UPDATE workflow_history SET nodes=? WHERE workflowId=? AND versionId=?",
                        (json.dumps(nodes, ensure_ascii=False), workflow_id, vid))
            tag = "ACTIVE" if vid == active_vid else "historical"
            print(f"  ✓ workflow_history versionId={vid[:8]}... patched ({tag}, {count} node(s)).")

    conn.commit()
    conn.close()


def verify_db(db_path, workflow_id="TuKvVdtren4w6HHM", node_id="prepare-rdv"):
    print(f"\n=== Verifying: {db_path} ===")
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    # Check active version
    cur.execute("SELECT activeVersionId FROM workflow_entity WHERE id=?", (workflow_id,))
    row = cur.fetchone()
    if not row or not row[0]:
        print("  ✗ Cannot find active version.")
        conn.close()
        return
    active_vid = row[0]

    cur.execute(
        "SELECT nodes FROM workflow_history WHERE workflowId=? AND versionId=?",
        (workflow_id, active_vid),
    )
    row = cur.fetchone()
    if row and row[0]:
        nodes = json.loads(row[0])
        for n in nodes:
            if n.get("id") == node_id and "jsCode" in n.get("parameters", {}):
                js = n["parameters"]["jsCode"]
                has_bug = "return [];" in js
                status = "BUGGY" if has_bug else "FIXED"
                print(f"  Active version prepare-rdv: {status}")

    # Check all versions
    cur.execute("SELECT versionId, nodes FROM workflow_history WHERE workflowId=?", (workflow_id,))
    buggy = []
    for vid, nodes_raw in cur.fetchall():
        if not nodes_raw:
            continue
        for n in json.loads(nodes_raw):
            if n.get("id") == node_id and "jsCode" in n.get("parameters", {}):
                if "return [];" in n["parameters"]["jsCode"]:
                    buggy.append(f"{vid[:8]}...")
    if buggy:
        print(f"  ⚠ Buggy versions: {buggy}")
    else:
        print("  All versions clean.")
    conn.close()


if __name__ == "__main__":
    patch_json_file(r"backend\n8n\workflows\appointment-reminders-with-notifications.json")
    if len(sys.argv) > 1:
        db_path = sys.argv[1]
        if db_path != "verify-only":
            patch_sqlite_db(db_path)
            verify_db(db_path)
        else:
            verify_db(r"c:\Users\Aziz\Desktop\med\_verify\n8n_container.sqlite")