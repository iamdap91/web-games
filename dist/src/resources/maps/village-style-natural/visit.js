import { facingFor } from '../../characters/ataho/facing.js';
import { canWalkNatural, groundHeight, naturalPlaces, naturalRules, } from './layout.js';
/** 작은 시안의 이동·발동·복구 상태를 소유한다. */
export class NaturalVisit {
    position = { x: 0, z: 11 };
    facing = 'front';
    moving = false;
    fire = 0;
    restored = false;
    notice = null;
    noticeTime = 0;
    visited = new Set();
    shelterDiscovered = false;
    get snapshot() {
        const nearby = naturalPlaces
            .filter((p) => Math.hypot(p.x - this.position.x, p.z - this.position.z) <=
            naturalRules.interactionDistance)
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
        };
    }
    reset() {
        this.position = { x: 0, z: 11 };
        this.stop();
        this.facing = 'front';
    }
    stop() {
        this.moving = false;
    }
    walk(delta, input) {
        this.stop();
        if (!Number.isFinite(delta) ||
            delta <= 0 ||
            !Number.isFinite(input.x) ||
            !Number.isFinite(input.z))
            return;
        const length = Math.hypot(input.x, input.z);
        if (!length)
            return;
        this.facing = facingFor(input);
        const previous = this.position;
        const distance = Math.min(delta, 0.05) * naturalRules.speed, steps = Math.ceil(distance / 0.04);
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
            Math.hypot(previous.x - this.position.x, previous.z - this.position.z) >
                0.00001;
        if (!this.shelterDiscovered &&
            Math.hypot(this.position.x - 10.7, this.position.z + 8.4) < 2.3) {
            this.shelterDiscovered = true;
            this.tell('물소리 쉼터 발견 — 먼 길로 돌아오길 잘했다.');
        }
    }
    move(point) {
        if (canWalkNatural(point))
            this.position = point;
    }
    interact() {
        const nearby = naturalPlaces.find((p) => p.id === this.snapshot.nearby);
        if (!nearby)
            return false;
        this.visited.add(nearby.id);
        this.tell(nearby.description);
        if (nearby.id === 'hearth')
            this.fire = 12;
        this.stop();
        return true;
    }
    toggleRestored() {
        this.restored = !this.restored;
        this.tell(this.restored
            ? '도장 복구 — 새 지붕과 등불, 길가의 작은 깃발이 돌아왔다.'
            : '복구 전 — 빛바랜 지붕과 빈 마당.');
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
