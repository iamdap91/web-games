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
  advance(game, 0.55);
}
function until(game, phase) {
  for (let i = 0; i < 600 && game.snapshot.phase !== phase; i++)
    game.update(step, 0);
  assert.equal(game.snapshot.phase, phase);
}

function flee(game, stopJumpingAfter = Infinity) {
  let grounded = 0;
  let airborne = 0;
  let flashed = false;
  let minGap = Infinity;
  // 두 Alt 입력 사이와 착지 후 다음 입력에 각각 80ms의 반응 시간을 둔다.
  for (let t = 0; t < 10 && game.snapshot.phase === 'playing'; t += step) {
    if (game.snapshot.player.grounded) {
      grounded += step;
      airborne = 0;
      flashed = false;
      if (grounded >= 0.08 && t < stopJumpingAfter) {
        game.jump(-1);
        grounded = 0;
      }
    } else {
      airborne += step;
      if (airborne >= 0.08 && !flashed) {
        game.jump(-1);
        flashed = true;
      }
    }
    game.update(step, -1);
    if (game.snapshot.chase.phase === 'chasing')
      minGap = Math.min(
        minGap,
        game.snapshot.chase.boundary - game.snapshot.player.x,
      );
  }
  return minGap;
}

test('화면 밖에 나가면 방향과 무관하게 떨림 유예가 시작되고 재진입해야 추격한다', () => {
  const game = new LaboratoryGame();
  game.reset('frame-escape');
  escape(game);
  assert.equal(game.snapshot.chase.phase, 'warning');
  const boundary = game.snapshot.chase.boundary;
  advance(game, 0.2);
  assert.equal(game.snapshot.chase.boundary, boundary);
  game.face(-1);
  advance(game, 0.1);
  assert.equal(game.snapshot.chase.phase, 'warning');
  game.jump(-1);
  game.jump(-1);
  advance(game, 0.3, -1);
  assert.equal(game.snapshot.chase.phase, 'chasing');
  assert.ok(game.snapshot.chase.boundary < boundary);
  assert.equal(
    frameEdge(game.snapshot),
    game.snapshot.chase.boundary - cameraPosition(game.snapshot.player.x),
  );
});

test('유예 동안 복귀하지 않으면 낙하해 0번 방에 착지하고 번호가 초기화된다', () => {
  const game = new LaboratoryGame();
  game.reset('frame-escape');
  advance(game, 1.4, -1);
  advance(game, 0.6);
  assert.equal(game.snapshot.progress, 1);
  escape(game);
  until(game, 'falling');
  const caught = game.snapshot.player;
  game.jump(-1);
  advance(game, 0.25, -1);
  assert.deepEqual(game.snapshot.player, caught);
  until(game, 'landing');
  assert.equal(game.snapshot.progress, 0);
  assert.equal(game.snapshot.previousRoom, 1);
  assert.notEqual(game.snapshot.failureElapsed, null);
  assert.ok(game.snapshot.player.y < 0);
  until(game, 'playing');
  assert.deepEqual(game.snapshot.encountered, ['frame-escape']);
  assert.equal(game.snapshot.chase.phase, 'idle');
});

test('복귀 후 걷기만 하거나 플래시점프를 멈추면 경계에 잡힌다', () => {
  for (const stopAfter of [0, 1.5]) {
    const game = new LaboratoryGame();
    game.reset('frame-escape');
    escape(game);
    flee(game, stopAfter);
    assert.equal(game.snapshot.phase, 'falling');
    assert.ok(game.snapshot.player.x > 55);
    assert.ok(game.snapshot.chase.boundary <= game.snapshot.player.x + 14);
  }
});

test('반응 시간을 둔 연속 플래시점프로 추격을 벗어나 다음 방으로 진행할 수 있다', () => {
  const game = new LaboratoryGame();
  game.reset('frame-escape');
  escape(game);
  advance(game, 0.2);
  const minGap = flee(game);
  assert.equal(game.snapshot.phase, 'transition');
  assert.ok(game.snapshot.player.x <= 55);
  assert.ok(minGap > 14 && minGap < 80);
  advance(game, 0.6);
  assert.equal(game.snapshot.progress, 1);
  assert.equal(game.snapshot.failureElapsed, null);
  assert.equal(game.snapshot.chase.phase, 'idle');
  assert.equal(frameEdge(game.snapshot), 1000);
});

test('7번 방에서 추격을 피하면 8번 방으로 진입하고 직접 나가야 완료된다', () => {
  const game = new LaboratoryGame();
  game.reset('frame-escape');
  for (let room = 0; room < 7; room++) {
    advance(game, 1.4, -1);
    advance(game, 0.6);
  }
  escape(game);
  flee(game);
  assert.equal(game.snapshot.phase, 'transition');
  advance(game, 0.6);
  assert.equal(game.snapshot.progress, 8);
  assert.equal(game.snapshot.scenario, 'normal');
  assert.equal(game.snapshot.phase, 'playing');
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
  for (let i = 0; i < 1200 && game.snapshot.phase === 'playing'; i++)
    game.update(step, -1);
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

test('귀로 문에 도달하면 맵 끝까지 지나가지 않아도 다음 방으로 전환한다', () => {
  for (const flash of [false, true]) {
    const game = new LaboratoryGame();
    game.reset('folding-stage');
    advance(game, 3.5, 1);
    advance(game, 3.5, -1);
    assert.equal(game.snapshot.phase, 'playing');
    if (flash) {
      game.jump(-1);
      game.jump(-1);
    }
    for (let i = 0; i < 120 && game.snapshot.phase === 'playing'; i++)
      game.update(step, -1);
    assert.equal(game.snapshot.phase, 'transition');
    assert.ok(game.snapshot.player.x > 230 && game.snapshot.player.x <= 250);
    assert.equal(game.snapshot.failureElapsed, null);
    advance(game, 0.6);
    assert.equal(game.snapshot.progress, 1);
    assert.equal(game.snapshot.player.x, 360);
  }
});
