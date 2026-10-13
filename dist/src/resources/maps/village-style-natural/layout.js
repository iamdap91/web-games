export const naturalRules = {
    radius: 0.32,
    speed: 4.6,
    bounds: 13.5,
    interactionDistance: 1.9,
};
export const naturalPlaces = [
    {
        id: 'hearth',
        label: '화덕 마당',
        x: -5,
        z: 3,
        description: '장작을 넣자 화덕이 따뜻해졌다. 개울 건너 바람소리도 들린다.',
    },
    {
        id: 'dojo',
        label: '언덕 위 도장',
        x: 1,
        z: -4,
        description: '언덕에서 마을이 한눈에 보인다. R로 도장의 복구 전후를 비교해 보자.',
    },
    {
        id: 'rest',
        label: '물소리 쉼터',
        x: 10.7,
        z: -8.4,
        description: '샛길 끝, 물소리만 남는 작은 쉼터를 찾았다. 북쪽 징검다리로 돌아가 보자.',
    },
];
export const naturalTrees = [
    [-11, 10, 1.15],
    [-9.6, 7.2, 0.9],
    [-12, 3.5, 1.3],
    [-10.5, -2.5, 1.1],
    [-12, -7, 1.35],
    [-8.8, -10.4, 1.25],
    [-5.8, -12, 1.05],
    [-4.8, -7.8, 0.9],
    [5.5, -9, 1.1],
    [4.7, -12, 1.25],
    [11.8, -12, 1.15],
    [12, -3.5, 0.8],
    [12.3, 5.4, 1.1],
    [10.2, 11.2, 1.25],
    [5.8, 12, 0.9],
    [-4.5, 9.7, 0.65],
    [4.3, 5.1, 0.7],
    [5.5, -1.8, 0.75],
    [-8, 0.4, 0.65],
    [12.4, -6.6, 0.62],
];
export const naturalBuildings = [
    { x: 1, z: -7.1, width: 6.1, depth: 4.1 },
    { x: -8.2, z: 4.6, width: 3, depth: 3.2 },
];
export function riverCenter(z) {
    return 7.5 + Math.sin(z * 0.24) * 1.15;
}
export function onBridge(point) {
    return ((Math.abs(point.z - 3) < 1.12 || Math.abs(point.z + 10) < 0.8) &&
        Math.abs(point.x - riverCenter(point.z)) < 2.05);
}
export function groundHeight(point) {
    const hill = 1.85 * Math.exp(-((point.x / 6) ** 2 + ((point.z + 7) / 5.8) ** 2));
    const west = 0.45 * Math.exp(-(((point.x + 9) / 4) ** 2 + ((point.z + 7) / 5) ** 2));
    const east = 0.3 * Math.exp(-(((point.x - 11) / 4) ** 2 + ((point.z + 7) / 7) ** 2));
    const land = 0.12 + hill + west + east;
    return onBridge(point) ? Math.max(land, 0.36) : land;
}
export function canWalkNatural(point) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.z))
        return false;
    if (Math.max(Math.abs(point.x), Math.abs(point.z)) >
        naturalRules.bounds - naturalRules.radius)
        return false;
    if (Math.abs(point.x - riverCenter(point.z)) < 1.2 + naturalRules.radius &&
        !onBridge(point))
        return false;
    if (naturalBuildings.some((area) => Math.hypot(Math.max(0, Math.abs(point.x - area.x) - area.width / 2), Math.max(0, Math.abs(point.z - area.z) - area.depth / 2)) < naturalRules.radius))
        return false;
    if (Math.hypot(point.x + 5, point.z - 3) < 0.7 + naturalRules.radius)
        return false;
    return !naturalTrees.some(([x, z, scale]) => Math.hypot(point.x - x, point.z - z) < 0.3 * scale + naturalRules.radius);
}
export const naturalPaths = [
    [
        { x: 0, z: 13 },
        { x: 0, z: 7 },
        { x: -3, z: 4 },
        { x: -5, z: 1.7 },
        { x: -3, z: -1 },
        { x: 1, z: -4.2 },
    ],
    [
        { x: -2, z: 0 },
        { x: 3, z: 1 },
        { x: 6, z: 3 },
        { x: 10, z: 3 },
        { x: 11, z: -2 },
        { x: 10.7, z: -8.4 },
        { x: 10, z: -10 },
        { x: 5, z: -10 },
        { x: 4.5, z: -5 },
        { x: 1, z: -4.2 },
    ],
    [
        { x: 3, z: 2 },
        { x: 4, z: 7 },
        { x: 0, z: 9 },
    ],
];
export function distanceToPath(point) {
    let distance = Infinity;
    for (const path of naturalPaths)
        for (let i = 1; i < path.length; i++) {
            const a = path[i - 1], b = path[i];
            if (!a || !b)
                continue;
            const dx = b.x - a.x, dz = b.z - a.z;
            const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.z - a.z) * dz) / (dx * dx + dz * dz)));
            distance = Math.min(distance, Math.hypot(point.x - a.x - t * dx, point.z - a.z - t * dz));
        }
    return distance;
}
