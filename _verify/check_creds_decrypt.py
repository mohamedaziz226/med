"""Compare credentials_entity across DB copies and attempt n8n-style decryption.

n8n cipher (core/src/encryption/cipher.ts):
  algo aes-256-cbc, key = sha256(secret), iv = random 16 bytes,
  format: base64(iv):base64(ciphertext)
"""
import base64
import hashlib
import json
import sqlite3
import sys

DB = sys.argv[1] if len(sys.argv) > 1 else r"c:\Users\Aziz\Desktop\med\_verify\n8n_now.sqlite"
KEY = "J1kQ0c5ykuhE+ZyEBfW6EpfpquWpIrmP"


def try_decrypt(data_b64, key):
    try:
        from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
    except ImportError:
        return "no-cryptography-module"
    try:
        raw = base64.b64decode(data_b64)
        iv, ct = raw[:16], raw[16:]
        dec = Cipher(algorithms.AES(hashlib.sha256(key.encode()).digest()), modes.CBC(iv))
        d = dec.decryptor()
        pt = d.update(ct) + d.final()
        return json.loads(pt[:-pt[-1]].decode())
    except Exception as e:
        return f"FAIL: {type(e).__name__}: {e}"


conn = sqlite3.connect(DB)
cur = conn.cursor()
cur.execute("PRAGMA table_info(credentials_entity)")
print("cols:", [c[1] for c in cur.fetchall()])
cur.execute("SELECT id, name, type, data, createdAt, updatedAt FROM credentials_entity")
for cid, name, ctype, data, created, updated in cur.fetchall():
    print(f"\ncred={cid} name={name} type={ctype}")
    print(f"  created={created} updated={updated}")
    print(f"  data[:60]={data[:60]}")
    print(f"  decrypt with config key: {str(try_decrypt(data, KEY))[:120]}")
conn.close()
