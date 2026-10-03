import type { GameSnapshot } from './game.js';

export const stagePanels = [800, 1320, 1840] as const;
export const returnPanels = [-240, 280] as const;
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

export function returnPanelAngle(playerX: number, index: number): number {
  return 105 * smooth((1250 - playerX - (1 - index) * 95) / 600);
}
export function stagePanelViews(state: GameSnapshot) {
  return [
    ...stagePanels.map((x, index) => ({
      x,
      angle: panelAngle(state.player.x, index),
      reverse: false,
      visible: true,
    })),
    ...returnPanels.map((x, index) => ({
      x,
      angle: returnPanelAngle(state.player.x, index),
      reverse: true,
      visible: state.anomaly.backstageReturning,
    })),
  ];
}
