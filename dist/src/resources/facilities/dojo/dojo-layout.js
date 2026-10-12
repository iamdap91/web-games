export const dojoStages = ['weathered', 'patched', 'restored'];
// 그림과 발밑 판정이 같은 건물·계단·소품의 경계를 사용한다.
export const dojoLayout = {
    building: { x: 0, z: -3, width: 8, depth: 5 },
    porch: { x: 0, z: 0.1, width: 8.4, depth: 1.2, height: 0.42 },
    steps: { x: 0, z: 1.15, width: 2.4, depth: 0.9, count: 3 },
    dummy: { x: -3.25, z: 3.25, width: 0.8, depth: 0.8 },
    logs: { x: -5.2, z: -2.2, width: 1.35, depth: 1.6 },
    fence: { x: -6.25, z: 2.1, width: 0.22, depth: 5.2 },
    actor: { radius: 0.27, speed: 3.6, pixelsPerUnit: 32 },
    cameraYaw: 0.28,
};
export function inside(point, bounds) {
    return (Math.abs(point.x - bounds.x) <= bounds.width / 2 &&
        Math.abs(point.z - bounds.z) <= bounds.depth / 2);
}
export const dojoPillars = [-3.85, -1.55, 1.55, 3.85].map((x) => ({
    x,
    z: 0.16,
    width: 0.4,
    depth: 0.4,
}));
export const dojoObstacles = [
    dojoLayout.building,
    dojoLayout.dummy,
    dojoLayout.logs,
    dojoLayout.fence,
    ...dojoPillars,
];
