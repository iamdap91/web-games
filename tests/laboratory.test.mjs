import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  LaboratoryGame,
  Player,
  movement,
  world,
  isSelection,
  passage,
  exitLight,
} from '../dist/src/games/laboratory/game.js';

const step = 1 / 120;
function advance(actor, seconds, direction = 0) {
  for (let time = 0; time < seconds; time += step)
    actor.update(step, direction);
}
function exit(game, direction) {
  for (let tick = 0; tick < 1500; tick++) {
    game.update(step, direction);
    if (game.snapshot.phase === 'transition') return;
  }
  assert.fail('통로 출구에 도달하지 못했습니다.');
}

test('좌우 이동과 바닥 착지, 월드 경계를 유지한다', () => {
  const player = new Player();
  advance(player, 1, 1);
  assert.ok(Math.abs(player.snapshot.x - (360 + movement.speed)) < 3);
  player.jump(-1);
  advance(player, 0.1, -1);
  assert.ok(player.snapshot.y < world.ground);
  assert.equal(player.snapshot.facing, -1);
  advance(player, 1, -1);
  assert.equal(player.snapshot.y, world.ground);
  advance(player, 10, -1);
  assert.equal(player.snapshot.x, 24);
});

test('공중 추가 입력은 수평 가속이며 한 번만 가능하고 착지하면 회복한다', () => {
  const player = new Player();
  player.jump(1);
  advance(player, 0.1, 1);
  const before = player.snapshot.x;
  player.jump(1);
  advance(player, 0.1, 1);
  assert.ok(player.snapshot.x - before > movement.speed * 0.1 * 3);
  assert.equal(player.snapshot.flashAvailable, false);
  const remaining = player.snapshot.flashRemaining;
  player.jump(1);
  assert.equal(player.snapshot.flashRemaining, remaining);
  advance(player, 1);
  assert.equal(player.snapshot.grounded, true);
  assert.equal(player.snapshot.flashAvailable, true);
  player.jump(-1);
  player.jump(-1);
  const x = player.snapshot.x;
  advance(player, 0.1);
  assert.ok(player.snapshot.x < x);
});

test('0번 방은 정상이며 오른쪽으로 나가면 자동으로 1번 방이 된다', () => {
  const game = new LaboratoryGame(() => 0.9);
  assert.equal(game.snapshot.phase, 'playing');
  assert.equal(game.snapshot.progress, 0);
  assert.equal(game.snapshot.scenario, 'normal');
  exit(game, 1);
  assert.equal(game.snapshot.phase, 'transition');
  assert.equal(game.snapshot.progress, 0);
  advance(game, passage.fadeOut + passage.fadeIn + step);
  assert.equal(game.snapshot.progress, 1);
  assert.equal(game.snapshot.phase, 'playing');
  assert.equal(game.snapshot.scenario, 'falling-pipe');
  assert.equal(game.snapshot.player.x, 360);
});

test('정상은 오른쪽, 이상은 왼쪽이 정답이며 오답은 0번 방으로 돌려보낸다', () => {
  const game = new LaboratoryGame();
  game.reset('normal');
  exit(game, 1);
  advance(game, 0.6);
  assert.equal(game.snapshot.progress, 1);
  exit(game, -1);
  advance(game, 1.5);
  assert.equal(game.snapshot.progress, 0);
  for (const scenario of ['giant-door', 'falling-pipe']) {
    game.reset(scenario);
    exit(game, -1);
    advance(game, 0.6);
    assert.equal(game.snapshot.progress, 1);
    exit(game, 1);
    advance(game, 1.5);
    assert.equal(game.snapshot.progress, 0);
  }
});

test('8번 방에서도 움직이고 오른쪽 빛 속으로 나가야 종료된다', () => {
  const game = new LaboratoryGame();
  game.reset('giant-door');
  for (let count = 1; count <= 8; count++) {
    exit(game, -1);
    advance(game, 0.6);
    assert.equal(game.snapshot.progress, count);
  }
  assert.equal(game.snapshot.phase, 'playing');
  assert.equal(game.snapshot.scenario, 'normal');
  advance(game, 0.3, 1);
  assert.ok(game.snapshot.player.x > 360);
  exit(game, 1);
  advance(game, 0.3);
  assert.equal(game.snapshot.phase, 'complete');
  const before = game.snapshot.player;
  game.jump(1);
  advance(game, 1, 1);
  assert.deepEqual(game.snapshot.player, before);
  game.reset('giant-door');
  assert.equal(game.snapshot.progress, 0);
  assert.equal(game.snapshot.phase, 'playing');
});

