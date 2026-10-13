export const buildings = [
    { x: 15, z: 11.6, w: 9, d: 5, kind: 'dojo' },
    { x: 31, z: 15, w: 8, d: 5, kind: 'tea' },
    { x: 7.5, z: 18, w: 6, d: 4, kind: 'home' },
];
export const trees = [
    { x: 7, z: 7, size: 2.2 },
    { x: 4.5, z: 12, size: 1.8 },
    { x: 22, z: 4, size: 1.8 },
    { x: 28, z: 4, size: 2 },
    { x: 31.5, z: 4, size: 1.9 },
    { x: 38, z: 5, size: 2.3 },
    { x: 41.5, z: 8, size: 2.1 },
    { x: 42.5, z: 17, size: 2 },
    { x: 7, z: 26, size: 2.1 },
    { x: 12, z: 28, size: 1.7 },
    { x: 32, z: 27, size: 1.8 },
    { x: 45, z: 24, size: 1.9 },
];
export const places = [
    {
        id: 'hearth',
        name: '빵 화덕',
        x: 13.3,
        z: 20.8,
        approach: { x: 14.5, z: 23 },
    },
    { id: 'dojo', name: '빈 도장', x: 15, z: 14.1, approach: { x: 16, z: 16.2 } },
    {
        id: 'refuge',
        name: '나무 뒤 쉼터',
        x: 35,
        z: 5.3,
        approach: { x: 35, z: 7.3 },
    },
];
export const start = { x: 23.5, z: 27 };
export const walkRadius = 0.42;
export function riverCenter(z) {
    return 39 + Math.sin(z * 0.28) * 1.4;
}
export function isWalkable(point) {
    const { x, z } = point;
    if (x < 3 || x > 45.5 || z < 3 || z > 29)
        return false;
    if (z > 9 &&
        Math.abs(x - riverCenter(z)) < 1.65 + walkRadius &&
        Math.abs(z - 21) > 1.4)
        return false;
    for (const b of buildings) {
        if (Math.abs(x - b.x) < b.w / 2 + walkRadius &&
            Math.abs(z - b.z) < b.d / 2 + walkRadius)
            return false;
    }
    for (const t of trees)
        if (Math.hypot(x - t.x, z - t.z) < t.size * 0.44 + walkRadius)
            return false;
    if (Math.hypot(x - 13.3, z - 20.8) < 1.3 + walkRadius)
        return false;
    if (Math.abs(x - 35) < 1.8 + walkRadius &&
        Math.abs(z - 5.3) < 0.6 + walkRadius)
        return false;
    return true;
}
function distance(a, b) {
    return Math.hypot(a.x - b.x, a.z - b.z);
}
const step = 0.5;
const gridWidth = 97;
const key = (p) => Math.round(p.z / step) * gridWidth + Math.round(p.x / step);
const fromKey = (id) => ({
    x: (id % gridWidth) * step,
    z: Math.floor(id / gridWidth) * step,
});
/** 대각선 모서리 통과를 피하는 4근접 탐색. 냇물·집·나무를 실제로 우회한다. */
export function findPath(origin, requested) {
    const candidates = [];
    for (let z = 3; z <= 29; z += step)
        for (let x = 3; x <= 45.5; x += step) {
            const p = { x, z };
            if (isWalkable(p))
                candidates.push(p);
        }
    const closest = (p) => candidates.reduce((a, b) => (distance(b, p) < distance(a, p) ? b : a), candidates[0]);
    const source = closest(origin), goal = closest(requested), sourceKey = key(source), goalKey = key(goal);
    const queue = [sourceKey], seen = new Map([[sourceKey, sourceKey]]);
    for (let head = 0; head < queue.length; head++) {
        const id = queue[head];
        if (id === goalKey)
            break;
        const p = fromKey(id);
        for (const next of [
            { x: p.x + step, z: p.z },
            { x: p.x - step, z: p.z },
            { x: p.x, z: p.z + step },
            { x: p.x, z: p.z - step },
        ]) {
            const nextKey = key(next);
            if (seen.has(nextKey) || !isWalkable(next))
                continue;
            seen.set(nextKey, id);
            queue.push(nextKey);
        }
    }
    if (!seen.has(goalKey))
        return [];
    const path = [];
    for (let id = goalKey; id !== sourceKey; id = seen.get(id))
        path.unshift(fromKey(id));
    if (distance(origin, source) > 0.05)
        path.unshift(source);
    return path;
}
export class LimitedVillage {
    position = { ...start };
    direction = { x: 0, z: 1 };
    moving = false;
    elapsed = 0;
    steps = 0;
    restored = false;
    fireSeconds = 0;
    visited = new Set();
    route = [];
    message = '빵 화덕의 연기 너머, 두빛 마을을 한 바퀴 걸어보세요.';
    get snapshot() {
        return {
            position: { ...this.position },
            direction: { ...this.direction },
            moving: this.moving,
            elapsed: this.elapsed,
            steps: this.steps,
            nearby: this.nearby,
            visited: [...this.visited],
            restored: this.restored,
            fireSeconds: this.fireSeconds,
            route: this.route.map((p) => ({ ...p })),
            message: this.message,
        };
    }
    get nearby() {
        return (places.find((p) => distance(this.position, p.approach) < 2)?.id ?? null);
    }
    walkTo(point) {
        this.route = findPath(this.position, point);
        if (this.route.length)
            this.message = '좁은 도장 옆길로 갈까요, 서쪽 나무 사이로 돌아갈까요?';
    }
    update(delta, input) {
        if (delta <= 0)
            return;
        this.elapsed += delta;
        this.fireSeconds = Math.max(0, this.fireSeconds - delta);
        this.moving = false;
        let vector = input;
        const manual = Math.hypot(input.x, input.z) > 0;
        if (manual)
            this.route = [];
        else {
            while (this.route[0] && distance(this.position, this.route[0]) < 0.08)
                this.route.shift();
            const next = this.route[0];
            vector = next
                ? { x: next.x - this.position.x, z: next.z - this.position.z }
                : { x: 0, z: 0 };
        }
        const length = Math.hypot(vector.x, vector.z);
        if (!length)
            return;
        const travel = Math.min(delta * 5.8, manual ? Infinity : length);
        const movement = {
            x: (vector.x / length) * travel,
            z: (vector.z / length) * travel,
        };
        const before = { ...this.position };
        const x = { x: this.position.x + movement.x, z: this.position.z };
        if (isWalkable(x))
            this.position.x = x.x;
        const z = { x: this.position.x, z: this.position.z + movement.z };
        if (isWalkable(z))
            this.position.z = z.z;
        const moved = distance(before, this.position);
        this.moving = moved > 0.001;
        if (this.moving) {
            this.direction = vector;
            this.steps += moved;
        }
    }
    interact() {
        const nearby = this.nearby;
        if (!nearby) {
            this.message = '화덕·도장·나무 뒤 쉼터 앞에서 사용해 보세요.';
            return;
        }
        this.visited.add(nearby);
        if (nearby === 'hearth') {
            this.fireSeconds = 14;
            this.message = '장작이 톡! 빵 굽는 냄새에 마을 굴뚝도 숨을 쉽니다.';
        }
        else if (nearby === 'dojo')
            this.toggleRestored();
        else
            this.message =
                '나무 뒤에서 쉼터를 찾았어요. 물결 한 줄, 찻잔 하나. 잠깐 쉬어갑니다.';
    }
    toggleRestored() {
        this.restored = !this.restored;
        this.message = this.restored
            ? '깨진 처마를 잇고 등불을 걸었어요. 도장 앞 목인도 다시 섭니다.'
            : '복구 전 도장. 빈 창과 부서진 처마가 기다립니다.';
    }
    reset() {
        this.position = { ...start };
        this.direction = { x: 0, z: 1 };
        this.moving = false;
        this.route = [];
        this.message = '입구로 돌아왔어요. 이번에는 다른 골목을 걸어볼까요?';
    }
}
