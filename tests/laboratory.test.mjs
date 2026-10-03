import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  LaboratoryGame,
  Player,
  movement,
  world,
  isSelection,
} from '../dist/src/games/laboratory/game.js';

const step = 1 / 120;
function advance(actor, seconds, direction = 0) {
  for (let time = 0; time < seconds; time += step)
    actor.update(step, direction);
}
function exit(game, direction) {
  for (let tick = 0; tick < 1500; tick++) {
    game.update(step, direction);
    if (['result', 'complete'].includes(game.snapshot.phase)) return;
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

test('기준 통로는 정상이며 오른쪽으로 나가도 점수를 주지 않는다', () => {
  const game = new LaboratoryGame(() => 0.9);
  assert.equal(game.snapshot.phase, 'reference');
  assert.equal(game.snapshot.scenario, 'normal');
  advance(game, 1.4, -1);
  assert.equal(game.snapshot.phase, 'reference');
  assert.ok(game.snapshot.player.x > 55);
  exit(game, 1);
  assert.equal(game.snapshot.progress, 0);
  game.continue();
  assert.equal(game.snapshot.scenario, 'falling-pipe');
});

test('정상은 오른쪽, 이상은 왼쪽이 정답이며 오답은 연속 성공을 초기화한다', () => {
  const game = new LaboratoryGame();
  game.reset('normal');
  exit(game, 1);
  assert.equal(game.snapshot.progress, 1);
  game.continue();
  exit(game, -1);
  assert.equal(game.snapshot.progress, 0);
  assert.match(game.snapshot.message, /잘못된 방향/);
  for (const scenario of ['giant-door', 'falling-pipe']) {
    game.reset(scenario);
    exit(game, -1);
    assert.equal(game.snapshot.progress, 1);
    game.continue();
    exit(game, 1);
    assert.equal(game.snapshot.progress, 0);
  }
});

test('8회 연속 성공하면 입력이 멈추고 다시 시작할 수 있다', () => {
  const game = new LaboratoryGame();
  game.reset('giant-door');
  for (let count = 1; count <= 8; count++) {
    exit(game, -1);
    assert.equal(game.snapshot.progress, count);
    if (count < 8) game.continue();
  }
  assert.equal(game.snapshot.phase, 'complete');
  const before = game.snapshot.player;
  game.jump(1);
  advance(game, 1, 1);
  assert.deepEqual(game.snapshot.player, before);
  game.continue();
  assert.equal(game.snapshot.progress, 0);
  assert.equal(game.snapshot.phase, 'playing');
});

test('빠른 접근에도 배관이 발동하고 되돌아가도 초기화되지 않는다', () => {
  const game = new LaboratoryGame();
  game.reset('falling-pipe');
  advance(game, 3.4, 1);
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

test('개발 선택을 유지하고 무작위로 돌아오면 정상 기준 통로부터 시작한다', () => {
  const game = new LaboratoryGame(() => 0.6);
  game.reset('giant-door');
  exit(game, -1);
  game.continue();
  assert.equal(game.snapshot.scenario, 'giant-door');
  game.reset('random');
  assert.equal(game.snapshot.phase, 'reference');
  assert.equal(game.snapshot.progress, 0);
  assert.equal(game.snapshot.scenario, 'normal');
  exit(game, 1);
  game.continue();
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
