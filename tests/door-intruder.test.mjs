import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LaboratoryGame } from '../dist/src/games/laboratory/game.js';
import {
  DoorIntruder,
  intruderHand,
  intruderReveal,
  intruderTiming,
} from '../dist/src/games/laboratory/door-intruder.js';

const step = 1 / 120;
function advance(game, seconds, direction = 0) {
  for (let t = 0; t < seconds; t += step) game.update(step, direction);
}
function make() {
  const game = new LaboratoryGame();
  game.reset('room-invasion');
  return game;
}
function approach(game, x) {
  for (let i = 0; game.snapshot.player.x < x && i < 1000; i++)
    game.update(step, 1);
}
function armAttack(game) {
  approach(game, 1260);
  for (let i = 0; game.snapshot.intruder.phase !== 'bracing' && i < 400; i++)
    game.update(step, 0);
  assert.equal(game.snapshot.intruder.phase, 'bracing');
}

test('문에 접근하면 손가락만 나타나고 더 다가오기 전에는 손과 몸을 숨긴다', () => {
  const game = make();
  advance(game, 5);
  assert.equal(game.snapshot.intruder.phase, 'hidden');
  approach(game, 1100);
  assert.equal(game.snapshot.intruder.phase, 'fingers');
  advance(game, 8);
  assert.equal(game.snapshot.intruder.phase, 'fingers');
  assert.equal(game.snapshot.intruder.attackElapsed, null);
  assert.deepEqual(intruderReveal(game.snapshot.intruder), {
    fingers: 1,
    hand: 0,
    body: 0,
  });
  assert.deepEqual(game.snapshot.encountered, ['room-invasion']);
  advance(game, 2, -1);
  assert.equal(game.snapshot.intruder.phase, 'fingers');
});

test('움츠리는 예고 뒤 손에 잡히면 입력을 잠그고 문 안으로 끌어간 뒤 0번 방으로 복귀한다', () => {
  const game = make();
  // 먼저 한 방을 통과해 실패 시 실제 진행도가 초기화되는지도 확인한다.
  advance(game, 1.5, -1);
  advance(game, 0.6);
  assert.equal(game.snapshot.progress, 1);
  armAttack(game);
  advance(game, intruderTiming.brace - 0.02);
  assert.equal(game.snapshot.phase, 'playing');
  for (let i = 0; game.snapshot.phase === 'playing' && i < 120; i++)
    game.update(step, 0);
  assert.equal(game.snapshot.phase, 'snatched');
  const captured = game.snapshot.player;
  const hand = intruderHand(game.snapshot.intruder);
  game.jump(-1);
  game.face(-1);
  advance(game, 0.55, -1);
  assert.deepEqual(game.snapshot.player, captured);
  assert.ok(intruderHand(game.snapshot.intruder).x > hand.x);
  advance(game, 0.85);
  assert.equal(game.snapshot.progress, 0);
  assert.notEqual(game.snapshot.failureElapsed, null);
  assert.equal(game.snapshot.intruder.phase, 'hidden');
  assert.deepEqual(game.snapshot.encountered, ['room-invasion']);
});

test('예고에 반응한 왼쪽 플래시점프는 피할 수 있고 공격은 취소되거나 반복되지 않는다', () => {
  const game = make();
  armAttack(game);
  advance(game, 0.2);
  game.jump(-1);
  game.jump(-1);
  advance(game, 0.8, -1);
  assert.equal(game.snapshot.phase, 'playing');
  assert.equal(game.snapshot.intruder.phase, 'striking');
  advance(game, 2);
  assert.equal(game.snapshot.intruder.phase, 'lodged');
  approach(game, 1350);
  advance(game, 3);
  assert.equal(game.snapshot.phase, 'playing');
  assert.equal(game.snapshot.intruder.phase, 'lodged');
  advance(game, 6, -1);
  advance(game, 0.6);
  assert.equal(game.snapshot.progress, 1);
});

test('빠른 상대 이동은 놓치지 않고 손 위를 뛰어넘으면 잡지 않는다', () => {
  const base = make().snapshot.player;
  for (const [height, caught] of [
    [340, true],
    [170, false],
  ]) {
    const creature = new DoorIntruder();
    const far = { ...base, x: 1800, y: height };
    creature.update(2.2, far);
    creature.update(intruderTiming.brace + 0.12, far);
    const previous = { ...base, x: 1000, y: height };
    const player = { ...base, x: 1400, y: height };
    creature.update(step, player, previous);
    assert.equal(creature.snapshot.caughtElapsed !== null, caught);
  }
});

test('등장·공격·잡힌 도중 재선택과 8번 방 미리보기는 상태를 모두 정리한다', () => {
  for (const stage of ['fingers', 'bracing', 'snatched']) {
    for (const preview of [false, true]) {
      const game = make();
      if (stage === 'fingers') approach(game, 1100);
      else armAttack(game);
      if (stage === 'snatched') advance(game, 1);
      assert.equal(
        stage === 'snatched'
          ? game.snapshot.phase
          : game.snapshot.intruder.phase,
        stage,
      );
      if (preview) game.previewExit();
      else game.reset('room-invasion');
      assert.equal(game.snapshot.intruder.phase, 'hidden');
      assert.equal(game.snapshot.intruder.caughtElapsed, null);
      assert.equal(game.snapshot.intruder.grip, null);
    }
  }
});

test('공격은 손부터 튀어나오고 몸은 나중에 따르며 잡은 뒤에도 계속 나온다', () => {
  const creature = new DoorIntruder();
  const player = { ...make().snapshot.player, x: 1800 };
  creature.update(intruderTiming.fingers + 0.1, player);
  creature.update(intruderTiming.brace - 0.02, player);
  assert.equal(intruderReveal(creature.snapshot).hand, 0);
  assert.equal(intruderReveal(creature.snapshot).body, 0);
  creature.update(0.12, player);
  assert.ok(intruderReveal(creature.snapshot).hand > 0);
  assert.equal(intruderReveal(creature.snapshot).body, 0);
  creature.update(0.2, player);
  assert.equal(intruderReveal(creature.snapshot).hand, 1);
  assert.ok(intruderReveal(creature.snapshot).body > 0);
  const game = make();
  armAttack(game);
  for (let i = 0; game.snapshot.phase === 'playing' && i < 120; i++)
    game.update(step, 0);
  assert.equal(game.snapshot.phase, 'snatched');
  const before = intruderReveal(game.snapshot.intruder).body;
  advance(game, 0.7);
  assert.ok(intruderReveal(game.snapshot.intruder).body > before);
});
