import { modularEntrance, modularPlaces, modularRoute, modularRules, canWalkModular, } from './layout.js';
/** 시설 반응·발견·귀환을 작은 한 바퀴의 경험으로 소유한다. */
export class ModularVisit {
    position = modularEntrance;
    facing = 'front';
    moving = false;
    stage = 0;
    fire = 0;
    elapsed = 0;
    route = [];
    visited = new Set();
    shelterDiscovered = false;
    loopComplete = false;
    notice = null;
    noticeTime = 0;
    get snapshot() {
        const nearby = modularPlaces.find((place) => Math.hypot(place.x - this.position.x, place.z - this.position.z) < 1.45);
        return {
            player: {
                ...this.position,
                y: modularRules.groundY,
                facing: this.facing,
                moving: this.moving,
            },
            nearby: nearby?.id ?? null,
            visited: [...this.visited],
            restored: this.stage > 0,
            stage: this.stage,
            fire: this.fire,
            elapsed: this.elapsed,
            shelterDiscovered: this.shelterDiscovered,
            loopComplete: this.loopComplete,
            routeRemaining: this.route.length,
            notice: this.notice,
        };
    }
    navigate(point) {
        this.route = modularRoute(this.position, point, this.stage);
    }
    stop() {
        this.route = [];
        this.moving = false;
    }
    reset() {
        this.position = modularEntrance;
        this.facing = 'front';
        this.stop();
        this.tell('입구로 돌아왔어요. 복구와 방문 기록은 남아 있습니다.');
    }
    tell(text) {
        this.notice = text;
        this.noticeTime = 5.5;
    }
    toggleRestored() {
        this.stage = ((this.stage + 1) % 3);
        this.stop();
        if (!canWalkModular(this.position, this.stage))
            this.position = modularEntrance;
        this.tell([
            '분리된 집들 · 문이 막힌 작은 도장',
            '양옆 집이 이어지며 벽이 사라지고, 도장 아래 아치 길이 열렸어요.',
            '뒤쪽 집까지 잇자 골목 안에 작은 마당과 꽃이 생겼어요.',
        ][this.stage] ?? '');
    }
    interact() {
        const nearby = this.snapshot.nearby;
        if (!nearby)
            return false;
        this.visited.add(nearby);
        if (nearby === 'hearth') {
            this.fire = 10;
            this.tell('화덕에 불을 지피자 차 향과 따뜻한 연기가 부두로 퍼집니다.');
        }
        else if (nearby === 'dojo')
            this.toggleRestored();
        else
            this.tell('안쪽 마당 쉼터 · 아치 너머 바람이 쉬는 자리예요.');
        this.stop();
        return true;
    }
    update(delta, input, yaw) {
        if (!Number.isFinite(delta) ||
            delta <= 0 ||
            !Number.isFinite(input.x) ||
            !Number.isFinite(input.z))
            return;
        const step = Math.min(delta, 0.05);
        this.elapsed += step;
        this.fire = Math.max(0, this.fire - step);
        this.noticeTime = Math.max(0, this.noticeTime - step);
        if (!this.noticeTime)
            this.notice = null;
        let dx = input.x, dz = input.z;
        const direct = !!(dx || dz);
        if (direct)
            this.route = [];
        else {
            while (this.route[0] &&
                Math.hypot(this.route[0].x - this.position.x, this.route[0].z - this.position.z) < 0.001)
                this.route.shift();
            const waypoint = this.route[0];
            if (waypoint) {
                dx = waypoint.x - this.position.x;
                dz = waypoint.z - this.position.z;
            }
        }
        this.moving = false;
        const length = Math.hypot(dx, dz);
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
            const distance = Math.min(step * modularRules.speed, direct ? Infinity : length);
            const count = Math.ceil(distance / 0.04), previous = this.position;
            for (let i = 0; i < count; i++) {
                const x = {
                    x: this.position.x + ((dx / length) * distance) / count,
                    z: this.position.z,
                };
                if (canWalkModular(x, this.stage))
                    this.position = x;
                const z = {
                    x: this.position.x,
                    z: this.position.z + ((dz / length) * distance) / count,
                };
                if (canWalkModular(z, this.stage))
                    this.position = z;
            }
            this.moving =
                Math.hypot(previous.x - this.position.x, previous.z - this.position.z) >
                    0.00001;
            const waypoint = this.route[0];
            if (waypoint &&
                Math.hypot(this.position.x - waypoint.x, this.position.z - waypoint.z) <
                    0.001)
                this.route.shift();
        }
        if (!this.shelterDiscovered &&
            Math.hypot(this.position.x, this.position.z + 2.6) < 1.7) {
            this.shelterDiscovered = true;
            this.tell('지붕 안쪽에 작은 마당이 숨어 있었네요. 양옆 집을 이으면 가까운 길이 열립니다.');
        }
        if (!this.loopComplete &&
            this.visited.size === 3 &&
            Math.hypot(this.position.x - modularEntrance.x, this.position.z - modularEntrance.z) < 0.8) {
            this.loopComplete = true;
            this.tell('한 바퀴 완료 · 따뜻해진 골목을 다시 돌아왔어요.');
        }
    }
}
