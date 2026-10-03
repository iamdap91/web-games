import type { GameSnapshot } from './game.js';

export const stagePanels = [800, 1320, 1840] as const;
export const panelWidth = 520;
export const frameTriggerX = 2100;
export function cameraPosition(x: number): number {
  return Math.max(0, Math.min(1400, x - 400));
}
function smooth(value: number): number {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}
export function frameEdge(state: GameSnapshot): number {
  if (state.scenario !== 'frame-escape' || state.anomaly.activeElapsed === null)
    return 1000;
  return 1000 - 240 * smooth(state.anomaly.activeElapsed / 0.55);
}
export function panelAngle(playerX: number, index: number): number {
  return -105 * smooth((playerX - 820 - index * 95) / 900);
}
