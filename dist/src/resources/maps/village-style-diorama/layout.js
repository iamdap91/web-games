export const dioramaRules = {
    radius: 0.28,
    speed: 4.6,
    interactionDistance: 1.8,
    ground: 0.1,
    terrace: 1.3,
    step: 0.2,
};
export const dioramaPlaces = [
    {
        id: 'hearth',
        label: '목공 화덕',
        x: -4.8,
        z: 3,
        description: '장작에 불이 붙고 석회벽에 주황빛이 번진다. 작업마당에 연기가 오르는 동안 다음 길을 골라 보자.',
    },
    {
        id: 'dojo',
        label: '석회벽 도장',
        x: 0,
        z: -4.9,
        description: '낡은 천막 아래 도장에 도착했다. R로 벽과 천막, 등불이 정돈되는 모습을 비교해 보자.',
    },
    {
        id: 'rest',
        label: '돌아치 쉼터',
        x: 10,
        z: -6,
        description: '돌다리 너머 테라스. 북쪽 다리로 짧게 돌아가거나 남쪽 시장 골목을 지나 귀환할 수 있다.',
    },
];
export const dioramaBuildings = [
    { x: 0, z: -7.3, width: 5.2, depth: 3.2, height: 3.1 },
    { x: -8.5, z: 2.1, width: 3.4, depth: 4.6, height: 2.5 },
    { x: -7.3, z: -6.6, width: 3.8, depth: 3.2, height: 3.2 },
    { x: 2.2, z: 4.7, width: 3, depth: 2.8, height: 2.7 },
];
export const dioramaBridgeCenters = [3, -8.5];
export const dioramaShrubs = [
    [-11, -10],
    [-12, 6],
    [-10, 10],
    [11, 10],
    [11, -11],
    [1, -12],
];
export function onBridge(point) {
    return (Math.abs(point.x - 6) < 1.75 &&
        dioramaBridgeCenters.some((z) => Math.abs(point.z - z) < 0.94));
}
export function groundHeight(point) {
    if (onBridge(point))
        return (0.1 +
            0.25 *
                Math.sin(Math.PI * Math.max(0, Math.min(1, (point.x - 4.25) / 3.5))));
    if (Math.abs(point.x) <= 1.25 && point.z >= -4.5 && point.z <= -2)
        return 0.1 + Math.min(6, Math.floor((-point.z - 2) / (2.5 / 6)) + 1) * 0.2;
    if (point.x >= 3 && point.x <= 4.5 && point.z >= -7.5 && point.z <= -5)
        return 0.1 + Math.max(0, 6 - Math.floor((point.x - 3) / 0.25)) * 0.2;
    if (point.x >= -3.5 && point.x <= 3 && point.z >= -9.3 && point.z <= -4.5)
        return dioramaRules.terrace;
    return dioramaRules.ground;
}
export function canWalkDiorama(point, options = {}) {
    if (!Number.isFinite(point.x) ||
        !Number.isFinite(point.z) ||
        Math.abs(point.x) > 12.6 ||
        Math.abs(point.z) > 12.6)
        return false;
    if (Math.abs(point.x - 6) < 1.1 + dioramaRules.radius && !onBridge(point))
        return false;
    if (dioramaBuildings.some((b) => Math.hypot(Math.max(0, Math.abs(point.x - b.x) - b.width / 2), Math.max(0, Math.abs(point.z - b.z) - b.depth / 2)) < dioramaRules.radius))
        return false;
    if (Math.hypot(point.x + 4.8, point.z - 1.3) < 1.0)
        return false;
    if (Math.abs(point.x - 10.8) < 1.2 && Math.abs(point.z + 7.3) < 0.62)
        return false;
    if (Math.abs(point.x + 7) < 1 && Math.abs(point.z + 0.6) < 0.65)
        return false;
    if ([-2.8, 3.4].some((x) => Math.abs(point.x - x) < 1.08 && Math.abs(point.z - 7.65) < 0.6))
        return false;
    if (dioramaShrubs.some(([x, z]) => Math.hypot(point.x - x, point.z - z) < 0.4))
        return false;
    if (options.restored && Math.hypot(point.x + 2.4, point.z + 5.1) < 0.68)
        return false;
    return true;
}
export function canStepDiorama(from, to, options = {}) {
    return (canWalkDiorama(to, options) &&
        Math.abs(groundHeight(from) - groundHeight(to)) <= 0.275);
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
export function dioramaRoute(from, requested, options = {}) {
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
            if (startD < startDistance && canStepDiorama(from, q, options)) {
                startPoint = q;
                startDistance = startD;
            }
            if (d < best && canWalkDiorama(q, options)) {
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
            if (!canStepDiorama(p, q, options))
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
