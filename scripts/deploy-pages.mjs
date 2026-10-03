import { execFileSync } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { cwd } from 'node:process';
import { log } from 'node:console';

const root = cwd();
const site = resolve(root, 'site');
const branch = 'gh-pages';

function git(directory, args) {
  return execFileSync('git', args, {
    cwd: directory,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  }).trim();
}

for (const file of ['index.html', '.nojekyll']) {
  if (!(await stat(join(site, file))).isFile()) {
    throw new Error('먼저 npm run build:pages를 실행하세요.');
  }
}

const remote = git(root, ['remote', 'get-url', '--push', 'origin']);
const revision = git(root, ['rev-parse', '--short', 'HEAD']);
const name = git(root, ['config', 'user.name']);
const email = git(root, ['config', 'user.email']);
const existing = git(root, [
  'ls-remote',
  '--heads',
  remote,
  `refs/heads/${branch}`,
]);
const staging = await mkdtemp(join(tmpdir(), 'web-games-pages-'));

try {
  // 소스 워크트리와 독립된 저장소에서 배포 브랜치의 이력만 이어 간다.
  git(staging, ['init', '--initial-branch', branch]);
  git(staging, ['config', 'user.name', name]);
  git(staging, ['config', 'user.email', email]);
  git(staging, ['remote', 'add', 'origin', remote]);
  if (existing) {
    git(staging, ['fetch', '--depth=1', 'origin', branch]);
    git(staging, ['checkout', '-B', branch, 'FETCH_HEAD']);
  }

  const cname = await readFile(join(staging, 'CNAME'), 'utf8').catch(
    () => null,
  );
  git(staging, ['rm', '-r', '-f', '--ignore-unmatch', '.']);
  await cp(site, staging, { recursive: true });
  if (cname !== null) await writeFile(join(staging, 'CNAME'), cname);
  git(staging, ['add', '--all']);

  if (!git(staging, ['status', '--porcelain'])) {
    log('배포된 파일과 동일합니다. 새 커밋을 만들지 않습니다.');
  } else {
    git(staging, ['commit', '-m', `deploy(pages): 게임 배포 (${revision})`]);
    // 동시 배포가 있으면 일반 push가 실패하므로 다른 배포를 덮어쓰지 않는다.
    git(staging, ['push', 'origin', `HEAD:refs/heads/${branch}`]);
    log(
      'gh-pages 푸시 완료. GitHub Pages의 게시 상태는 저장소 Actions에서 확인하세요.',
    );
  }
} finally {
  await rm(staging, { recursive: true, force: true });
}
