export const horizonEntrance = { x: 0, z: 11 };
export const horizonBounds = { left: -10, right: 10, back: -26, front: 14 };
export const harborShoreZ = -14;
export const harborDock = { left: -1.6, right: 1.6, back: -23, front: -13.5 };
/** 지형과 발·부착물의 바닥에 같은 높이를 사용한다. 바다와 부두는 언덕 밖에 둔다. */
export function harborGroundHeight(point) {
    if (point.z <= -12)
        return 0;
    const hill = Math.max(0, 1 - Math.abs(point.z - 0.5) / 12.5);
    return 1.35 * hill * hill * (3 - 2 * hill);
}
export function harborSurfaceHeight(point) {
    return (harborGroundHeight(point) +
        (point.z < harborDock.front &&
            point.z >= harborDock.back &&
            Math.abs(point.x) <= harborDock.right
            ? 0.1
            : 0));
}
export function harborGroundSlope(point) {
    const epsilon = 0.005;
    return ((harborGroundHeight({ ...point, z: point.z + epsilon }) -
        harborGroundHeight({ ...point, z: point.z - epsilon })) /
        (2 * epsilon));
}
export const horizonHouses = [
    {
        x: -5.6,
        z: 7,
        w: 4.2,
        d: 3.6,
        h: 3.4,
        color: '#ead6b1',
        roof: '#bc6f52',
        name: '솔바람 여관',
        kind: 'inn',
    },
    {
        x: 5.5,
        z: -0.5,
        w: 4.4,
        d: 2.8,
        h: 1.8,
        color: '#d0b996',
        roof: '#758d70',
        name: '바람 시장',
        kind: 'market',
    },
    {
        x: -5.4,
        z: -5,
        w: 3.3,
        d: 3.3,
        h: 2.7,
        color: '#c7d8c6',
        roof: '#628486',
        name: '원정 보급소',
        kind: 'supply',
    },
    {
        x: 5.5,
        z: -11,
        w: 4.3,
        d: 3.6,
        h: 3.2,
        color: '#cab79d',
        roof: '#7f7773',
        name: '나루 창고',
        kind: 'warehouse',
    },
];
export const horizonPlaces = [
    { id: 'inn', label: '솔바람 여관 · 따뜻한 차', x: -3, z: 9.4 },
    { id: 'market', label: '바람 시장 · 도시락', x: 2.6, z: 1.6 },
    { id: 'supply', label: '원정 보급소 · 밧줄', x: -2.8, z: -2.8 },
    { id: 'warehouse', label: '나루 창고 · 짐 전달', x: 2.8, z: -8.7 },
    { id: 'dock', label: '부두 종 · 출항 신호', x: 0, z: -20.5 },
];
export const harborExits = [
    { id: 'land-exit', label: '육로 · 입구 귀환', x: 0, z: 11 },
    { id: 'sea-exit', label: '뱃길 · 바다 전망', x: 0, z: -22 },
];
export function canWalkHorizon(point) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.z))
        return false;
    if (point.x < horizonBounds.left + 0.4 ||
        point.x > horizonBounds.right - 0.4 ||
        point.z < horizonBounds.back + 0.4 ||
        point.z > horizonBounds.front - 0.4)
        return false;
    if (point.z < harborShoreZ &&
        !(point.x >= harborDock.left + 0.25 &&
            point.x <= harborDock.right - 0.25 &&
            point.z >= harborDock.back + 0.25))
        return false;
    if (Math.hypot(point.x + 4.2, point.z - 9.4) < 0.9)
        return false;
    if (Math.abs(point.x - 5.5) < 2.6 && Math.abs(point.z - 1.7) < 0.7)
        return false;
    if ([
        { x: -8, z: 12 },
        { x: 8, z: 10 },
        { x: 8, z: -5 },
        { x: -8, z: -9 },
        { x: -8, z: -0.5 },
    ].some((tree) => Math.hypot(point.x - tree.x, point.z - tree.z) < 0.35))
        return false;
    return !horizonHouses.some((house) => Math.abs(point.x - house.x) < house.w / 2 + 0.3 &&
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