test('빠른 접근에도 배관이 발동하고 되돌아가도 초기화되지 않는다', () => {
  const game = new LaboratoryGame();
  game.reset('falling-pipe');
  advance(game, 5.2, 1);
  assert.equal(game.snapshot.pipeElapsed, null);
  game.jump(1);
  game.update(step, 1);
  game.jump(1);
  advance(game, 0.2, 1);
  assert.notEqual(game.snapshot.pipeElapsed, null);
  advance(game, 0.3, -1);
  assert.ok(game.snapshot.pipeElapsed > 0.18);
  game.reset('falling-pipe');
  assert.equal(game.snapshot.pipeElapsed, null);
  assert.equal(game.snapshot.player.x, 360);
});

test('개발 선택을 유지하고 무작위로 돌아오면 정상 0번 방부터 시작한다', () => {
  const game = new LaboratoryGame(() => 0.6);
  game.reset('giant-door');
  exit(game, -1);
  advance(game, 0.6);
  assert.equal(game.snapshot.scenario, 'giant-door');
  game.reset('random');
  assert.equal(game.snapshot.phase, 'playing');
  assert.equal(game.snapshot.progress, 0);
  assert.equal(game.snapshot.scenario, 'normal');
  exit(game, 1);
  advance(game, 0.6);
  assert.equal(game.snapshot.scenario, 'giant-door');
  assert.equal(isSelection('invalid'), false);
  assert.equal(isSelection('falling-pipe'), true);
});

test('정상과 정적 이상에서는 배관이 움직이지 않는다', () => {
  const game = new LaboratoryGame();
  for (const scenario of ['normal', 'giant-door']) {
    game.reset(scenario);
    advance(game, 5, 1);
    assert.equal(game.snapshot.pipeElapsed, null);
  }
});

test('짧은 방향 입력도 다음 점프의 방향에 반영한다', () => {
  const game = new LaboratoryGame();
  game.face(-1);
  game.jump(0);
  game.jump(0);
  advance(game, 0.1);
  assert.equal(game.snapshot.player.facing, -1);
  assert.ok(game.snapshot.player.x < 360);
});

test('실패는 암전에서 방을 교체하고 입장 숫자 노이즈가 끝나면 조작을 돌려준다', () => {
  const game = new LaboratoryGame(() => 0.1);
  exit(game, 1);
  advance(game, 0.6);
  exit(game, -1);
  const oldPosition = game.snapshot.player.x;
  game.jump(1);
  advance(game, 0.1, 1);
  assert.equal(game.snapshot.player.x, oldPosition);
  assert.equal(game.snapshot.progress, 1);
  assert.equal(game.snapshot.failureElapsed, null);
  advance(game, 0.25, 1);
  assert.equal(game.snapshot.progress, 0);
  assert.equal(game.snapshot.previousRoom, 1);
  assert.ok(game.snapshot.failureElapsed > 0);
  assert.equal(game.snapshot.player.x, 360);
  assert.equal(game.snapshot.scenario, 'normal');
  assert.equal(game.snapshot.phase, 'transition');
  advance(game, 0.5, 1);
  assert.equal(game.snapshot.player.x, 360);
  advance(game, 0.8);
  assert.equal(game.snapshot.failureElapsed, null);
  assert.equal(game.snapshot.phase, 'playing');
});

test('전환 중 개발 상황을 바꾸면 이전 전환과 노이즈가 취소된다', () => {
  const game = new LaboratoryGame();
  exit(game, -1);
  advance(game, 0.3);
  assert.notEqual(game.snapshot.failureElapsed, null);
  game.reset('falling-pipe');
  advance(game, 1);
  assert.equal(game.snapshot.transitionElapsed, null);
  assert.equal(game.snapshot.failureElapsed, null);
  assert.equal(game.snapshot.scenario, 'falling-pipe');
  assert.equal(game.snapshot.progress, 0);
  assert.equal(game.snapshot.player.x, 360);
});

test('개발 모드의 8번 방 확인은 같은 입장 상태를 만들고 현재 기록을 보존한다', () => {
  const completed = new LaboratoryGame();
  completed.reset('giant-door');
  for (let room = 0; room < 8; room++) {
    exit(completed, -1);
    advance(completed, 0.6);
  }
  const preview = new LaboratoryGame();
  preview.reset('falling-pipe');
  advance(preview, 6, 1);
  assert.notEqual(preview.snapshot.pipeElapsed, null);
  preview.previewExit();
  assert.equal(preview.snapshot.progress, 7);
  assert.equal(preview.snapshot.phase, 'transition');
  assert.equal(preview.snapshot.pipeElapsed, null);
  assert.equal(preview.snapshot.failureElapsed, null);
  advance(preview, 0.6);
  const { encountered, ...previewRoom } = preview.snapshot;
  const { encountered: completedRecords, ...completedRoom } =
    completed.snapshot;
  assert.deepEqual(previewRoom, completedRoom);
  assert.deepEqual(encountered, ['falling-pipe']);
  assert.deepEqual(completedRecords, []);
});

