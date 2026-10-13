export const growthRules = {
    roomSize: 3,
    doorway: 1.1,
    radius: 0.2,
    thickness: 0.12,
    groundY: 0.04,
    floorY: 0.22,
    loftY: 0.7,
    speed: 3.15,
    boundX: 7.2,
    minZ: -5.1,
    maxZ: 6,
    grid: 0.15,
};
export const growthEntrance = { x: 0, z: 5.4 };
const roomSeeds = [
    {
        id: 'workshop',
        x: -growthRules.roomSize,
        z: 0,
        stage: 0,
        color: 0xf1d7b4,
        label: '찻불 공방',
    },
    {
        id: 'dojo',
        x: growthRules.roomSize,
        z: 0,
        stage: 0,
        color: 0xc4d5c7,
        label: '虎 도장',
    },
    {
        id: 'corridor',
        x: 0,
        z: 0,
        stage: 1,
        color: 0xddd3b9,
        label: '이어진 복도',
    },
    {
        id: 'lodging',
        x: growthRules.roomSize,
        z: -growthRules.roomSize,
        stage: 2,
        color: 0xd7cedd,
        label: '작은 숙소',
    },
];
const sides = [
    { side: 'north', x: 0, z: -1 },
    { side: 'south', x: 0, z: 1 },
    { side: 'west', x: -1, z: 0 },
    { side: 'east', x: 1, z: 0 },
];
const cache = new Map();
function buildTopology(stage) {
    const rooms = roomSeeds.filter((room) => room.stage <= stage);
    const walls = [];
    let sharedWalls = 0;
    for (const room of rooms)
        for (const side of sides) {
            const neighbor = rooms.find((other) => other.x === room.x + side.x * growthRules.roomSize &&
                other.z === room.z + side.z * growthRules.roomSize);
            if (neighbor && ['north', 'west'].includes(side.side)) {
                sharedWalls++;
                continue;
            }
            const opening = !!neighbor || (side.side === 'south' && room.id !== 'lodging');
            walls.push({
                room: room.id,
                side: side.side,
                x: room.x + side.x * (growthRules.roomSize / 2),
                z: room.z + side.z * (growthRules.roomSize / 2),
                alongX: side.x === 0,
                opening,
                shared: !!neighbor,
            });
        }
    const furniture = [
        { x: -3.85, z: -0.75, w: 0.75, d: 0.7 },
        { x: -2.15, z: -0.8, w: 0.65, d: 0.55 },
        { x: 3.85, z: -0.8, w: 0.45, d: 0.5 },
        ...(stage === 2
            ? [
                { x: -1.05, z: 3.05, w: 0.2, d: 1.5 },
                { x: 0.55, z: 3.05, w: 0.2, d: 1.5 },
                { x: -1.8, z: 3.45, w: 1.1, d: 0.38 },
                { x: 3.85, z: -3.7, w: 0.72, d: 0.9 },
                { x: 2.05, z: -3.8, w: 0.4, d: 0.45 },
            ]
            : [{ x: 3, z: -3.65, w: 1, d: 0.34 }]),
    ];
    return Object.freeze({
        stage,
        rooms,
        walls,
        furniture,
        sharedWalls,
        exteriorWalls: walls.filter((w) => !w.shared).length,
        corridors: stage >= 1 ? 1 : 0,
        courtyard: stage === 2,
        indoorLife: stage === 0
            ? '소규모 공방·수련'
            : stage === 1
                ? '공유 식탁·교류'
                : '숙소·쉬는 주민·마당',
        signature: rooms.map((r) => r.id).join('/'),
    });
}
/** 외벽·통로·실내는 이 한 인접 상태에서 함께 파생한다. */
export function growthTopology(stage) {
    let result = cache.get(stage);
    if (!result) {
        result = buildTopology(stage);
        cache.set(stage, result);
    }
    return result;
}
export function wallSegments(wall) {
    const length = wall.opening
        ? (growthRules.roomSize - growthRules.doorway) / 2
        : growthRules.roomSize;
    const offset = growthRules.doorway / 2 + length / 2;
    const centers = wall.opening ? [-offset, offset] : [0];
    return centers.map((offset) => ({
        x: wall.x + (wall.alongX ? offset : 0),
        z: wall.z + (wall.alongX ? 0 : offset),
        w: wall.alongX ? length : growthRules.thickness,
        d: wall.alongX ? growthRules.thickness : length,
    }));
}
export function growthPlaces(stage) {
    return [
        { id: 'hearth', label: '공방 화덕', x: -growthRules.roomSize, z: 0.25 },
        { id: 'dojo', label: '도장 수련', x: growthRules.roomSize, z: 0.25 },
        {
            id: 'rest',
            label: stage === 2 ? '숙소 쉼터' : '빈터 쉼터',
            x: growthRules.roomSize,
            z: stage === 2 ? -3.35 : -2.85,
        },
    ];
}
function intersects(point, rect) {
    return (Math.abs(point.x - rect.x) < rect.w / 2 + growthRules.radius &&
        Math.abs(point.z - rect.z) < rect.d / 2 + growthRules.radius);
}
export function canWalkGrowth(point, stage) {
    if (!Number.isFinite(point.x) ||
        !Number.isFinite(point.z) ||
        Math.abs(point.x) > growthRules.boundX - growthRules.radius ||
        point.z < growthRules.minZ + growthRules.radius ||
        point.z > growthRules.maxZ - growthRules.radius)
        return false;
    const topology = growthTopology(stage);
    return (!topology.walls.some((wall) => wallSegments(wall).some((rect) => intersects(point, rect))) && !topology.furniture.some((rect) => intersects(point, rect)));
}
/** 3D 바닥과 발 접점 모두 같은 계단 높이를 쓴다. */
export function growthFloor(point, stage) {
    const room = growthTopology(stage).rooms.find((room) => Math.abs(point.x - room.x) < growthRules.roomSize / 2 &&
        Math.abs(point.z - room.z) < growthRules.roomSize / 2);
    if (room?.id === 'lodging') {
        if (point.z <= -2.9)
            return growthRules.loftY;
        if (point.z <= -2.7)
            return 0.58;
        if (point.z <= -2.5)
            return 0.46;
        if (point.z <= -2.3)
            return 0.34;
    }
    if (room)
        return growthRules.floorY;
    const stepRoom = growthTopology(stage).rooms.find((room) => room.id !== 'lodging' &&
        Math.abs(point.x - room.x) < 0.55 &&
        point.z >= growthRules.roomSize / 2 &&
        point.z <= 2.05);
    return stepRoom
        ? point.z < 1.65
            ? 0.19
            : point.z < 1.85
                ? 0.13
                : 0.07
        : growthRules.groundY;
}
function clearLine(a, b, stage) {
    const n = Math.ceil(Math.hypot(a.x - b.x, a.z - b.z) / 0.045);
    for (let i = 1; i <= n; i++)
        if (!canWalkGrowth({ x: a.x + ((b.x - a.x) * i) / n, z: a.z + ((b.z - a.z) * i) / n }, stage))
            return false;
    return true;
}
function gridPoints(stage) {
    const points = [];
    for (let iz = 0; iz <= Math.floor((growthRules.maxZ - growthRules.minZ) / growthRules.grid); iz++)
        for (let ix = 0; ix <= Math.floor((growthRules.boundX * 2) / growthRules.grid); ix++) {
            const point = {
                x: -growthRules.boundX + ix * growthRules.grid,
                z: growthRules.minZ + iz * growthRules.grid,
            };
            if (canWalkGrowth(point, stage))
                points.push(point);
        }
    return points;
}
export function nearestGrowthPoint(point, stage) {
    if (canWalkGrowth(point, stage))
        return point;
    return gridPoints(stage).reduce((best, p) => Math.hypot(p.x - point.x, p.z - point.z) <
        Math.hypot(best.x - point.x, best.z - point.z)
        ? p
        : best, growthEntrance);
}
export function growthRoute(from, to, stage) {
    if (!canWalkGrowth(from, stage) || !canWalkGrowth(to, stage))
        return [];
    if (clearLine(from, to, stage))
        return [to];
    const points = gridPoints(stage), key = (p) => `${Math.round(p.x / growthRules.grid)},${Math.round(p.z / growthRules.grid)}`;
    const byKey = new Map(points.map((p) => [key(p), p]));
    const closest = (p) => [...points]
        .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))
        .find((q) => clearLine(p, q, stage)) ?? growthEntrance;
    const start = closest(from), goal = closest(to), queue = [key(start)], parents = new Map([[key(start), null]]);
    for (let index = 0; index < queue.length; index++) {
        const current = queue[index];
        if (!current)
            continue;
        if (current === key(goal))
            break;
        const p = byKey.get(current);
        if (!p)
            continue;
        for (const [dx, dz] of [
            [growthRules.grid, 0],
            [-growthRules.grid, 0],
            [0, growthRules.grid],
            [0, -growthRules.grid],
        ]) {
            const candidate = { x: p.x + (dx ?? 0), z: p.z + (dz ?? 0) }, next = key(candidate);
            if (parents.has(next) ||
                !byKey.has(next) ||
                !clearLine(p, candidate, stage))
                continue;
            parents.set(next, current);
            queue.push(next);
        }
    }
    if (!parents.has(key(goal)))
        return [];
    const route = [to];
    let current = key(goal);
    while (current) {
        const p = byKey.get(current);
        if (p)
            route.unshift(p);
        current = parents.get(current) ?? null;
    }
    const simplified = [];
    let anchor = from;
    for (let i = 0; i < route.length; i++)
        if (!route[i + 1] || !clearLine(anchor, route[i + 1], stage)) {
            simplified.push(route[i]);
            anchor = route[i];
        }
    return simplified;
}
