import { world, viewport } from './layout.js';
import { smooth } from './event-rules.js';
export const stagePanels = [800, 1320, 1840];
export const returnPanels = [-240, 280];
export const panelWidth = 520;
export function cameraPosition(x) {
    return Math.max(0, Math.min(world.width - viewport.width, x - 400));
}
export function roomCameraPosition(state) {
    const x = state.player.x;
    if (state.scenario !== 'escaping-exit' || !state.rightExit.revealed)
        return cameraPosition(x);
    let camera = x < 360 ? x - 360 : x > 2040 ? x - 640 : cameraPosition(x);
    // 멀어진 문은 서서히 놓아 주어 반대 출구로 돌아갈 때 카메라가 붙잡히지 않는다.
    if (state.exit.revealed) {
        const near = 1 - smooth((Math.abs(x - state.exit.x) - 600) / 300);
        camera += Math.min(0, state.exit.x - 105 - camera) * near;
    }
    const near = 1 - smooth((Math.abs(x - state.rightExit.x) - 600) / 300);
    camera += Math.max(0, state.rightExit.x - 895 - camera) * near;
    return camera;
}
export function frameEdge(state) {
    if (state.scenario !== 'frame-escape' || state.anomaly.activeElapsed === null)
        return viewport.width;
    if (state.chase.phase === 'chasing' || state.chase.phase === 'falling') {
        return Math.max(0, Math.min(viewport.width, state.chase.boundary - cameraPosition(state.player.x)));
    }
    return openingFrameEdge(state.anomaly.activeElapsed);
}
export function openingFrameEdge(elapsed) {
    return viewport.width - 240 * smooth(elapsed / 0.55);
}
export function panelAngle(playerX, index) {
    return -105 * smooth((playerX - 820 - index * 95) / 900);
}
export function returnPanelAngle(playerX, index) {
    return 105 * smooth((1250 - playerX - (1 - index) * 95) / 600);
}
export function stagePanelViews(state) {
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
