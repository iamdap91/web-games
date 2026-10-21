import hashlib
import json
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image

root = Path('/Users/3sam3/.codex/worktrees/ataho-grab-motions/web-games')
record_path = root / 'resources/ataho-v2-grab-motion-refinement.json'
record = json.loads(record_path.read_text())
base = root / 'public/assets/maplestory/ataho-v2-grabs/20261021/refinement-r2'
results = {v['id']: v for v in record.get('results', [])}

def download_frame(arguments):
    index, url, directory = arguments
    path = directory / f'{index:03d}.png'
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        path.write_bytes(urllib.request.urlopen(url, timeout=120).read())
    raw = path.read_bytes()
    with Image.open(path) as source:
        return {'index': index, 'sourceUrl': url, 'localPath': str(path.relative_to(root)),
                'sha256': hashlib.sha256(raw).hexdigest(), 'byteSize': len(raw),
                'width': source.width, 'height': source.height,
                'alphaBounds': source.convert('RGBA').getchannel('A').getbbox()}

for job in record['jobs']:
    completion = job.get('latest') or {}
    if completion.get('status') != 'completed':
        continue
    urls = completion.get('download_urls') or [completion['download_url']]
    directory = base / job['technique'] / job['direction'] / 'originals' / job['stage']
    with ThreadPoolExecutor(max_workers=6) as executor:
        frames = list(executor.map(download_frame, [(index, url, directory) for index, url in enumerate(urls)]))
    results[job['id']] = {'id': job['id'], 'technique': job['technique'], 'direction': job['direction'],
                          'stage': job['stage'], 'jobId': completion['job_id'],
                          'chargedGenerations': completion.get('charged_generations'), 'frames': frames}
record['results'] = list(results.values())
record_path.write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'jobs': len(results), 'frames': sum(len(v['frames']) for v in results.values()),
                  'lastPaths': [v['frames'][-1]['localPath'] for v in results.values()]}, ensure_ascii=False))
