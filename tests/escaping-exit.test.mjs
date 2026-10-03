import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LaboratoryGame } from '../dist/src/games/laboratory/game.js';
import { roomCameraPosition } from '../dist/src/games/laboratory/spatial-rules.js';
const dt = 1 / 120;
function advance(game, seconds, direction = 0) {
  for (let t = 0; t < seconds; t += dt) game.update(dt, direction);
}
function until(game, predicate, direction, seconds = 12) {
  for (let t = 0; t < seconds && !predicate(game.snapshot); t += dt)
    game.update(dt, direction);
  assert.ok(predicate(game.snapshot));
}
function start() {
  const game = new LaboratoryGame();
  game.reset('escaping-exit');
  return game;
}
function revealRight(game) {
  until(game, (s) => s.rightExit.revealed, 1);
}
function returnToLeft() {
  const game = start();
  revealRight(game);
  until(game, (s) => s.player.x <= 500, -1);
  return game;
}
function flashToward(game, direction) {
  game.jump(direction);
  advance(game, 0.08, direction);
  game.jump(direction);
  for (let t = 0; t < 0.6 && game.snapshot.phase === 'playing'; t += dt)
    game.update(dt, direction);
}

test('오른쪽 문이 먼저 달아나고, 귀환해 접근해야 왼쪽 문도 움직인다', () => {
  const game = start();
  until(game, (s) => s.player.x >= 1900, 1);
  assert.equal(game.snapshot.exit.x, 203);
  assert.equal(game.snapshot.rightExit.x, 2243);
  assert.deepEqual(game.snapshot.encountered, []);
  revealRight(game);
  advance(game, 0.3);
  assert.ok(game.snapshot.rightExit.x > 2243);
  assert.equal(game.snapshot.exit.x, 203);
  assert.equal(game.snapshot.exit.revealed, false);
  assert.deepEqual(game.snapshot.encountered, ['escaping-exit']);
  until(game, (s) => s.player.x <= 500, -1);
  assert.equal(game.snapshot.exit.x, 203);
  assert.equal(game.snapshot.exit.phase, 'idle');
  until(game, (s) => s.exit.phase === 'resting', -1);
  assert.ok(game.snapshot.exit.x < 203);
});

test('오른쪽 이상을 보기 전에는 왼쪽 문이 피하지 않고 기존 귀환 경계를 유지한다', () => {
  const game = start();
  until(game, (s) => s.phase === 'transition', -1);
  assert.equal(game.snapshot.exit.phase, 'idle');
  assert.equal(game.snapshot.rightExit.phase, 'idle');
  assert.deepEqual(game.snapshot.encountered, []);
  advance(game, 0.6);
  assert.equal(game.snapshot.progress, 1);
});

test('귀로의 문은 한두 번에 잡히지 않고 연속 플래시점프 약 세 번으로 잡힌다', () => {
  for (const delay of [0, 0.04, 0.08, 0.12]) {
    const game = returnToLeft();
    let flashes = 0;
    let airborne = 0;
    for (let t = 0; t < 8 && game.snapshot.phase === 'playing'; t += dt) {
      if (game.snapshot.player.grounded) {
        game.jump(-1);
        airborne = 0;
      }
      if (airborne >= delay && game.snapshot.player.flashAvailable) {
        game.jump(-1);
        flashes++;
      }
      airborne += dt;
      game.update(dt, -1);
      if (flashes < 3) assert.equal(game.snapshot.phase, 'playing');
    }
    assert.equal(game.snapshot.phase, 'transition');
    assert.equal(game.snapshot.exit.phase, 'caught');
    assert.ok(flashes >= 3 && flashes <= 4, `${delay}: ${flashes}번`);
  }
});

test('물러나면 왼쪽 문이 돌아오며 복귀 중 접촉하면 다음 방으로 간다', () => {
  const game = returnToLeft();
  until(game, (s) => s.exit.phase === 'resting', -1);
  const away = game.snapshot.exit.x;
  until(game, (s) => s.exit.phase === 'returning', 1);
  advance(game, 0.35);
  assert.ok(game.snapshot.exit.x > away);
  for (let i = 0; i < 4 && game.snapshot.phase === 'playing'; i++)
    flashToward(game, -1);
  assert.equal(game.snapshot.exit.phase, 'caught');
  advance(game, 0.6);
  assert.equal(game.snapshot.progress, 1);
  assert.equal(game.snapshot.exit.x, 203);
  assert.equal(game.snapshot.rightExit.x, 2243);
  assert.equal(game.snapshot.exit.attempts, 0);
  assert.equal(game.snapshot.rightExit.attempts, 0);
});

test('양쪽 모두 보행으로는 끝없이 도망가고 카메라와 통로가 이어진다', () => {
  for (const direction of [-1, 1]) {
    const game = direction === -1 ? returnToLeft() : start();
    for (let i = 0; i < 90; i++) {
      advance(game, 1, direction);
      if (i % 2 === 0) advance(game, 0.4);
      assert.equal(game.snapshot.phase, 'playing');
      const door =
        direction === -1 ? game.snapshot.exit : game.snapshot.rightExit;
      assert.ok((door.x - game.snapshot.player.x) * direction > 64);
    }
    assert.ok(game.snapshot.player.x * direction > 20000);
    const door =
      direction === -1 ? game.snapshot.exit : game.snapshot.rightExit;
    assert.ok(door.attempts > 50);
    const camera = roomCameraPosition(game.snapshot);
    assert.ok(game.snapshot.player.x - camera > 50);
    assert.ok(game.snapshot.player.x - camera < 950);
    assert.ok(door.x - camera > 0 && door.x - camera < 1000);
    until(
      game,
      (s) => (direction === -1 ? s.exit : s.rightExit).phase === 'resting',
      0,
    );
    until(
      game,
      (s) => (direction === -1 ? s.exit : s.rightExit).phase === 'returning',
      -direction,
    );
    advance(game, 0.3);
    for (let i = 0; i < 5 && game.snapshot.phase === 'playing'; i++)
      flashToward(game, direction);
    assert.equal(game.snapshot.phase, 'transition');
    advance(game, 1.6);
    assert.equal(game.snapshot.progress, direction === -1 ? 1 : 0);
    assert.equal(game.snapshot.player.x, 360);
    assert.equal(roomCameraPosition(game.snapshot), 0);
  }
});

test('오른쪽 문을 잡으면 오답으로 0번 방에 돌아간다', () => {
  const game = start();
  until(game, (s) => s.phase === 'transition', -1);
  advance(game, 0.6);
  assert.equal(game.snapshot.progress, 1);
  until(game, (s) => s.player.x >= 1950, 1);
  for (let i = 0; i < 8 && game.snapshot.phase === 'playing'; i++)
    flashToward(game, 1);
  assert.equal(game.snapshot.rightExit.phase, 'caught');
  advance(game, 1.6);
  assert.equal(game.snapshot.progress, 0);
});

test('재선택과 8번 미리보기는 양쪽 문과 발동 순서를 초기화한다', () => {
  for (const preview of [false, true]) {
    const game = returnToLeft();
    until(game, (s) => s.exit.phase === 'fleeing', -1);
    if (preview) {
      game.previewExit();
      advance(game, 0.6);
    } else game.reset('normal');
    assert.equal(game.snapshot.exit.phase, 'idle');
    assert.equal(game.snapshot.exit.x, 203);
    assert.equal(game.snapshot.rightExit.phase, 'idle');
    assert.equal(game.snapshot.rightExit.x, 2243);
    assert.equal(game.snapshot.progress, preview ? 8 : 0);
  }
});
