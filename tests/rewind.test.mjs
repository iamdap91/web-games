import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LaboratoryGame, Player } from '../dist/src/games/laboratory/game.js';
import { recordedFrame } from '../dist/src/games/laboratory/rewind-renderer.js';
const dt = 1 / 120;
function advance(game, seconds, direction = 0) {
  for (let t = 0; t < seconds; t += dt) game.update(dt, direction);
}
function recordUntilRewind(game) {
  const poses = [];
  for (let tick = 0; tick < 1800; tick++) {
    // 바닥 보행과 공중 궤적, 플래시 잔상을 모두 포함하는 입력이다.
    if (tick % 80 === 0 || tick % 80 === 15) game.jump(1);
    game.update(dt, 1);
    poses.push(game.snapshot.player);
    if (game.snapshot.rewind.rewinding) return poses;
  }
  throw new Error('되감기가 발동하지 않았다');
}
function near(a, b) {
  assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);
}
test('실제 점프와 플래시 궤적을 2.5배속 역재생하며 방향 입력으로 덮어쓰지 않는다', () => {
  const game = new LaboratoryGame();
  game.reset('time-rewind');
  const poses = recordUntilRewind(game);
  assert.ok(poses.some((p) => p.flashRemaining > 0));
  for (let i = 1; i <= 25; i++) {
    game.face(-1);
    game.jump(-1);
    game.update(dt * 2, -1);
    const actual = game.snapshot.player;
    const expected = poses[poses.length - 1 - i * 5];
    near(actual.x, expected.x);
    near(actual.y, expected.y);
    near(actual.motionElapsed, expected.motionElapsed);
    assert.equal(actual.facing, expected.facing);
    assert.equal(actual.motion, expected.motion);
    near(actual.flashRemaining, expected.flashRemaining);
  }
});
test('물리 기록을 복원하면 공중 속도와 남은 플래시를 같은 궤적으로 이어간다', () => {
  const original = new Player();
  original.jump(1);
  original.update(0.1, 1);
  original.jump(1);
  original.update(0.06, 1);
  const restored = new Player();
  restored.rewindTo(original.captureMotion());
  for (let i = 0; i < 70; i++) {
    original.update(dt, -1);
    restored.update(dt, -1);
    assert.deepEqual(restored.snapshot, original.snapshot);
  }
});
test('반복 되감기는 새 조작만 기록하고 누른 방향을 이어받아 결국 탈출한다', () => {
  const game = new LaboratoryGame();
  game.reset('time-rewind');
  while (!game.snapshot.rewind.rewinding) game.update(dt, 1);
  let rewinding = true;
  const returnPoints = [];
  let warned = false;
  for (let tick = 0; tick < 4000 && game.snapshot.phase === 'playing'; tick++) {
    game.update(dt, -1);
    const state = game.snapshot;
    warned ||= state.rewind.warning > 0;
    if (rewinding && !state.rewind.rewinding) returnPoints.push(state.player.x);
    rewinding = state.rewind.rewinding;
  }
  assert.ok(warned);
  assert.ok(returnPoints.length >= 2);
  for (let i = 1; i < returnPoints.length; i++)
    assert.ok(returnPoints[i] < returnPoints[i - 1] - 200);
  assert.equal(game.snapshot.phase, 'transition');
  advance(game, 0.6);
  assert.equal(game.snapshot.progress, 1);
  assert.equal(game.snapshot.rewind.active, false);
  assert.deepEqual(game.snapshot.encountered, ['time-rewind']);
});
test('개발 재선택과 8번 방은 재생 기록과 입력 잠금을 초기화한다', () => {
  for (const preview of [false, true]) {
    const game = new LaboratoryGame();
    game.reset('time-rewind');
    recordUntilRewind(game);
    if (preview) game.previewExit();
    else game.reset('normal');
    advance(game, 0.6);
    assert.equal(game.snapshot.rewind.active, false);
    assert.equal(game.snapshot.rewind.cycles, 0);
    assert.deepEqual(game.snapshot.rewind.echoes, []);
    const x = game.snapshot.player.x;
    advance(game, 0.1, 1);
    assert.ok(game.snapshot.player.x > x);
  }
});
test('기록된 모션 시간으로 같은 애니메이션 프레임을 거꾸로 선택한다', () => {
  const frames = [
    { durationSeconds: 0.1 },
    { durationSeconds: 0.2 },
    { durationSeconds: 0.1 },
  ];
  const assets = { animations: new Map([['move', { frames }]]) };
  assert.equal(
    recordedFrame(assets, { motion: 'move', motionElapsed: 0.35 }, frames[0]),
    frames[2],
  );
  assert.equal(
    recordedFrame(assets, { motion: 'move', motionElapsed: 0.25 }, frames[0]),
    frames[1],
  );
  assert.equal(
    recordedFrame(assets, { motion: 'move', motionElapsed: 0.05 }, frames[0]),
    frames[0],
  );
});
