export const retroRules = {
    radius: 0.3,
    speed: 4.5,
    interactionDistance: 1.9,
    ground: 0.2,
    terrace: 1.1,
    step: 0.15,
};
export const retroPlaces = [
    {
        id: 'hearth',
        label: '불씨 공방',
        x: -4.75,
        z: 1.25,
        description: '불씨를 넣자 가마가 붉어졌다. 간판과 목재 벽에 따뜻한 빛이 번진다.',
    },
    {
        id: 'dojo',
        label: '나루 도장',
        x: 1.25,
        z: -5.75,
        description: '도장 앞 돌계단에 도착했다. R로 새 차양과 목인, 등불의 복구를 비교해 보자.',
    },
    {
        id: 'rest',
        label: '뱃사공 쉼터',
        x: 10.25,
        z: -6.75,
        description: '개울 건너 차 한 잔. 북쪽 다리로 돌아가거나 시장길을 따라 입구로 향할 수 있다.',
    },
];
export const retroBuildings = [
    { id: 'workshop', x: -7.65, z: 2.5, width: 4.3, depth: 4.1, height: 2.7 },
    { id: 'market', x: -6.1, z: -4.3, width: 4.6, depth: 3.6, height: 3.1 },
    { id: 'inn', x: 3.8, z: 1.9, width: 3.8, depth: 3.5, height: 3.8 },
    { id: 'dojo', x: 1.3, z: -8, width: 5.2, depth: 3, height: 2.6 },
];
export const retroTrees = [
    [-11, -7],
    [-10.7, 7],
    [-2.8, -10.4],
    [5.7, -10.2],
    [11, -10],
];
export const retroWalls = [
    { x: -10.9, z: -2.9, width: 0.5, depth: 6 },
    { x: 0, z: -10.5, width: 22, depth: 0.45 },
    { x: 0, z: 10.8, width: 22, depth: 0.4 },
];
export const retroBarrels = [
    [-2.6, 5],
    [5.5, -2],
    [-9, -7.5],
    [-3.65, -4.2],
    [5, 5.2],
    [9.8, 5.4],
    [11.4, 5.4],
];
export function onBridge(p) {
    return (Math.abs(p.x - 8) <= 1.8 &&
        (Math.abs(p.z - 2.5) < 0.55 || Math.abs(p.z + 7.75) < 0.55));
}
export function groundHeight(p) {
    if (onBridge(p))
        return 0.4;
    if (p.x >= 0 && p.x <= 2.6 && p.z <= -2.5 && p.z >= -4.5)
        return (retroRules.ground +
            Math.min(6, Math.floor((-p.z - 2.5) / (2 / 6)) + 1) * retroRules.step);
    if (p.x >= 4.5 && p.x <= 6.2 && p.z >= -8.9 && p.z <= -6.3)
        return (retroRules.ground +
            Math.max(0, 6 - Math.floor((p.x - 4.5) / (1.7 / 6))) * retroRules.step);
    if (p.x >= -2 && p.x <= 4.5 && p.z >= -9.8 && p.z <= -4.5)
        return retroRules.terrace;
    return retroRules.ground;
}
export function canWalkRetro(p, options = {}) {
    if (!Number.isFinite(p.x) ||
        !Number.isFinite(p.z) ||
        Math.abs(p.x) > 11.5 ||
        Math.abs(p.z) > 10.5)
        return false;
    if (Math.abs(p.x - 8) < 1.05 + retroRules.radius && !onBridge(p))
        return false;
    for (const center of [2.5, -7.75]) {
        if (Math.abs(p.x - 8) < 1.8 &&
            [-0.82, 0.82].some((side) => Math.abs(p.z - center - side) < 0.36))
            return false;
    }
    if ([...retroBuildings, ...retroWalls].some((b) => Math.hypot(Math.max(0, Math.abs(p.x - b.x) - b.width / 2), Math.max(0, Math.abs(p.z - b.z) - b.depth / 2)) < retroRules.radius))
        return false;
    if (Math.abs(p.x + 4.75) < 0.65 + retroRules.radius &&
        Math.abs(p.z - 2.5) < 0.65 + retroRules.radius)
        return false;
    // 장터 작업대·물가 벤치는 그림과 같은 위치에 부피가 있다.
    if (Math.abs(p.x + 7.2) < 1.25 + retroRules.radius &&
        Math.abs(p.z + 1.7) < 0.4 + retroRules.radius)
        return false;
    if (Math.abs(p.x - 10.5) < 0.9 + retroRules.radius &&
        Math.abs(p.z + 9.2) < 0.4 + retroRules.radius)
        return false;
    if (options.restored &&
        [-0.7, 3.45].some((x) => Math.hypot(p.x - x, p.z + 5.1) < 0.45 + retroRules.radius))
        return false;
    if (options.restored &&
        [-1.3, 3.9].some((x) => Math.hypot(p.x - x, p.z + 5.93) < 0.36))
        return false;
    if (retroBarrels.some(([x, z]) => Math.hypot(p.x - x, p.z - z) < 0.36 + retroRules.radius))
        return false;
    return !retroTrees.some(([x, z]) => Math.hypot(p.x - x, p.z - z) < 0.55 + retroRules.radius);
}
export function canStepRetro(from, to, options = {}) {
    return (canWalkRetro(to, options) &&
        Math.abs(groundHeight(from) - groundHeight(to)) <= retroRules.step + 0.075);
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
export function retroRoute(from, requested, options = {}) {
    if (!Number.isFinite(requested.x) || !Number.isFinite(requested.z))
        return [];
    const target = {
        x: Math.max(-11.5, Math.min(11.5, requested.x)),
        z: Math.max(-10.5, Math.min(10.5, requested.z)),
    };
    let endpoint = null, startPoint = null, best = Infinity, startDistance = Infinity;
    for (let x = -11.5; x <= 11.5; x += pathGrid)
        for (let z = -10.5; z <= 10.5; z += pathGrid) {
            const q = { x, z };
            const d = Math.hypot(x - target.x, z - target.z);
            const startD = Math.hypot(x - from.x, z - from.z);
            if (startD < startDistance && canStepRetro(from, q, options)) {
                startPoint = q;
                startDistance = startD;
            }
            if (d < best && canWalkRetro(q, options)) {
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
            if (!canStepRetro(p, q, options))
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
