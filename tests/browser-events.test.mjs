import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LaboratoryGame } from '../dist/src/games/laboratory/game.js';
const dt = 1 / 120;
function advance(game, seconds, direction = 0) {
  for (let t = 0; t < seconds; t += dt) game.update(dt, direction);
}
function walkUntil(game, predicate, direction = 1, seconds = 15) {
  for (let t = 0; t < seconds && !predicate(game.snapshot); t += dt)
    game.update(dt, direction);
  assert.ok(predicate(game.snapshot), '예상한 상태에 도달해야 한다');
}
function start(scenario) {
  const game = new LaboratoryGame();
  game.reset(scenario);
  // 1번 방으로 들어간 뒤 위험 연출의 실제 0번 복귀를 검사한다.
  walkUntil(game, (s) => s.phase === 'transition', -1);
  advance(game, 0.6);
  assert.equal(game.snapshot.progress, 1);
  return game;
}
for (const scenario of ['page-scroll', 'image-zoom']) {
  test(`${scenario}: 발동 뒤 점프·귀환·다음 방 전환과 초기화`, () => {
    const game = start(scenario);
    walkUntil(game, (s) => s.player.x >= 1500);
    advance(game, 2.2);
    assert.notEqual(game.snapshot.page.elapsed, null);
    assert.ok(game.snapshot.encountered.includes(scenario));
    if (scenario === 'image-zoom') assert.equal(game.snapshot.page.reveal, 1);
    game.jump(-1);
    advance(game, 0.1, -1);
    assert.equal(game.snapshot.player.grounded, false);
    walkUntil(game, (s) => s.player.x < 300, -1);
    assert.ok(game.snapshot.page.departure < 0.11);
    walkUntil(game, (s) => s.phase === 'transition', -1);
    advance(game, 0.6);
    assert.equal(game.snapshot.progress, 2);
    assert.equal(game.snapshot.page.elapsed, null);
  });
}

test('선택 삭제: 삭제 전에는 닿아도 살고, 삭제 순간 영역 안에 있으면 0번 방', () => {
  const game = start('select-delete');
  walkUntil(game, (s) => s.selection.elapsed !== null);
  advance(game, 3.8);
  assert.equal(game.snapshot.phase, 'playing');
  assert.ok(game.snapshot.player.x > game.snapshot.selection.boundary);
  advance(game, 0.5);
  assert.equal(game.snapshot.phase, 'erased');
  const player = game.snapshot.player;
  game.jump(-1);
  advance(game, 0.2, -1);
  assert.deepEqual(game.snapshot.player, player);
  advance(game, 2);
  assert.equal(game.snapshot.progress, 0);
  assert.equal(game.snapshot.selection.elapsed, null);
});

test('선택 삭제: 선택 경계에서 빠져나오면 삭제 후에도 걸어서 탈출 가능', () => {
  const game = start('select-delete');
  walkUntil(game, (s) => s.selection.elapsed !== null);
  advance(game, 0.7);
  walkUntil(game, (s) => s.player.x <= 350, -1);
  advance(game, 1);
  assert.equal(game.snapshot.selection.deleted, true);
  assert.equal(game.snapshot.phase, 'playing');
  walkUntil(game, (s) => s.phase === 'transition', -1);
  advance(game, 0.6);
  assert.equal(game.snapshot.progress, 2);
});

test('로딩 표시: 입장 후에는 끌지 않다가 시간이 지나면 정지한 몸을 흡수한다', () => {
  const game = start('loading-wheel');
  const x = game.snapshot.player.x;
  advance(game, 2.9);
  assert.equal(game.snapshot.wheel.phase, 'waiting');
  assert.equal(game.snapshot.player.x, x);
  advance(game, 0.8);
  assert.equal(game.snapshot.wheel.phase, 'pulling');
  assert.ok(game.snapshot.player.x > x);
  walkUntil(game, (s) => s.wheel.phase === 'caught', 0);
  const caught = game.snapshot.player;
  game.jump(-1);
  advance(game, 0.4, -1);
  assert.deepEqual(game.snapshot.player, caught);
  assert.equal(game.snapshot.progress, 1);
  advance(game, 1.8);
  assert.equal(game.snapshot.progress, 0);
  assert.equal(game.snapshot.wheel.phase, 'waiting');
});

test('로딩 표시: 흡수에 반응해 왼쪽 플래시점프를 하면 탈출한다', () => {
  const game = start('loading-wheel');
  advance(game, 3.9);
  assert.equal(game.snapshot.wheel.phase, 'pulling');
  let jumpedAt = 0;
  for (let t = 0; t < 8 && game.snapshot.phase === 'playing'; t += dt) {
    if (game.snapshot.player.grounded) {
      game.jump(-1);
      jumpedAt = t;
    } else if (t - jumpedAt > 0.08 && game.snapshot.player.flashAvailable)
      game.jump(-1);
    game.update(dt, -1);
  }
  assert.equal(game.snapshot.phase, 'transition');
  assert.ok(game.snapshot.player.x <= 55);
  advance(game, 0.6);
  assert.equal(game.snapshot.progress, 2);
});

test('흡수 도중 재선택·출구 미리보기는 포획과 입력 잠금을 초기화한다', () => {
  for (const preview of [false, true]) {
    const game = start('loading-wheel');
    walkUntil(game, (s) => s.wheel.phase === 'caught', 0);
    if (preview) {
      game.previewExit();
      advance(game, 0.6);
    } else game.reset('normal');
    assert.equal(game.snapshot.wheel.caughtElapsed, null);
    assert.equal(game.snapshot.wheel.elapsed, 0);
    game.jump(-1);
    advance(game, 0.1);
    assert.equal(game.snapshot.player.grounded, false);
  }
});

test('새 이상현상 재선택·8번 방 미리보기는 페이지와 삭제·흡수를 모두 정리한다', () => {
  for (const scenario of [
    'page-scroll',
    'image-zoom',
    'select-delete',
    'loading-wheel',
  ]) {
    for (const preview of [false, true]) {
      const game = start(scenario);
      walkUntil(game, (s) => s.player.x >= 1200);
      if (preview) {
        game.previewExit();
        advance(game, 0.6);
      } else game.reset('normal');
      assert.equal(game.snapshot.page.elapsed, null);
      assert.equal(game.snapshot.selection.elapsed, null);
      assert.equal(game.snapshot.wheel.phase, 'waiting');
      assert.equal(game.snapshot.progress, preview ? 8 : 0);
    }
  }
});
