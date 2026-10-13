export const rootTrails = [
    {
        points: [
            { x: -8, z: 3 },
            { x: -5, z: 1 },
            { x: -2, z: 1 },
            { x: 0, z: -0.8 },
            { x: 4, z: -0.6 },
            { x: 7, z: 1 },
        ],
        radius: 1.75,
    },
    {
        points: [
            { x: -5, z: 1 },
            { x: -5, z: -2.8 },
            { x: -2, z: -4 },
            { x: 2, z: -3.4 },
            { x: 4, z: -0.6 },
        ],
        radius: 1.05,
    },
];
export const villagePlaces = {
    entrance: { x: -7.7, z: 2.5 },
    hearth: { x: -4.2, z: 1 },
    dojo: { x: -0.8, z: -0.1 },
    refuge: { x: 1.5, z: -3.4 },
};
export const approachPoints = {
    hearth: { x: -4.2, z: 2 },
    dojo: villagePlaces.dojo,
    refuge: villagePlaces.refuge,
};
export const villageHouses = [
    { id: 'dojo', x: -1, z: -1.6, radius: 0.9, size: 1.18 },
    { id: 'workshop', x: -6.1, z: -0.1, radius: 0.6, size: 0.76 },
    { id: 'home', x: 5.8, z: 0, radius: 0.67, size: 0.85 },
];
const playerRadius = 0.18;
const speed = 3.2;
function segmentDistance(p, a, b) {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz)));
    return Math.hypot(p.x - a.x - dx * t, p.z - a.z - dz * t);
}
export function isRootWalkable(p) {
    const onRoot = rootTrails.some((trail) => trail.points.some((a, i) => {
        const b = trail.points[i + 1];
        return b && segmentDistance(p, a, b) < trail.radius - playerRadius;
    }));
    if (!onRoot)
        return false;
    if (villageHouses.some((house) => Math.hypot(p.x - house.x, p.z - house.z) < house.radius + playerRadius))
        return false;
    return (Math.hypot(p.x - villagePlaces.hearth.x, p.z - villagePlaces.hearth.z) >
        0.62);
}
/** 보행과 시설 반응은 그림과 독립적으로 뿌리의 실제 폭을 따른다. */
export class CollageVillage {
    position = villagePlaces.entrance;
    direction = { x: 1, z: 0 };
    moving = false;
    restored = false;
    discovered = false;
    fireSeconds = 0;
    elapsed = 0;
    steps = 0;
    visited = new Set();
    route = [];
    message = '큰 뿌리를 따라 걸어보세요. 늘어진 이끼 뒤에도 길이 있습니다.';
    get snapshot() {
        return {
            position: { ...this.position },
            direction: { ...this.direction },
            moving: this.moving,
            restored: this.restored,
            discovered: this.discovered,
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
        this.moving = this.route.length > 0;
        const magnitude = Math.hypot(direction.x, direction.z);
        if (magnitude > 0.001) {
            this.direction = {
                x: direction.x / magnitude,
                z: direction.z / magnitude,
            };
            const dx = this.direction.x * speed * delta;
            const dz = this.direction.z * speed * delta;
            const old = this.position;
            if (isRootWalkable({ x: old.x + dx, z: old.z }))
                this.position = { ...this.position, x: old.x + dx };
            if (isRootWalkable({ x: this.position.x, z: old.z + dz }))
                this.position = { ...this.position, z: old.z + dz };
            const distance = Math.hypot(this.position.x - old.x, this.position.z - old.z);
            this.steps += distance;
            this.moving = distance > 0.001;
        }
        const nearby = this.nearby();
        if (nearby)
            this.visited.add(nearby);
        if (nearby === 'refuge' && !this.discovered) {
            this.discovered = true;
            this.message =
                '이끼 뒤에서 포자 쉼터를 찾았어요. 푸른 포자가 돌아갈 길을 비춰줍니다.';
        }
    }
    walkTo(target) {
        if (!isRootWalkable(target)) {
            this.message = '아래는 숲의 빈 공간이에요. 뿌리 윗면을 골라주세요.';
            return;
        }
        const cell = 0.25;
        const key = (p) => `${p.x},${p.z}`;
        const start = {
            x: Math.round(this.position.x / cell) * cell,
            z: Math.round(this.position.z / cell) * cell,
        };
        const end = {
            x: Math.round(target.x / cell) * cell,
            z: Math.round(target.z / cell) * cell,
        };
        if (!isRootWalkable(start) || !isRootWalkable(end)) {
            this.message = '뿌리 가운데를 조금 더 가까이 골라주세요.';
            return;
        }
        const frontier = [start];
        const previous = new Map([[key(start), null]]);
        for (let head = 0; head < frontier.length && head < 7000; head += 1) {
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
                if (!previous.has(key(next)) && isRootWalkable(next)) {
                    previous.set(key(next), current);
                    frontier.push(next);
                }
            }
        }
        if (!previous.has(key(end))) {
            this.message = '이어지는 뿌리길을 찾지 못했어요.';
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
            this.fireSeconds = 12;
            this.message =
                '씨앗 화덕에 불을 지폈어요. 작은 주전자가 덜컹이고 따뜻한 포자가 올라옵니다.';
        }
        else if (place === 'dojo')
            this.toggleRestored();
        else if (place === 'refuge')
            this.message =
                '속이 빈 호두 껍질 쉼터. 바람에 닿은 조개가 맑게 울리는 듯해요.';
        else
            this.message = '씨앗 화덕·버섯 도장·포자 쉼터 가까이에서 살펴보세요.';
    }
    toggleRestored() {
        this.restored = !this.restored;
        this.message = this.restored
            ? '버섯 도장이 열렸어요. 찢어진 지붕을 잎으로 꿰매고 포자 등불을 걸었습니다.'
            : '도장을 고치기 전의 찢어진 버섯 지붕으로 돌아왔어요.';
    }
    reset() {
        this.position = villagePlaces.entrance;
        this.route = [];
        this.moving = false;
        this.message =
            '뿌리 입구로 돌아왔어요. 발견한 길과 고친 도장은 남아 있습니다.';
    }
    nearby() {
        for (const place of ['hearth', 'dojo', 'refuge'])
            if (Math.hypot(this.position.x - villagePlaces[place].x, this.position.z - villagePlaces[place].z) < 1.4)
                return place;
        return null;
    }
}
