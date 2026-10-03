import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  pipes,
  pipeFall,
  pipeShake,
} from '../dist/src/games/laboratory/pipe-cascade.js';

test('배관은 앞에서부터 차례로 움직이고 모두 내린 뒤 그 상태를 유지한다', () => {
  assert.ok(pipes.every((pipe) => pipeFall(null, pipe.delay) === 0));
  const early = pipes.map((pipe) => pipeFall(0.1, pipe.delay));
  assert.ok(early[0] > 0 && early[0] < 1);
  assert.deepEqual(early.slice(1), [0, 0, 0, 0]);
  const middle = pipes.map((pipe) => pipeFall(0.4, pipe.delay));
  assert.deepEqual(middle.slice(0, 2), [1, 1]);
  assert.ok(middle[2] > 0 && middle[2] < 1);
  assert.deepEqual(middle.slice(3), [0, 0]);
  assert.ok(pipes.every((pipe) => pipeFall(0.8, pipe.delay) === 1));
  assert.ok(pipes.every((pipe) => pipeFall(20, pipe.delay) === 1));
});

test('흔들림은 충돌 전에는 없고 충돌마다 짧게 발생한 후 사라진다', () => {
  assert.equal(pipeShake(null), 0);
  assert.equal(pipeShake(0.1), 0);
  for (const pipe of pipes) assert.notEqual(pipeShake(pipe.delay + 0.21), 0);
  for (let time = 0; time <= 1; time += 0.01)
    assert.ok(Math.abs(pipeShake(time)) <= 4);
  assert.equal(pipeShake(1), 0);
  assert.equal(pipeShake(20), 0);
});
