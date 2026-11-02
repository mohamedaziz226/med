import sqlite3, os

db = os.environ['TEMP'] + r'\n8n_cli\database.sqlite'
con = sqlite3.connect(db)
cur = con.cursor()
print('PUBVERSIONS:')
for r in cur.execute('SELECT * FROM workflow_published_version').fetchall():
    print(' ', r)
print('WFS:')
for r in cur.execute("SELECT id, active, activeVersionId, versionId FROM workflow_entity WHERE id IN ('TESTdebtWF0001','cIIOrjdhNGTPjwfJ')").fetchall():
    print(' ', r)
print('WEBHOOKS:')
for r in cur.execute('SELECT * FROM webhook_entity').fetchall():
    print(' ', r)
con.close()