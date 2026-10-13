import { facingFor } from '../../characters/ataho/facing.js';
import { canStepDiorama, canWalkDiorama, groundHeight, dioramaPlaces, dioramaRules, dioramaRoute, } from './layout.js';
/** 복셀풍 마을의 이동·경로·시설 반응·복구 상태를 소유한다. */
export class DioramaVisit {
    position = { x: 0, z: 11 };
    facing = 'front';
    moving = false;
    fire = 0;
    restored = false;
    notice = null;
    noticeTime = 0;
    shelterDiscovered = false;
    visited = new Set();
    route = [];
    get snapshot() {
        const nearby = dioramaPlaces
            .filter((p) => Math.hypot(p.x - this.position.x, p.z - this.position.z) <=
            dioramaRules.interactionDistance)
            .sort((a, b) => Math.hypot(a.x - this.position.x, a.z - this.position.z) -
            Math.hypot(b.x - this.position.x, b.z - this.position.z))[0];
        return {
            player: {
                ...this.position,
                y: groundHeight(this.position),
                facing: this.facing,
                moving: this.moving,
            },
            nearby: nearby?.id ?? null,
            visited: [...this.visited],
            fire: this.fire,
            restored: this.restored,
            notice: this.notice,
            shelterDiscovered: this.shelterDiscovered,
            routeLength: this.route.length,
        };
    }
    reset() {
        this.position = { x: 0, z: 11 };
        this.facing = 'front';
        this.cancelRoute();
    }
    stop() {
        this.moving = false;
    }
    cancelRoute() {
        this.route = [];
        this.stop();
    }
    navigate(point) {
        this.route = [
            ...dioramaRoute(this.position, point, { restored: this.restored }),
        ];
        if (!this.route.length)
            this.tell('그곳까지 길이 이어지지 않아요. 다른 길목을 눌러 보세요.');
    }
    walk(delta, input) {
        this.stop();
        if (!Number.isFinite(delta) ||
            delta <= 0 ||
            !Number.isFinite(input.x) ||
            !Number.isFinite(input.z))
            return;
        let direction = input;
        let remaining = Infinity;
        const manual = !!(input.x || input.z);
        if (manual)
            this.route = [];
        else {
            while (this.route[0] &&
                Math.hypot(this.route[0].x - this.position.x, this.route[0].z - this.position.z) < 0.06) {
                const waypoint = this.route.shift();
                // 단상 모서리에서 다음 축으로 돌 때 높이 경계의 미세 오차를 남기지 않는다.
                if (waypoint &&
                    canStepDiorama(this.position, waypoint, { restored: this.restored }))
                    this.position = waypoint;
            }
            const target = this.route[0];
            if (target) {
                direction = {
                    x: target.x - this.position.x,
                    z: target.z - this.position.z,
                };
                remaining = Math.hypot(direction.x, direction.z);
            }
        }
        const length = Math.hypot(direction.x, direction.z);
        if (!length)
            return;
        this.facing = facingFor(direction);
        const previous = this.position, distance = Math.min(Math.min(delta, 0.05) * dioramaRules.speed, remaining), steps = Math.ceil(distance / 0.035);
        for (let i = 0; i < steps; i++) {
            this.move({
                x: this.position.x + ((direction.x / length) * distance) / steps,
                z: this.position.z,
            });
            this.move({
                x: this.position.x,
                z: this.position.z + ((direction.z / length) * distance) / steps,
            });
        }
        this.moving =
            Math.hypot(previous.x - this.position.x, previous.z - this.position.z) >
                0.00001;
        if (!manual && !this.moving)
            this.cancelRoute();
        if (!this.shelterDiscovered &&
            Math.hypot(this.position.x - 10, this.position.z + 6) < 2) {
            this.shelterDiscovered = true;
            this.tell('테라스 쉼터 발견 — 북쪽 돌아치 다리로 돌아갈 수 있다.');
        }
    }
    move(point) {
        if (canStepDiorama(this.position, point, { restored: this.restored }))
            this.position = point;
    }
    interact() {
        const nearby = dioramaPlaces.find((p) => p.id === this.snapshot.nearby);
        if (!nearby)
            return false;
        this.visited.add(nearby.id);
        this.tell(nearby.description);
        if (nearby.id === 'hearth')
            this.fire = 12;
        this.cancelRoute();
        return true;
    }
    toggleRestored() {
        this.restored = !this.restored;
        this.cancelRoute();
        if (!canWalkDiorama(this.position, { restored: this.restored })) {
            // 복구 비교로 새 소품이 발 위치에 생기면 같은 높이의 빈 곳으로 옮긴다.
            const previous = this.position;
            search: for (let distance = 0.15; distance <= 1.8; distance += 0.15)
                for (let i = 0; i < 16; i++) {
                    const angle = (i * Math.PI) / 8, point = {
                        x: previous.x + Math.cos(angle) * distance,
                        z: previous.z + Math.sin(angle) * distance,
                    };
                    if (canStepDiorama(previous, point, { restored: this.restored })) {
                        this.position = point;
                        break search;
                    }
                }
        }
        this.tell(this.restored
            ? '도장 복구 — 석회벽과 천막이 정돈되고 등불이 돌아왔다.'
            : '복구 전 — 지붕 틈과 빈 훈련 마당.');
    }
    tell(message) {
        this.notice = message;
        this.noticeTime = 6;
    }
    update(delta) {
        if (!Number.isFinite(delta) || delta <= 0)
            return;
        const step = Math.min(delta, 0.05);
        this.fire = Math.max(0, this.fire - step);
        this.noticeTime = Math.max(0, this.noticeTime - step);
        if (!this.noticeTime)
            this.notice = null;
    }
}
