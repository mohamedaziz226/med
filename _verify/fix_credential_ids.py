"""Fix Gmail credential ID mismatch in n8n workflows.

The workflow nodes reference credential ID 'CaiZmZzshoECZ5OO' (old, lost)
but the actual Gmail credential in the DB has ID 'zDNxc43cvYUrbJe9'.

Patches:
  1. Source JSON files (both RDV and DEBT workflows)
  2. SQLite DB: workflow_entity.nodes + all workflow_history versions
"""
import json
import sqlite3
import os

OLD_CRED_ID = "CaiZmZzshoECZ5OO"
NEW_CRED_ID = "zDNxc43cvYUrbJe9"

# Workflow file configs
WORKFLOWS = [
    ("TuKvVdtren4w6HHM", "prepare-rdv", "gmail-rdv", r"backend\n8n\workflows\appointment-reminders-with-notifications.json"),
    ("cIIOrjdhNGTPjwfJ", "prepare-debt", "gmail-debt", r"backend\n8n\workflows\debt-reminders-with-notifications.json"),
]


def fix_node_credentials(node):
    """Fix credential ID in a single node. Returns True if changed."""
    creds = node.get("credentials", {})
    if "gmailOAuth2" in creds:
        cred = creds["gmailOAuth2"]
        if cred.get("id") == OLD_CRED_ID:
            cred["id"] = NEW_CRED_ID
            return True
    return False


def fix_nodes_list(nodes):
    """Fix all nodes in a list. Returns count of fixed nodes."""
    count = 0
    for node in nodes:
        if fix_node_credentials(node):
            count += 1
            print(f"    ✓ Fixed credential in node '{node.get('name')}' (id={node.get('id')})")
    return count


def patch_json_files():
    print("=== Patching source JSON files ===\n")
    for wid, _, gmail_node_id, json_path in WORKFLOWS:
        label = "RDV" if "appointment" in json_path else "DEBT"
        print(f"[{label}] {json_path}")
        with open(json_path, "r", encoding="utf-8") as f:
            wf = json.load(f)

        changed = False
        for node in wf["nodes"]:
            if fix_node_credentials(node):
                changed = True

        if changed:
            with open(json_path, "w", encoding="utf-8") as f:
                json.dump(wf, f, indent=2, ensure_ascii=False)
            print(f"  ✓ Saved {label} workflow JSON")
        else:
            print(f"  Already correct or not found")
        print()


def patch_sqlite_db(db_path):
    """Patch credential IDs in both workflow_entity and workflow_history."""
    print(f"=== Patching SQLite DB: {db_path} ===\n")
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    for wid, _, gmail_node_id, _ in WORKFLOWS:
        label = "RDV" if wid == "TuKvVdtren4w6HHM" else "DEBT"
        print(f"[{label}] workflow {wid}")

        # 1) workflow_entity
        cur.execute("SELECT nodes FROM workflow_entity WHERE id=?", (wid,))
        row = cur.fetchone()
        if row and row[0]:
            nodes = json.loads(row[0])
            count = fix_nodes_list(nodes)
            if count > 0:
                cur.execute(
                    "UPDATE workflow_entity SET nodes=? WHERE id=?",
                    (json.dumps(nodes, ensure_ascii=False), wid),
                )
                print(f"  ✓ workflow_entity patched ({count} node(s))")
            else:
                print(f"  workflow_entity already correct")
        else:
            print(f"  ✗ workflow_entity not found")

        # 2) workflow_history (all versions)
        cur.execute("SELECT versionId, nodes FROM workflow_history WHERE workflowId=?", (wid,))
        rows = cur.fetchall()
        total_fixed = 0
        for vid, nodes_raw in rows:
            if not nodes_raw:
                continue
            nodes = json.loads(nodes_raw)
            before = sum(1 for n in nodes if n.get("credentials", {}).get("gmailOAuth2", {}).get("id") == OLD_CRED_ID)
            if before > 0:
                fix_nodes_list(nodes)
                cur.execute(
                    "UPDATE workflow_history SET nodes=? WHERE workflowId=? AND versionId=?",
                    (json.dumps(nodes, ensure_ascii=False), wid, vid),
                )
                total_fixed += before
        if total_fixed > 0:
            print(f"  ✓ workflow_history patched ({total_fixed} node(s) across versions)")
        else:
            print(f"  workflow_history already correct")
        print()

    conn.commit()
    conn.close()


def verify_db(db_path):
    """Verify no old credential ID remains in any workflow version."""
    print(f"=== Verifying: {db_path} ===\n")
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    for wid, _, _, _ in WORKFLOWS:
        label = "RDV" if wid == "TuKvVdtren4w6HHM" else "DEBT"

        # Check workflow_entity
        cur.execute("SELECT nodes FROM workflow_entity WHERE id=?", (wid,))
        row = cur.fetchone()
        if row and row[0]:
            nodes = json.loads(row[0])
            found = any(
                n.get("credentials", {}).get("gmailOAuth2", {}).get("id") == OLD_CRED_ID
                for n in nodes
            )
            print(f"  [{label}] workflow_entity: old cred present = {found}")

        # Check all history versions
        cur.execute("SELECT versionId, nodes FROM workflow_history WHERE workflowId=?", (wid,))
        buggy = []
        for vid, nodes_raw in cur.fetchall():
            if not nodes_raw:
                continue
            nodes = json.loads(nodes_raw)
            for n in nodes:
                if n.get("credentials", {}).get("gmailOAuth2", {}).get("id") == OLD_CRED_ID:
                    buggy.append(f"{vid[:8]}...")
        if buggy:
            print(f"  [{label}] ⚠ Buggy versions: {buggy}")
        else:
            print(f"  [{label}] All versions clean ✅")

    conn.close()


if __name__ == "__main__":
    patch_json_files()

    import sys
    if len(sys.argv) > 1:
        db_path = sys.argv[1]
        if db_path != "verify-only":
            patch_sqlite_db(db_path)
        verify_db(db_path)