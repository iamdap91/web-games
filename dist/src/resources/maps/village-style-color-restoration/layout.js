export const restorationRules = {
    speed: 4.2,
    radius: 0.22,
    grid: 0.3,
    seconds: 2.4,
    interactionDistance: 1.05,
};
export const colorEntrance = { x: -8, z: 6 };
export const colorPlaces = [
    { id: 'workshop', label: '안료 공방', x: -7, z: 0.5, region: 0 },
    { id: 'teahouse', label: '동쪽 찻집', x: 6, z: 0, region: 1 },
    { id: 'room', label: '새로 생긴 다락방', x: 6, z: -5.5, region: 1 },
];
export const colorFloors = {
    west: { x: -7, z: 1.5, width: 10, depth: 15 },
    east: { x: 6.8, z: 1.8, width: 9.6, depth: 8.4 },
    firstBridge: { x: 0, z: 0, width: 4.4, depth: 2 },
    returnBridge: { x: 0, z: 5.3, width: 4.4, depth: 1.9 },
    room: { x: 6, z: -4.6, width: 4.4, depth: 6.4 },
};
export const workshopBody = { x: -7.2, z: -2.4, width: 4.8, depth: 3.2 };
export const teahouseBody = { x: 6, z: -2.8, width: 4.4, depth: 2.8 };
export const colorTrees = [
    { x: -11, z: -4.5, radius: 0.5, region: 0 },
    { x: -3.2, z: -3.8, radius: 0.5, region: 0 },
    { x: -10.8, z: 7.2, radius: 0.5, region: 0 },
    { x: 10.4, z: -0.8, radius: 0.5, region: 1 },
    { x: 10.3, z: 5.1, radius: 0.5, region: 1 },
];
export const roomWalls = [
    { x: 3.8, z: -4.6, width: 0.22, depth: 6.4 },
    { x: 8.2, z: -4.6, width: 0.22, depth: 6.4 },
    { x: 6, z: -7.8, width: 4.4, depth: 0.22 },
    { x: 4.55, z: -1.4, width: 1.5, depth: 0.22 },
    { x: 7.45, z: -1.4, width: 1.5, depth: 0.22 },
];
export const roomFurniture = [
    { x: 7.1, z: -5.6, width: 1.0, depth: 2.1 },
    { x: 4.7, z: -6.8, width: 1.0, depth: 0.65 },
];
export function insideRect(point, rect, inset = 0) {
    return (Math.abs(point.x - rect.x) <= rect.width / 2 - inset &&
        Math.abs(point.z - rect.z) <= rect.depth / 2 - inset);
}
/** 바닥의 동일한 사각형이 그림·보행·경로와 생성 완료 판정의 기준이다. */
export function restorationFloors(stage) {
    return [
        colorFloors.west,
        colorFloors.east,
        ...(stage >= 1 ? [colorFloors.firstBridge] : []),
        ...(stage === 2 ? [colorFloors.returnBridge, colorFloors.room] : []),
    ];
}
function blocked(point, rect) {
    return insideRect(point, {
        ...rect,
        width: rect.width + restorationRules.radius * 2,
        depth: rect.depth + restorationRules.radius * 2,
    });
}
export function canWalkColor(point, stage) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.z))
        return false;
    const floors = restorationFloors(stage);
    // 인물 반지름 전체가 땅 위에 있는지를 네 방향 표본으로 검사해 다리 접합부는 열어 둔다.
    for (const offset of [
        { x: 0, z: 0 },
        { x: restorationRules.radius, z: 0 },
        { x: -restorationRules.radius, z: 0 },
        { x: 0, z: restorationRules.radius },
        { x: 0, z: -restorationRules.radius },
    ]) {
        if (!floors.some((rect) => insideRect({ x: point.x + offset.x, z: point.z + offset.z }, rect)))
            return false;
    }
    if (blocked(point, workshopBody))
        return false;
    if (stage < 2 && blocked(point, teahouseBody))
        return false;
    if (stage === 2 &&
        [...roomWalls, ...roomFurniture].some((rect) => blocked(point, rect)))
        return false;
    return !colorTrees.some((tree) => Math.hypot(point.x - tree.x, point.z - tree.z) <
        tree.radius + restorationRules.radius);
}
function clearLine(from, to, stage) {
    const count = Math.max(1, Math.ceil(Math.hypot(from.x - to.x, from.z - to.z) / 0.06));
    for (let i = 0; i <= count; i++)
        if (!canWalkColor({
            x: from.x + ((to.x - from.x) * i) / count,
            z: from.z + ((to.z - from.z) * i) / count,
        }, stage))
            return false;
    return true;
}
export function colorRoute(from, to, stage) {
    if (!canWalkColor(from, stage) || !canWalkColor(to, stage))
        return [];
    if (clearLine(from, to, stage))
        return [to];
    const cell = restorationRules.grid;
    const key = (p) => `${Math.round(p.x / cell)},${Math.round(p.z / cell)}`;
    const nearby = (point) => {
        const center = {
            x: Math.round(point.x / cell) * cell,
            z: Math.round(point.z / cell) * cell,
        }, candidates = [];
        for (let x = -1; x <= 1; x++)
            for (let z = -1; z <= 1; z++)
                candidates.push({ x: center.x + x * cell, z: center.z + z * cell });
        return candidates
            .sort((a, b) => Math.hypot(a.x - point.x, a.z - point.z) -
            Math.hypot(b.x - point.x, b.z - point.z))
            .find((p) => clearLine(point, p, stage));
    };
    const start = nearby(from), end = nearby(to);
    if (!start || !end)
        return [];
    const queue = [start], parents = new Map([[key(start), null]]);
    for (let head = 0; head < queue.length && head < 10000; head++) {
        const p = queue[head];
        if (key(p) === key(end))
            break;
        for (const offset of [
            { x: cell, z: 0 },
            { x: -cell, z: 0 },
            { x: 0, z: cell },
            { x: 0, z: -cell },
        ]) {
            const next = { x: p.x + offset.x, z: p.z + offset.z };
            if (!parents.has(key(next)) && clearLine(p, next, stage)) {
                parents.set(key(next), p);
                queue.push(next);
            }
        }
    }
    if (!parents.has(key(end)))
        return [];
    const route = [to];
    let cursor = end;
    while (cursor && key(cursor) !== key(start)) {
        route.push(cursor);
        cursor = parents.get(key(cursor)) ?? null;
    }
    route.reverse();
    const simplified = [];
    let anchor = from;
    for (let i = 0; i < route.length; i++)
        if (!route[i + 1] || !clearLine(anchor, route[i + 1], stage)) {
            simplified.push(route[i]);
            anchor = route[i];
        }
    return simplified;
}
