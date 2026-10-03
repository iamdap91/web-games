import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  pipes,
  pipeFall,
  pipeShake,
  pipeHitsPlayer,
} from '../dist/src/games/laboratory/pipe-cascade.js';

test('5 → 2 → 1번만 낙하하고 3·4번은 천장에 남는다', () => {
  const falls = (time) => pipes.map((pipe) => pipeFall(time, pipe.delay));
  assert.deepEqual(falls(null), [0, 0, 0, 0, 0]);
  assert.deepEqual(falls(0.1).slice(0, 4), [0, 0, 0, 0]);
  assert.ok(falls(0.1)[4] > 0 && falls(0.1)[4] < 1);
  assert.equal(falls(0.35)[4], 1);
  assert.ok(falls(0.35)[1] > 0 && falls(0.35)[1] < 1);
  assert.equal(falls(0.35)[0], 0);
  assert.ok(falls(0.55)[0] > 0 && falls(0.55)[0] < 1);
  assert.deepEqual(falls(1), [1, 1, 0, 0, 1]);
  assert.deepEqual(falls(20), [1, 1, 0, 0, 1]);
});

test('흔들림은 충돌마다 짧게 발생한 후 사라진다', () => {
  assert.equal(pipeShake(null), 0);
  assert.equal(pipeShake(0.1), 0);
  for (const pipe of pipes.filter((pipe) => pipe.delay !== null))
    assert.notEqual(pipeShake(pipe.delay + 0.21), 0);
  for (let time = 0; time <= 1; time += 0.01)
    assert.ok(Math.abs(pipeShake(time)) <= 4);
  assert.equal(pipeShake(1), 0);
});

test('낙하 중 몸체와만 충돌하고 끝난 배관·빈 구간·잔상에는 충돌하지 않는다', () => {
  const body = { x: 1940, y: 340 };
  assert.equal(pipeHitsPlayer(0, 0.1, body, body), false);
  assert.equal(pipeHitsPlayer(0.15, 0.19, body, body), true);
  assert.equal(pipeHitsPlayer(0.19, 0.3, body, body), false);
  assert.equal(
    pipeHitsPlayer(0, 1, { x: 1700, y: 340 }, { x: 1700, y: 340 }),
    false,
  );
  assert.equal(
    pipeHitsPlayer(0.15, 0.18, { x: 2010, y: 340 }, { x: 2010, y: 340 }),
    false,
  );
  assert.equal(
    pipeHitsPlayer(0.1, 0.15, { x: 1940, y: 240 }, { x: 1940, y: 230 }),
    true,
  );
});
