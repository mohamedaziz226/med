import sqlite3, os, json

db = os.environ['TEMP'] + r'\n8n_deploy\database.sqlite'
con = sqlite3.connect(db)
cur = con.cursor()
print('WFS:')
for r in cur.execute("SELECT id, active, versionId, activeVersionId FROM workflow_entity WHERE id IN ('TESTdebtWF0001','cIIOrjdhNGTPjwfJ')").fetchall():
    print(' ', r)
print('NODES (TEST):')
row = cur.execute("SELECT nodes FROM workflow_entity WHERE id='TESTdebtWF0001'").fetchone()
nodes = json.loads(row[0])
for n in nodes:
    t = n.get('type', '')
    params = n.get('parameters', {})
    extra = ''
    if n.get('name') == 'Calculate Debt':
        extra = f" typeVersion={n.get('typeVersion')} mode={params.get('mode')}"
    if t == 'n8n-nodes-base.emailSend':
        extra = f" creds={n.get('credentials')}"
    if 'jsonBody' in params:
        extra = ' jsonBody=' + params['jsonBody'].replace('\n', '\\n')
    print(f"  {n['name']} | {t}{extra}")
print('WAL after one-shot:', [f for f in os.listdir(os.environ['TEMP'] + r'\n8n_deploy') if 'database' in f])
con.close()