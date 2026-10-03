import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LaboratoryGame } from '../dist/src/games/laboratory/game.js';
import {
  cameraPosition,
  frameEdge,
  panelAngle,
  returnPanelAngle,
  stagePanelViews,
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

function escape(game) {
  advance(game, 7.2, 1);
  game.jump(1);
  game.jump(1);
  advance(game, 0.9, 1);
}
function until(game, phase) {
  for (let i = 0; i < 600 && game.snapshot.phase !== phase; i++)
    game.update(step, 0);
  assert.equal(game.snapshot.phase, phase);
}

test('화면 밖에서 돌아서야 추격하고 포획 후 회전 낙하와 다음 방 착지로 이어진다', () => {
  const game = new LaboratoryGame();
  game.reset('frame-escape');
  escape(game);
  advance(game, 1);
  assert.equal(game.snapshot.chase.phase, 'idle');
  assert.equal(game.snapshot.phase, 'playing');
  const before = game.snapshot.player.x;
  advance(game, 0.2, -1);
  assert.ok(Math.abs(before - game.snapshot.player.x - 48) < 3);
  assert.equal(game.snapshot.chase.phase, 'warning');
  assert.equal(game.snapshot.chase.offset, 0);
  advance(game, 0.1);
  assert.equal(game.snapshot.chase.phase, 'chasing');
  assert.ok(game.snapshot.chase.offset > 0);
  until(game, 'falling');
  const caught = game.snapshot.player;
  game.jump(1);
  advance(game, 0.25, 1);
  assert.deepEqual(game.snapshot.player, caught);
  assert.equal(game.snapshot.progress, 0);
  until(game, 'landing');
  assert.equal(game.snapshot.progress, 1);
  assert.equal(game.snapshot.player.x, 360);
  assert.ok(game.snapshot.player.y < 0);
  assert.equal(game.snapshot.failureElapsed, null);
  assert.equal(game.snapshot.chase.phase, 'idle');
  until(game, 'playing');
  assert.equal(game.snapshot.player.y, 340);
  advance(game, 0.1, 1);
  assert.ok(game.snapshot.player.x > 360);
  assert.equal(game.snapshot.progress, 1);
  assert.deepEqual(game.snapshot.encountered, ['frame-escape']);
});

test('되돌아선 뒤 다시 오른쪽 플래시점프로 잠시 거리를 벌릴 수 있다', () => {
  const game = new LaboratoryGame();
  game.reset('frame-escape');
  advance(game, 7.2, 1);
  game.jump(1);
  game.jump(1);
  advance(game, 0.75);
  game.face(-1);
  advance(game, 0.1);
  const before = game.snapshot.player.x - 2160 - game.snapshot.chase.offset;
  game.jump(1);
  game.jump(1);
  advance(game, 0.12);
  assert.ok(
    game.snapshot.player.x - 2160 - game.snapshot.chase.offset > before,
  );
  until(game, 'falling');
});

test('7번 방에서 화면에 잡혀도 8번 방에 착지한 뒤 직접 나가야 완료된다', () => {
  const game = new LaboratoryGame();
  game.reset('frame-escape');
  for (let room = 0; room < 7; room++) {
    advance(game, 1.4, -1);
    advance(game, 0.6);
    assert.equal(game.snapshot.progress, room + 1);
  }
  escape(game);
  game.face(-1);
  until(game, 'falling');
  until(game, 'landing');
  assert.equal(game.snapshot.progress, 8);
  assert.equal(game.snapshot.scenario, 'normal');
  until(game, 'playing');
  assert.equal(game.snapshot.progress, 8);
  advance(game, 8.6, 1);
  advance(game, 0.6);
  assert.equal(game.snapshot.phase, 'complete');
});

test('문은 접근하면 천천히 열리고 왕복해도 유지되며 새 방에서는 닫힌다', () => {
  const game = new LaboratoryGame();
  game.reset('folding-stage');
  advance(game, 6, 1);
  const opening = game.snapshot.anomaly.backstageDoorOpen;
  assert.ok(opening > 0 && opening < 1);
  advance(game, 0.8, 1);
  advance(game, 2);
  assert.equal(game.snapshot.anomaly.backstageDoorOpen, 1);
  advance(game, 3, -1);
  assert.equal(game.snapshot.anomaly.backstageDoorOpen, 1);
  advance(game, 3, 1);
  assert.equal(game.snapshot.anomaly.backstageDoorOpen, 1);
  advance(game, 9, -1);
  advance(game, 0.6);
  assert.equal(game.snapshot.progress, 1);
  assert.equal(game.snapshot.anomaly.backstageDoorOpen, 0);
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

test('포획 중 초기화와 8번 방 미리보기는 낙하와 착지를 취소한다', () => {
  const game = new LaboratoryGame();
  for (const preview of [false, true]) {
    game.reset('frame-escape');
    escape(game);
    game.face(-1);
    until(game, 'falling');
    if (preview) game.previewExit();
    else game.reset('folding-stage');
    advance(game, 2);
    assert.equal(game.snapshot.phase, 'playing');
    assert.equal(game.snapshot.chase.phase, 'idle');
    assert.equal(game.snapshot.landingElapsed, null);
    assert.equal(game.snapshot.progress, preview ? 8 : 0);
  }
});

test('처음 입장해 왼쪽으로 움직일 때는 귀로 벽과 문이 나타나지 않는다', () => {
  const game = new LaboratoryGame();
  game.reset('folding-stage');
  advance(game, 0.3, -1);
  assert.equal(game.snapshot.anomaly.backstageReturning, false);
  assert.equal(game.snapshot.anomaly.returnDoorOpen, 0);
  assert.equal(
    stagePanelViews(game.snapshot).filter(
      (view) => view.reverse && view.visible,
    ).length,
    0,
  );
});

test('이상을 보고 돌아오면 반대 경첩의 벽과 왼쪽 문틈이 열리고 새 방에서 초기화된다', () => {
  const game = new LaboratoryGame();
  game.reset('folding-stage');
  advance(game, 4, 1);
  assert.equal(game.snapshot.anomaly.backstageReturning, false);
  advance(game, 0.2, -1);
  assert.equal(game.snapshot.anomaly.backstageReturning, true);
  const before = returnPanelAngle(game.snapshot.player.x, 1);
  advance(game, 3.8, -1);
  advance(game, 1);
  assert.ok(returnPanelAngle(game.snapshot.player.x, 1) > before);
  assert.ok(game.snapshot.anomaly.returnDoorOpen > 0.8);
  assert.equal(
    stagePanelViews(game.snapshot).filter(
      (view) => view.reverse && view.visible,
    ).length,
    2,
  );
  const opened = game.snapshot.anomaly.returnDoorOpen;
  advance(game, 1, 1);
  assert.equal(game.snapshot.anomaly.returnDoorOpen, opened);
  advance(game, 3, -1);
  advance(game, 0.6);
  assert.equal(game.snapshot.progress, 1);
  assert.equal(game.snapshot.anomaly.returnDoorOpen, 0);
  assert.equal(game.snapshot.anomaly.backstageReturning, false);
  game.previewExit();
  advance(game, 0.6);
  assert.equal(game.snapshot.anomaly.backstageReturning, false);
});
