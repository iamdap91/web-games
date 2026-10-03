import { playerBody } from './layout.js';

export const pipes = [
  { x: 1460, width: 68, delay: 0.78 },
  { x: 1580, width: 74, delay: 0.56 },
  { x: 1700, width: 80, delay: null },
  { x: 1820, width: 86, delay: null },
  { x: 1940, width: 92, delay: 0 },
] as const;

export const pipeTriggerX = 1720;
export const pipeShape = { top: -190, height: 300, travel: 225 } as const;
const fallDuration = 0.18;
const impactDuration = 0.2;

type Position = { readonly x: number; readonly y: number };

export function pipeFall(elapsed: number | null, delay: number | null): number {
  if (elapsed === null || delay === null || elapsed <= delay) return 0;
  return Math.min(1, ((elapsed - delay) / fallDuration) ** 2);
}

export function pipeHitsPlayer(
  before: number,
  after: number,
  from: Position,
  to: Position,
): boolean {
  if (after <= before) return false;
  return pipes.some((pipe) => {
    if (pipe.delay === null) return false;
    const start = Math.max(before, pipe.delay);
    const end = Math.min(after, pipe.delay + fallDuration);
    if (end <= start) return false;
    // 낙하 중인 시간만 검사해 빠른 점프와 마지막 낙하 틱도 빠뜨리지 않는다.
    const positionAt = (time: number): Position => {
      const ratio = (time - before) / (after - before);
      return {
        x: from.x + (to.x - from.x) * ratio,
        y: from.y + (to.y - from.y) * ratio,
      };
    };
    const first = positionAt(start);
    const last = positionAt(end);
    const bottom =
      pipeShape.top +
      pipeShape.height +
      pipeShape.travel * pipeFall(end, pipe.delay);
    const top = pipeShape.top + pipeShape.travel * pipeFall(start, pipe.delay);
    // 머리카락·잔상은 제외하고 몸통과 머리의 안쪽을 판정한다.
    return (
      Math.max(first.x, last.x) + playerBody.halfWidth >
        pipe.x - pipe.width / 2 &&
      Math.min(first.x, last.x) - playerBody.halfWidth <
        pipe.x + pipe.width / 2 &&
      Math.min(first.y, last.y) - playerBody.height < bottom &&
      Math.max(first.y, last.y) - playerBody.footInset > top
    );
  });
}

export function pipeShake(elapsed: number | null): number {
  if (elapsed === null) return 0;
  let shake = 0;
  for (const pipe of pipes) {
    if (pipe.delay === null) continue;
    const impact = elapsed - pipe.delay - fallDuration;
    if (impact < 0 || impact >= impactDuration) continue;
    // 낙하 순간이 아니라 바닥에 닿는 순간에만 짧게 반응한다.
    shake += Math.sin(impact * 90) * 3 * (1 - impact / impactDuration);
  }
  return Math.max(-4, Math.min(4, shake));
}

export class PipeCascade {
  private elapsed: number | null = null;

  update(
    seconds: number,
    player: Position,
    previous: Position,
  ): 'triggered' | 'hit' | null {
    if (this.elapsed !== null) {
      const before = this.elapsed;
      this.elapsed += seconds;
      return pipeHitsPlayer(before, this.elapsed, previous, player)
        ? 'hit'
        : null;
    }
    if (previous.x >= pipeTriggerX || player.x < pipeTriggerX) return null;
    this.elapsed = 0;
    return 'triggered';
  }

  get activeElapsed(): number | null {
    return this.elapsed;
  }
}