test('실패 중에도 8번 방을 확인할 수 있고 반복 확인과 상황 복귀가 가능하다', () => {
  const game = new LaboratoryGame();
  exit(game, -1);
  advance(game, 0.3);
  assert.notEqual(game.snapshot.failureElapsed, null);
  for (let attempt = 0; attempt < 2; attempt++) {
    game.previewExit();
    assert.equal(game.snapshot.failureElapsed, null);
    advance(game, 0.6);
    assert.equal(game.snapshot.phase, 'playing');
    assert.equal(game.snapshot.progress, 8);
  }
  game.reset('falling-pipe');
  assert.equal(game.snapshot.progress, 0);
  assert.equal(game.snapshot.scenario, 'falling-pipe');
  assert.equal(game.snapshot.phase, 'playing');
});

test('8번 방의 왼쪽은 출구가 아니고 빛이 몸과 잔상을 가린 뒤 공중에서도 탈출한다', () => {
  const game = new LaboratoryGame();
  game.previewExit();
  advance(game, 0.6);
  advance(game, 2, -1);
  assert.equal(game.snapshot.phase, 'playing');
  assert.equal(game.snapshot.progress, 8);
  game.previewExit();
  advance(game, 0.6);
  while (game.snapshot.player.x < exitLight.opaque) game.update(step, 1);
  assert.equal(game.snapshot.phase, 'playing');
  game.jump(1);
  game.jump(1);
  while (game.snapshot.phase === 'playing') game.update(step, 1);
  assert.ok(game.snapshot.player.x >= exitLight.finish);
  assert.ok(game.snapshot.player.x - 130 >= exitLight.opaque);
  assert.equal(game.snapshot.player.grounded, false);
  advance(game, 0.3);
  assert.equal(game.snapshot.phase, 'complete');
});

test('배정만 된 이상은 기록하지 않고 실제 접근한 이상은 실패 후에도 중복 없이 남긴다', () => {
  const game = new LaboratoryGame();
  game.reset('giant-door');
  exit(game, -1);
  advance(game, 0.6);
  assert.deepEqual(game.snapshot.encountered, []);
  advance(game, 2, 1);
  assert.deepEqual(game.snapshot.encountered, ['giant-door']);
  exit(game, 1);
  advance(game, 1.5);
  assert.equal(game.snapshot.progress, 0);
  assert.deepEqual(game.snapshot.encountered, ['giant-door']);
  advance(game, 2, 1);
  assert.deepEqual(game.snapshot.encountered, ['giant-door']);
  game.previewExit();
  advance(game, 0.6);
  exit(game, 1);
  advance(game, 0.3);
  assert.deepEqual(game.snapshot.encountered, ['giant-door']);
  game.reset();
  assert.deepEqual(game.snapshot.encountered, []);
});

function approachPipes(game) {
  for (let tick = 0; tick < 1000; tick++) {
    game.update(step, 1);
    if (game.snapshot.pipeElapsed !== null) return;
  }
  assert.fail('마지막 배관 접근으로 발동하지 않았습니다.');
}

test('배관을 보고 멈추면 안전하고 낙하 종료 후 왼쪽으로 돌아가면 진행한다', () => {
  const game = new LaboratoryGame();
  game.reset('falling-pipe');
  approachPipes(game);
  advance(game, 1);
  assert.equal(game.snapshot.phase, 'playing');
  assert.equal(game.snapshot.hitElapsed, null);
  exit(game, -1);
  advance(game, 0.6);
  assert.equal(game.snapshot.progress, 1);
});

test('낙하를 보고 반응한 뒤 플래시점프하면 2번 또는 1번에 맞고 0번으로 돌아간다', () => {
  for (const reaction of [0.3, 0.4, 0.5]) {
    const game = new LaboratoryGame();
    game.reset('falling-pipe');
    exit(game, -1);
    advance(game, 0.6);
    assert.equal(game.snapshot.progress, 1);
    approachPipes(game);
    advance(game, reaction);
    game.jump(-1);
    game.jump(-1);
    for (let tick = 0; tick < 120 && game.snapshot.phase === 'playing'; tick++)
      game.update(step, -1);
    assert.equal(game.snapshot.hitElapsed, 0);
    assert.ok(game.snapshot.player.x > 1400 && game.snapshot.player.x < 1640);
    const impactPosition = game.snapshot.player;
    game.jump(1);
    advance(game, 0.1, 1);
    assert.deepEqual(game.snapshot.player, impactPosition);
    advance(game, 0.15);
    assert.equal(game.snapshot.progress, 0);
    assert.equal(game.snapshot.previousRoom, 1);
    assert.notEqual(game.snapshot.failureElapsed, null);
    assert.equal(game.snapshot.hitElapsed, null);
    assert.deepEqual(game.snapshot.encountered, ['falling-pipe']);
    advance(game, 1.5);
    assert.equal(game.snapshot.phase, 'playing');
    assert.equal(game.snapshot.player.x, 360);
    assert.equal(game.snapshot.pipeElapsed, null);
  }
});
