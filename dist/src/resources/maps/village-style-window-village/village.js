export const buildings = [
    { id: 'workshop', name: '창빛 공방', x: -7, z: 0, width: 6, depth: 5 },
    { id: 'dojo', name: '작은 수련당', x: 0, z: -7, width: 6, depth: 5 },
    { id: 'teahouse', name: '개울 찻집', x: 9, z: -2, width: 6, depth: 5 },
];
export const entrance = { x: -2, z: 11 };
export const bridge = { x: 4.5, z: 5 };
export const fixtures = [
    { id: 'hearth', room: 'workshop', name: '공방 풀무', x: -8.5, z: -2.5 },
    { id: 'repair', room: 'dojo', name: '수련 마루', x: 0, z: -9.5 },
    { id: 'tea', room: 'teahouse', name: '창가 찻상', x: 9, z: -4.5 },
];
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export function roomAt(point) {
    return (buildings.find((b) => Math.abs(point.x - b.x) < b.width / 2 &&
        point.z < b.z &&
        point.z > b.z - b.depth)?.id ?? null);
}
export function isWalkable(point, permission) {
    if (!Number.isFinite(point.x) ||
        !Number.isFinite(point.z) ||
        Math.abs(point.x) > 14 ||
        Math.abs(point.z) > 13)
        return false;
    // 개울은 하나의 넓은 다리에서만 건넌다. 실내 권한으로 개울을 통과할 수 없다.
    if (Math.abs(point.x - bridge.x) < 0.8 && Math.abs(point.z - bridge.z) > 1.1)
        return false;
    for (const b of buildings) {
        const inBuilding = Math.abs(point.x - b.x) < b.width / 2 + 0.2 &&
            point.z < b.z + 0.2 &&
            point.z > b.z - b.depth - 0.2;
        if (!inBuilding)
            continue;
        if (permission !== b.id)
            return false;
        if (Math.abs(point.x - b.x) > b.width / 2 - 0.35 ||
            point.z < b.z - b.depth + 0.35)
            return false;
        // 벽과 문은 같은 판정을 공유한다. 앞벽은 문 폭만 열어둔다.
        if (point.z > b.z - 0.35 && Math.abs(point.x - b.x) > 0.65)
            return false;
    }
    return true;
}
export function findRoute(from, to, permission) {
    if (!isWalkable(to, permission))
        return [];
    const key = (p) => `${p.x},${p.z}`;
    const start = {
        x: Math.round(from.x * 2) / 2,
        z: Math.round(from.z * 2) / 2,
    };
    const end = { x: Math.round(to.x * 2) / 2, z: Math.round(to.z * 2) / 2 };
    const queue = [start];
    const previous = new Map([[key(start), null]]);
    for (let head = 0; head < queue.length && head < 6500; head++) {
        const current = queue[head];
        if (!current)
            break;
        if (key(current) === key(end))
            break;
        for (const [dx, dz] of [
            [0.5, 0],
            [-0.5, 0],
            [0, 0.5],
            [0, -0.5],
        ]) {
            const next = { x: current.x + (dx ?? 0), z: current.z + (dz ?? 0) };
            if (!previous.has(key(next)) && isWalkable(next, permission)) {
                previous.set(key(next), current);
                queue.push(next);
            }
        }
    }
    if (!previous.has(key(end)))
        return [];
    const route = [to];
    let cursor = end;
    while (cursor && key(cursor) !== key(start)) {
        route.push(cursor);
        cursor = previous.get(key(cursor)) ?? null;
    }
    return route.reverse();
}
/** 실외와 실내가 한 월드에 있다. 문 허용·경로·생활 반응·잠금은 이 객체가 함께 소유한다. */
export class WindowVillage {
    position = { ...entrance };
    direction = { x: 0, z: 1 };
    route = [];
    inside = null;
    transition = null;
    moving = false;
    visited = new Set();
    worked = false;
    repaired = false;
    trained = false;
    tea = false;
    fireSeconds = 0;
    trainingSeconds = 0;
    elapsed = 0;
    message = '공방의 창으로 보이는 불과 손길. 문을 열고 들어가 같은 생활을 가까이 보세요.';
    get snapshot() {
        return {
            position: { ...this.position },
            direction: { ...this.direction },
            moving: this.moving,
            target: this.route.at(-1) ? { ...this.route.at(-1) } : null,
            inside: this.inside,
            transition: this.transition,
            nearbyDoor: buildings.find((b) => distance(this.position, { x: b.x, z: b.z + 0.6 }) < 1.05)?.id ?? null,
            nearbyFixture: fixtures.find((f) => f.room === this.inside && distance(this.position, f) < 1.25)?.id ?? null,
            visited: [...this.visited],
            worked: this.worked,
            repaired: this.repaired,
            trained: this.trained,
            tea: this.tea,
            fireSeconds: this.fireSeconds,
            trainingSeconds: this.trainingSeconds,
            elapsed: this.elapsed,
            message: this.message,
        };
    }
    isUnlocked(id) {
        return id === 'workshop' || (id === 'dojo' ? this.worked : this.repaired);
    }
    walkTo(point) {
        if (this.transition)
            return;
        const permission = this.inside;
        const destinationRoom = roomAt(point);
        if (destinationRoom !== this.inside && (destinationRoom || this.inside)) {
            this.message = this.inside
                ? '문으로 나간 뒤 다음 곳으로 걸어가세요. 나가기 버튼도 같은 문을 통과합니다.'
                : '집 안은 문 앞에서 Space로 들어가세요.';
            return;
        }
        const route = findRoute(this.position, point, permission);
        if (!route.length) {
            this.message = '벽과 개울을 피해 다리와 문을 따라 걸어보세요.';
            return;
        }
        this.route = [...route];
    }
    approach(id) {
        if (this.inside || this.transition) {
            this.message = '현재 방의 문으로 먼저 나가세요.';
            return;
        }
        const b = buildings.find((b) => b.id === id);
        if (b)
            this.walkTo({ x: b.x, z: b.z + 0.8 });
    }
    update(delta, input = { x: 0, z: 0 }) {
        this.elapsed += delta;
        this.fireSeconds = Math.max(0, this.fireSeconds - delta);
        this.trainingSeconds = Math.max(0, this.trainingSeconds - delta);
        this.moving = false;
        if (!this.transition && Math.hypot(input.x, input.z) > 0.01) {
            this.route = [];
            const n = Math.hypot(input.x, input.z), step = 3.6 * delta;
            const dx = (input.x / n) * step, dz = (input.z / n) * step;
            if (isWalkable({ x: this.position.x + dx, z: this.position.z }, this.inside))
                this.move({ x: this.position.x + dx, z: this.position.z });
            if (isWalkable({ x: this.position.x, z: this.position.z + dz }, this.inside))
                this.move({ x: this.position.x, z: this.position.z + dz });
        }
        else {
            let budget = 3.6 * delta;
            while (budget > 0 && this.route.length) {
                const target = this.route[0];
                const gap = distance(this.position, target);
                if (gap < 0.001) {
                    this.route.shift();
                    continue;
                }
                const step = Math.min(budget, gap);
                const ratio = step / gap;
                this.move({
                    x: this.position.x + (target.x - this.position.x) * ratio,
                    z: this.position.z + (target.z - this.position.z) * ratio,
                });
                budget -= step;
                if (step === gap)
                    this.route.shift();
            }
        }
        const room = roomAt(this.position);
        if (this.transition && room === this.transition) {
            this.inside = room;
            this.visited.add(room);
        }
        if (this.transition && !this.route.length)
            this.transition = null;
        if (this.inside && !room && isWalkable(this.position, null))
            this.inside = null;
    }
    move(point) {
        const dx = point.x - this.position.x, dz = point.z - this.position.z, gap = Math.hypot(dx, dz);
        if (gap > 0.000001) {
            this.direction = { x: dx / gap, z: dz / gap };
            this.moving = true;
        }
        this.position = point;
    }
    interact() {
        if (this.transition)
            return;
        const fixture = this.snapshot.nearbyFixture;
        if (fixture === 'hearth') {
            this.worked = true;
            this.fireSeconds = 14;
            this.message =
                '풀무를 도왔어요. 창밖에도 같은 불이 보이고, 수련당 열쇠를 받았습니다.';
            return;
        }
        if (fixture === 'repair') {
            if (!this.repaired) {
                this.repaired = true;
                this.message =
                    '흔들리는 창과 마루를 고쳤어요. 새 창빛이 골목으로 번집니다. 찻집도 문을 열었어요.';
            }
            else {
                this.trained = true;
                this.trainingSeconds = 8;
                this.message =
                    '주민과 함께 수련해요. 바깥 창을 통해서도 움직이는 목인과 손이 보입니다.';
            }
            return;
        }
        if (fixture === 'tea') {
            this.tea = true;
            this.message = this.trained
                ? '불과 수리와 수련을 마친 귀환. 개울 찻집에서 오늘의 차를 받습니다.'
                : '창가에서 차를 받아요. 밖에서 보던 같은 찻상과 주민입니다.';
            return;
        }
        if (this.inside) {
            this.message =
                '방 안 시설 가까이 걸어가서 Space를 누르세요. 출입은 문으로 연결됩니다.';
            return;
        }
        const door = this.snapshot.nearbyDoor;
        if (!door) {
            this.message =
                '창빛을 따라 문 앞으로. Space로 들어가고 실내 시설 가까이서 다시 사용하세요.';
            return;
        }
        if (!this.isUnlocked(door)) {
            this.message =
                door === 'dojo'
                    ? '수련당이 잠겨 있어요. 먼저 공방의 풀무를 돕고 열쇠를 받아오세요.'
                    : '찻집은 수련당 마루가 복구되면 문을 열어요.';
            return;
        }
        const b = buildings.find((b) => b.id === door);
        this.transition = door;
        this.route = [
            { x: b.x, z: b.z + 0.6 },
            { x: b.x, z: b.z - 1.2 },
        ];
        this.message = `${b.name}의 문을 열어요. 밖에서 보던 창·가구·주민이 같은 자리에 있습니다.`;
    }
    exit() {
        if (!this.inside || this.transition)
            return;
        const b = buildings.find((b) => b.id === this.inside);
        const route = findRoute(this.position, { x: b.x, z: b.z - 0.5 }, this.inside);
        if (!route.length)
            return;
        this.transition = this.inside;
        this.route = [...route, { x: b.x, z: b.z + 0.8 }];
        this.message =
            '같은 문을 걸어서 나옵니다. 창으로 보이는 생활과 완료 기록은 남아요.';
    }
    returnToEntrance() {
        this.position = { ...entrance };
        this.inside = this.transition = null;
        this.route = [];
        this.moving = false;
        this.message =
            '입구로 돌아왔어요. 공방 열쇠·마루 복구·수련·차·방문 기록은 남아 있어요.';
    }
}
