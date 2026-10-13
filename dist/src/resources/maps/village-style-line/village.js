export const linePlaces = {
    entrance: { x: 0, z: 12 },
    hearth: { x: -5.5, z: 3 },
    dojo: { x: -1, z: -6 },
    refuge: { x: 11, z: -5 },
};
export const lineBuildings = [
    { id: 'dojo', x: -1, z: -6, width: 7, depth: 3.3 },
    { id: 'workshop', x: -10, z: 0, width: 5.6, depth: 3.2 },
    { id: 'home', x: -10, z: 9, width: 5, depth: 2.8 },
];
export const lineTrees = [
    { x: -14, z: -6, size: 1.1 },
    { x: -8, z: -11, size: 1.15 },
    { x: 5.4, z: -11, size: 1.1 },
    { x: 14.3, z: -10, size: 1.2 },
    { x: 14.1, z: 1, size: 1.0 },
    { x: 12.9, z: 11, size: 1.25 },
    { x: -14.4, z: 11, size: 1.0 },
];
const radius = 0.34;
const speed = 5.1;
export function lineStream(z) {
    return 8.5 + Math.sin(z * 0.31) * 0.55;
}
export function canWalkLine(point) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.z))
        return false;
    if (Math.abs(point.x) > 15.5 || Math.abs(point.z) > 13.5)
        return false;
    const inWater = Math.abs(point.x - lineStream(point.z)) < 1.02 + radius;
    const bridge = Math.abs(point.z - 5) < 1.15 || Math.abs(point.z + 10) < 1.15;
    if (inWater && !bridge)
        return false;
    if (lineBuildings.some((b) => point.x > b.x - b.width / 2 - radius &&
        point.x < b.x + b.width / 2 + radius &&
        point.z > b.z - b.depth - radius &&
        point.z < b.z + radius))
        return false;
    if (lineTrees.some((t) => Math.hypot(point.x - t.x, point.z - t.z) < 0.6 + radius))
        return false;
    if (Math.hypot(point.x - linePlaces.hearth.x, point.z - linePlaces.hearth.z) <
        0.9 + radius)
        return false;
    return true;
}
/** 화면과 독립적인 발밑 규칙. 색 회복과 시설 시간도 이 방문 객체가 소유한다. */
export class LineVillage {
    position = linePlaces.entrance;
    direction = { x: 0, z: 1 };
    moving = false;
    restored = false;
    paintProgress = 0;
    fireSeconds = 0;
    elapsed = 0;
    steps = 0;
    message = '흰 골목을 따라 걸어보세요. 도장을 고치면 마을에 색이 돌아옵니다.';
    visited = new Set();
    route = [];
    get snapshot() {
        const target = this.route.at(-1);
        return {
            position: { ...this.position },
            direction: { ...this.direction },
            moving: this.moving,
            restored: this.restored,
            paintProgress: this.paintProgress,
            fireSeconds: this.fireSeconds,
            elapsed: this.elapsed,
            visited: [...this.visited],
            nearby: this.nearby(),
            steps: this.steps,
            message: this.message,
            routeRemaining: this.route.length,
            target: target ? { ...target } : null,
        };
    }
    update(delta, input) {
        if (!Number.isFinite(delta) ||
            delta <= 0 ||
            !Number.isFinite(input.x) ||
            !Number.isFinite(input.z))
            return;
        const dt = Math.min(delta, 0.05);
        this.elapsed += dt;
        this.fireSeconds = Math.max(0, this.fireSeconds - dt);
        const targetPaint = Number(this.restored);
        this.paintProgress +=
            Math.sign(targetPaint - this.paintProgress) *
                Math.min(Math.abs(targetPaint - this.paintProgress), dt / 1.8);
        let direction = input;
        const manual = input.x !== 0 || input.z !== 0;
        if (manual)
            this.route = [];
        this.moving = false;
        const waypoint = manual ? undefined : this.route[0];
        if (waypoint) {
            const distance = Math.hypot(waypoint.x - this.position.x, waypoint.z - this.position.z);
            if (distance <= speed * dt) {
                this.steps += distance;
                this.position = waypoint;
                this.route.shift();
                this.moving = distance > 0.001;
                this.recordPlace();
                return;
            }
            direction = {
                x: waypoint.x - this.position.x,
                z: waypoint.z - this.position.z,
            };
        }
        const length = Math.hypot(direction.x, direction.z);
        if (length > 0.001) {
            this.direction = { x: direction.x / length, z: direction.z / length };
            const previous = this.position;
            const dx = this.direction.x * speed * dt, dz = this.direction.z * speed * dt;
            if (canWalkLine({ x: this.position.x + dx, z: this.position.z }))
                this.position = { ...this.position, x: this.position.x + dx };
            if (canWalkLine({ x: this.position.x, z: this.position.z + dz }))
                this.position = { ...this.position, z: this.position.z + dz };
            const distance = Math.hypot(this.position.x - previous.x, this.position.z - previous.z);
            this.steps += distance;
            this.moving = distance > 0.001;
            if (!manual && !this.moving)
                this.route = [];
        }
        this.recordPlace();
    }
    walkTo(target) {
        if (!canWalkLine(target)) {
            this.message =
                '물과 건물에는 발을 디딜 수 없어요. 흰 길이나 마당을 골라주세요.';
            return false;
        }
        const cell = 0.5;
        const key = (p) => `${p.x},${p.z}`;
        const gridPoint = (p) => {
            const center = {
                x: Math.round(p.x / cell) * cell,
                z: Math.round(p.z / cell) * cell,
            };
            const candidates = [
                center,
                ...[
                    { x: cell, z: 0 },
                    { x: -cell, z: 0 },
                    { x: 0, z: cell },
                    { x: 0, z: -cell },
                ].map((v) => ({ x: center.x + v.x, z: center.z + v.z })),
            ];
            return (candidates
                .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) -
                Math.hypot(b.x - p.x, b.z - p.z))
                .find(canWalkLine) ?? null);
        };
        const start = gridPoint(this.position), end = gridPoint(target);
        if (!start || !end)
            return false;
        const frontier = [start], previous = new Map([[key(start), null]]);
        for (let head = 0; head < frontier.length && head < 6000; head++) {
            const current = frontier[head];
            if (!current || key(current) === key(end))
                break;
            for (const offset of [
                { x: cell, z: 0 },
                { x: -cell, z: 0 },
                { x: 0, z: cell },
                { x: 0, z: -cell },
            ]) {
                const next = { x: current.x + offset.x, z: current.z + offset.z };
                if (!previous.has(key(next)) && canWalkLine(next)) {
                    previous.set(key(next), current);
                    frontier.push(next);
                }
            }
        }
        if (!previous.has(key(end))) {
            this.message = '이어지는 골목을 찾지 못했어요.';
            return false;
        }
        const route = [target];
        let cursor = end;
        while (cursor) {
            route.push(cursor);
            cursor = previous.get(key(cursor)) ?? null;
        }
        this.route = route.reverse();
        return true;
    }
    interact() {
        const nearby = this.nearby();
        if (nearby === 'hearth') {
            this.fireSeconds = 10;
            this.message =
                '장작을 넣었어요. 흰 벽과 바닥에 따뜻한 살구색이 번집니다.';
        }
        else if (nearby === 'dojo')
            this.toggleRestored();
        else if (nearby === 'refuge')
            this.message =
                '동그란 정원 쉼터. 위쪽 작은 다리로 돌아가거나, 아래 다리로 골목을 다시 걸을 수 있어요.';
        else {
            this.message = '화덕·도장 앞·정원 쉼터 가까이에서 살펴보세요.';
            return false;
        }
        return true;
    }
    toggleRestored() {
        this.restored = !this.restored;
        this.message = this.restored
            ? '도장을 고쳤어요! 골목에 색이 번지고, 화분과 빨래와 마당의 놀이가 돌아옵니다.'
            : '선화로 돌아왔어요. 같은 골목의 윤곽과 빈 공간을 비교해보세요.';
    }
    reset() {
        this.position = linePlaces.entrance;
        this.direction = { x: 0, z: 1 };
        this.route = [];
        this.moving = false;
        this.message = '입구로 돌아왔어요. 색과 방문 기록은 이어집니다.';
    }
    nearby() {
        for (const place of ['hearth', 'dojo', 'refuge']) {
            const p = linePlaces[place];
            if (Math.hypot(this.position.x - p.x, this.position.z - p.z) < 2.3)
                return place;
        }
        return null;
    }
    recordPlace() {
        const place = this.nearby();
        if (place && !this.visited.has(place)) {
            this.visited.add(place);
            if (place === 'refuge')
                this.message =
                    '동그란 정원 쉼터를 찾았어요. 꽃 모양 나무가 길을 지켜봅니다.';
        }
    }
}
