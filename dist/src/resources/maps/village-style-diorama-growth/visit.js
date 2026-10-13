import { facingFor } from '../../characters/ataho/facing.js';
import { canStepDiorama, canWalkDiorama, groundHeight, dioramaPlaces, dioramaRules, dioramaRoute, } from './layout.js';
/** 복셀풍 마을의 이동·경로·시설 반응·복구 상태를 소유한다. */
export class DioramaVisit {
    position = { x: 0, z: 11 };
    facing = 'front';
    moving = false;
    fire = 0;
    restored = false;
    growthElapsed = null;
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
            growth: this.growthElapsed === null
                ? null
                : {
                    elapsed: this.growthElapsed,
                    progress: Math.min(1, this.growthElapsed / 3),
                },
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
            ...dioramaRoute(this.position, point, {
                restored: this.restored,
                growing: this.growthElapsed !== null,
            }),
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
                    canStepDiorama(this.position, waypoint, {
                        restored: this.restored,
                        growing: this.growthElapsed !== null,
                    }))
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
        if (canStepDiorama(this.position, point, {
            restored: this.restored,
            growing: this.growthElapsed !== null,
        }))
            this.position = point;
    }
    interact() {
        const nearby = dioramaPlaces.find((p) => p.id === this.snapshot.nearby);
        if (!nearby)
            return false;
        this.visited.add(nearby.id);
        this.tell(nearby.description);
        if (nearby.id === 'hearth') {
            this.fire = 12;
            this.toggleRestored();
        }
        this.cancelRoute();
        return true;
    }
    toggleRestored() {
        if (this.growthElapsed !== null)
            return;
        this.cancelRoute();
        if (this.restored) {
            this.restored = false;
            if (!canWalkDiorama(this.position, { restored: false }))
                this.reset();
            this.tell('증축 전 비교 · 별채를 걷고 골목 문을 다시 닫았어요.');
            return;
        }
        this.growthElapsed = 0;
        if (!canWalkDiorama(this.position, { growing: true }))
            this.reset();
        this.tell('공방 별채를 세우는 중 · 지붕 완성 뒤 새 마당으로 통하는 문이 열려요.');
    }
    tell(message) {
        this.notice = message;
        this.noticeTime = 6;
    }
    update(delta) {
        if (!Number.isFinite(delta) || delta <= 0)
            return;
        const step = Math.min(delta, 0.05);
        if (this.growthElapsed !== null) {
            this.growthElapsed += step;
            if (this.growthElapsed >= 3) {
                this.growthElapsed = null;
                this.restored = true;
                this.cancelRoute();
                if (!canWalkDiorama(this.position, { restored: true }))
                    this.reset();
                this.tell('공방 별채 완성 · 막힌 골목 문이 열렸어요. 새 작업마당에 들어가 보세요.');
            }
        }
        this.fire = Math.max(0, this.fire - step);
        this.noticeTime = Math.max(0, this.noticeTime - step);
        if (!this.noticeTime)
            this.notice = null;
    }
}
