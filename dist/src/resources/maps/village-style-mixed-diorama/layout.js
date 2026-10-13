export const mixedDioramaRules = {
    radius: 0.28,
    speed: 4.6,
    interactionDistance: 1.8,
    ground: 0.1,
    terrace: 1.7,
    frontSteps: 8,
    sideSteps: 6,
    maxStep: 0.29,
};
export const mixedDioramaPlaces = [
    {
        id: 'hearth',
        label: '안료 화덕 마당',
        x: -4.5,
        z: 3.4,
        description: '작은 화덕에 불씨를 넣었다. 푸른 돌계단으로 도장을 복구한 뒤 담 뒤 쉼터를 찾아보자.',
    },
    {
        id: 'dojo',
        label: '붓결 도장',
        x: -2.8,
        z: -4.9,
        description: '처마 아래 비어 있던 마당. R로 도장과 천 기둥을 되살리면 훈련 북과 빛이 돌아온다.',
    },
    {
        id: 'rest',
        label: '담 뒤 천 쉼터',
        x: 9,
        z: -6.7,
        description: '담 뒤 천 쉼터에 도착했다. 북쪽 다리로 짧게 돌아갈까, 굽은 수로 끝과 남쪽 천시장을 지나 귀환할까?',
    },
];
export const mixedDioramaBuildings = [
    { x: -2.8, z: -7.3, width: 5.8, depth: 3.4, height: 3.8 },
    { x: -8, z: 2, width: 3.2, depth: 3.8, height: 2.8 },
];
export const mixedDioramaOutline = [
    { x: -12, z: -11 },
    { x: 4, z: -12 },
    { x: 10, z: -9 },
    { x: 12, z: -2 },
    { x: 10, z: 5 },
    { x: 5, z: 10 },
    { x: -3, z: 12 },
    { x: -12, z: 9 },
];
export const mixedDioramaRiver = [
    { x: 5, z: -11.9 },
    { x: 5, z: -2 },
    { x: 8, z: 0.5 },
    { x: 8.7, z: 3.4 },
];
export const mixedDioramaBridgeCenters = [-5.2];
export const mixedDioramaShrubs = [
    [-11, -9],
    [-11, 7],
    [-7, 10],
    [7, 7],
    [8, -10],
    [-1, -11],
];
export const mixedDioramaStalls = [
    { x: -1.5, z: 6.8 },
    { x: 2.4, z: 6.2 },
];
export const mixedDioramaWall = {
    x: 7.4,
    z: -4.2,
    width: 0.45,
    depth: 5.2,
    height: 2.65,
};
export function onBridge(point) {
    return point.x >= 3.25 && point.x <= 6.75 && Math.abs(point.z + 5.2) < 0.94;
}
export function groundHeight(point) {
    const r = mixedDioramaRules, rise = r.terrace - r.ground;
    if (onBridge(point))
        return (r.ground +
            0.25 *
                Math.sin(Math.PI * Math.max(0, Math.min(1, (point.x - 3.25) / 3.5))));
    if (Math.abs(point.x + 2.8) <= 1.25 && point.z >= -4.5 && point.z <= -1.8)
        return (r.ground +
            (Math.min(r.frontSteps, Math.floor((-point.z - 1.8) / (2.7 / r.frontSteps)) + 1) *
                rise) /
                r.frontSteps);
    if (point.x >= 0.9 && point.x <= 2.4 && point.z >= -7.5 && point.z <= -5)
        return (r.ground +
            (Math.max(0, r.sideSteps - Math.floor((point.x - 0.9) / (1.5 / r.sideSteps))) *
                rise) /
                r.sideSteps);
    if (point.x >= -6.2 && point.x <= 0.9 && point.z >= -9.5 && point.z <= -4.5)
        return r.terrace;
    return r.ground;
}
function inside(point) {
    let result = false;
    for (let i = 0, j = mixedDioramaOutline.length - 1; i < mixedDioramaOutline.length; j = i++) {
        const a = mixedDioramaOutline[i], b = mixedDioramaOutline[j];
        if (a.z > point.z !== b.z > point.z &&
            point.x < ((b.x - a.x) * (point.z - a.z)) / (b.z - a.z) + a.x)
            result = !result;
    }
    return result;
}
export function distanceToSegment(point, a, b) {
    const dx = b.x - a.x, dz = b.z - a.z, t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.z - a.z) * dz) / (dx * dx + dz * dz)));
    return Math.hypot(point.x - a.x - t * dx, point.z - a.z - t * dz);
}
export function canWalkMixedDiorama(point, options = {}) {
    const r = mixedDioramaRules;
    if (!Number.isFinite(point.x) || !Number.isFinite(point.z))
        return false;
    if (![
        { x: point.x - r.radius, z: point.z },
        { x: point.x + r.radius, z: point.z },
        { x: point.x, z: point.z - r.radius },
        { x: point.x, z: point.z + r.radius },
    ].every(inside))
        return false;
    if (!onBridge(point) &&
        mixedDioramaRiver.some((a, i) => {
            const b = mixedDioramaRiver[i + 1];
            return b && distanceToSegment(point, a, b) < 0.78 + r.radius;
        }))
        return false;
    if (mixedDioramaBuildings.some((b) => Math.hypot(Math.max(0, Math.abs(point.x - b.x) - b.width / 2), Math.max(0, Math.abs(point.z - b.z) - b.depth / 2)) < r.radius))
        return false;
    if (Math.hypot(point.x + 5.1, point.z - 1.7) < 1)
        return false;
    const wall = mixedDioramaWall;
    if (Math.abs(point.x - wall.x) < wall.width / 2 + r.radius &&
        Math.abs(point.z - wall.z) < wall.depth / 2 + r.radius)
        return false;
    if (Math.abs(point.x - 9.5) < 1.2 && Math.abs(point.z + 8) < 0.62)
        return false;
    if (Math.abs(point.x + 7) < 1 && Math.abs(point.z + 0.6) < 0.65)
        return false;
    if (mixedDioramaStalls.some((p) => Math.abs(point.x - p.x) < 1.2 && Math.abs(point.z - p.z) < 0.65))
        return false;
    if (mixedDioramaShrubs.some(([x, z]) => Math.hypot(point.x - x, point.z - z) < 0.4))
        return false;
    if (options.restored && Math.hypot(point.x + 5.2, point.z + 5.1) < 0.68)
        return false;
    return true;
}
export function canStepMixedDiorama(from, to, options = {}) {
    return (canWalkMixedDiorama(to, options) &&
        Math.abs(groundHeight(from) - groundHeight(to)) <= mixedDioramaRules.maxStep);
}
const pathGrid = 0.25;
function gridKey(point) {
    return `${Math.round(point.x / pathGrid)},${Math.round(point.z / pathGrid)}`;
}
function gridPoint(key) {
    const [x = 0, z = 0] = key.split(',').map(Number);
    return { x: x * pathGrid, z: z * pathGrid };
}
/** 클릭한 시설은 가장 가까운 걸을 수 있는 칸까지 접근하며 계단과 두 다리를 경유한다. */
export function mixedDioramaRoute(from, requested, options = {}) {
    if (!Number.isFinite(requested.x) || !Number.isFinite(requested.z))
        return [];
    const target = {
        x: Math.max(-13, Math.min(13, requested.x)),
        z: Math.max(-13, Math.min(13, requested.z)),
    };
    let endpoint = null, startPoint = null, best = Infinity, startDistance = Infinity;
    for (let x = -13; x <= 13; x += pathGrid)
        for (let z = -13; z <= 13; z += pathGrid) {
            const q = { x, z };
            const d = Math.hypot(x - target.x, z - target.z);
            const startD = Math.hypot(x - from.x, z - from.z);
            if (startD < startDistance && canStepMixedDiorama(from, q, options)) {
                startPoint = q;
                startDistance = startD;
            }
            if (d < best && canWalkMixedDiorama(q, options)) {
                endpoint = q;
                best = d;
            }
        }
    if (!endpoint || !startPoint || startDistance > 0.6)
        return [];
    const start = gridKey(startPoint), goal = gridKey(endpoint), open = new Set([start]), cost = new Map([[start, 0]]), came = new Map();
    const heuristic = (k) => {
        const q = gridPoint(k);
        return Math.abs(q.x - endpoint.x) + Math.abs(q.z - endpoint.z);
    };
    let loops = 0;
    while (open.size && loops++ < 18000) {
        let current = '', score = Infinity;
        for (const key of open) {
            const n = (cost.get(key) ?? Infinity) + heuristic(key);
            if (n < score) {
                score = n;
                current = key;
            }
        }
        if (current === goal) {
            const result = [];
            let p = current;
            while (p !== start) {
                result.unshift(gridPoint(p));
                const next = came.get(p);
                if (!next)
                    return [];
                p = next;
            }
            return [gridPoint(start), ...result];
        }
        open.delete(current);
        const p = gridPoint(current);
        for (const d of [
            { x: pathGrid, z: 0 },
            { x: -pathGrid, z: 0 },
            { x: 0, z: pathGrid },
            { x: 0, z: -pathGrid },
        ]) {
            const q = { x: p.x + d.x, z: p.z + d.z };
            if (!canStepMixedDiorama(p, q, options))
                continue;
            const key = gridKey(q), next = (cost.get(current) ?? 0) + pathGrid;
            if (next >= (cost.get(key) ?? Infinity))
                continue;
            came.set(key, current);
            cost.set(key, next);
            open.add(key);
        }
    }
    return [];
}
