import { canWalkGrowth, growthEntrance, growthFloor, growthPlaces, growthRoute, growthRules, nearestGrowthPoint, } from './layout.js';
/** 답사 시간·생활 반응·성장을 함께 소유하고 표시 전환은 관여하지 않는다. */
export class GrowthVisit {
    position = growthEntrance;
    stage = 0;
    restored = false;
    visited = new Set();
    elapsed = 0;
    steps = 0;
    fire = 0;
    shelterDiscovered = false;
    loopComplete = false;
    route = [];
    facing = 'front';
    moving = false;
    notice = null;
    noticeTime = 0;
    get snapshot() {
        const nearby = growthPlaces(this.stage).find((place) => Math.hypot(place.x - this.position.x, place.z - this.position.z) <
            0.75)?.id ?? null;
        return {
            player: {
                ...this.position,
                y: growthFloor(this.position, this.stage),
                facing: this.facing,
                moving: this.moving,
            },
            stage: this.stage,
            growth: this.stage,
            restored: this.restored,
            nearby,
            visited: [...this.visited],
            elapsed: this.elapsed,
            steps: this.steps,
            fire: this.fire,
            shelterDiscovered: this.shelterDiscovered,
            loopComplete: this.loopComplete,
            routeRemaining: this.route.length,
            notice: this.notice,
        };
    }
    navigate(point) {
        this.route = growthRoute(this.position, point, this.stage);
    }
    stop() {
        this.route = [];
        this.moving = false;
    }
    reset() {
        this.position = growthEntrance;
        this.facing = 'front';
        this.stop();
        this.tell('입구로 돌아왔어요. 성장과 방문 기록은 그대로예요.');
    }
    tell(text) {
        this.notice = text;
        this.noticeTime = 5;
    }
    grow() {
        this.stage = ((this.stage + 1) % 3);
        this.position = nearestGrowthPoint(this.position, this.stage);
        this.stop();
        this.tell([
            '각자의 공방과 도장 · 골목을 돌아 만나요.',
            '사이 벽이 열렸어요. 공유 복도와 긴 작업대가 생겼습니다.',
            '도장 뒤 작은 숙소와 계단, 골목에 꽃 마당이 생겼어요.',
        ][this.stage] ?? '');
    }
    restore() {
        this.restored = !this.restored;
        this.tell(this.restored
            ? '도장을 고쳤어요. 수련 매트와 주민의 움직임이 돌아옵니다.'
            : '수리 전 모습으로 비교합니다. 방문과 성장 기록은 남아요.');
    }
    interact() {
        const nearby = this.snapshot.nearby;
        if (!nearby)
            return false;
        this.visited.add(nearby);
        if (nearby === 'hearth') {
            this.fire = 14;
            this.tell('불을 지피자 벽돌 틈에 빛이 번지고, 공방의 손길이 바빠집니다.');
        }
        if (nearby === 'dojo') {
            this.restored = true;
            this.tell('느슨한 마룻장을 고치고 수련을 마쳤어요. 옆방과 이어 보세요.');
        }
        if (nearby === 'rest') {
            this.shelterDiscovered = true;
            this.tell(this.stage === 2
                ? '계단 위 쉼터 · 방 안의 찻잔과 낮은 침상이 기다립니다.'
                : '빈터 쉼터를 발견했어요. 도장 뒤에는 작은 숙소를 더할 수 있어요.');
        }
        this.stop();
        return true;
    }
    update(delta, input, yaw) {
        if (!Number.isFinite(delta) ||
            delta <= 0 ||
            !Number.isFinite(input.x) ||
            !Number.isFinite(input.z))
            return;
        const dt = Math.min(0.05, delta);
        this.elapsed += dt;
        this.fire = Math.max(0, this.fire - dt);
        this.noticeTime = Math.max(0, this.noticeTime - dt);
        if (!this.noticeTime)
            this.notice = null;
        let dx = input.x, dz = input.z;
        const direct = !!(dx || dz);
        if (direct)
            this.route = [];
        else {
            while (this.route[0] &&
                Math.hypot(this.route[0].x - this.position.x, this.route[0].z - this.position.z) < 0.001)
                this.route = this.route.slice(1);
            const target = this.route[0];
            if (target) {
                dx = target.x - this.position.x;
                dz = target.z - this.position.z;
            }
        }
        const length = Math.hypot(dx, dz);
        this.moving = false;
        if (length) {
            const sx = dx * Math.cos(yaw) - dz * Math.sin(yaw), sz = dx * Math.sin(yaw) + dz * Math.cos(yaw);
            this.facing =
                Math.abs(sx) > Math.abs(sz)
                    ? sx > 0
                        ? 'right'
                        : 'left'
                    : sz > 0
                        ? 'front'
                        : 'back';
            const distance = Math.min(dt * growthRules.speed, direct ? Infinity : length), n = Math.ceil(distance / 0.04), before = this.position;
            for (let i = 0; i < n; i++) {
                const x = {
                    x: this.position.x + ((dx / length) * distance) / n,
                    z: this.position.z,
                };
                if (canWalkGrowth(x, this.stage))
                    this.position = x;
                const z = {
                    x: this.position.x,
                    z: this.position.z + ((dz / length) * distance) / n,
                };
                if (canWalkGrowth(z, this.stage))
                    this.position = z;
            }
            const moved = Math.hypot(before.x - this.position.x, before.z - this.position.z);
            this.steps += moved;
            this.moving = moved > 0.00001;
        }
        if (!this.loopComplete &&
            this.visited.size === 3 &&
            Math.hypot(this.position.x - growthEntrance.x, this.position.z - growthEntrance.z) < 0.8) {
            this.loopComplete = true;
            this.tell('골목 한 바퀴 완료 · 불빛과 수련, 쉬는 방이 이어졌어요.');
        }
    }
}
