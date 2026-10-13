export const forestRules = {
    speed: 3.4,
    radius: 0.18,
    cell: 0.25,
    meshStep: 0.2,
    interactionDistance: 1.15,
};
export const entrance = { x: -9, z: 5 };
export const courtyard = { x: -0.8, z: -0.9, radius: 2.6 };
const rootControls = [
    [
        { x: -10, z: 6, y: 0.55, radius: 1.75 },
        { x: -6, z: 3, y: 0.82, radius: 2.1 },
        { x: -2, z: 1, y: 1.2, radius: 2 },
        { x: 3, z: 0.8, y: 1.45, radius: 1.8 },
        { x: 8.8, z: 3.2, y: 1, radius: 1.65 },
    ],
    [
        { x: -6, z: 3, y: 0.82, radius: 1.5 },
        { x: -6.4, z: -0.7, y: 1.3, radius: 1.3 },
        { x: -4.2, z: -4.5, y: 2.0, radius: 1.3 },
        { x: 0, z: -5.7, y: 2.15, radius: 1.35 },
        { x: 4.7, z: -4.2, y: 1.8, radius: 1.6 },
        { x: 6.5, z: -1.4, y: 1.55, radius: 1.4 },
        { x: 3, z: 0.8, y: 1.45, radius: 1.8 },
    ],
];
function cubic(a, b, c, d, t) {
    return (0.5 *
        (2 * b +
            (-a + c) * t +
            (2 * a - 5 * b + 4 * c - d) * t * t +
            (-a + 3 * b - 3 * c + d) * t * t * t));
}
/** 같은 곡선 표본이 보행 폭·높이·입체 외곽의 기준이다. */
export function sampleRoot(points) {
    const result = [];
    for (let i = 0; i < points.length - 1; i++) {
        const a = points[Math.max(0, i - 1)], b = points[i], c = points[i + 1], d = points[Math.min(points.length - 1, i + 2)];
        for (let j = 0; j < 24; j++) {
            const t = j / 24;
            result.push({
                x: cubic(a.x, b.x, c.x, d.x, t),
                z: cubic(a.z, b.z, c.z, d.z, t),
                y: cubic(a.y, b.y, c.y, d.y, t),
                radius: cubic(a.radius, b.radius, c.radius, d.radius, t),
            });
        }
    }
    result.push(points.at(-1));
    return result;
}
export const rootTrails = rootControls.map(sampleRoot);
export const forestPlaces = [
    {
        id: 'hearth',
        label: '씨앗 화덕',
        x: -5.2,
        z: 3.6,
        description: '씨앗 화덕에 온기가 돌자 옆 껍질의 홈과 돌의 요철이 불빛에 살아났다.',
    },
    {
        id: 'dojo',
        label: '버섯 도장',
        x: -0.3,
        z: -0.1,
        description: '버섯 지붕에 잎 패치를 덧댔다. 속 빈 줄기 마당에 작은 포자 등이 켜진다.',
    },
    {
        id: 'refuge',
        label: '이끼 뒤 쉼터',
        x: -4.2,
        z: -4.5,
        description: '늘어진 이끼 뒤 쉼터 발견. 높은 뿌리를 돌아가는 푸른 포자가 켜졌다.',
    },
];
export const forestBodies = [
    { x: -5.25, z: 2.55, radius: 0.64 },
    { x: -0.3, z: -1.35, radius: 0.82 },
    { x: 7.4, z: 2.5, radius: 0.72 },
    { x: -8, z: 4.7, radius: 0.42 },
];
function surface(point) {
    let height = -Infinity, clearance = -Infinity;
    for (const trail of rootTrails)
        for (let i = 1; i < trail.length; i++) {
            const a = trail[i - 1], b = trail[i], dx = b.x - a.x, dz = b.z - a.z;
            const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.z - a.z) * dz) / (dx * dx + dz * dz)));
            const distance = Math.hypot(point.x - a.x - t * dx, point.z - a.z - t * dz), radius = a.radius + (b.radius - a.radius) * t;
            const margin = radius - distance;
            clearance = Math.max(clearance, margin);
            if (margin >= 0)
                height = Math.max(height, a.y + (b.y - a.y) * t - 0.16 * (distance / radius) ** 2);
        }
    const distance = Math.hypot(point.x - courtyard.x, point.z - courtyard.z);
    clearance = Math.max(clearance, courtyard.radius - distance);
    if (distance <= courtyard.radius)
        height = Math.max(height, 1.16 + 0.12 * Math.cos(distance * 0.6));
    return { height: Number.isFinite(height) ? height : -1.6, clearance };
}
export function rootHeight(point) {
    return surface(point).height;
}
export function onRoot(point, margin = 0) {
    return (Number.isFinite(point.x) &&
        Number.isFinite(point.z) &&
        surface(point).clearance >= margin);
}
export function trunkWall(point) {
    const dx = point.x - courtyard.x, dz = point.z - courtyard.z, r = Math.hypot(dx, dz);
    return r > 2.16 && r < 3.0 && dz < 1.45;
}
/** 보행과 새 뿌리 geometry가 공유하는 끊어진 구간이다. */
export function inShortcutGap(point) {
    return point.x < -4.4 && point.z > -1.65 && point.z < 0.25;
}
export const shortcutRules = {
    openingSeconds: 3.2,
    returnDistance: 1.0,
};
export const shortcutApproach = { x: -6.1, z: -2.25 };
export function canWalkForest(point, shortcutOpen = false) {
    return (onRoot(point, forestRules.radius) &&
        (shortcutOpen || !inShortcutGap(point)) &&
        !trunkWall(point) &&
        !forestBodies.some((body) => Math.hypot(point.x - body.x, point.z - body.z) <
            body.radius + forestRules.radius));
}
/** 클릭 경로도 곡면과 몸체 충돌을 공유한다. */
export function findRoute(start, target, shortcutOpen = false) {
    if (!canWalkForest(target, shortcutOpen))
        return [];
    const cell = forestRules.cell, key = (p) => `${p.x},${p.z}`;
    const snap = (p) => ({
        x: Math.round(p.x / cell) * cell,
        z: Math.round(p.z / cell) * cell,
    });
    // 둥근 몸체 옆의 유효 위치가 격자 반올림만으로 몸체 안에 들어가지 않게 한다.
    const nearbyCell = (point) => {
        const center = snap(point), candidates = [];
        for (let x = -1; x <= 1; x++)
            for (let z = -1; z <= 1; z++)
                candidates.push({ x: center.x + x * cell, z: center.z + z * cell });
        return candidates
            .filter((candidate) => {
            if (!canWalkForest(candidate, shortcutOpen))
                return false;
            const length = Math.hypot(candidate.x - point.x, candidate.z - point.z), steps = Math.max(1, Math.ceil(length / 0.04));
            for (let i = 0; i <= steps; i++)
                if (!canWalkForest({
                    x: point.x + ((candidate.x - point.x) * i) / steps,
                    z: point.z + ((candidate.z - point.z) * i) / steps,
                }, shortcutOpen))
                    return false;
            return true;
        })
            .sort((a, b) => Math.hypot(a.x - point.x, a.z - point.z) -
            Math.hypot(b.x - point.x, b.z - point.z))[0];
    };
    const first = nearbyCell(start), end = nearbyCell(target);
    if (!first || !end)
        return [];
    const queue = [first], previous = new Map([[key(first), null]]);
    for (let head = 0; head < queue.length && head < 11000; head++) {
        const p = queue[head];
        if (key(p) === key(end))
            break;
        for (const offset of [
            { x: cell, z: 0 },
            { x: -cell, z: 0 },
            { x: 0, z: cell },
            { x: 0, z: -cell },
        ]) {
            const next = { x: p.x + offset.x, z: p.z + offset.z };
            if (!previous.has(key(next)) && canWalkForest(next, shortcutOpen)) {
                queue.push(next);
                previous.set(key(next), p);
            }
        }
    }
    if (!previous.has(key(end)))
        return [];
    const result = [target];
    let cursor = end;
    while (cursor && key(cursor) !== key(first)) {
        result.push(cursor);
        cursor = previous.get(key(cursor)) ?? null;
    }
    return result.reverse();
}
/** 뿌리 중심선의 좌표를 UV 결 방향과 둥근 아랫면에 같이 제공한다. */
export function rootFrame(point) {
    let best = {
        center: entrance,
        radius: 1,
        distance: Infinity,
        lateral: 0,
        along: 0,
    };
    for (const trail of rootTrails) {
        let along = 0;
        for (let i = 1; i < trail.length; i++) {
            const a = trail[i - 1], b = trail[i], dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
            const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.z - a.z) * dz) / (length * length)));
            const center = { x: a.x + dx * t, z: a.z + dz * t }, ox = point.x - center.x, oz = point.z - center.z, distance = Math.hypot(ox, oz);
            if (distance < best.distance)
                best = {
                    center,
                    radius: a.radius + (b.radius - a.radius) * t,
                    distance,
                    lateral: (ox * dz - oz * dx) / length,
                    along: along + t * length,
                };
            along += length;
        }
    }
    return best;
}
/** 검증 거리도 실제 클릭 경로의 이동량으로 계산한다. */
export function forestRouteDistance(start, route) {
    let distance = 0, previous = start;
    for (const point of route) {
        distance += Math.hypot(point.x - previous.x, point.z - previous.z);
        previous = point;
    }
    return distance;
}
