export const villageTerrain = {
    upperHeight: 2.8,
    stairsBottomZ: 2.2,
    stairsTopZ: -3,
    stairsHalfWidth: 1.85,
    rampEdgeX: 7.3,
    rampBottomZ: 3,
    rampTopZ: -6,
    riverLeftX: 8.15,
    riverRightX: 10.1,
    bridgeBackZ: 4.4,
    bridgeFrontZ: 6.6,
};
export const villagePoints = [
    { id: 'fire', name: '공동 화덕', x: -4.6, z: 4.9 },
    { id: 'dojo', name: '언덕 도장', x: 0, z: -4.2 },
    { id: 'rest', name: '강변 쉼터', x: 10.8, z: -8.4 },
];
const buildings = [
    { x0: -10.7, x1: -6.2, z0: 3.5, z1: 6.4 },
    { x0: 2.8, x1: 6.8, z0: 0.2, z1: 3.8 },
    { x0: -10.5, x1: -5.1, z0: -8.7, z1: -5.2 },
    { x0: -3.4, x1: 3.4, z0: -8.7, z1: -5.5 },
    { x0: 4.1, x1: 7.0, z0: -8.7, z1: -5.6 },
];
/** 지면·계단·동쪽 경사로를 같은 좌표로 판정해 절벽을 걸어서 오르지 못하게 한다. */
export function villageHeight({ x, z }) {
    const t = villageTerrain;
    if (x >= t.rampEdgeX && z < t.rampBottomZ)
        return Math.min(t.upperHeight, ((t.rampBottomZ - z) / (t.rampBottomZ - t.rampTopZ)) * t.upperHeight);
    if (z < t.stairsTopZ)
        return t.upperHeight;
    if (Math.abs(x) < t.stairsHalfWidth && z < t.stairsBottomZ)
        return (((t.stairsBottomZ - z) / (t.stairsBottomZ - t.stairsTopZ)) * t.upperHeight);
    if (x > t.rampEdgeX && z >= t.bridgeBackZ && z <= t.bridgeFrontZ)
        return 0.14;
    return 0;
}
export function isVillageWalkable(position) {
    const { x, z } = position;
    if (x < -12.5 || x > 12.5 || z < -11.5 || z > 11.3)
        return false;
    const t = villageTerrain;
    if (x > t.riverLeftX &&
        x < t.riverRightX &&
        z > t.rampBottomZ &&
        (z < t.bridgeBackZ || z > t.bridgeFrontZ))
        return false;
    if (Math.hypot(x + 4.6, z - 3.5) < 0.72)
        return false;
    return !buildings.some((b) => x > b.x0 - 0.24 && x < b.x1 + 0.24 && z > b.z0 - 0.24 && z < b.z1 + 0.24);
}
export function canVillageStep(from, to) {
    return (isVillageWalkable(to) &&
        Math.abs(villageHeight(to) - villageHeight(from)) < 0.37);
}
/** 누른 지점의 경로는 높이가 연결된 격자를 통과해 절벽과 건물을 우회한다. */
export function villageRoute(from, to) {
    const size = 0.5;
    const start = { x: Math.round(from.x / size), z: Math.round(from.z / size) };
    const goal = { x: Math.round(to.x / size), z: Math.round(to.z / size) };
    const key = (p) => `${p.x},${p.z}`;
    const open = [start];
    const parents = new Map();
    const costs = new Map([[key(start), 0]]);
    const score = (p) => (costs.get(key(p)) ?? Infinity) +
        Math.abs(p.x - goal.x) +
        Math.abs(p.z - goal.z);
    for (let attempt = 0; open.length && attempt < 2600; attempt++) {
        open.sort((a, b) => score(a) - score(b));
        const current = open.shift();
        if (!current)
            break;
        if (key(current) === key(goal)) {
            const result = [];
            let next = current;
            while (key(next) !== key(start)) {
                result.unshift({ x: next.x * size, z: next.z * size });
                const previous = parents.get(key(next));
                if (!previous)
                    break;
                next = previous;
            }
            return result;
        }
        for (const offset of [
            { x: 1, z: 0 },
            { x: -1, z: 0 },
            { x: 0, z: 1 },
            { x: 0, z: -1 },
        ]) {
            const next = { x: current.x + offset.x, z: current.z + offset.z };
            if (!canVillageStep({ x: current.x * size, z: current.z * size }, { x: next.x * size, z: next.z * size }))
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
/** 작은 마을의 보행·높이·시설 시험 상태를 소유한다. */
export class VillageVisit {
    position = { x: 0, z: 10.5 };
    facing = 'front';
    moving = false;
    restored = false;
    fire = 0;
    route = [];
    visited = new Set();
    get snapshot() {
        return {
            ...this.position,
            height: villageHeight(this.position),
            facing: this.facing,
            moving: this.moving,
            restored: this.restored,
            fire: this.fire,
            visited: [...this.visited],
            routeRemaining: this.route.length,
        };
    }
    get nearby() {
        return villagePoints.find((p) => Math.hypot(p.x - this.position.x, p.z - this.position.z) < 1.8);
    }
    navigate(to) {
        this.route = villageRoute(this.position, to);
    }
    stop() {
        this.route = [];
        this.moving = false;
    }
    reset() {
        this.position = { x: 0, z: 10.5 };
        this.stop();
        this.visited.clear();
    }
    toggleRestored() {
        this.restored = !this.restored;
    }
    interact() {
        const point = this.nearby;
        if (!point)
            return '계단 위 도장, 화덕, 강변 쉼터를 찾아보세요.';
        this.visited.add(point.id);
        if (point.id === 'fire') {
            this.fire = 6;
            return '불이 살아나고, 화덕 빛이 골목을 데웁니다.';
        }
        if (point.id === 'dojo') {
            this.toggleRestored();
            return this.restored
                ? '도장 복구 · 기와와 등이 제자리를 찾았습니다.'
                : '도장 복구 전 · 무너진 기와와 꺼진 등불';
        }
        return '쉼터에 도착했어요. 언덕 아래를 돌아 다리로 내려가 보세요.';
    }
    update(seconds, input) {
        this.fire = Math.max(0, this.fire - seconds);
        let dx = input.x, dz = input.z;
        if (dx || dz)
            this.route = [];
        else if (this.route[0]) {
            const target = this.route[0];
            dx = target.x - this.position.x;
            dz = target.z - this.position.z;
            if (Math.hypot(dx, dz) < 0.12) {
                this.route.shift();
                dx = 0;
                dz = 0;
            }
        }
        const magnitude = Math.hypot(dx, dz);
        this.moving = magnitude > 0;
        if (!this.moving)
            return;
        if (Math.abs(dx) > Math.abs(dz))
            this.facing = dx > 0 ? 'right' : 'left';
        else
            this.facing = dz > 0 ? 'front' : 'back';
        const distance = Math.min(3.4 * seconds, this.route.length ? magnitude : Infinity);
        const nextX = {
            x: this.position.x + (dx / magnitude) * distance,
            z: this.position.z,
        };
        if (canVillageStep(this.position, nextX))
            this.position = nextX;
        const nextZ = {
            x: this.position.x,
            z: this.position.z + (dz / magnitude) * distance,
        };
        if (canVillageStep(this.position, nextZ))
            this.position = nextZ;
    }
}
