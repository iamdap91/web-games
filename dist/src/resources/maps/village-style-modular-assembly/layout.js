export const modularRules = {
    cell: 2.6,
    radius: 0.23,
    speed: 3.9,
    grid: 0.26,
    boundX: 8.8,
    boundZ: 8.7,
    groundY: 0.06,
    archHalf: 0.85,
};
export const modularEntrance = { x: 0, z: 7.5 };
export const modularPlaces = [
    { id: 'hearth', label: '나루 차 화덕', x: -4.9, z: 4.45 },
    { id: 'dojo', label: '이어짓는 도장', x: 0, z: 2.25 },
    { id: 'rest', label: '안쪽 마당 쉼터', x: 0, z: -2.6 },
];
const seeds = [
    ...[-2, -1, 0, 1].flatMap((row) => [
        { col: -2, row, stage: 0, color: 0xe8a06f },
        { col: 2, row, stage: 0, color: 0x77adb8 },
    ]),
    { col: -1, row: -2, stage: 0, color: 0xe3bf68 },
    { col: 1, row: -2, stage: 0, color: 0x92b49c },
    { col: 0, row: 0, stage: 0, color: 0xe4ac83 },
    { col: -1, row: 0, stage: 1, color: 0xe8a06f },
    { col: 1, row: 0, stage: 1, color: 0x77adb8 },
    { col: -1, row: -1, stage: 2, color: 0xe3bf68 },
    { col: 1, row: -1, stage: 2, color: 0x92b49c },
    { col: 0, row: -2, stage: 2, color: 0xe4ac83 },
];
const directions = [
    { side: 'north', dx: 0, dz: -1 },
    { side: 'south', dx: 0, dz: 1 },
    { side: 'west', dx: -1, dz: 0 },
    { side: 'east', dx: 1, dz: 0 },
];
/** 건물과 통행 판정은 같은 인접 표를 사용한다. 단계는 배치만 바꾸며 형태 규칙에는 관여하지 않는다. */
export function modularTopology(stage) {
    const occupied = seeds.filter((seed) => seed.stage <= stage);
    const has = (col, row) => occupied.some((seed) => seed.col === col && seed.row === row);
    const cells = occupied.map((seed) => {
        const walls = directions
            .filter((direction) => !has(seed.col + direction.dx, seed.row + direction.dz))
            .map((direction) => direction.side);
        const arch = seed.col === 0 && seed.row === 0 && has(-1, 0) && has(1, 0);
        return {
            ...seed,
            x: seed.col * modularRules.cell,
            z: seed.row * modularRules.cell,
            walls,
            roofSides: walls,
            arch,
        };
    });
    const exteriorWalls = cells.reduce((sum, cell) => sum + cell.walls.length, 0);
    const courtyard = has(-1, -1) && has(1, -1) && has(0, -2) && has(0, 0);
    return {
        cells,
        sharedWalls: (cells.length * 4 - exteriorWalls) / 2,
        exteriorWalls,
        arches: cells.filter((cell) => cell.arch).length,
        courtyard,
        signature: cells
            .map((cell) => `${cell.col},${cell.row}:${cell.walls.join('/')}:${cell.arch ? 'arch' : 'solid'}`)
            .join('|'),
    };
}
export function canWalkModular(point, stage) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.z))
        return false;
    const r = modularRules.radius;
    if (Math.abs(point.x) > modularRules.boundX - r ||
        Math.abs(point.z) > modularRules.boundZ - r)
        return false;
    if (Math.hypot(point.x + 5.8, point.z - 4.45) < 0.48 + r)
        return false;
    return !modularTopology(stage).cells.some((cell) => {
        const inside = Math.abs(point.x - cell.x) < modularRules.cell / 2 + r &&
            Math.abs(point.z - cell.z) < modularRules.cell / 2 + r;
        if (!inside)
            return false;
        return !cell.arch || Math.abs(point.x - cell.x) > modularRules.archHalf - r;
    });
}
function clearSegment(a, b, stage) {
    const steps = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.07);
    for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        if (!canWalkModular({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }, stage))
            return false;
    }
    return true;
}
/** 작은 마을의 실제 통로를 탐색하고 건물 클릭은 가장 가까운 보행점으로 보정한다. */
export function modularRoute(from, to, stage) {
    if (!Number.isFinite(to.x) || !Number.isFinite(to.z))
        return [];
    const size = modularRules.grid;
    const cells = [];
    for (let x = -32; x <= 32; x++)
        for (let z = -32; z <= 32; z++)
            if (canWalkModular({ x: x * size, z: z * size }, stage))
                cells.push({ x, z });
    const closest = (point) => cells.reduce((best, cell) => !best ||
        Math.hypot(cell.x * size - point.x, cell.z * size - point.z) <
            Math.hypot(best.x * size - point.x, best.z * size - point.z)
        ? cell
        : best, undefined);
    const start = closest(from), goal = closest(to);
    if (!start ||
        !goal ||
        !clearSegment(from, { x: start.x * size, z: start.z * size }, stage))
        return [];
    const key = (point) => `${point.x},${point.z}`;
    const open = [start], parents = new Map(), costs = new Map([[key(start), 0]]), closed = new Set();
    const score = (point) => (costs.get(key(point)) ?? Infinity) +
        Math.abs(point.x - goal.x) +
        Math.abs(point.z - goal.z);
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
            if (canWalkModular(to, stage) &&
                clearSegment(route.at(-1) ?? from, to, stage))
                route.push(to);
            const compact = [];
            let origin = from;
            while (route.length) {
                let index = route.length - 1;
                while (index > 0 &&
                    !clearSegment(origin, route[index] ?? origin, stage))
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
                !canWalkModular({ x: next.x * size, z: next.z * size }, stage))
                continue;
            const cost = (costs.get(key(current)) ?? 0) + 1;
            if (cost >= (costs.get(key(next)) ?? Infinity))
                continue;
            costs.set(key(next), cost);
            parents.set(key(next), current);
            if (!open.some((point) => key(point) === key(next)))
                open.push(next);
        }
    }
    return [];
}
