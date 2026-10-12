import { facingFor, } from '../../resources/characters/ataho/facing.js';
export { facingFor } from '../../resources/characters/ataho/facing.js';
/** 체력과 위치를 소유하며 외부에는 읽기 전용 스냅샷만 제공한다. */
export class Combatant {
    spec;
    health;
    point;
    facing;
    moving = false;
    staggered = false;
    constructor(spec, health = spec.maxHealth) {
        this.spec = spec;
        if (!Number.isFinite(health))
            throw new Error('입장 체력이 유효하지 않습니다.');
        this.health = Math.max(0, Math.min(spec.maxHealth, Math.floor(health)));
        this.point = { ...spec.home };
        this.facing =
            spec.kind === 'ataho' || spec.kind === 'yeonmuk' ? 'right' : 'left';
    }
    get alive() {
        return this.health > 0;
    }
    get snapshot() {
        return {
            ...this.spec,
            ...this.point,
            health: this.health,
            facing: this.facing,
            moving: this.moving,
            staggered: this.staggered,
        };
    }
    stop() {
        this.moving = false;
    }
    face(direction) {
        this.facing =
            this.spec.kind === 'ataho'
                ? facingFor(direction)
                : direction.x < 0
                    ? 'left'
                    : 'right';
    }
    moveTo(point) {
        const direction = { x: point.x - this.point.x, z: point.z - this.point.z };
        if (Math.hypot(direction.x, direction.z) < 0.0001)
            return;
        this.face(direction);
        this.point = { ...point };
        this.moving = true;
    }
    stagger() {
        if (this.alive)
            this.staggered = true;
    }
    consumeStagger() {
        const skipped = this.staggered;
        this.staggered = false;
        return skipped;
    }
    hurt(damage) {
        const actual = Math.min(this.health, Math.max(0, damage));
        this.health -= actual;
        return actual;
    }
    heal(amount) {
        if (!this.alive || !Number.isFinite(amount))
            return 0;
        const actual = Math.min(this.spec.maxHealth - this.health, Math.max(0, Math.floor(amount)));
        this.health += actual;
        return actual;
    }
}
