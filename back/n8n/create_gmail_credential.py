"""Create the Gmail OAuth2 credential in n8n (imported, encrypted by n8n).

The secret lives ONLY in n8n's encrypted credential store — never in the repo.
This temp file is deleted right after import.
"""
import json
import os
import subprocess
import sys

CRED_PATH = r'c:\Users\Aziz\Desktop\med\backend\n8n\gmail_cred_tmp.json'

import os

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")

cred = {
    'id': 'CaiZmZzshoECZ5OO',
    'name': 'Gmail account',
    'type': 'gmailOAuth2',
    'data': {
        'clientId': CLIENT_ID,
        'clientSecret': CLIENT_SECRET,
        'grantType': 'authorizationCode',
        'authUrl': 'https://accounts.google.com/o/oauth2/v2/auth',
        'tokenUrl': 'https://oauth2.googleapis.com/token',
        'scope': (
            'https://www.googleapis.com/auth/gmail.labels '
            'https://www.googleapis.com/auth/gmail.addons.current.action.compose '
            'https://mail.google.com/ '
            'https://www.googleapis.com/auth/gmail.addons.current.message.action '
            'https://www.googleapis.com/auth/gmail.addons.execute '
            'https://www.googleapis.com/auth/gmail.modify '
            'https://www.googleapis.com/auth/gmail.basic '
            'https://www.googleapis.com/auth/gmail.metadata'
        ),
        'authQueryParameters': 'access_type=offline&prompt=consent',
        'authentication': 'body',
        'oauthTokenData': {},
    },
}

with open(CRED_PATH, 'w', encoding='utf-8') as f:
    json.dump([cred], f, indent=2)
print('temp credential file written (deleted after import)')

subprocess.run([
    'docker', 'cp', CRED_PATH, 'backend-n8n-1:/tmp/gmail_cred.json'
], check=True)

res = subprocess.run(
    ['docker', 'exec', 'backend-n8n-1', 'n8n', 'import:credentials',
     '--input=/tmp/gmail_cred.json'],
    capture_output=True, text=True)
print(res.stdout.strip()[-300:])
if res.returncode != 0:
    print('STDERR:', res.stderr.strip()[-500:])
    sys.exit(1)

# delete secret from container AND host immediately
subprocess.run(['docker', 'exec', 'backend-n8n-1', 'sh', '-c',
                'rm -f /tmp/gmail_cred.json'], check=True)
os.remove(CRED_PATH)
print('secret files deleted (container + host)')
