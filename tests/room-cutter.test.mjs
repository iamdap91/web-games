import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LaboratoryGame } from '../dist/src/games/laboratory/game.js';
import {
  RoomCutter,
  cutting,
  cutImpact,
} from '../dist/src/games/laboratory/room-cutter.js';
const dt = 1 / 120;
function advance(game, seconds, direction = 0) {
  for (let t = 0; t < seconds; t += dt) game.update(dt, direction);
}
function triggered() {
  const game = new LaboratoryGame();
  game.reset('room-guillotine');
  // 실제 진행 번호가 있는 상태에서 실패 복귀도 검사한다.
  advance(game, 1.4, -1);
  advance(game, 0.6);
  while (game.snapshot.cut.elapsed === null) game.update(dt, 1);
  return game;
}
test('칼날은 오른쪽부터 순서대로 자르고 마지막에 출구도 사라진다', () => {
  const cutter = new RoomCutter();
  cutter.update(dt, { x: 1280 });
  cutter.update(cutImpact(0) - 0.01, { x: 24 });
  assert.equal(cutter.snapshot.count, 0);
  cutter.update(0.02, { x: 24 });
  assert.equal(cutter.snapshot.boundary, 1550);
  cutter.update(cutting.interval * 4, { x: 24 });
  assert.equal(cutter.snapshot.boundary, 310);
  assert.equal(cutter.snapshot.caughtElapsed, null);
  cutter.update(cutting.interval, { x: 24 });
  assert.equal(cutter.snapshot.boundary, 0);
  assert.equal(cutter.snapshot.caughtElapsed, 0);
});
test('반응 후 연속 플래시점프는 입구에서 탈출하고 멈춰 있으면 조각과 함께 떨어진다', () => {
  for (const flash of [false, true]) {
    const game = triggered();
    advance(game, 0.3);
    let jumpedAt = 0;
    for (let t = 0; t < 8 && game.snapshot.phase === 'playing'; t += dt) {
      if (flash) {
        if (game.snapshot.player.grounded) {
          game.jump(-1);
          jumpedAt = t;
        } else if (t - jumpedAt > 0.08 && game.snapshot.player.flashAvailable)
          game.jump(-1);
      }
      game.update(dt, flash ? -1 : 0);
    }
    assert.equal(game.snapshot.phase, flash ? 'transition' : 'severed');
    if (flash) assert.ok(game.snapshot.player.x <= 235);
    else {
      const position = game.snapshot.player;
      game.jump(-1);
      advance(game, 0.4, -1);
      assert.deepEqual(game.snapshot.player, position);
    }
    advance(game, 2.5);
    assert.equal(game.snapshot.progress, flash ? 2 : 0);
    assert.equal(game.snapshot.cut.elapsed, null);
  }
});
test('절단 중 재선택과 출구 미리보기는 칼날과 낙하를 초기화한다', () => {
  for (const preview of [false, true]) {
    const game = triggered();
    advance(game, cutImpact(1) + 0.05);
    assert.equal(game.snapshot.phase, 'severed');
    if (preview) game.previewExit();
    else game.reset('normal');
    advance(game, 0.6);
    assert.equal(game.snapshot.cut.elapsed, null);
    assert.equal(game.snapshot.phase, 'playing');
    assert.equal(game.snapshot.progress, preview ? 8 : 0);
  }
});
