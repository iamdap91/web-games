import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  anomalies,
  chooseScenario,
  isSelection,
} from '../dist/src/games/laboratory/anomalies.js';
import { LaboratoryGame } from '../dist/src/games/laboratory/game.js';
const step = 1 / 120;
function advance(game, seconds, direction = 0) {
  for (let time = 0; time < seconds; time += step) game.update(step, direction);
}
function make(scenario) {
  const game = new LaboratoryGame();
  game.reset(scenario);
  return game;
}

test('11종으로 정리해도 정상 30%와 부재형 1/35를 유지한다', () => {
  assert.equal(anomalies.length, 11);
  const counts = new Map();
  for (let i = 0; i < 35000; i++) {
    const scenario = chooseScenario((i + 0.5) / 35000);
    counts.set(scenario, (counts.get(scenario) ?? 0) + 1);
  }
  assert.equal(counts.get('normal'), 10500);
  assert.equal(counts.get('empty-center'), 700);
  for (const id of anomalies) {
    assert.ok(isSelection(id));
    assert.ok(
      Math.abs(counts.get(id) - (id === 'empty-center' ? 700 : 23800 / 10)) <=
        1,
    );
  }
  for (const removed of [
    'giant-door',
    'bent-pipes',
    'upside-down',
    'red-fluid',
    'sealed-exit',
    'crowded-lab',
    'following-door',
    'late-shadow',
    'lingering-echo',
    'reverse-flow',
    'toString',
  ])
    assert.equal(isSelection(removed), false);
});

test('모든 이상은 왼쪽으로 진행하며 재선택과 8번 방은 연출을 초기화한다', () => {
  for (const id of anomalies) {
    const game = make(id);
    advance(game, 1.4, -1);
    advance(game, 0.6);
    assert.equal(game.snapshot.progress, 1, id);
    game.previewExit();
    advance(game, 0.6);
    assert.equal(game.snapshot.scenario, 'normal');
    assert.equal(game.snapshot.mirrored, false);
    assert.equal(game.snapshot.player.inverted, false);
    assert.equal(game.snapshot.anomaly.mirrorElapsed, null);
    assert.equal(game.snapshot.anomaly.ceilingSlam, null);
    assert.equal(game.snapshot.anomaly.invasion, 0);
    game.reset('normal');
    assert.deepEqual(game.snapshot.encountered, []);
  }
});

test('상하 반전 뒤 추가 이동에만 좌우가 뒤집히며 조작과 귀로를 유지한다', () => {
  for (const direction of [1, -1]) {
    const game = make('mirrored-lab');
    advance(game, 2.3, 1);
    advance(game, 1.5);
    assert.equal(game.snapshot.player.inverted, true);
    assert.equal(game.snapshot.player.y, 0);
    advance(game, 2);
    assert.equal(game.snapshot.anomaly.mirrorElapsed, null);
    advance(game, 0.5, direction);
    assert.equal(game.snapshot.anomaly.mirrorElapsed, null);
    advance(game, 0.3, direction);
    advance(game, 1.5);
    assert.equal(game.snapshot.mirrored, true);
    assert.equal(game.snapshot.player.y, 0);
    const x = game.snapshot.player.x;
    game.face(direction);
    game.jump(direction);
    advance(game, 0.1, direction);
    game.jump(direction);
    advance(game, 0.1, direction);
    assert.equal(Math.sign(game.snapshot.player.x - x), -direction);
    assert.equal(game.snapshot.player.flashAvailable, false);
    for (let tick = 0; tick < 2000 && game.snapshot.phase === 'playing'; tick++)
      game.update(step, direction);
    advance(game, 1.5);
    assert.equal(game.snapshot.progress, direction === 1 ? 1 : 0);
    assert.equal(game.snapshot.mirrored, false);
  }
});

test('낮아지는 천장을 보고 돌아오면 안전하며 더 전진하면 찌부 연출을 거쳐 0번 방이다', () => {
  const safe = make('lowering-ceiling');
  advance(safe, 2.75, 1);
  assert.equal(safe.snapshot.anomaly.ceilingSlam, null);
  while (safe.snapshot.phase === 'playing') safe.update(step, -1);
  advance(safe, 0.6);
  assert.equal(safe.snapshot.progress, 1);
  const hit = make('lowering-ceiling');
  advance(hit, 1.4, -1);
  advance(hit, 0.6);
  while (hit.snapshot.phase === 'playing') hit.update(step, 1);
  assert.equal(hit.snapshot.progress, 1);
  assert.equal(hit.snapshot.phase, 'squashed');
  assert.ok(hit.snapshot.player.x < 1150);
  assert.equal(hit.snapshot.hitElapsed, null);
  const flattenedAt = hit.snapshot.player;
  hit.jump(-1);
  advance(hit, 0.5, -1);
  assert.equal(hit.snapshot.phase, 'squashed');
  assert.deepEqual(hit.snapshot.player, flattenedAt);
  advance(hit, 2);
  assert.equal(hit.snapshot.progress, 0);
  assert.equal(hit.snapshot.anomaly.ceilingSlam, null);
  assert.deepEqual(hit.snapshot.encountered, ['lowering-ceiling']);
});

test('기계는 등질 때 접근하고 바라보면 위치를 멈춘다', () => {
  const game = make('creeping-machine');
  advance(game, 2.5, 1);
  const before = game.snapshot.anomaly.machineX;
  advance(game, 0.5);
  assert.equal(game.snapshot.anomaly.machineX, before);
  game.face(-1);
  advance(game, 0.6);
  assert.ok(game.snapshot.anomaly.machineX < before);
  const close = game.snapshot.anomaly.machineX;
  game.face(1);
  advance(game, 0.6);
  assert.equal(game.snapshot.anomaly.machineX, close);
});

test('소등은 한 번만 이동시키고 침범한 방은 물러나도 접히지 않는다', () => {
  const blackout = make('blackout');
  advance(blackout, 4, 1);
  const x = blackout.snapshot.anomaly.blackoutX;
  advance(blackout, 0.6, -1);
  advance(blackout, 0.6, 1);
  assert.equal(blackout.snapshot.anomaly.blackoutX, x);
  const room = make('room-invasion');
  advance(room, 4.8, 1);
  advance(room, 2);
  assert.ok(room.snapshot.anomaly.invasion > 0.9);
  const invaded = room.snapshot.anomaly.invasion;
  advance(room, 1, -1);
  assert.equal(room.snapshot.anomaly.invasion, invaded);
  room.reset('room-invasion');
  assert.equal(room.snapshot.anomaly.invasion, 0);
});

test('찌부 중 재선택이나 출구 미리보기는 연출을 즉시 정리한다', () => {
  for (const preview of [false, true]) {
    const game = make('lowering-ceiling');
    while (game.snapshot.phase === 'playing') game.update(step, 1);
    assert.equal(game.snapshot.squashElapsed, 0);
    if (preview) game.previewExit();
    else game.reset('normal');
    advance(game, 0.6);
    assert.equal(game.snapshot.squashElapsed, null);
    assert.equal(game.snapshot.phase, 'playing');
    assert.equal(game.snapshot.progress, preview ? 8 : 0);
  }
});
