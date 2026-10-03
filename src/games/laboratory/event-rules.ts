export function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}
export function smooth(value: number): number {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
}
export const ceiling = {
  start: 700,
  trigger: 1650,
  edge: 1050,
  duration: 0.18,
} as const;
export function ceilingHeight(x: number, slam: number | null): number {
  const warning = 145 * smooth((x - ceiling.start) / 850);
  return slam === null
    ? warning
    : 145 + 155 * clamp(slam / ceiling.duration) ** 2;
}
export function roomTurn(elapsed: number | null): number {
  return elapsed === null ? 0 : smooth(elapsed / 1.4);
}
