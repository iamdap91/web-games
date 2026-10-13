export const cameraYaw = Math.PI / 9;
export const toyRules = {
    radius: 0.3,
    speed: 5,
    bounds: 12.6,
    interactionDistance: 1.65,
};
export const toyPlaces = [
    {
        id: 'hearth',
        label: '공방 화덕',
        x: -6.3,
        z: 2.2,
        description: '주전자에서 김이 오른다. 둥근 광장의 도장으로 가 보자.',
    },
    {
        id: 'dojo',
        label: '둥근 광장 도장',
        x: 0,
        z: -2.5,
        description: '지붕을 고치고 화분과 목인을 놓으면 작은 도장이 완성된다. R로 비교해 보자.',
    },
    {
        id: 'rest',
        label: '언덕 쉼터',
        x: 7.5,
        z: -5.1,
        description: '작은 언덕에 올라 마을을 내려다본다. 오른쪽 골목으로 돌아가도 좋겠다.',
    },
];
export const toyBuildings = [
    { x: 0, z: -5.2, width: 5.2, depth: 3.2, color: 0x88bab9 },
    { x: -8.1, z: 1.8, width: 2.4, depth: 3, color: 0xe7ab83 },
    { x: 7, z: 5.7, width: 3.1, depth: 3, color: 0xe8c571 },
    { x: -7.8, z: -6, width: 2.7, depth: 3, color: 0xadabc8 },
];
export const toyBenches = [
    { x: -5.3, z: 3.65, width: 1.3, depth: 0.55, color: 0xc09a77 },
    { x: 7.5, z: -6.2, width: 1.9, depth: 0.65, color: 0xe6c59e },
];
export const toyTrees = [
    [-10, 8, 1],
    [-10, -10, 1.2],
    [-5, -11, 0.95],
    [0, -11, 1.05],
    [4, -11, 1],
    [10, -10, 0.9],
    [11, -2, 0.85],
    [11, 8, 1.1],
    [5, 11, 0.8],
    [-5, 11, 0.8],
    [-11, -2, 0.85],
    [-3, 8.5, 0.55],
];
export function groundHeight({ x, z }) {
    return 0.16 + 1.75 * Math.exp(-(((x - 7.5) / 4.1) ** 2 + ((z + 6) / 4) ** 2));
}
export function screenToWorld(input) {
    return {
        x: input.x * Math.cos(cameraYaw) + input.z * Math.sin(cameraYaw),
        z: -input.x * Math.sin(cameraYaw) + input.z * Math.cos(cameraYaw),
    };
}
export function worldToScreen(input) {
    return {
        x: input.x * Math.cos(cameraYaw) - input.z * Math.sin(cameraYaw),
        z: input.x * Math.sin(cameraYaw) + input.z * Math.cos(cameraYaw),
    };
}
export function canWalkToy(p, restored = false) {
    if (!Number.isFinite(p.x) ||
        !Number.isFinite(p.z) ||
        Math.max(Math.abs(p.x), Math.abs(p.z)) > toyRules.bounds - toyRules.radius)
        return false;
    if (toyBuildings.some((b) => Math.hypot(Math.max(0, Math.abs(p.x - b.x) - b.width / 2), Math.max(0, Math.abs(p.z - b.z) - b.depth / 2)) < toyRules.radius))
        return false;
    if (toyBenches.some((b) => Math.hypot(Math.max(0, Math.abs(p.x - b.x) - b.width / 2), Math.max(0, Math.abs(p.z - b.z) - b.depth / 2)) < toyRules.radius))
        return false;
    if (Math.hypot(p.x, p.z - 1.5) < 1.1 + toyRules.radius)
        return false;
    if (Math.hypot(p.x + 6.3, p.z - 2.2) < 0.65 + toyRules.radius)
        return false;
    if (((p.x + 4) / 2.7) ** 2 + ((p.z + 9) / 1.65) ** 2 < 1.15)
        return false;
    if (restored && Math.hypot(p.x - 3.5, p.z + 2.5) < 0.45 + toyRules.radius)
        return false;
    return !toyTrees.some(([x, z, s]) => Math.hypot(p.x - x, p.z - z) < 0.23 * s + toyRules.radius);
}
export function pathDistance(p) {
    const circle = Math.abs(Math.hypot(p.x, p.z) - 6.2);
    const entrance = Math.abs(p.x) + Math.max(0, 6 - p.z) * 2;
    const plaza = Math.max(0, Math.hypot(p.x, p.z - 0.2) - 4);
    const rest = Math.hypot(Math.max(0, 6.2 - p.x, p.x - 8), Math.max(0, p.z + 7, -4 - p.z));
    return Math.min(circle, entrance, plaza, rest);
}
/** 0.4단위 보행 그리드에서 건물·우물·복구 목인을 우회하는 경로를 만든다. */
export function findToyRoute(start, target, restored) {
    if (!canWalkToy(target, restored))
        return [];
    const unit = 0.4, size = 63, offset = 31;
    const key = (p) => [Math.round(p.x / unit) + offset, Math.round(p.z / unit) + offset];
    const [sx, sz] = key(start), [tx, tz] = key(target), first = sz * size + sx, last = tz * size + tx;
    const previous = new Map(), cost = new Map([[first, 0]]), open = new Set([first]);
    const point = (id) => ({
        x: ((id % size) - offset) * unit,
        z: (Math.floor(id / size) - offset) * unit,
    });
    for (let count = 0; open.size && count < 4000; count++) {
        let current = -1, best = Infinity;
        for (const id of open) {
            const p = point(id), score = (cost.get(id) ?? 0) + Math.hypot(p.x - target.x, p.z - target.z);
            if (score < best) {
                best = score;
                current = id;
            }
        }
        if (current === last) {
            const result = [target];
            let id = current;
            while (id !== first) {
                result.unshift(point(id));
                id = previous.get(id) ?? first;
            }
            return result;
        }
        open.delete(current);
        const p = point(current);
        for (const [dx, dz] of [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
            [1, 1],
            [-1, 1],
            [1, -1],
            [-1, -1],
        ]) {
            if (dx === undefined || dz === undefined)
                continue;
            const q = { x: p.x + dx * unit, z: p.z + dz * unit };
            if (!canWalkToy(q, restored) ||
                !canWalkToy({ x: p.x + dx * unit, z: p.z }, restored) ||
                !canWalkToy({ x: p.x, z: p.z + dz * unit }, restored))
                continue;
            const [qx, qz] = key(q);
            if (qx < 0 || qx >= size || qz < 0 || qz >= size)
                continue;
            const id = qz * size + qx, next = (cost.get(current) ?? 0) + unit * Math.hypot(dx, dz);
            if (next < (cost.get(id) ?? Infinity)) {
                cost.set(id, next);
                previous.set(id, current);
                open.add(id);
            }
        }
    }
    return [];
}
