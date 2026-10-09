export function facingFor({ x, z }) {
    return Math.abs(x) >= Math.abs(z)
        ? x < 0
            ? 'left'
            : 'right'
        : z < 0
            ? 'back'
            : 'front';
}
/** 체력과 위치를 소유하며 외부에는 읽기 전용 스냅샷만 제공한다. */
export class Combatant {
    spec;
    health;
    point;
    facing;
    moving = false;
    staggered = false;
    constructor(spec) {
        this.spec = spec;
        this.health = spec.maxHealth;
        this.point = { ...spec.home };
        this.facing = spec.kind === 'ataho' ? 'right' : 'left';
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
}
