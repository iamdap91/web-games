export const stair = { bottom: { x: 23, z: 0 }, top: { x: 26, z: 1 } };
export const facilities = [
    { id: 'workshop', name: '구리빛 공방', x: 7, z: 0, width: 6 },
    { id: 'dojo', name: '달맞이 도장', x: 17.5, z: 0, width: 7 },
    { id: 'inn', name: '등불 여관 · 2층 찻방', x: 30, z: 1, width: 7 },
];
function floorBounds(z) {
    return z === 1 ? [26, 34] : [1, 36];
}
/** 보행과 실내 방문은 이 객체가 소유한다. 모든 층 이동은 실제 경사 계단을 통과한다. */
export class LitStreet {
    position = { x: 2, z: 0 };
    route = [];
    moving = false;
    facing = 'right';
    elapsed = 0;
    inside = null;
    visited = new Set();
    worked = false;
    repaired = false;
    trained = false;
    tea = false;
    fireSeconds = 0;
    practiceSeconds = 0;
    message = '공방의 불을 살리고, 도장을 수리한 뒤 계단 위 찻방에서 쉬어가세요.';
    get snapshot() {
        return {
            position: { ...this.position },
            route: this.route.map((p) => ({ ...p })),
            moving: this.moving,
            facing: this.facing,
            elapsed: this.elapsed,
            inside: this.inside,
            nearby: this.nearby?.id ?? null,
            visited: [...this.visited],
            worked: this.worked,
            repaired: this.repaired,
            trained: this.trained,
            tea: this.tea,
            fireSeconds: this.fireSeconds,
            practiceSeconds: this.practiceSeconds,
            message: this.message,
        };
    }
    get nearby() {
        return facilities.find((f) => Math.abs(f.x - this.position.x) < 1.2 &&
            Math.abs(f.z - this.position.z) < 0.02);
    }
    walkTo(point) {
        const floor = point.z > 0.5 ? 1 : 0;
        const [low, high] = floorBounds(floor);
        const destination = { x: Math.max(low, Math.min(high, point.x)), z: floor };
        this.inside = null;
        // 경사 중 다시 클릭해도 경사의 끝까지 간 후 새 층으로 향한다.
        this.route = [];
        let currentFloor = Math.round(this.position.z);
        if (this.position.z > 0.001 && this.position.z < 0.999) {
            currentFloor = floor;
            this.route.push(floor === 1 ? stair.top : stair.bottom);
        }
        if (currentFloor !== floor) {
            this.route.push(currentFloor === 0 ? stair.bottom : stair.top);
            this.route.push(floor === 1 ? stair.top : stair.bottom);
        }
        this.route.push(destination);
    }
    changeFloor(direction) {
        if (this.position.z > 0.01 && this.position.z < 0.99)
            return;
        const endpoint = this.position.z > 0.5 ? stair.top : stair.bottom;
        if (Math.abs(endpoint.x - this.position.x) > 1.1) {
            this.message = '도장 오른쪽 바깥 계단에서 ↑ / ↓로 층을 바꿀 수 있어요.';
            return;
        }
        const destination = direction > 0 ? stair.top : stair.bottom;
        this.walkTo(destination);
    }
    update(delta, horizontal = 0) {
        this.elapsed += delta;
        this.fireSeconds = Math.max(0, this.fireSeconds - delta);
        this.practiceSeconds = Math.max(0, this.practiceSeconds - delta);
        this.moving = false;
        const onFloor = Math.abs(this.position.z - Math.round(this.position.z)) < 0.001;
        if (horizontal && onFloor) {
            this.route = [];
            const [low, high] = floorBounds(Math.round(this.position.z));
            this.move({
                x: Math.max(low, Math.min(high, this.position.x + horizontal * 4.8 * delta)),
                z: Math.round(this.position.z),
            });
        }
        else {
            const target = this.route[0];
            if (target) {
                const dx = target.x - this.position.x;
                const dz = target.z - this.position.z;
                const distance = Math.hypot(dx, dz * 2.4);
                const ratio = Math.min(1, (4.8 * delta) / Math.max(0.0001, distance));
                this.move({
                    x: this.position.x + dx * ratio,
                    z: this.position.z + dz * ratio,
                });
                if (ratio === 1)
                    this.route.shift();
            }
        }
        if (this.inside && !this.nearby) {
            this.inside = null;
            this.message = '다시 거리로 나왔어요. 시설에서 한 일은 남아 있어요.';
        }
    }
    move(point) {
        this.moving =
            Math.hypot(point.x - this.position.x, point.z - this.position.z) >
                0.00001;
        if (point.x !== this.position.x)
            this.facing = point.x > this.position.x ? 'right' : 'left';
        this.position = point;
    }
    interact() {
        const facility = this.nearby;
        if (!facility) {
            this.message =
                '시설 문 앞에서 Space를 누르면 들어가요. 한 번 더 누르면 일을 함께합니다.';
            return;
        }
        if (this.inside !== facility.id) {
            this.route = [];
            this.inside = facility.id;
            this.visited.add(facility.id);
            this.message = `${facility.name}에 들어왔어요. Space로 ${facility.id === 'workshop' ? '풀무 돕기' : facility.id === 'dojo' ? (this.repaired ? '수련' : '수리') : '차 마시기'}, 문 밖으로 걸으면 나갑니다.`;
            return;
        }
        if (facility.id === 'workshop') {
            this.worked = true;
            this.fireSeconds = 12;
            this.message =
                '풀무를 도와 구리 경첩을 받았어요. 도장 수리에 쓰고, 수련을 마친 뒤 여관 차를 받아보세요.';
        }
        else if (facility.id === 'dojo') {
            if (!this.repaired) {
                if (!this.worked) {
                    this.message =
                        '도장 문 경첩이 망가졌어요. 먼저 공방 풀무를 돕고 구리 경첩을 받아오세요.';
                    return;
                }
                this.repaired = true;
                this.message =
                    '공방의 구리 경첩으로 도장 문과 마루를 수리했어요. Space를 한 번 더 눌러 함께 수련하세요.';
            }
            else {
                this.trained = true;
                this.practiceSeconds = 7;
                this.message =
                    '목인과 수련을 마쳤어요. 주민이 여관에 찻잎을 맡겨두었습니다. 계단 위 찻방에서 오늘의 차를 받아요.';
            }
        }
        else {
            if (!this.trained) {
                this.message =
                    '오늘의 차는 도장 수련을 마친 손님에게 내어드려요. 공방 경첩으로 도장을 수리하고 함께 수련해보세요.';
                return;
            }
            this.tea = true;
            this.message =
                this.worked && this.trained
                    ? '불을 살리고 도장을 되찾은 짧은 답사. 창밖의 능선을 보며 차를 마십니다.'
                    : '2층 찻방에서 따뜻한 차를 받아요. 아래 거리와 멀리 능선이 한눈에 보입니다.';
        }
    }
    returnToEntrance() {
        this.position = { x: 2, z: 0 };
        this.route = [];
        this.inside = null;
        this.moving = false;
        this.message =
            '입구로 돌아왔어요. 작업·수리·수련·차와 방문 기록은 그대로 남아요.';
    }
}
