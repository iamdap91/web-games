export function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}
export function smooth(value: number): number {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
}
export const ceiling = {
  start: 700,
  trigger: 1080,
  edge: 1050,
  duration: 0.18,
} as const;
export function ceilingHeight(x: number, slam: number | null): number {
  const warning =
    145 * smooth((x - ceiling.start) / (ceiling.trigger - ceiling.start));
  return slam === null
    ? warning
    : 145 + 139 * clamp(slam / ceiling.duration) ** 2;
}
export function roomTurn(elapsed: number | null): number {
  return elapsed === null ? 0 : smooth(elapsed / roomFlip.duration);
}

export const roomFlip = { duration: 1.4, returnDistance: 180 } as const;
