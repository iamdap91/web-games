export const villageTerrain = {
    upperHeight: 2.4,
    stairsCenterX: 1.2,
    stairsBottomZ: 1.8,
    stairsTopZ: -3.4,
    stairsHalfWidth: 1.65,
    stairCount: 13,
    rampEdgeX: 7.2,
    rampBottomZ: 4,
    rampTopZ: -6.2,
    bounds: 13.2,
};
export const villagePoints = [
    { id: 'fire', name: '온빛 화덕', x: -4.5, z: 4.4 },
    { id: 'dojo', name: '언덕 도장', x: 1.2, z: -4.4 },
    { id: 'rest', name: '나무 뒤 쉼터', x: 9.0, z: -9.4 },
];
export const villageBuildings = [
    { x: -8.8, z: 4.7, w: 3.6, d: 3.0, h: 2.6, title: '茶 屋' },
    { x: 4.8, z: 1.9, w: 3.3, d: 3.0, h: 2.5, title: '木 工' },
    { x: -7.6, z: -7.2, w: 3.7, d: 3.2, h: 2.8, title: '薬 房' },
    { x: 0.8, z: -7.0, w: 6.4, d: 3.2, h: 2.8, title: '虎 道 場' },
];
export const villageTrees = [
    [-12.2, 8, 1.3],
    [-10.8, 10.8, 0.9],
    [-12.3, 1.5, 1.15],
    [-11.9, -6.6, 1.3],
    [-8.8, -12.3, 1.0],
    [-4.6, -12, 1.3],
    [2.4, -12.9, 1.0],
    [5.9, -12.1, 1.35],
    [11.9, -11.7, 1.1],
    [10.2, -6.5, 1.25],
    [12.5, -3.4, 0.8],
    [11.6, 6.5, 1.0],
    [8.2, 11.5, 0.95],
    [-6.1, 10.1, 0.42],
    [6.2, 9.1, 0.45],
];
export const villagePaths = [
    [
        { x: -1.2, z: 11.2 },
        { x: -2.1, z: 8.2 },
        { x: -0.1, z: 5.5 },
        { x: 1.2, z: 1.8 },
        { x: 1.2, z: -4.4 },
    ],
    [
        { x: -0.1, z: 5.5 },
        { x: -3.0, z: 6.0 },
        { x: -4.5, z: 4.4 },
        { x: -3.8, z: 1.8 },
        { x: -1, z: 0.4 },
        { x: 1.2, z: 1.8 },
    ],
    [
        { x: -0.1, z: 5.5 },
        { x: 3.0, z: 5.5 },
        { x: 7.5, z: 4.6 },
        { x: 9.0, z: 1.7 },
        { x: 8.7, z: -3.8 },
        { x: 8.5, z: -7.5 },
        { x: 9, z: -9.4 },
        { x: 5.8, z: -10.6 },
        { x: 4.9, z: -4.5 },
        { x: 1.2, z: -4.4 },
    ],
];
export function villageHeight({ x, z }) {
    const t = villageTerrain;
    if (x >= t.rampEdgeX && z < t.rampBottomZ)
        return Math.min(t.upperHeight, ((t.rampBottomZ - z) / (t.rampBottomZ - t.rampTopZ)) * t.upperHeight);
    if (z <= t.stairsTopZ)
        return t.upperHeight;
    if (Math.abs(x - t.stairsCenterX) <= t.stairsHalfWidth &&
        z < t.stairsBottomZ) {
        const step = Math.ceil(((t.stairsBottomZ - z) / (t.stairsBottomZ - t.stairsTopZ)) * t.stairCount);
        return Math.min(t.upperHeight, (step * t.upperHeight) / t.stairCount);
    }
    // 흙광장과 길은 평탄하게 유지하고 가장자리 식생에만 낮은 자연 언덕을 둔다.
    return (0.28 * Math.exp(-(((x + 11) / 2.6) ** 2 + ((z + 0.8) / 4.8) ** 2)) +
        0.2 * Math.exp(-(((x - 11.5) / 2.6) ** 2 + ((z - 8) / 4) ** 2)));
}
export function distanceToVillagePath(point) {
    let distance = Infinity;
    for (const path of villagePaths)
        for (let i = 1; i < path.length; i++) {
            const a = path[i - 1], b = path[i];
            if (!a || !b)
                continue;
            const dx = b.x - a.x, dz = b.z - a.z;
            const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.z - a.z) * dz) / (dx * dx + dz * dz)));
            distance = Math.min(distance, Math.hypot(point.x - a.x - t * dx, point.z - a.z - t * dz));
        }
    return distance;
}
export function isVillageWalkable({ x, z }) {
    if (!Number.isFinite(x) ||
        !Number.isFinite(z) ||
        Math.max(Math.abs(x), Math.abs(z)) > villageTerrain.bounds)
        return false;
    if (Math.hypot(x + 5.3, z - 3.3) < 0.9)
        return false;
    if (villageTrees.some(([tx, tz, scale]) => Math.hypot(x - tx, z - tz) < 0.28 * scale + 0.26))
        return false;
    return !villageBuildings.some((b) => Math.abs(x - b.x) < b.w / 2 + 0.26 && Math.abs(z - b.z) < b.d / 2 + 0.26);
}
export function canVillageStep(from, to) {
    return (isVillageWalkable(to) &&
        Math.abs(villageHeight(to) - villageHeight(from)) < 0.32);
}
export function villageRoute(from, to) {
    if (!isVillageWalkable(to))
        return [];
    const size = 0.4;
    const start = { x: Math.round(from.x / size), z: Math.round(from.z / size) };
    const goal = { x: Math.round(to.x / size), z: Math.round(to.z / size) };
    const key = (p) => `${p.x},${p.z}`;
    const world = (p) => ({
        x: p.x * size,
        z: p.z * size,
    });
    const open = [start], parents = new Map(), costs = new Map([[key(start), 0]]);
    const score = (p) => (costs.get(key(p)) ?? Infinity) +
        Math.abs(p.x - goal.x) +
        Math.abs(p.z - goal.z);
    for (let attempt = 0; open.length && attempt < 6000; attempt++) {
        open.sort((a, b) => score(a) - score(b));
        const current = open.shift();
        if (!current)
            break;
        if (key(current) === key(goal)) {
            const result = [to];
            let next = current;
            while (key(next) !== key(start)) {
                result.unshift(world(next));
                const previous = parents.get(key(next));
                if (!previous)
                    break;
                next = previous;
            }
            return result;
        }
        for (const offset of [
            { x: 1, z: 0 },
            { x: -1, z: 0 },
            { x: 0, z: 1 },
            { x: 0, z: -1 },
        ]) {
            const next = { x: current.x + offset.x, z: current.z + offset.z };
            if (!canVillageStep(world(current), world(next)))
                continue;
            const cost = (costs.get(key(current)) ?? 0) +
                1 +
                Math.min(0.4, distanceToVillagePath(world(next)) * 0.08);
            if (cost >= (costs.get(key(next)) ?? Infinity))
                continue;
            costs.set(key(next), cost);
            parents.set(key(next), current);
            if (!open.some((p) => key(p) === key(next)))
                open.push(next);
        }
    }
    return [];
}
