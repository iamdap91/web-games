import { facingFor } from '../../characters/ataho/facing.js';
import { canWalkToy, findToyRoute, groundHeight, toyPlaces, toyRules, worldToScreen, } from './layout.js';
/** 이 시안의 순환 보행·시설 반응·복구 충돌 상태를 소유한다. */
export class ToyVisit {
    position = { x: 0, z: 10 };
    facing = 'front';
    moving = false;
    fire = 0;
    restored = false;
    notice = null;
    noticeTime = 0;
    visited = new Set();
    route = [];
    get snapshot() {
        const nearby = toyPlaces.find((p) => Math.hypot(p.x - this.position.x, p.z - this.position.z) <=
            toyRules.interactionDistance);
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
            routeRemaining: this.route.length,
        };
    }
    reset() {
        this.position = { x: 0, z: 10 };
        this.stop();
        this.facing = 'front';
    }
    stop() {
        this.moving = false;
        this.route = [];
    }
    routeTo(target) {
        this.route = findToyRoute(this.position, target, this.restored);
        if (!this.route.length)
            this.tell('그곳은 작은 모형 건물이에요. 길을 눌러 주세요.');
    }
    walk(delta, input) {
        this.moving = false;
        if (!Number.isFinite(delta) ||
            delta <= 0 ||
            !Number.isFinite(input.x) ||
            !Number.isFinite(input.z))
            return;
        if (input.x || input.z)
            this.route = [];
        const target = this.route[0];
        if (target && !input.x && !input.z) {
            input = { x: target.x - this.position.x, z: target.z - this.position.z };
        }
        const length = Math.hypot(input.x, input.z);
        if (!length)
            return;
        this.facing = facingFor(worldToScreen(input));
        const before = this.position, distance = Math.min(Math.min(delta, 0.05) * toyRules.speed, target ? length : Infinity), steps = Math.ceil(distance / 0.035);
        for (let i = 0; i < steps; i++) {
            this.move({
                x: this.position.x + ((input.x / length) * distance) / steps,
                z: this.position.z,
            });
            this.move({
                x: this.position.x,
                z: this.position.z + ((input.z / length) * distance) / steps,
            });
        }
        this.moving =
            Math.hypot(before.x - this.position.x, before.z - this.position.z) > 1e-6;
        if (target &&
            Math.hypot(target.x - this.position.x, target.z - this.position.z) < 0.02)
            this.route.shift();
    }
    move(p) {
        if (canWalkToy(p, this.restored))
            this.position = p;
    }
    interact() {
        const nearby = toyPlaces.find((p) => p.id === this.snapshot.nearby);
        if (!nearby)
            return false;
        this.visited.add(nearby.id);
        if (nearby.id === 'hearth')
            this.fire = 12;
        this.tell(nearby.description);
        this.stop();
        return true;
    }
    toggleRestored() {
        this.restored = !this.restored;
        if (!canWalkToy(this.position, this.restored)) {
            this.position = { x: 3.5, z: -1.4 };
        }
        this.stop();
        this.tell(this.restored
            ? '새 지붕·화분·목인 — 작은 도장이 다시 열렸어요.'
            : '바랜 지붕과 비어 있는 도장 마당.');
    }
    tell(text) {
        this.notice = text;
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
