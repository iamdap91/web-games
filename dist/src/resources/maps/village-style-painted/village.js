export const villagePlaces = {
    entrance: { x: 0, z: 11 },
    hearth: { x: -3, z: 3 },
    dojo: { x: -2, z: -4 },
    refuge: { x: 10, z: -1.2 },
};
export const villageBuildings = [
    { id: 'dojo', x: -2, z: -5.5, width: 7.7, depth: 3.6 },
    { id: 'workshop', x: -11, z: 0.2, width: 5, depth: 3.8 },
    { id: 'home', x: 9.5, z: 7.7, width: 5.2, depth: 3.4 },
    { id: 'store', x: -10, z: 10, width: 5.7, depth: 3.1 },
];
const radius = 0.34;
const speed = 4.8;
export function isVillageWalkable(p) {
    if (Math.abs(p.x) > 15.3 || Math.abs(p.z) > 12.8)
        return false;
    if (p.x > 6.4 - radius &&
        p.x < 12.7 + radius &&
        p.z < -3.4 + radius &&
        p.z > -11.2 - radius)
        return false;
    if (villageBuildings.some((b) => p.x > b.x - b.width / 2 - radius &&
        p.x < b.x + b.width / 2 + radius &&
        p.z > b.z - b.depth - radius &&
        p.z < b.z + radius))
        return false;
    if (Math.hypot(p.x + 3, p.z - 3) < 0.75 + radius)
        return false;
    // 낮은 담은 그림의 발밑 띠와 같은 경계를 사용한다.
    if (p.z > 8.7 - radius &&
        p.z < 9.2 + radius &&
        p.x > -5.3 - radius &&
        p.x < -2 + radius)
        return false;
    return true;
}
/** 보행·길찾기와 시설의 시간을 소유한다. 그림 좌표는 이 객체 밖에서 변환한다. */
export class PaintedVillage {
    position = villagePlaces.entrance;
    direction = { x: 0, z: 1 };
    moving = false;
    restored = false;
    fireSeconds = 0;
    elapsed = 0;
    steps = 0;
    visited = new Set();
    route = [];
    message = '빛바랜 광장을 지나 도장과 갈대 연못의 쉼터를 찾아보세요.';
    get snapshot() {
        return {
            position: { ...this.position },
            direction: { ...this.direction },
            moving: this.moving,
            restored: this.restored,
            fireSeconds: this.fireSeconds,
            elapsed: this.elapsed,
            steps: this.steps,
            nearby: this.nearby(),
            visited: [...this.visited],
            message: this.message,
            target: this.route.at(-1) ? { ...this.route.at(-1) } : null,
        };
    }
    update(delta, input) {
        this.elapsed += delta;
        this.fireSeconds = Math.max(0, this.fireSeconds - delta);
        let direction = input;
        if (input.x || input.z)
            this.route = [];
        else if (this.route[0]) {
            const next = this.route[0];
            const distance = Math.hypot(next.x - this.position.x, next.z - this.position.z);
            if (distance <= speed * delta) {
                this.steps += distance;
                this.position = next;
                this.route.shift();
                direction = { x: 0, z: 0 };
            }
            else
                direction = {
                    x: next.x - this.position.x,
                    z: next.z - this.position.z,
                };
        }
        const magnitude = Math.hypot(direction.x, direction.z);
        this.moving = this.route.length > 0;
        if (magnitude > 0.001) {
            this.direction = {
                x: direction.x / magnitude,
                z: direction.z / magnitude,
            };
            const dx = this.direction.x * speed * delta, dz = this.direction.z * speed * delta;
            const old = this.position;
            if (isVillageWalkable({ x: old.x + dx, z: old.z }))
                this.position = { ...this.position, x: old.x + dx };
            if (isVillageWalkable({ x: this.position.x, z: old.z + dz }))
                this.position = { ...this.position, z: old.z + dz };
            const distance = Math.hypot(this.position.x - old.x, this.position.z - old.z);
            this.steps += distance;
            this.moving = distance > 0.001;
        }
        const nearby = this.nearby();
        if (nearby)
            this.visited.add(nearby);
    }
    walkTo(target) {
        if (!isVillageWalkable(target)) {
            this.message = '벽과 연못을 피해, 발을 디딜 수 있는 곳을 골라주세요.';
            return;
        }
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
        if (!isVillageWalkable(end) || !isVillageWalkable(start)) {
            this.message = '조금 더 넓은 길을 골라주세요.';
            return;
        }
        const frontier = [start];
        const previous = new Map([[key(start), null]]);
        for (let head = 0; head < frontier.length && head < 4800; head += 1) {
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
                if (!previous.has(key(next)) && isVillageWalkable(next)) {
                    previous.set(key(next), current);
                    frontier.push(next);
                }
            }
        }
        if (!previous.has(key(end))) {
            this.message = '이어지는 길을 찾지 못했어요.';
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
        const place = this.nearby();
        if (place === 'hearth') {
            this.fireSeconds = 9;
            this.message = '장작 냄새가 번져요. 푸른 광장에 주황빛이 묻어납니다.';
        }
        else if (place === 'dojo')
            this.toggleRestored();
        else if (place === 'refuge')
            this.message =
                '갈대 사이에 숨은 쉼터. 낡은 차 주전자와 조용한 물결이 있어요.';
        else
            this.message = '화덕·도장 앞·연못 쉼터에서 살펴볼 수 있어요.';
    }
    toggleRestored() {
        this.restored = !this.restored;
        this.message = this.restored
            ? '도장이 다시 열렸어요. 마당에 차 상과 깃발, 사람들의 흔적이 돌아옵니다.'
            : '도장 문이 닫힌 빛바랜 광장으로 돌아왔어요.';
    }
    reset() {
        this.position = villagePlaces.entrance;
        this.route = [];
        this.moving = false;
        this.message = '광장 입구로 돌아왔어요.';
    }
    nearby() {
        for (const place of ['hearth', 'dojo', 'refuge'])
            if (Math.hypot(this.position.x - villagePlaces[place].x, this.position.z - villagePlaces[place].z) < 2.2)
                return place;
        return null;
    }
}
