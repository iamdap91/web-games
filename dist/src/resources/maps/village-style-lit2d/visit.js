export const entrance = { x: 0, z: 10 };
export const places = [
    { id: 'hearth', x: -7, z: 4.7, label: '불빛 화덕' },
    { id: 'dojo', x: 1, z: -3.8, label: '등불 도장' },
    { id: 'rest', x: 8, z: 6.5, label: '달빛 쉼터' },
];
export function canWalk(point) {
    if (!Number.isFinite(point.x + point.z))
        return false;
    if (point.x < -12.5 || point.x > 12.5 || point.z < -4.2 || point.z > 11)
        return false;
    if (Math.hypot(point.x + 7, point.z - 3) < 1.1)
        return false;
    if (point.x > 6 && point.x < 10 && point.z > 4.1 && point.z < 5.3)
        return false;
    return true;
}
export function findRoute(start, target) {
    if (!canWalk(target))
        return [];
    const cell = 0.4;
    const key = (point) => `${Math.round(point.x / cell)},${Math.round(point.z / cell)}`;
    const first = {
        x: Math.round(start.x / cell) * cell,
        z: Math.round(start.z / cell) * cell,
    };
    const end = {
        x: Math.round(target.x / cell) * cell,
        z: Math.round(target.z / cell) * cell,
    };
    const queue = [first];
    const previous = new Map([[key(first), null]]);
    for (let head = 0; head < queue.length && head < 3500; head++) {
        const current = queue[head];
        if (!current || key(current) === key(end))
            break;
        for (const [dx, dz] of [
            [cell, 0],
            [-cell, 0],
            [0, cell],
            [0, -cell],
        ]) {
            const next = { x: current.x + (dx ?? 0), z: current.z + (dz ?? 0) };
            if (!previous.has(key(next)) && canWalk(next)) {
                previous.set(key(next), current);
                queue.push(next);
            }
        }
    }
    if (!previous.has(key(end)))
        return [];
    const route = [target];
    let cursor = end;
    while (cursor && key(cursor) !== key(first)) {
        route.push(cursor);
        cursor = previous.get(key(cursor)) ?? null;
    }
    return route.reverse();
}
export class LitVisit {
    position = entrance;
    direction = { x: 0, z: 1 };
    route = [];
    elapsed = 0;
    steps = 0;
    moving = false;
    restored = false;
    fireSeconds = 0;
    normalEnabled = true;
    lightPosition = 0;
    lightMoving = true;
    message = '움직이는 등불을 따라 골목을 걷고, 돌과 기와의 빛을 살펴보세요.';
    visited = new Set();
    get snapshot() {
        const nearby = places.find((p) => Math.hypot(p.x - this.position.x, p.z - this.position.z) < 1.3)?.id ?? null;
        return {
            position: { ...this.position },
            direction: { ...this.direction },
            moving: this.moving,
            restored: this.restored,
            fireSeconds: this.fireSeconds,
            elapsed: this.elapsed,
            steps: this.steps,
            nearby,
            visited: [...this.visited],
            normalEnabled: this.normalEnabled,
            lightPosition: this.lightPosition,
            lightMoving: this.lightMoving,
            routeRemaining: this.route.length,
            message: this.message,
        };
    }
    update(delta, input) {
        if (!Number.isFinite(delta + input.x + input.z) || delta <= 0)
            return;
        const dt = Math.min(delta, 0.05);
        this.elapsed += dt;
        this.fireSeconds = Math.max(0, this.fireSeconds - dt);
        let vector = input;
        if (Math.hypot(input.x, input.z) > 0.01)
            this.route = [];
        else if (this.route[0]) {
            const next = this.route[0];
            const distance = Math.hypot(next.x - this.position.x, next.z - this.position.z);
            if (distance < 4.4 * dt + 0.01) {
                this.position = { ...next };
                this.route.shift();
            }
            vector = { x: next.x - this.position.x, z: next.z - this.position.z };
        }
        const length = Math.hypot(vector.x, vector.z);
        this.moving = false;
        if (length > 0.001) {
            this.direction = { x: vector.x / length, z: vector.z / length };
            const previous = this.position;
            const dx = this.direction.x * 4.4 * dt, dz = this.direction.z * 4.4 * dt;
            if (canWalk({ x: this.position.x + dx, z: this.position.z }))
                this.position = { ...this.position, x: this.position.x + dx };
            if (canWalk({ x: this.position.x, z: this.position.z + dz }))
                this.position = { ...this.position, z: this.position.z + dz };
            const distance = Math.hypot(this.position.x - previous.x, this.position.z - previous.z);
            this.steps += distance;
            this.moving = distance > 0.001;
        }
        const nearby = this.snapshot.nearby;
        if (nearby)
            this.visited.add(nearby);
    }
    navigate(point) {
        this.route = findRoute(this.position, point);
        if (!this.route.length)
            this.message = '돌담과 화덕은 지나갈 수 없어요. 열린 돌길을 눌러주세요.';
    }
    interact() {
        const nearby = this.snapshot.nearby;
        if (nearby === 'hearth') {
            this.fireSeconds = 10;
            this.message =
                '장작을 넣었어요. 따뜻한 빛이 화덕 돌의 모서리와 젖은 길을 훑습니다.';
        }
        else if (nearby === 'dojo')
            this.toggleRestored();
        else if (nearby === 'rest')
            this.message =
                '달빛 쉼터. 푸른 달빛과 등불빛이 같은 벤치의 서로 다른 면에 닿습니다.';
        else
            this.message = '화덕·도장·쉼터 가까이에서 사용해보세요.';
    }
    toggleRestored() {
        this.restored = !this.restored;
        this.message = this.restored
            ? '도장을 고쳤어요. 청록 기와와 문살, 두 개의 홍등이 켜집니다.'
            : '오래된 도장으로 돌아왔어요.';
    }
    toggleNormal() {
        this.normalEnabled = !this.normalEnabled;
    }
    changeLight() {
        this.lightPosition = (this.lightPosition + 1) % 3;
        this.lightMoving = false;
    }
    toggleLightMovement() {
        this.lightMoving = !this.lightMoving;
    }
    reset() {
        this.position = entrance;
        this.route = [];
        this.moving = false;
        this.message = '입구로 돌아왔어요. 살펴본 시설은 기억합니다.';
    }
}
