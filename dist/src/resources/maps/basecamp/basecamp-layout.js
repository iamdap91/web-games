// 기존 시설의 제작 좌표는 유지하고, 렌더링과 보행이 같은 배치 이동량을 사용한다.
export const basecampLayout = {
    grounds: { x: -2.7, z: 1.5, width: 41.4, depth: 27 },
    spawn: { x: 1.3, z: 6.5 },
    placements: {
        dojo: { x: -16.5, z: 0 },
        smithy: { x: -5.5, z: 7.2 },
        kitchen: { x: 2, z: 1 },
    },
};
export const basecampSouthZ = basecampLayout.grounds.z + basecampLayout.grounds.depth / 2;
// 출구의 폭·끝은 지형과 보행이 공유하고, 통로 안에서 Space로 출발한다.
export const basecampExpeditionExit = {
    x: 0,
    z: basecampSouthZ,
    width: 3.6,
    endZ: basecampSouthZ + 3,
};
export const basecampExpeditionGate = {
    x: basecampExpeditionExit.x,
    z: basecampExpeditionExit.z + 1.4,
};
export const basecampBattleReturnSpawn = {
    x: basecampExpeditionGate.x,
    z: basecampExpeditionGate.z - 2.8,
};
export const basecampExpeditionSign = {
    x: basecampExpeditionExit.x + basecampExpeditionExit.width / 2 + 0.7,
    z: basecampExpeditionExit.z - 2.4,
    radius: 0.25,
};
// 무도장 오른쪽을 돌아 뒤편으로 나가는 숲길. 그림·출발 판정·귀환 위치가 함께 쓴다.
export const basecampForestGate = { x: -13.4, z: -13.2, width: 3.2 };
export const basecampReturnSpawn = {
    x: basecampForestGate.x + 1,
    z: basecampForestGate.z + 3.5,
};
export const basecampForestPath = [
    { x: -12.3, z: 4.4 },
    { x: -10.5, z: 1.2 },
    { x: -10.7, z: -5.5 },
    basecampReturnSpawn,
    basecampForestGate,
    { x: -14.6, z: -17.5 },
    { x: -18, z: -25 },
];
export const basecampTrees = [
    { x: -21, z: -8.5, size: 1.55 },
    { x: -7.4, z: -5.8, size: 1.05 },
    { x: -9.1, z: 8.9, size: 1.05 },
    { x: 8.7, z: -9.4, size: 1.7 },
    { x: 16, z: -4, size: 1.25 },
];
export function placeFootprint(bounds, offset) {
    return { ...bounds, x: bounds.x + offset.x, z: bounds.z + offset.z };
}
// 지면의 윤곽은 그림·비탈·보행이 함께 쓴다. 숲길과 남쪽 원정 통로를 연다.
export const basecampBoundary = [
    { x: -24, z: -8.6 },
    { x: -21.5, z: -12.4 },
    {
        x: basecampForestGate.x - basecampForestGate.width / 2,
        z: basecampForestGate.z,
    },
    {
        x: basecampForestGate.x + basecampForestGate.width / 2,
        z: basecampForestGate.z,
    },
    { x: -5, z: -12.2 },
    { x: 1, z: -13.4 },
    { x: 8.5, z: -11.8 },
    { x: 14.5, z: -11 },
    { x: 17.8, z: -7.8 },
    { x: 18.6, z: -1.8 },
    { x: 17.4, z: 3.5 },
    { x: 18.1, z: 8.2 },
    { x: 15.1, z: 11.8 },
    { x: 9, z: 13.1 },
    { x: 4.5, z: 14.2 },
    { x: 2.7, z: basecampSouthZ },
    { x: basecampExpeditionExit.width / 2, z: basecampExpeditionExit.z },
    { x: basecampExpeditionExit.width / 2, z: basecampExpeditionExit.endZ },
    { x: -basecampExpeditionExit.width / 2, z: basecampExpeditionExit.endZ },
    { x: -basecampExpeditionExit.width / 2, z: basecampExpeditionExit.z },
    { x: -2.7, z: basecampSouthZ },
    { x: -7.3, z: 15.4 },
    { x: -12.8, z: 15.4 },
    { x: -17.2, z: 15 },
    { x: -21, z: 11.4 },
    { x: -23, z: 7.8 },
    { x: -24.2, z: 3.1 },
    { x: -23.4, z: -3.2 },
];
/** 출구를 지형 테두리나 외곽 소품으로 다시 막지 않도록 같은 구간을 비운다. */
export function isBasecampExitEdge(a, b) {
    return ((a.z === basecampForestGate.z && b.z === basecampForestGate.z) ||
        (a.z >= basecampExpeditionExit.z &&
            b.z >= basecampExpeditionExit.z &&
            Math.abs(a.x - basecampExpeditionExit.x) <=
                basecampExpeditionExit.width / 2 &&
            Math.abs(b.x - basecampExpeditionExit.x) <=
                basecampExpeditionExit.width / 2));
}
export function insideBasecampGround(point, radius) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.z))
        return false;
    let inside = false;
    for (let i = 0; i < basecampBoundary.length; i++) {
        const a = basecampBoundary[i];
        const b = basecampBoundary[(i + 1) % basecampBoundary.length];
        const dx = b.x - a.x, dz = b.z - a.z;
        const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.z - a.z) * dz) / (dx * dx + dz * dz)));
        if (Math.hypot(point.x - a.x - t * dx, point.z - a.z - t * dz) <
            radius - 1e-8)
            return false;
        if (a.z > point.z !== b.z > point.z &&
            point.x < a.x + ((point.z - a.z) * dx) / dz)
            inside = !inside;
    }
    return inside;
}
