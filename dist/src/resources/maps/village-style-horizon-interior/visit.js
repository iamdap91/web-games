import { insideHorizonRoom, horizonRoomOpen, horizonResident, } from './interior.js';
import { canWalkHorizon, horizonEntrance, horizonPlaces, horizonRoute, } from './layout.js';
export class HorizonVisit {
    position = horizonEntrance;
    facing = 'front';
    moving = false;
    restored = false;
    fire = 0;
    elapsed = 0;
    route = [];
    visited = new Set();
    discovered = false;
    loopComplete = false;
    notice = null;
    noticeTime = 0;
    get snapshot() {
        return {
            inside: insideHorizonRoom(this.position),
            roomOpen: horizonRoomOpen(this.position),
            resident: horizonResident(this.elapsed),
            player: { ...this.position, facing: this.facing, moving: this.moving },
            restored: this.restored,
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
    navigate(point) {
        this.route = horizonRoute(this.position, point);
    }
    stop() {
        this.route = [];
        this.moving = false;
    }
    reset() {
        this.position = horizonEntrance;
        this.facing = 'front';
        this.stop();
        this.tell('입구로 돌아왔어요. 복구와 방문 기록은 남아 있어요.');
    }
    tell(message) {
        this.notice = message;
        this.noticeTime = 5;
    }
    toggleRestored() {
        this.restored = !this.restored;
        this.tell(this.restored
            ? '지붕과 문을 고치자 도장 앞에 등불이 켜졌어요.'
            : '복구 전 · 덧댄 판자와 닫힌 도장');
    }
    interact() {
        if (this.snapshot.inside) {
            this.tell('언덕 너머 집 안에 도착했어요. 밖과 같은 좌표의 탁자와 주민입니다.');
            return true;
        }
        const nearby = this.snapshot.nearby;
        if (!nearby)
            return false;
        this.visited.add(nearby);
        if (nearby === 'hearth') {
            this.fire = 12;
            this.tell('따뜻한 차 한 잔. 화덕 연기가 둥근 길 너머로 올라가요.');
        }
        else if (nearby === 'dojo')
            this.toggleRestored();
        else {
            this.discovered = true;
            this.tell('언덕 뒤 쉼터 · 멀리서는 보이지 않던 노란 꽃밭과 벤치.');
        }
        this.stop();
        return true;
    }
    update(delta, input) {
        if (!Number.isFinite(delta) ||
            delta <= 0 ||
            !Number.isFinite(input.x) ||
            !Number.isFinite(input.z))
            return;
        const previousPosition = this.position;
        const step = Math.min(0.05, delta);
        this.elapsed += step;
        this.fire = Math.max(0, this.fire - step);
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
        if (!this.discovered &&
            Math.hypot(this.position.x - 3.8, this.position.z + 21.3) < 2.2) {
            this.discovered = true;
            this.tell('둥근 길 너머에 작은 쉼터가 나타났어요.');
        }
        if (!this.loopComplete &&
            this.visited.size === 3 &&
            this.moving &&
            // 순간 입구 복귀는 보행 경계를 넘지 않으므로 완주로 세지 않는다.
            Math.hypot(previousPosition.x - horizonEntrance.x, previousPosition.z - horizonEntrance.z) >= 1 &&
            Math.hypot(this.position.x - horizonEntrance.x, this.position.z - horizonEntrance.z) < 1) {
            this.loopComplete = true;
            this.tell('한 바퀴 완료 · 처음 보던 지평선으로 돌아왔어요.');
        }
    }
}
