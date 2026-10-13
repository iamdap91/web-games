export const villagePlaces = {
    entrance: { x: 0, z: 11 },
    hearth: { x: -5, z: 3 },
    dojo: { x: 1, z: -5 },
    bridge: { x: 8, z: 3 },
    refuge: { x: 10, z: -8 },
};
export const villageBuildings = [
    { id: 'dojo', x: 1, z: -5, width: 6, depth: 3.2 },
    { id: 'workshop', x: -9, z: -1.5, width: 5, depth: 3.4 },
    { id: 'home', x: -8.5, z: 8.4, width: 5, depth: 3.2 },
];
export const villageTrees = [
    { x: -12, z: -9, size: 1.1 },
    { x: -6, z: -11, size: 1.25 },
    { x: 5.4, z: -11, size: 0.95 },
    { x: 12, z: -11, size: 1.1 },
    { x: 12, z: -4, size: 0.9 },
    { x: 12, z: 9, size: 1.15 },
    { x: 6, z: 11, size: 0.9 },
    { x: -12, z: 3, size: 1.05 },
    { x: -12, z: 11.7, size: 1.2 },
];
const actorRadius = 0.32;
const speed = 4.2;
export function streamCenter(z) {
    return 7.7 + Math.sin(z * 0.32) * 0.48;
}
export function isVillageWalkable(point) {
    if (Math.abs(point.x) > 13.1 || Math.abs(point.z) > 12.4)
        return false;
    const inWater = Math.abs(point.x - streamCenter(point.z)) < 0.9 + actorRadius;
    const onBridge = Math.abs(point.z - 3) < 1.3 || Math.abs(point.z + 10) < 1.2;
    if (inWater && !onBridge)
        return false;
    if (villageBuildings.some((b) => point.x > b.x - b.width / 2 - actorRadius &&
        point.x < b.x + b.width / 2 + actorRadius &&
        point.z > b.z - b.depth - actorRadius &&
        point.z < b.z + actorRadius))
        return false;
    if (villageTrees.some((t) => Math.hypot(point.x - t.x, point.z - t.z) < 0.45 + actorRadius))
        return false;
    if (Math.hypot(point.x + 5, point.z - 3) < 0.62 + actorRadius)
        return false;
    return true;
}
/** 발밑 충돌·길찾기·시설 반응을 소유하고 화면 API에 의존하지 않는다. */
export class PixelVillage {
    position = villagePlaces.entrance;
    direction = { x: 0, z: 1 };
    moving = false;
    restored = false;
    night = false;
    fireSeconds = 0;
    elapsed = 0;
    steps = 0;
    message = '불빛이 있는 마당을 지나, 도장과 개울 뒷길을 걸어보세요.';
    visited = new Set();
    route = [];
    get snapshot() {
        const nearby = this.nearby();
        return {
            position: { ...this.position },
            direction: { ...this.direction },
            moving: this.moving,
            restored: this.restored,
            night: this.night,
            fireSeconds: this.fireSeconds,
            elapsed: this.elapsed,
            nearby,
            visited: [...this.visited],
            steps: this.steps,
            message: this.message,
            target: this.route.at(-1) ?? null,
        };
    }
    update(delta, input) {
        this.elapsed += delta;
        this.fireSeconds = Math.max(0, this.fireSeconds - delta);
        let direction = input;
        if (input.x !== 0 || input.z !== 0)
            this.route = [];
        else if (this.route[0]) {
            const next = this.route[0];
            const distance = Math.hypot(next.x - this.position.x, next.z - this.position.z);
            if (distance < speed * delta + 0.1)
                this.route.shift();
            direction = { x: next.x - this.position.x, z: next.z - this.position.z };
        }
        const magnitude = Math.hypot(direction.x, direction.z);
        this.moving = false;
        if (magnitude > 0.01) {
            this.direction = {
                x: direction.x / magnitude,
                z: direction.z / magnitude,
            };
            const dx = this.direction.x * speed * delta;
            const dz = this.direction.z * speed * delta;
            const previous = this.position;
            // 축별 이동으로 담 모서리에 걸렸을 때 멈추지 않고 가장자리를 따라 걷는다.
            if (isVillageWalkable({ x: this.position.x + dx, z: this.position.z }))
                this.position = { ...this.position, x: this.position.x + dx };
            if (isVillageWalkable({ x: this.position.x, z: this.position.z + dz }))
                this.position = { ...this.position, z: this.position.z + dz };
            const moved = Math.hypot(this.position.x - previous.x, this.position.z - previous.z);
            this.moving = moved > 0.001;
            this.steps += moved;
        }
        const place = this.nearby();
        if (place && !this.visited.has(place)) {
            this.visited.add(place);
            if (place === 'refuge')
                this.message =
                    '개울 뒷길의 쉼터를 찾았어요. 물소리와 등불 사이에서 쉬어갑니다.';
        }
    }
    walkTo(target) {
        if (!isVillageWalkable(target)) {
            this.message = '건물과 물은 지나갈 수 없어요. 발을 디딜 곳을 골라주세요.';
            return;
        }
        // 작은 독립 구역에서만 쓰는 반 단위 격자 경로. 물과 건물의 실제 판정을 공유한다.
        const cell = 0.5;
        const key = (p) => `${p.x},${p.z}`;
        const start = {
            x: Math.round(this.position.x / cell) * cell,
            z: Math.round(this.position.z / cell) * cell,
        };
        const end = {
            x: Math.round(target.x / cell) * cell,
            z: Math.round(target.z / cell) * cell,
        };
        const frontier = [start];
        const previous = new Map([[key(start), null]]);
        for (let head = 0; head < frontier.length && head < 3200; head += 1) {
            const current = frontier[head];
            if (!current)
                break;
            if (key(current) === key(end))
                break;
            for (const offset of [
                { x: cell, z: 0 },
                { x: -cell, z: 0 },
                { x: 0, z: cell },
                { x: 0, z: -cell },
            ]) {
                const next = { x: current.x + offset.x, z: current.z + offset.z };
                if (!previous.has(key(next)) && isVillageWalkable(next)) {
                    previous.set(key(next), current);
                    frontier.push(next);
                }
            }
        }
        if (!previous.has(key(end))) {
            this.message = '그곳으로 이어지는 길을 찾지 못했어요.';
            return;
        }
        const route = [target];
        let cursor = end;
        while (cursor && key(cursor) !== key(start)) {
            route.push(cursor);
            cursor = previous.get(key(cursor)) ?? null;
        }
        this.route = route.reverse();
    }
    interact() {
        const nearby = this.nearby();
        if (nearby === 'hearth') {
            this.fireSeconds = 8;
            this.message =
                '장작을 넣었어요. 불꽃이 솟고, 마당과 담벼락이 따뜻해집니다.';
        }
        else if (nearby === 'dojo') {
            this.toggleRestored();
        }
        else if (nearby === 'refuge') {
            this.message =
                '버드나무 아래 쉼터. 돌아갈 길은 위쪽 작은 다리로 이어져요.';
        }
        else
            this.message = '화덕·도장 앞·강변 쉼터 가까이에서 살펴볼 수 있어요.';
    }
    toggleRestored() {
        this.restored = !this.restored;
        this.message = this.restored
            ? '도장을 고쳤어요. 새 기와와 문살, 홍등이 골목의 표정을 바꿉니다.'
            : '복구 전의 도장. 덧댄 판자와 오래된 기와가 남아있어요.';
    }
    toggleNight() {
        this.night = !this.night;
    }
    reset() {
        this.position = villagePlaces.entrance;
        this.route = [];
        this.moving = false;
        this.message = '마을 입구로 돌아왔어요.';
    }
    nearby() {
        for (const place of ['hearth', 'dojo', 'refuge']) {
            const p = villagePlaces[place];
            if (Math.hypot(this.position.x - p.x, this.position.z - p.z) < 2.3)
                return place;
        }
        return null;
    }
}
