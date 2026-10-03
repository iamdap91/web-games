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

test('16종을 모두 선택할 수 있고 정상 30%와 드문 부재형 가중치를 유지한다', () => {
  assert.equal(anomalies.length, 16);
  const counts = new Map();
  for (let i = 0; i < 31000; i++) {
    const scenario = chooseScenario((i + 0.5) / 31000);
    counts.set(scenario, (counts.get(scenario) ?? 0) + 1);
  }
  assert.equal(counts.get('normal'), 9300);
  assert.equal(counts.get('empty-center'), 700);
  for (const id of anomalies) {
    assert.ok(isSelection(id));
    assert.equal(counts.get(id), id === 'empty-center' ? 700 : 1400);
  }
  assert.equal(isSelection('toString'), false);
});

test('모든 이상현상에서 왼쪽 출구는 다음 방으로 이어지고 재선택은 상태를 초기화한다', () => {
  for (const id of anomalies) {
    const game = make(id);
    advance(game, 1.4, -1);
    advance(game, 0.6);
    assert.equal(game.snapshot.progress, 1, id);
    assert.equal(game.snapshot.scenario, id);
    game.reset('normal');
    assert.deepEqual(game.snapshot.encountered, []);
    assert.equal(game.snapshot.anomaly.activeElapsed, null);
    assert.equal(game.snapshot.anomaly.echo, null);
  }
});

test('잔상은 플래시점프에만 발동하고 지연 후 따라오되 몸 뒤에 남는다', () => {
  const game = make('lingering-echo');
  advance(game, 1, 1);
  game.jump(1);
  advance(game, 0.1, 1);
  assert.equal(game.snapshot.anomaly.echo, null);
  game.jump(1);
  advance(game, 0.1, 1);
  const echoX = game.snapshot.anomaly.echo.x;
  assert.deepEqual(game.snapshot.encountered, ['lingering-echo']);
  advance(game, 0.3);
  assert.equal(game.snapshot.anomaly.echo.x, echoX);
  advance(game, 2);
  assert.ok(game.snapshot.anomaly.echo.x > echoX);
  assert.ok(
    Math.abs(game.snapshot.player.x - game.snapshot.anomaly.echo.x - 65) < 1,
  );
});

test('그림자는 멈춘 뒤에도 움직이다가 0.65초 뒤 현재 위치에 도달한다', () => {
  const game = make('late-shadow');
  advance(game, 1, 1);
  const stopped = game.snapshot.player.x;
  const shadow = game.snapshot.anomaly.shadow.x;
  advance(game, 0.3);
  assert.equal(game.snapshot.player.x, stopped);
  assert.ok(game.snapshot.anomaly.shadow.x > shadow);
  assert.ok(game.snapshot.anomaly.shadow.x < stopped);
  advance(game, 0.7);
  assert.equal(game.snapshot.anomaly.shadow.x, stopped);
});

test('기계는 등지고 있을 때만 다가오고 바라보면 멈춘다', () => {
  const game = make('creeping-machine');
  advance(game, 2.5, 1);
  const before = game.snapshot.anomaly.machineX;
  advance(game, 0.5);
  assert.equal(game.snapshot.anomaly.machineX, before);
  game.face(-1);
  advance(game, 0.5);
  assert.ok(game.snapshot.anomaly.machineX < before);
  const closer = game.snapshot.anomaly.machineX;
  game.face(1);
  advance(game, 0.5);
  assert.equal(game.snapshot.anomaly.machineX, closer);
});

test('문은 이동을 따라오고 소등 장치는 발동 위치에 한 번만 나타난다', () => {
  const door = make('following-door');
  advance(door, 3, 1);
  const before = door.snapshot.anomaly.doorX;
  advance(door, 1, 1);
  assert.ok(door.snapshot.anomaly.doorX > before);
  const blackout = make('blackout');
  advance(blackout, 3, 1);
  const x = blackout.snapshot.anomaly.blackoutX;
  assert.notEqual(blackout.snapshot.anomaly.activeElapsed, null);
  advance(blackout, 1, -1);
  advance(blackout, 1, 1);
  assert.equal(blackout.snapshot.anomaly.blackoutX, x);
  assert.ok(blackout.snapshot.anomaly.activeElapsed > 2);
});

test('역류는 이동 방향과 반대이며 8번 방은 새 연출 상태를 남기지 않는다', () => {
  const game = make('reverse-flow');
  advance(game, 0.2, 1);
  assert.ok(game.snapshot.anomaly.flowOffset < 0);
  const offset = game.snapshot.anomaly.flowOffset;
  advance(game, 0.2, -1);
  assert.ok(game.snapshot.anomaly.flowOffset > offset);
  game.previewExit();
  advance(game, 0.6);
  assert.equal(game.snapshot.scenario, 'normal');
  assert.equal(game.snapshot.anomaly.activeElapsed, null);
  assert.deepEqual(game.snapshot.encountered, ['reverse-flow']);
});

test('신규 14종에는 피격 초기화가 없고 관찰 후 기록을 보존한다', () => {
  for (const id of anomalies.filter(
    (id) => !['giant-door', 'falling-pipe'].includes(id),
  )) {
    const game = make(id);
    game.jump(1);
    game.jump(1);
    advance(game, 7, 1);
    assert.equal(game.snapshot.phase, 'playing', id);
    assert.equal(game.snapshot.hitElapsed, null, id);
    assert.deepEqual(game.snapshot.encountered, [id], id);
    game.previewExit();
    advance(game, 0.6);
    assert.deepEqual(game.snapshot.encountered, [id], id);
  }
});
