export const bookRules = {
    radius: 0.27,
    speed: 4.8,
    ground: 0.16,
    interactionDistance: 1.7,
    foldDuration: 2.4,
};
export const bookEntrance = { x: -10, z: 6.5 };
export const bookPlaces = [
    { id: 'workshop', label: '제본 공방 · 첫 펼침', x: -8, z: 2, stage: 0 },
    { id: 'dojo', label: '접힌 도장 · 둘째 펼침', x: 3, z: 0.8, stage: 1 },
    { id: 'rest', label: '책갈피 전망대', x: 14, z: 0.5, stage: 2 },
];
export const bookCourts = [
    { x: -8.5, z: 0.5, width: 9, depth: 15 },
    { x: 3, z: -1.5, width: 8, depth: 11 },
    { x: 13.5, z: 0, width: 7, depth: 14 },
];
export const bookBridges = [
    { x: -2.5, z: 0, width: 3, depth: 2 },
    { x: 8.5, z: -3.5, width: 3, depth: 2 },
];
export const bookBuildings = [
    {
        x: -9,
        z: -1,
        width: 3.2,
        depth: 2.4,
        height: 2.8,
        label: '제본 공방',
        color: '#78918d',
    },
    {
        x: 3,
        z: -2,
        width: 3.8,
        depth: 2.6,
        height: 3.5,
        label: '종이 도장',
        color: '#a87966',
    },
    {
        x: 14,
        z: -3,
        width: 2.8,
        depth: 2.2,
        height: 2.9,
        label: '책갈피 정자',
        color: '#8592a3',
    },
];
function inRect(point, rect) {
    return (Math.abs(point.x - rect.x) <= rect.width / 2 &&
        Math.abs(point.z - rect.z) <= rect.depth / 2);
}
function onSurface(point, access) {
    return (bookCourts.some((court, i) => (i === 0 ||
        (i === 1 && access.firstOpen) ||
        (i === 2 && access.secondOpen)) &&
        inRect(point, court)) ||
        bookBridges.some((bridge, i) => (i === 0 ? access.firstOpen : access.secondOpen) &&
            inRect(point, bridge)));
}
/** 종이 다리는 펼침을 마친 뒤에만 실제 보행 영역에 포함한다. */
export function canWalkBook(point, access) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.z))
        return false;
    if (!Array.from({ length: 8 }, (_, i) => ({
        x: point.x + Math.cos((i * Math.PI) / 4) * bookRules.radius,
        z: point.z + Math.sin((i * Math.PI) / 4) * bookRules.radius,
    })).every((p) => onSurface(p, access)))
        return false;
    return !bookBuildings.some((b) => Math.hypot(Math.max(0, Math.abs(point.x - b.x) - b.width / 2), Math.max(0, Math.abs(point.z - b.z) - b.depth / 2)) < bookRules.radius);
}
const grid = 0.25;
const key = (p) => `${Math.round(p.x / grid)},${Math.round(p.z / grid)}`;
const point = (k) => {
    const [x = 0, z = 0] = k.split(',').map(Number);
    return { x: x * grid, z: z * grid };
};
/** 완전히 막힌 다음 장을 눌렀을 때 현재 장으로 잘못 이동하지 않는다. */
export function bookRoute(from, requested, access) {
    if (!Number.isFinite(requested.x) ||
        !Number.isFinite(requested.z) ||
        (!access.firstOpen && requested.x > -4) ||
        (!access.secondOpen && requested.x > 7))
        return [];
    let start = null, target = null, nearestStart = Infinity, nearestTarget = Infinity;
    for (let x = -13; x <= 17; x += grid)
        for (let z = -7; z <= 8; z += grid) {
            const p = { x, z };
            if (!canWalkBook(p, access))
                continue;
            const ds = Math.hypot(from.x - x, from.z - z), dt = Math.hypot(requested.x - x, requested.z - z);
            if (ds < nearestStart) {
                start = p;
                nearestStart = ds;
            }
            if (dt < nearestTarget) {
                target = p;
                nearestTarget = dt;
            }
        }
    if (!start || !target || nearestStart > 0.4)
        return [];
    const startKey = key(start), goal = key(target), queue = [startKey], seen = new Set(queue), came = new Map();
    for (let i = 0; i < queue.length; i++) {
        const current = queue[i];
        if (current === goal) {
            const route = [];
            let next = current;
            while (next !== startKey) {
                route.unshift(point(next));
                next = came.get(next);
            }
            return [start, ...route];
        }
        const p = point(current);
        for (const d of [
            { x: grid, z: 0 },
            { x: -grid, z: 0 },
            { x: 0, z: grid },
            { x: 0, z: -grid },
        ]) {
            const candidate = { x: p.x + d.x, z: p.z + d.z }, k = key(candidate);
            if (seen.has(k) || !canWalkBook(candidate, access))
                continue;
            seen.add(k);
            came.set(k, current);
            queue.push(k);
        }
    }
    return [];
}
