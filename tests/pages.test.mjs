import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { execPath } from 'node:process';
import { URL } from 'node:url';
import test from 'node:test';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'web-games-pages-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const path of ['scripts/build-pages.mjs', 'scripts/deploy-pages.mjs']) {
    await mkdir(join(root, 'scripts'), { recursive: true });
    await cp(new URL(`../${path}`, import.meta.url), join(root, path));
  }
  const files = {
    'src/games/laboratory/index.html':
      '<link href="./style.css"><script type="module" src="../../../dist/src/games/laboratory/index.js"></script>',
    'src/games/laboratory/style.css': 'canvas { display: block; }',
    'dist/src/games/laboratory/index.js': 'export const ready = true;',
    'dist/resources/manifest.json': JSON.stringify({
      assets: [{ localPath: 'public/assets/maplestory/test.png' }],
    }),
    'public/assets/maplestory/test.png': 'test image',
    'public/assets/maplestory/private-metadata.json': 'not for deployment',
    '.gitignore': 'public/\nsite/\ndist/\n',
  };
  for (const [path, content] of Object.entries(files)) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), content);
  }
  return root;
}

function run(root, script) {
  return execFileSync(execPath, [`scripts/${script}.mjs`], {
    cwd: root,
    encoding: 'utf8',
  });
}

function git(root, ...args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

test('Pages 빌드는 Git 제외 리소스를 포함하고 원본 메타데이터를 제외한다', async (t) => {
  const root = await fixture(t);
  run(root, 'build-pages');
  const html = await readFile(join(root, 'site/index.html'), 'utf8');
  assert.match(html, /src="\.\/dist\/src\/games\/laboratory\/index.js"/);
  assert.equal(
    await readFile(
      join(root, 'site/public/assets/maplestory/test.png'),
      'utf8',
    ),
    'test image',
  );
  assert.equal(await readFile(join(root, 'site/.nojekyll'), 'utf8'), '');
  await assert.rejects(
    readFile(join(root, 'site/public/assets/maplestory/private-metadata.json')),
  );
  await assert.rejects(
    readFile(join(root, 'site/src/games/laboratory/index.html')),
  );
});

test('리소스가 누락되면 기존 Pages 결과를 보존하고 빌드를 중단한다', async (t) => {
  const root = await fixture(t);
  run(root, 'build-pages');
  await rm(join(root, 'public/assets/maplestory/test.png'));
  const result = spawnSync(execPath, ['scripts/build-pages.mjs'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /로컬 리소스가 없습니다/);
  assert.equal(
    await readFile(
      join(root, 'site/public/assets/maplestory/test.png'),
      'utf8',
    ),
    'test image',
  );
});

test('Pages 첫 배포와 재배포는 main을 보존하고 gh-pages 이력을 이어 간다', async (t) => {
  const root = await fixture(t);
  const remote = join(root, 'remote.git');
  git(root, 'init', '--bare', remote);
  git(root, 'init', '--initial-branch', 'main');
  git(root, 'config', 'user.name', 'Pages Test');
  git(root, 'config', 'user.email', 'pages@example.invalid');
  git(root, 'remote', 'add', 'origin', remote);
  git(root, 'add', 'scripts', 'src', '.gitignore');
  git(root, 'commit', '-m', 'test: initial source');
  git(root, 'push', 'origin', 'main');
  const main = git(root, 'rev-parse', 'HEAD');

  run(root, 'build-pages');
  run(root, 'deploy-pages');
  const first = git(remote, 'rev-parse', 'gh-pages');
  assert.equal(
    git(remote, 'show', 'gh-pages:public/assets/maplestory/test.png'),
    'test image',
  );
  assert.equal(
    git(remote, 'ls-tree', '--name-only', 'gh-pages'),
    '.nojekyll\ndist\nindex.html\npublic\nstyle.css',
  );
  assert.match(run(root, 'deploy-pages'), /새 커밋을 만들지 않습니다/);
  assert.equal(git(remote, 'rev-parse', 'gh-pages'), first);

  await writeFile(join(root, 'site/index.html'), '<h1>updated</h1>');
  await rm(join(root, 'site/style.css'));
  run(root, 'deploy-pages');
  assert.equal(git(remote, 'rev-parse', 'gh-pages^'), first);
  assert.equal(git(remote, 'show', 'gh-pages:index.html'), '<h1>updated</h1>');
  assert.doesNotMatch(
    git(remote, 'ls-tree', '--name-only', 'gh-pages'),
    /style.css/,
  );
  assert.equal(git(root, 'rev-parse', 'HEAD'), main);
  assert.equal(git(root, 'branch', '--show-current'), 'main');
  assert.equal(git(remote, 'rev-parse', 'main'), main);
});
