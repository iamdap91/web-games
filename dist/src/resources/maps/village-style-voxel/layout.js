export const voxelRules = {
    unit: 0.45,
    radius: 0.3,
    speed: 4.5,
    bounds: 13.5,
    interactionDistance: 2,
    ground: 0.2,
    terrace: 1.1,
    step: 0.15,
};
export const voxelPlaces = [
    {
        id: 'hearth',
        label: '불씨 작업마당',
        x: -5,
        z: 3,
        description: '장작을 넣자 불꽃이 높아지고 굴뚝에서 연기가 피어난다. 벽돌에 따뜻한 빛이 번진다.',
    },
    {
        id: 'dojo',
        label: '기와 도장',
        x: 1,
        z: -4.8,
        description: '돌계단을 올라 도장에 도착했다. R로 무너진 기와와 훈련 마당의 복구를 비교해 보자.',
    },
    {
        id: 'rest',
        label: '수로 끝 쉼터',
        x: 10.3,
        z: -8,
        description: '작은 물레방아와 둥근 찻잔. 북쪽 다리를 건너 도장으로 돌아가는 길도 있다.',
    },
];
export const voxelTrees = [
    [-11, 9, 1],
    [-12, 5, 1.1],
    [-11, -2, 1.2],
    [-12, -8, 1.3],
    [-7, -10, 1.1],
    [-4.5, -12, 1],
    [2, -12, 1.15],
    [11.5, -12, 1.3],
    [12, -4.3, 1.2],
    [12, 6.5, 1.1],
    [10, 11.5, 1.25],
    [-5, 9, 0.85],
    [4, 7, 0.8],
    [-6, -3.4, 0.8],
];
export const voxelBuildings = [
    { x: 0.6, z: -7.25, width: 5.4, depth: 3.6 },
    { x: -9, z: 3.1, width: 3.6, depth: 4.05 },
];
export function onBridge(point) {
    return (Math.abs(point.x - 7.5) <= 1.8 &&
        (Math.abs(point.z - 3) < 1.15 || Math.abs(point.z + 9) < 0.9));
}
function onSouthSteps(point) {
    return (point.x >= -0.35 && point.x <= 2.35 && point.z <= -2 && point.z >= -4.5);
}
function onEastSteps(point) {
    return point.z >= -7.9 && point.z <= -5.2 && point.x >= 4.2 && point.x <= 6.2;
}
export function groundHeight(point) {
    if (onBridge(point))
        return 0.4;
    if (onSouthSteps(point))
        return (voxelRules.ground +
            Math.min(6, Math.floor((-point.z - 2) / (2.5 / 6)) + 1) * voxelRules.step);
    if (onEastSteps(point))
        return (voxelRules.ground +
            Math.max(0, 6 - Math.floor((point.x - 4.2) / (2 / 6))) * voxelRules.step);
    if (point.x >= -3 && point.x <= 4.2 && point.z >= -10 && point.z <= -4.5)
        return voxelRules.terrace;
    return voxelRules.ground;
}
export function canWalkVoxel(point, options = {}) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.z))
        return false;
    if (Math.max(Math.abs(point.x), Math.abs(point.z)) >
        voxelRules.bounds - voxelRules.radius)
        return false;
    if (Math.abs(point.x - 7.5) < 0.9 + voxelRules.radius && !onBridge(point))
        return false;
    if (voxelBuildings.some((b) => Math.hypot(Math.max(0, Math.abs(point.x - b.x) - b.width / 2), Math.max(0, Math.abs(point.z - b.z) - b.depth / 2)) < voxelRules.radius))
        return false;
    if (point.x < -3.65 && point.x > -13 && Math.abs(point.z + 5.8) < 0.525)
        return false;
    if ([8.3, 10.5].some((z) => Math.abs(point.z - z) < 0.435 &&
        Math.abs(Math.abs(point.x) - 1.85) < 0.435))
        return false;
    if (onBridge(point) && Math.abs(point.x - 7.5) < 1.8) {
        const depth = Math.abs(point.z - 3) < 1.15 ? 2.25 : 1.8;
        const center = Math.abs(point.z - 3) < 1.15 ? 3 : -9;
        if (Math.abs(point.z - center) > depth / 2 - 0.25)
            return false;
    }
    if (Math.abs(point.x + 5) < 0.9 + voxelRules.radius &&
        Math.abs(point.z - 3) < 0.9 + voxelRules.radius)
        return false;
    if (options.restored) {
        if ([-1.65, 3.7].some((x) => Math.hypot(point.x - x, point.z + 5) < 0.52 + voxelRules.radius))
            return false;
        if ([-2.05, 3.25].some((x) => Math.hypot(point.x - x, point.z + 4.9) < 0.15 + voxelRules.radius))
            return false;
    }
    // 벤치와 작업대는 보이는 위치에서 통행을 막는다.
    if (Math.abs(point.x - 11) < 0.8 + voxelRules.radius &&
        Math.abs(point.z + 8.9) < 0.4 + voxelRules.radius)
        return false;
    if (Math.abs(point.x + 8.1) < 1.1 + voxelRules.radius &&
        Math.abs(point.z - 0.3) < 0.5 + voxelRules.radius)
        return false;
    return !voxelTrees.some(([x, z, s]) => Math.hypot(point.x - x, point.z - z) < 0.28 * s + voxelRules.radius);
}
export function canStepVoxel(from, to, options = {}) {
    return (canWalkVoxel(to, options) &&
        Math.abs(groundHeight(from) - groundHeight(to)) <= voxelRules.step + 0.075);
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
export function voxelRoute(from, requested, options = {}) {
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
            if (startD < startDistance && canStepVoxel(from, q, options)) {
                startPoint = q;
                startDistance = startD;
            }
            if (d < best && canWalkVoxel(q, options)) {
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
            if (!canStepVoxel(p, q, options))
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
