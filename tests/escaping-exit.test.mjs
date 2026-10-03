import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LaboratoryGame } from '../dist/src/games/laboratory/game.js';
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

test('문은 최대 세 번만 피하고 보행으로도 잡을 수 있으며 원래 왼쪽 경계는 출구가 아니다', () => {
  const game = new LaboratoryGame();
  game.reset('escaping-exit');
  until(game, (s) => s.player.x <= 55, -1);
  assert.equal(game.snapshot.phase, 'playing');
  until(game, (s) => s.phase === 'transition', -1);
  assert.equal(game.snapshot.exit.phase, 'caught');
  assert.ok(game.snapshot.exit.attempts <= 3);
  assert.ok(game.snapshot.player.x < 0);
  advance(game, 0.6);
  assert.equal(game.snapshot.progress, 1);
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
