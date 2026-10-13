export const stairs = [12, 28];
export const facilities = [
    { id: 'hearth', name: '찻집 화덕', x: 6, z: 0 },
    { id: 'dojo', name: '오래된 도장', x: 20, z: 0 },
    { id: 'refuge', name: '뒷골목 쉼터', x: 33, z: 1 },
];
export function laneBounds(z) {
    return z === -1 ? [12, 28] : z === 1 ? [12, 36] : [1, 37];
}
/** 각 보행층의 연결은 두 계단만 소유한다. 클릭도 같은 연결을 통과한다. */
export class SideVillage {
    position = { x: 2, z: 0 };
    route = [];
    moving = false;
    facing = 'right';
    elapsed = 0;
    steps = 0;
    restored = false;
    fireSeconds = 0;
    visited = new Set();
    rooftopFound = false;
    message = '찻집에서 차를 데우고, 계단에서 지붕길과 뒷골목을 골라보세요.';
    get snapshot() {
        const target = this.route.at(-1);
        return {
            position: { ...this.position },
            target: target ? { ...target } : null,
            moving: this.moving,
            facing: this.facing,
            elapsed: this.elapsed,
            steps: this.steps,
            restored: this.restored,
            fireSeconds: this.fireSeconds,
            visited: [...this.visited],
            rooftopFound: this.rooftopFound,
            nearby: this.nearby?.id ?? null,
            nearbyName: this.nearby?.name ?? null,
            lane: this.position.z < -0.9
                ? '지붕길'
                : this.position.z > 0.9
                    ? '뒷골목'
                    : Math.abs(this.position.z) < 0.1
                        ? '상점 앞길'
                        : '연결 계단',
            message: this.message,
        };
    }
    get nearby() {
        return facilities.find((f) => Math.abs(f.x - this.position.x) < 1.1 &&
            Math.abs(f.z - this.position.z) < 0.1);
    }
    walkTo(point) {
        const z = Math.max(-1, Math.min(1, Math.round(point.z)));
        const [low, high] = laneBounds(z);
        const destination = { x: Math.max(low, Math.min(high, point.x)), z };
        this.route = [];
        if (Math.abs(this.position.z - z) > 0.01) {
            const gate = stairs.reduce((best, x) => Math.abs(x - this.position.x) + Math.abs(x - destination.x) <
                Math.abs(best - this.position.x) + Math.abs(best - destination.x)
                ? x
                : best);
            this.route.push({ x: gate, z: this.position.z }, { x: gate, z: 0 });
            if (z !== 0)
                this.route.push({ x: gate, z });
        }
        this.route.push(destination);
    }
    changeLane(direction) {
        if (!stairs.some((x) => Math.abs(x - this.position.x) < 0.8)) {
            this.message = '계단 표지에서 ↑는 지붕길, ↓는 뒷골목으로 이어져요.';
            return;
        }
        this.walkTo({
            x: this.position.x,
            z: Math.max(-1, Math.min(1, Math.round(this.position.z) + direction)),
        });
    }
    update(delta, horizontal) {
        this.elapsed += delta;
        this.fireSeconds = Math.max(0, this.fireSeconds - delta);
        this.moving = false;
        // 계단 중간에서는 층 연결을 끝내야 옆걸음으로 발밑 높이가 튀지 않는다.
        if (horizontal !== 0 &&
            Math.abs(this.position.z - Math.round(this.position.z)) < 0.01) {
            this.route = [];
            const [low, high] = laneBounds(Math.round(this.position.z));
            this.move({
                x: Math.max(low, Math.min(high, this.position.x + horizontal * 4.2 * delta)),
                z: Math.round(this.position.z),
            });
        }
        else {
            const target = this.route[0];
            if (target) {
                const dx = target.x - this.position.x;
                const dz = target.z - this.position.z;
                const distance = Math.hypot(dx, dz * 3);
                const ratio = Math.min(1, (4.2 * delta) / Math.max(0.0001, distance));
                this.move({
                    x: this.position.x + dx * ratio,
                    z: this.position.z + dz * ratio,
                });
                if (ratio === 1)
                    this.route.shift();
            }
        }
        if (this.nearby)
            this.visited.add(this.nearby.id);
        if (this.position.z < -0.9 && this.position.x > 17 && !this.rooftopFound) {
            this.rooftopFound = true;
            this.message =
                '지붕 사이 숨은 풍경을 찾았어요. 아래 거리의 소음이 멀어집니다.';
        }
    }
    move(point) {
        const distance = Math.hypot(point.x - this.position.x, point.z - this.position.z);
        this.steps += distance;
        this.moving = distance > 0.00001;
        if (point.x !== this.position.x)
            this.facing = point.x > this.position.x ? 'right' : 'left';
        this.position = point;
    }
    interact() {
        const facility = this.nearby;
        if (!facility) {
            this.message =
                '문 앞에서 Space를 눌러보세요. 계단은 ↑ / ↓로 오르내립니다.';
            return;
        }
        this.visited.add(facility.id);
        if (facility.id === 'hearth') {
            this.fireSeconds = 8;
            this.message =
                '주인이 화덕에 불을 붙였어요. 차 향과 연기가 간판 위로 올라갑니다.';
        }
        else if (facility.id === 'dojo') {
            this.restored = !this.restored;
            this.message = this.restored
                ? '도장 간판에 불이 켜지고 기와가 다시 놓였습니다.'
                : '복구 전과 후를 나란히 비교할 수 있도록 되돌렸어요.';
        }
        else {
            this.message = this.rooftopFound
                ? '지붕과 뒷골목을 모두 발견했어요. 꽃등 아래 잠시 쉬어갑니다.'
                : '가게 뒤에 숨은 작은 쉼터. 같은 거리에도 다른 길이 있어요.';
        }
    }
    toggleRestored() {
        this.restored = !this.restored;
    }
    reset() {
        this.position = { x: 2, z: 0 };
        this.route = [];
        this.moving = false;
        this.message = '입구로 돌아왔어요. 발견한 길과 도장 복구는 남아 있어요.';
    }
}
