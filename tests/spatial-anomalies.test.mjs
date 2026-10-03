import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LaboratoryGame } from '../dist/src/games/laboratory/game.js';
import {
  cameraPosition,
  frameEdge,
  panelAngle,
} from '../dist/src/games/laboratory/spatial-rules.js';
const step = 1 / 120;
function advance(game, seconds, direction = 0) {
  for (let t = 0; t < seconds; t += step) game.update(step, direction);
}

test('화면 경계는 걷기로 발동하지 않고 오른쪽 끝의 플래시점프로만 열린다', () => {
  const game = new LaboratoryGame();
  game.reset('frame-escape');
  advance(game, 7.2, 1);
  assert.equal(frameEdge(game.snapshot), 1000);
  assert.equal(game.snapshot.anomaly.activeElapsed, null);
  game.jump(1);
  advance(game, 0.04, 1);
  assert.equal(game.snapshot.anomaly.activeElapsed, null);
  game.jump(1);
  advance(game, 0.05, 1);
  assert.notEqual(game.snapshot.anomaly.activeElapsed, null);
  assert.equal(cameraPosition(game.snapshot.player.x), 1400);
  assert.deepEqual(game.snapshot.encountered, ['frame-escape']);
});

test('화면 밖에서도 같은 속도로 이동하고 우측 끝은 방 전환이 아니며 왼쪽으로 재진입할 수 있다', () => {
  const game = new LaboratoryGame();
  game.reset('frame-escape');
  advance(game, 7.2, 1);
  game.jump(1);
  game.jump(1);
  advance(game, 1, 1);
  assert.equal(game.snapshot.phase, 'playing');
  assert.equal(frameEdge(game.snapshot), 760);
  assert.ok(
    game.snapshot.player.x - cameraPosition(game.snapshot.player.x) >
      frameEdge(game.snapshot),
  );
  const before = game.snapshot.player.x;
  advance(game, 0.2, -1);
  assert.ok(Math.abs(before - game.snapshot.player.x - 48) < 3);
  advance(game, 1, -1);
  assert.ok(
    game.snapshot.player.x - cameraPosition(game.snapshot.player.x) <
      frameEdge(game.snapshot),
  );
  advance(game, 10, -1);
  advance(game, 0.6);
  assert.equal(game.snapshot.progress, 1);
  assert.equal(game.snapshot.anomaly.activeElapsed, null);
  assert.equal(frameEdge(game.snapshot), 1000);
});

test('벽은 이동 위치에 따라 순서대로 열리고 같은 위치로 돌아오면 같은 각도가 된다', () => {
  for (let i = 0; i < 3; i++) {
    assert.equal(Math.abs(panelAngle(360, i)), 0);
    assert.equal(panelAngle(2200, i), -105);
    assert.ok(panelAngle(1400, i) < 0 && panelAngle(1400, i) > -105);
  }
  assert.ok(panelAngle(1400, 0) < panelAngle(1400, 1));
  const game = new LaboratoryGame();
  game.reset('folding-stage');
  advance(game, 4, 1);
  const start = game.snapshot.player.x;
  const angle = panelAngle(start, 0);
  advance(game, 1, 1);
  assert.ok(panelAngle(game.snapshot.player.x, 0) < angle);
  advance(game, 1, -1);
  assert.ok(Math.abs(panelAngle(game.snapshot.player.x, 0) - angle) < 0.01);
  assert.equal(game.snapshot.hitElapsed, null);
});

test('재선택과 8번 방 미리보기는 경계 탈출 상태를 정리한다', () => {
  const game = new LaboratoryGame();
  game.reset('frame-escape');
  advance(game, 7.3, 1);
  game.jump(1);
  game.jump(1);
  advance(game, 0.2);
  game.previewExit();
  advance(game, 0.6);
  assert.equal(frameEdge(game.snapshot), 1000);
  assert.equal(game.snapshot.scenario, 'normal');
  game.reset('folding-stage');
  assert.equal(game.snapshot.anomaly.activeElapsed, null);
});
