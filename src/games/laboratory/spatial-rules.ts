import type { GameSnapshot } from './game.js';

export const stagePanels = [800, 1320, 1840] as const;
export const returnPanels = [-240, 280] as const;
export const panelWidth = 520;
export const frameTriggerX = 2100;
export function cameraPosition(x: number): number {
  return Math.max(0, Math.min(1400, x - 400));
}
export function roomCameraPosition(state: GameSnapshot): number {
  if (state.scenario === 'escaping-exit' && state.exit.revealed)
    return Math.min(
      cameraPosition(state.player.x),
      state.player.x - 360,
      state.exit.x - 105,
    );
  return cameraPosition(state.player.x);
}
function smooth(value: number): number {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}
export function frameEdge(state: GameSnapshot): number {
  if (state.scenario !== 'frame-escape' || state.anomaly.activeElapsed === null)
    return 1000;
  if (state.chase.phase === 'chasing' || state.chase.phase === 'falling') {
    return Math.max(
      0,
      Math.min(1000, state.chase.boundary - cameraPosition(state.player.x)),
    );
  }
  return openingFrameEdge(state.anomaly.activeElapsed);
}
export function openingFrameEdge(elapsed: number): number {
  return 1000 - 240 * smooth(elapsed / 0.55);
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
