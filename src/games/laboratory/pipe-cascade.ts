export const pipes = [
  { x: 1460, width: 68, delay: 0 },
  { x: 1580, width: 74, delay: 0.14 },
  { x: 1700, width: 80, delay: 0.28 },
  { x: 1820, width: 86, delay: 0.42 },
  { x: 1940, width: 92, delay: 0.56 },
] as const;

export const pipeTriggerX = pipes[0].x;
const fallDuration = 0.18;
const impactDuration = 0.2;

export function pipeFall(elapsed: number | null, delay: number): number {
  if (elapsed === null || elapsed <= delay) return 0;
  return Math.min(1, ((elapsed - delay) / fallDuration) ** 2);
}

export function pipeShake(elapsed: number | null): number {
  if (elapsed === null) return 0;
  let shake = 0;
  for (const pipe of pipes) {
    const impact = elapsed - pipe.delay - fallDuration;
    if (impact < 0 || impact >= impactDuration) continue;
    // 낙하 순간이 아니라 바닥에 닿는 순간에만 짧게 반응한다.
    shake += Math.sin(impact * 90) * 3 * (1 - impact / impactDuration);
  }
  return Math.max(-4, Math.min(4, shake));
}
