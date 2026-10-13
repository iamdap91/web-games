export const paperRules = {
    radius: 0.28,
    speed: 3.6,
    grid: 0.35,
    boundX: 10.5,
    boundZ: 11,
    groundY: 0.06,
};
export const paperEntrance = { x: 0, z: 9.45 };
export const paperPlaces = [
    { id: 'hearth', label: '차 향 화덕', x: -4.2, z: 3.5 },
    { id: 'dojo', label: '접힌 지붕 도장', x: 1, z: -3.45 },
    { id: 'rest', label: '뒷장 쉼터', x: 7.5, z: -6.4 },
];
export const paperHouses = [
    {
        x: -6.8,
        z: 0.3,
        width: 4,
        depth: 3,
        height: 3.1,
        color: '#d68661',
        name: '찻 집',
        kind: 'tea',
    },
    {
        x: -5.5,
        z: -6.3,
        width: 3.4,
        depth: 3.6,
        height: 3.4,
        color: '#809fa4',
        name: '책 방',
        kind: 'books',
    },
    {
        x: 6.3,
        z: 3.6,
        width: 3.5,
        depth: 3.4,
        height: 2.8,
        color: '#a7a657',
        name: '바 느 질',
        kind: 'sew',
    },
    {
        x: 6.7,
        z: -1.4,
        width: 2.7,
        depth: 2.8,
        height: 3.4,
        color: '#ce9c63',
        name: '작 은 집',
        kind: 'home',
    },
    {
        x: -5.8,
        z: 7.2,
        width: 3,
        depth: 2.5,
        height: 2.4,
        color: '#b5a07c',
        name: '창 고',
        kind: 'store',
    },
    {
        x: 1,
        z: -6.5,
        width: 6,
        depth: 3.8,
        height: 3.3,
        color: '#cc755a',
        name: '虎 道 場',
        kind: 'dojo',
    },
];
export const paperPaths = [
    [
        { x: 0, z: 10.5 },
        { x: 0, z: 6.6 },
        { x: -2.7, z: 3.5 },
        { x: -4.2, z: 3.5 },
    ],
    [
        { x: -2.7, z: 3.5 },
        { x: -2.7, z: -1.5 },
        { x: 1, z: -3.45 },
    ],
    [
        { x: 1, z: -3.45 },
        { x: 4.7, z: -3.4 },
        { x: 4.7, z: -6.4 },
        { x: 7.5, z: -6.4 },
    ],
    [
        { x: 7.5, z: -6.4 },
        { x: 9.3, z: -6.4 },
        { x: 9.3, z: 6.6 },
        { x: 3.2, z: 6.6 },
        { x: 0, z: 9.45 },
    ],
    [
        { x: -4.2, z: 3.5 },
        { x: -9.2, z: 3.5 },
        { x: -9.2, z: -9.3 },
        { x: 5, z: -9.3 },
        { x: 7.5, z: -6.4 },
    ],
];
export function paperHeight(point) {
    // 도장 앞 접힌 종이 경사로와 기단도 같은 높이 함수를 쓴다.
    if (point.x >= -1.5 && point.x <= 3.5 && point.z >= -4.6 && point.z <= -3)
        return paperRules.groundY + Math.min(0.3, ((-3 - point.z) * 0.3) / 0.9);
    return paperRules.groundY;
}
export function canWalkPaper(point) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.z))
        return false;
    const r = paperRules.radius;
    if (Math.abs(point.x) > paperRules.boundX - r ||
        Math.abs(point.z) > paperRules.boundZ - r)
        return false;
    if (Math.hypot(point.x + 5.3, point.z - 3.2) < 0.67 + r)
        return false;
    return !paperHouses.some((house) => point.x > house.x - house.width / 2 - r &&
        point.x < house.x + house.width / 2 + r &&
        point.z > house.z - house.depth / 2 - r &&
        point.z < house.z + house.depth / 2 + r);
}
function clearSegment(a, b) {
    const steps = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.07);
    for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        if (!canWalkPaper({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }))
            return false;
    }
    return true;
}
/** 건물 클릭도 가장 가까운 골목으로 보정하고 좁은 틈을 실제 반경으로 검사한다. */
export function paperRoute(from, to) {
    if (!Number.isFinite(to.x) || !Number.isFinite(to.z))
        return [];
    const size = paperRules.grid;
    const cells = [];
    for (let x = -29; x <= 29; x++)
        for (let z = -30; z <= 30; z++)
            if (canWalkPaper({ x: x * size, z: z * size }))
                cells.push({ x, z });
    const closest = (point) => cells.reduce((best, cell) => !best ||
        Math.hypot(cell.x * size - point.x, cell.z * size - point.z) <
            Math.hypot(best.x * size - point.x, best.z * size - point.z)
        ? cell
        : best, undefined);
    const start = closest(from), goal = closest(to);
    if (!start ||
        !goal ||
        !clearSegment(from, { x: start.x * size, z: start.z * size }))
        return [];
    const key = (p) => `${p.x},${p.z}`;
    const open = [start], parents = new Map(), costs = new Map([[key(start), 0]]), closed = new Set();
    const score = (p) => (costs.get(key(p)) ?? Infinity) +
        Math.abs(p.x - goal.x) +
        Math.abs(p.z - goal.z);
    while (open.length) {
        open.sort((a, b) => score(a) - score(b));
        const current = open.shift();
        if (!current)
            break;
        if (key(current) === key(goal)) {
            const route = [{ x: goal.x * size, z: goal.z * size }];
            let next = current;
            while (key(next) !== key(start)) {
                const previous = parents.get(key(next));
                if (!previous)
                    break;
                route.unshift({ x: previous.x * size, z: previous.z * size });
                next = previous;
            }
            if (canWalkPaper(to) && clearSegment(route.at(-1) ?? from, to))
                route.push(to);
            const compact = [];
            let origin = from;
            while (route.length) {
                let index = route.length - 1;
                while (index > 0 && !clearSegment(origin, route[index] ?? origin))
                    index--;
                const point = route[index];
                if (!point)
                    break;
                compact.push(point);
                origin = point;
                route.splice(0, index + 1);
            }
            return compact;
        }
        closed.add(key(current));
        for (const [dx, dz] of [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
        ]) {
            if (dx === undefined || dz === undefined)
                continue;
            const next = { x: current.x + dx, z: current.z + dz };
            if (closed.has(key(next)) ||
                !canWalkPaper({ x: next.x * size, z: next.z * size }))
                continue;
            const cost = (costs.get(key(current)) ?? 0) + 1;
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
