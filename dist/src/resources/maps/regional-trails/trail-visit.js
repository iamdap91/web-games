const grid = 0.5;
const movementEpsilon = 0.0001;
const key = (p) => `${p.x},${p.z}`;
/** 길 모형과 같은 영역 데이터로 보행과 클릭 경로를 판정한다. */
export class TrailVisit {
    ground;
    position;
    facing = 'north';
    moving = false;
    route = [];
    visited = new Set();
    definition;
    constructor(ground) {
        this.ground = ground;
        this.definition = ground.definition;
        this.position = { ...this.definition.start };
    }
    get snapshot() {
        return {
            ...this.position,
            moving: this.moving,
            facing: this.facing,
            visited: [...this.visited],
            remaining: this.route.length,
        };
    }
    get nearby() {
        return this.definition.landmarks.find((p) => Math.hypot(p.position.x - this.position.x, p.position.z - this.position.z) < 2.1);
    }
    isWalkable(p) {
        return this.ground.isWalkable(p);
    }
    reset() {
        this.position = { ...this.definition.start };
        this.facing = 'north';
        this.visited.clear();
        this.stop();
    }
    stop() {
        this.route = [];
        this.moving = false;
    }
    inspect() {
        const nearby = this.nearby;
        if (!nearby)
            return '길가의 표식 가까이에서 Space를 눌러 살펴보세요.';
        this.visited.add(nearby.id);
        return nearby.description;
    }
    navigate(target) {
        this.route = this.findRoute(target);
        this.moving = false;
        return this.route.length > 0;
    }
    update(delta, input) {
        this.moving = false;
        const length = Math.hypot(input.x, input.z);
        if (length > 0) {
            this.route = [];
            this.step({ x: input.x / length, z: input.z / length }, Math.min(delta, 0.04) * 4.8);
            return;
        }
        let budget = Math.min(delta, 0.04) * 4.8;
        // 경유점에서 남은 부동소수점 오차를 다음 보행 실패로 해석하지 않는다.
        while (budget > movementEpsilon && this.route.length) {
            const next = this.route[0];
            const dx = next.x - this.position.x, dz = next.z - this.position.z;
            const distance = Math.hypot(dx, dz);
            if (distance < 0.015) {
                this.route.shift();
                continue;
            }
            const amount = Math.min(distance, budget);
            this.step({ x: dx / distance, z: dz / distance }, amount);
            budget -= amount;
            if (amount === distance)
                this.route.shift();
            if (!this.moving) {
                this.route = [];
                break;
            }
        }
    }
    step(direction, distance) {
        const before = this.position;
        const next = {
            x: before.x + direction.x * distance,
            z: before.z + direction.z * distance,
        };
        if (this.isWalkable(next))
            this.position = next;
        else if (this.isWalkable({ x: next.x, z: before.z }))
            this.position = { x: next.x, z: before.z };
        else if (this.isWalkable({ x: before.x, z: next.z }))
            this.position = { x: before.x, z: next.z };
        const dx = this.position.x - before.x, dz = this.position.z - before.z;
        this.moving = Math.hypot(dx, dz) > movementEpsilon;
        if (this.moving) {
            const directions = [
                'east',
                'south-east',
                'south',
                'south-west',
                'west',
                'north-west',
                'north',
                'north-east',
            ];
            const sector = Math.round(Math.atan2(dz, dx) / (Math.PI / 4));
            this.facing = directions[(sector + 8) % 8];
        }
    }
    findRoute(target) {
        if (!this.isWalkable(target))
            return [];
        const start = this.nearestGrid(this.position), goal = this.nearestGrid(target);
        if (!start || !goal)
            return [];
        const open = [start], costs = new Map([[key(start), 0]]), previous = new Map();
        const visited = new Set();
        const score = (p) => (costs.get(key(p)) ?? Infinity) +
            Math.abs(p.x - goal.x) +
            Math.abs(p.z - goal.z);
        // 확장된 길도 실제 격자 범위 안에서는 끝까지 탐색한다.
        const bounds = this.ground.bounds;
        const cellLimit = this.ground.variant === 'seamless'
            ? (Math.ceil((bounds.maxX - bounds.minX) / grid) + 3) *
                (Math.ceil((bounds.maxZ - bounds.minZ) / grid) + 3)
            : 6000;
        while (open.length && visited.size < cellLimit) {
            open.sort((a, b) => score(a) - score(b));
            const current = open.shift();
            if (key(current) === key(goal)) {
                const route = [target];
                let cursor = current;
                while (key(cursor) !== key(start)) {
                    route.unshift({ x: cursor.x * grid, z: cursor.z * grid });
                    const parent = previous.get(key(cursor));
                    if (!parent)
                        return [];
                    cursor = parent;
                }
                route.unshift({ x: start.x * grid, z: start.z * grid });
                return route;
            }
            if (visited.has(key(current)))
                continue;
            visited.add(key(current));
            for (const [dx, dz] of [
                [1, 0],
                [-1, 0],
                [0, 1],
                [0, -1],
            ]) {
                const next = { x: current.x + dx, z: current.z + dz };
                if (visited.has(key(next)) ||
                    !this.canWalkBetween({ x: current.x * grid, z: current.z * grid }, { x: next.x * grid, z: next.z * grid }))
                    continue;
                const cost = (costs.get(key(current)) ?? 0) + 1;
                if (cost >= (costs.get(key(next)) ?? Infinity))
                    continue;
                costs.set(key(next), cost);
                previous.set(key(next), current);
                open.push(next);
            }
        }
        return [];
    }
    // 둥근 가장자리에서는 격자 양끝이 길 안이어도 그 사이가 길 밖일 수 있다.
    canWalkBetween(from, to) {
        const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / 0.125));
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            if (!this.isWalkable({
                x: from.x + (to.x - from.x) * t,
                z: from.z + (to.z - from.z) * t,
            }))
                return false;
        }
        return true;
    }
    nearestGrid(point) {
        const candidates = [];
        const baseX = Math.round(point.x / grid), baseZ = Math.round(point.z / grid);
        for (let x = -1; x <= 1; x++)
            for (let z = -1; z <= 1; z++) {
                const candidate = { x: baseX + x, z: baseZ + z };
                if (this.canWalkBetween(point, {
                    x: candidate.x * grid,
                    z: candidate.z * grid,
                }))
                    candidates.push(candidate);
            }
        return candidates.sort((a, b) => Math.hypot(a.x * grid - point.x, a.z * grid - point.z) -
            Math.hypot(b.x * grid - point.x, b.z * grid - point.z))[0];
    }
}
