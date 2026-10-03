import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { cwd } from 'node:process';
import { log } from 'node:console';

const root = cwd();
const output = resolve(root, 'site');
const game = 'src/games/laboratory';
const manifest = JSON.parse(
  await readFile(resolve(root, 'dist/resources/manifest.json'), 'utf8'),
);

function collectResourcePaths(value, paths = new Set()) {
  if (!value || typeof value !== 'object') return paths;
  for (const [key, child] of Object.entries(value)) {
    if (key === 'localPath') {
      if (
        typeof child !== 'string' ||
        !child.startsWith('public/assets/maplestory/') ||
        child.split('/').includes('..') ||
        child.includes('\\')
      ) {
        throw new Error(`리소스 경로가 올바르지 않습니다: ${child}`);
      }
      paths.add(child);
    } else {
      collectResourcePaths(child, paths);
    }
  }
  return paths;
}

const paths = collectResourcePaths(manifest);
if (paths.size === 0) throw new Error('배포할 리소스가 없습니다.');

// 누락된 파일이 있으면 기존 배포 결과를 지우기 전에 실패한다.
for (const path of paths) {
  const file = await stat(resolve(root, path)).catch(() => null);
  if (!file?.isFile()) throw new Error(`로컬 리소스가 없습니다: ${path}`);
}

const html = await readFile(resolve(root, game, 'index.html'), 'utf8');
const entry = '../../../dist/src/games/laboratory/index.js';
if (!html.includes(entry))
  throw new Error('게임 진입 스크립트를 찾지 못했습니다.');

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(resolve(root, 'dist'), resolve(output, 'dist'), { recursive: true });
await cp(resolve(root, game, 'style.css'), resolve(output, 'style.css'));
await writeFile(
  resolve(output, 'index.html'),
  html.replace(entry, './dist/src/games/laboratory/index.js'),
);
await writeFile(resolve(output, '.nojekyll'), '');

for (const path of paths) {
  const destination = resolve(output, path);
  await mkdir(dirname(destination), { recursive: true });
  await cp(resolve(root, path), destination);
}

log(`GitHub Pages 빌드 완료: site/ (리소스 ${paths.size}개)`);
