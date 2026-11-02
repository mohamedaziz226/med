"""Inspect run data for recent n8n executions."""
import sqlite3
import json
import zlib
import gzip
import base64


def try_decompress(s):
    """n8n compresses run data: '<level>:<payload>'."""
    if ':' not in s[:4]:
        return s
    level, payload = s.split(':', 1)
    print(f'  [compressed data, level={level}, len={len(payload)}]')
    raw = base64.b64decode(payload) if ',' in payload or '+' in payload or payload.endswith('==') else payload.encode()
    for name, fn in [
        ('zlib', lambda b: zlib.decompress(b)),
        ('gzip', lambda b: gzip.decompress(b)),
        ('zlib-raw', lambda b: zlib.decompressobj(-15).decompress(b)),
    ]:
        try:
            out = fn(raw)
            print(f'  decompressed with {name}')
            return json.loads(out)
        except Exception:
            continue
    try:
        import brotli  # type: ignore
        out = brotli.decompress(raw)
        print('  decompressed with brotli')
        return json.loads(out)
    except Exception as e:
        print('  decompress failed:', e)
        return {}

con = sqlite3.connect(r'c:\Users\Aziz\Desktop\med\backend\n8n\n8n_db_copy.sqlite')

EXEC_IDS = (6, 7, 8)

for exec_id in EXEC_IDS:
    row = con.execute(
        'SELECT data FROM execution_data WHERE executionId=?', (exec_id,)).fetchone()
    meta = con.execute(
        'SELECT workflowId, status, startedAt FROM execution_entity WHERE id=?',
        (exec_id,)).fetchone()
    print('=' * 72)
    print(f'EXEC {exec_id}: workflow={meta[0]} status={meta[1]} started={meta[2]}')
    raw = row[0]
    print('  RAW data column type:', type(raw).__name__, 'first 200:', str(raw)[:200])
    if isinstance(raw, (bytes, memoryview)):
        print('  bytes head:', bytes(raw[:20]))
    continue
    d = json.loads(row[0])
    if isinstance(d, list):
        d = d[0] if d else {}
    if isinstance(d, str):
        d = try_decompress(d)
    rd = d.get('resultData', {})
    if isinstance(rd, str):
        print('  resultData str (first 300):', rd[:300])
        continue
    err = rd.get('error')
    if err:
        print('  WORKFLOW ERROR:', json.dumps(err)[:500])
    runs = rd.get('runData', {})
    for node_name, node_runs in runs.items():
        for r in node_runs:
            e = r.get('error')
            status = 'ERROR' if e else 'ok'
            n_out = sum(len(b.get('items', [])) for b in r.get('data', {}).get('main', []) or [])
            print(f'  node "{node_name}" [{status}] output_items={n_out}')
            if e:
                print('    ->', json.dumps(e)[:400])
