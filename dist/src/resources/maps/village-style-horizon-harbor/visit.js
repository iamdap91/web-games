import { canWalkHorizon, horizonEntrance, horizonPlaces, horizonRoute, } from './layout.js';
export class HorizonVisit {
    position = horizonEntrance;
    facing = 'front';
    moving = false;
    restored = false;
    fire = 0;
    bell = 0;
    sail = 0;
    paused = false;
    returnArmed = false;
    elapsed = 0;
    route = [];
    visited = new Set();
    discovered = false;
    loopComplete = false;
    notice = null;
    noticeTime = 0;
    get snapshot() {
        return {
            player: { ...this.position, facing: this.facing, moving: this.moving },
            restored: this.restored,
            prepared: this.visited.has('market') && this.visited.has('supply'),
            cargoReady: this.visited.has('warehouse'),
            bell: this.bell,
            sail: this.sail,
            paused: this.paused,
            nearby: horizonPlaces.find((place) => Math.hypot(place.x - this.position.x, place.z - this.position.z) <
                1.25)?.id ?? null,
            visited: [...this.visited],
            fire: this.fire,
            elapsed: this.elapsed,
            discovered: this.discovered,
            loopComplete: this.loopComplete,
            routeRemaining: this.route.length,
            notice: this.notice,
        };
    }
    setPaused(paused) {
        this.paused = paused;
        if (paused)
            this.stop();
    }
    navigate(point) {
        if (this.paused)
            return;
        this.route = horizonRoute(this.position, point);
    }
    stop() {
        this.route = [];
        this.moving = false;
    }
    reset() {
        if (this.paused)
            return;
        this.returnArmed = false;
        this.position = horizonEntrance;
        this.facing = 'front';
        this.stop();
        this.tell('입구로 돌아왔어요. 준비 기록은 남지만 실제 보행 귀환 완료로 세지는 않아요.');
    }
    tell(message) {
        this.notice = message;
        this.noticeTime = 5;
    }
    interact() {
        if (this.paused)
            return false;
        const nearby = this.snapshot.nearby;
        if (!nearby)
            return false;
        this.stop();
        if (nearby === 'inn') {
            this.fire = 12;
            this.tell('여관 주전자가 김을 내요. 시장 도시락과 보급소 밧줄을 챙겨 나루로 가요.');
        }
        else if (nearby === 'market') {
            this.tell('도시락을 챙겼어요. 언덕 너머 나루 창고까지 가져가요.');
        }
        else if (nearby === 'supply') {
            this.tell('튼튼한 밧줄을 받았어요. 도시락과 함께 창고에 전달해요.');
        }
        else if (nearby === 'warehouse') {
            if (!this.snapshot.prepared) {
                this.tell('짐을 싣기 전에 시장 도시락과 보급소 밧줄을 챙겨요.');
                return false;
            }
            this.tell('도시락과 밧줄을 배에 실었어요. 중앙 부두 끝의 종을 울려요.');
        }
        else {
            if (!this.snapshot.prepared || !this.snapshot.cargoReady) {
                this.tell('출항 준비가 아직이에요. 시장 → 보급소 → 나루 창고를 둘러봐요.');
                return false;
            }
            this.bell = 8;
            this.restored = true;
            this.returnArmed = true;
            this.tell('종소리에 배의 돛이 펼쳐졌어요. 바다를 보고 육로 입구까지 걸어 돌아가요.');
        }
        this.visited.add(nearby);
        return true;
    }
    update(delta, input) {
        if (this.paused ||
            !Number.isFinite(delta) ||
            delta <= 0 ||
            !Number.isFinite(input.x) ||
            !Number.isFinite(input.z))
            return;
        const previousPosition = this.position;
        const step = Math.min(0.05, delta);
        this.elapsed += step;
        if (this.restored)
            this.sail = Math.min(1, this.sail + step / 1.6);
        this.fire = Math.max(0, this.fire - step);
        this.bell = Math.max(0, this.bell - step);
        this.noticeTime = Math.max(0, this.noticeTime - step);
        if (!this.noticeTime)
            this.notice = null;
        let dx = input.x, dz = input.z;
        const direct = !!(dx || dz);
        if (direct)
            this.route = [];
        else if (this.route[0]) {
            dx = this.route[0].x - this.position.x;
            dz = this.route[0].z - this.position.z;
        }
        this.moving = false;
        const length = Math.hypot(dx, dz);
        if (length > 0.00001) {
            this.facing =
                Math.abs(dx) > Math.abs(dz)
                    ? dx > 0
                        ? 'right'
                        : 'left'
                    : dz > 0
                        ? 'front'
                        : 'back';
            const amount = Math.min(step * 4.2, direct ? Infinity : length), count = Math.max(1, Math.ceil(amount / 0.04)), before = this.position;
            for (let i = 0; i < count; i++) {
                const x = {
                    x: this.position.x + ((dx / length) * amount) / count,
                    z: this.position.z,
                };
                if (canWalkHorizon(x))
                    this.position = x;
                const z = {
                    x: this.position.x,
                    z: this.position.z + ((dz / length) * amount) / count,
                };
                if (canWalkHorizon(z))
                    this.position = z;
            }
            this.moving =
                Math.hypot(before.x - this.position.x, before.z - this.position.z) >
                    0.00001;
        }
        const next = this.route[0];
        if (next &&
            Math.hypot(next.x - this.position.x, next.z - this.position.z) < 0.001)
            this.route.shift();
        if (!this.discovered && this.position.z < -12.3) {
            this.discovered = true;
            this.tell('언덕 너머 바다와 배가 나타났어요. 가운데 나무 부두로 내려가요.');
        }
        if (!this.loopComplete &&
            this.returnArmed &&
            this.moving &&
            Math.hypot(previousPosition.x - horizonEntrance.x, previousPosition.z - horizonEntrance.z) >= 1 &&
            Math.hypot(this.position.x - horizonEntrance.x, this.position.z - horizonEntrance.z) < 1) {
            this.loopComplete = true;
            this.tell('나루 답사 완료 · 챙긴 짐을 전달하고 종을 울린 뒤 육로로 돌아왔어요.');
        }
    }
}
