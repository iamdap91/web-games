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
function explore() {
  const game = new LaboratoryGame();
  game.reset('escaping-exit');
  until(game, (s) => s.player.x >= 1050, 1);
  return game;
}
function flashToward(game, direction) {
  game.jump(direction);
  advance(game, 0.08, direction);
  game.jump(direction);
  for (let t = 0; t < 0.6 && game.snapshot.phase === 'playing'; t += dt)
    game.update(dt, direction);
}

test('첫 접근은 한두 번에 잡히지 않고 연속 플래시점프 약 세 번으로 따라잡는다', () => {
  for (const explored of [false, true]) {
    for (const delay of [0, 0.04, 0.08, 0.12]) {
      const game = explored ? explore() : new LaboratoryGame();
      if (!explored) game.reset('escaping-exit');
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
      assert.ok(
        flashes >= 3 && flashes <= 4,
        `${explored}/${delay}: ${flashes}번`,
      );
    }
  }
});

test('탐색 중 따라온 입구는 귀환 접근에 회피하고, 번호와 함께 이동할 위치를 제공한다', () => {
  const game = explore();
  assert.ok(game.snapshot.exit.x > 203);
  assert.ok(game.snapshot.encountered.includes('escaping-exit'));
  const x = game.snapshot.exit.x;
  until(game, (s) => s.exit.phase === 'resting', -1);
  assert.ok(game.snapshot.exit.x < x);
  assert.equal(game.snapshot.phase, 'playing');
});

test('물러나면 문이 돌아오며 플래시점프로 복귀 중 문을 잡아 다음 방으로 간다', () => {
  const game = explore();
  until(game, (s) => s.exit.phase === 'resting', -1);
  const away = game.snapshot.exit.x;
  until(game, (s) => s.exit.phase === 'returning', 1);
  advance(game, 0.35);
  assert.ok(game.snapshot.exit.x > away);
  for (let i = 0; i < 3 && game.snapshot.phase === 'playing'; i++)
    flashToward(game, -1);
  assert.equal(game.snapshot.phase, 'transition');
  assert.equal(game.snapshot.exit.phase, 'caught');
  assert.ok(game.snapshot.player.x > 55);
  advance(game, 0.6);
  assert.equal(game.snapshot.progress, 1);
  assert.equal(game.snapshot.exit.x, 203);
  assert.equal(game.snapshot.exit.attempts, 0);
});

test('보행으로 오래 따라가거나 멈춰도 문과 통로가 끝없이 이어진다', () => {
  for (const pause of [false, true]) {
    const game = new LaboratoryGame();
    game.reset('escaping-exit');
    for (let i = 0; i < 90; i++) {
      advance(game, 1, -1);
      if (pause) advance(game, 0.4);
      assert.equal(game.snapshot.phase, 'playing');
      assert.equal(game.snapshot.progress, 0);
      assert.ok(game.snapshot.player.x - game.snapshot.exit.x > 64);
    }
    assert.ok(game.snapshot.player.x < -20000);
    assert.ok(game.snapshot.exit.attempts > 50);
    const camera = roomCameraPosition(game.snapshot);
    assert.ok(game.snapshot.player.x - camera >= 360);
    assert.ok(game.snapshot.player.x - camera < 650);
    assert.ok(game.snapshot.exit.x > camera);
    // 멀리 늘어난 통로에서도 복귀 중인 문을 잡아 탈출할 수 있어야 한다.
    until(game, (s) => s.exit.phase === 'resting', 0);
    until(game, (s) => s.exit.phase === 'returning', 1);
    advance(game, 0.3);
    for (let i = 0; i < 4 && game.snapshot.phase === 'playing'; i++)
      flashToward(game, -1);
    assert.equal(game.snapshot.phase, 'transition');
    assert.equal(game.snapshot.exit.phase, 'caught');
    advance(game, 0.6);
    assert.equal(game.snapshot.progress, 1);
    assert.equal(game.snapshot.player.x, 360);
    assert.equal(roomCameraPosition(game.snapshot), 0);
  }
});

test('잘못된 우측 선택은 0번으로, 재선택·8번 미리보기는 회피 상태를 정리한다', () => {
  const game = explore();
  until(game, (s) => s.phase === 'transition', 1);
  advance(game, 1.6);
  assert.equal(game.snapshot.progress, 0);
  for (const preview of [false, true]) {
    const active = explore();
    until(active, (s) => s.exit.phase === 'fleeing', -1);
    if (preview) {
      active.previewExit();
      advance(active, 0.6);
    } else active.reset('normal');
    assert.equal(active.snapshot.exit.phase, 'idle');
    assert.equal(active.snapshot.exit.x, 203);
    assert.equal(active.snapshot.progress, preview ? 8 : 0);
  }
});
