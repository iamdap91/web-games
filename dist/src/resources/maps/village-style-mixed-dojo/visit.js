import { canVillageStep, villageHeight, villagePoints, villageRoute, villageTerrain, } from './layout.js';
/** 보행과 복구·방문·세계 시간을 소유하고 입구 복귀는 진행을 보존한다. */
export class VillageVisit {
    position = { x: -1.2, z: 11.2 };
    facing = 'front';
    moving = false;
    restored = false;
    fire = 0;
    elapsed = 0;
    arrival = null;
    route = [];
    visited = new Set();
    get snapshot() {
        return {
            ...this.position,
            height: villageHeight(this.position),
            moving: this.moving,
            facing: this.facing,
            restored: this.restored,
            fire: this.fire,
            visited: [...this.visited],
            routeRemaining: this.route.length,
            nearby: this.nearby?.id ?? null,
            elapsed: this.elapsed,
            arrival: this.arrival,
        };
    }
    get nearby() {
        return villagePoints.find((p) => Math.hypot(p.x - this.position.x, p.z - this.position.z) < 1.65);
    }
    navigate(to) {
        this.route = villageRoute(this.position, to);
    }
    stop() {
        this.route = [];
        this.moving = false;
    }
    returnToEntrance() {
        this.position = { x: -1.2, z: 11.2 };
        this.facing = 'front';
        this.stop();
    }
    toggleRestored() {
        this.restored = !this.restored;
    }
    interact() {
        const point = this.nearby;
        if (!point)
            return '온빛 화덕 → 언덕 도장 → 나무 뒤 쉼터를 찾아보세요.';
        this.visited.add(point.id);
        if (point.id === 'fire') {
            this.fire = 18;
            return '장작을 넣자 벽돌 사이에 온빛이 맺힙니다. 빛 옮기기와 요철 버튼으로 면의 반응을 비교해 보세요.';
        }
        if (point.id === 'dojo') {
            this.restored = true;
            return this.arrival === 'hill'
                ? '뒤편 언덕길로 도착했어요. 문을 열자 기와와 작은 등불이 제자리를 찾습니다.'
                : '계단 끝 도장을 복구했어요. 처마 아래 불이 켜지고 쉼터로 이어지는 뒤편 길이 보입니다.';
        }
        return '나무 뒤에 차 한 잔과 쉼터가 있네요. 도장을 바라보며 잠시 쉬어갑니다.';
    }
    update(seconds, input) {
        this.elapsed += seconds;
        this.fire = Math.max(0, this.fire - seconds);
        let dx = input.x, dz = input.z;
        if (dx || dz)
            this.route = [];
        else if (this.route[0]) {
            const target = this.route[0];
            dx = target.x - this.position.x;
            dz = target.z - this.position.z;
            if (Math.hypot(dx, dz) < 0.08) {
                this.route.shift();
                dx = 0;
                dz = 0;
            }
        }
        const magnitude = Math.hypot(dx, dz);
        this.moving = magnitude > 0;
        if (!this.moving)
            return;
        this.facing =
            Math.abs(dx) > Math.abs(dz)
                ? dx > 0
                    ? 'right'
                    : 'left'
                : dz > 0
                    ? 'front'
                    : 'back';
        const distance = Math.min(4.6 * Math.min(seconds, 0.04), this.route.length ? magnitude : Infinity);
        const previous = this.position;
        const nextX = {
            x: this.position.x + (dx / magnitude) * distance,
            z: this.position.z,
        };
        if (canVillageStep(this.position, nextX))
            this.position = nextX;
        const nextZ = {
            x: this.position.x,
            z: this.position.z + (dz / magnitude) * distance,
        };
        if (canVillageStep(this.position, nextZ))
            this.position = nextZ;
        if (villageHeight(previous) < villageTerrain.upperHeight &&
            villageHeight(this.position) === villageTerrain.upperHeight)
            this.arrival =
                Math.max(previous.x, this.position.x) > villageTerrain.rampEdgeX
                    ? 'hill'
                    : 'stairs';
    }
}
