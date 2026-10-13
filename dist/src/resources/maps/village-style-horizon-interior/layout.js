import { canWalkRoom } from './interior.js';
export const horizonEntrance = { x: 0, z: 11 };
export const horizonBounds = { left: -10, right: 10, back: -26, front: 14 };
export const horizonHouses = [
    {
        x: -6,
        z: 6,
        w: 4.2,
        d: 3.1,
        h: 2.4,
        color: '#e6cba5',
        roof: '#bf694f',
        name: '차 굽는 집',
        kind: 'tea',
    },
    {
        x: 5.7,
        z: 3.4,
        w: 3.5,
        d: 3.1,
        h: 2.8,
        color: '#b5d1cc',
        roof: '#457f81',
        name: '바람 우편',
        kind: 'post',
    },
    {
        x: -5,
        z: -7,
        w: 4.4,
        d: 3.4,
        h: 3.0,
        color: '#f0dbb5',
        roof: '#986459',
        name: '지평 도장',
        kind: 'dojo',
    },
    {
        x: 5.7,
        z: -11,
        w: 3.6,
        d: 3.5,
        h: 2.4,
        color: '#dcc4b9',
        roof: '#718c8e',
        name: '풀빛 공방',
        kind: 'craft',
    },
    {
        x: -6,
        z: -19,
        w: 3.1,
        d: 2.8,
        h: 2.5,
        color: '#c5c9a5',
        roof: '#be8755',
        name: '먼 길의 집',
        kind: 'home',
    },
];
export const horizonPlaces = [
    { id: 'hearth', label: '차 향 화덕', x: -3.0, z: 8.6 },
    { id: 'dojo', label: '지평 도장', x: -2.1, z: -5.4 },
    { id: 'rest', label: '언덕 뒤 쉼터', x: 3.8, z: -21.3 },
];
export function canWalkHorizon(point) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.z))
        return false;
    if (point.x < horizonBounds.left + 0.4 ||
        point.x > horizonBounds.right - 0.4 ||
        point.z < horizonBounds.back + 0.4 ||
        point.z > horizonBounds.front - 0.4)
        return false;
    if (Math.hypot(point.x + 4.2, point.z - 8.6) < 0.9)
        return false;
    if (!canWalkRoom(point))
        return false;
    return !horizonHouses.some((house) => house.kind !== 'home' &&
        Math.abs(point.x - house.x) < house.w / 2 + 0.3 &&
        Math.abs(point.z - house.z) < house.d / 2 + 0.3);
}
const gridStep = 0.5;
const columns = 41;
const rows = 81;
const gridPoint = (index) => ({
    x: horizonBounds.left + (index % columns) * gridStep,
    z: horizonBounds.back + Math.floor(index / columns) * gridStep,
});
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
function nearestIndex(point) {
    let result = -1, best = Infinity;
    for (let index = 0; index < columns * rows; index++) {
        const candidate = gridPoint(index), length = distance(point, candidate);
        if (length < best && canWalkHorizon(candidate)) {
            result = index;
            best = length;
        }
    }
    return result;
}
/** 집과 화덕을 우회하며 곡면 표시에서 돌려받은 평면 좌표로 경로를 푼다. */
export function horizonRoute(from, target) {
    if (!Number.isFinite(target.x) || !Number.isFinite(target.z))
        return [];
    const start = nearestIndex(from), end = nearestIndex(target);
    if (start < 0 || end < 0)
        return [];
    const parents = new Int32Array(columns * rows).fill(-1), queue = [start];
    parents[start] = start;
    for (let offset = 0; offset < queue.length; offset++) {
        const current = queue[offset];
        if (current === undefined || current === end)
            break;
        for (const [dx, dz] of [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
        ]) {
            if (dx === undefined || dz === undefined)
                continue;
            const column = (current % columns) + dx, row = Math.floor(current / columns) + dz;
            if (column < 0 || column >= columns || row < 0 || row >= rows)
                continue;
            const next = row * columns + column;
            if (parents[next] !== -1 || !canWalkHorizon(gridPoint(next)))
                continue;
            parents[next] = current;
            queue.push(next);
        }
    }
    if (parents[end] === -1)
        return [];
    const path = [];
    let current = end;
    while (current !== start) {
        path.unshift(gridPoint(current));
        const parent = parents[current];
        if (parent === undefined || parent < 0)
            return [];
        current = parent;
    }
    if (distance(from, gridPoint(start)) > 0.001)
        path.unshift(gridPoint(start));
    if (canWalkHorizon(target))
        path.push({ ...target });
    return path;
}
