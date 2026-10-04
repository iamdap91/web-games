import { arena, direction, distance } from './board.js';
export const movement = {
    speed: 3.5,
    dashSpeed: 14,
    dashDuration: 0.19,
    dashCooldown: 1.65,
    contactDistance: 0.43,
};
export class Player {
    position = { x: arena.columns / 2, y: arena.rows / 2 };
    facing = { x: 0, y: -1 };
    dashRemaining = 0;
    cooldown = 0;
    get snapshot() {
        return {
            ...this.position,
            facing: { ...this.facing },
            dashRemaining: this.dashRemaining,
            cooldown: this.cooldown,
        };
    }
    dash(input) {
        if (this.cooldown > 0 || this.dashRemaining > 0)
            return false;
        if (Math.hypot(input.x, input.y) > 0)
            this.facing = direction({ x: 0, y: 0 }, input);
        this.dashRemaining = movement.dashDuration;
        this.cooldown = movement.dashCooldown;
        return true;
    }
    recharge() {
        this.cooldown = 0;
    }
    update(dt, input, board, time) {
        this.cooldown = Math.max(0, this.cooldown - dt);
        const dashing = this.dashRemaining > 0;
        const velocity = direction({ x: 0, y: 0 }, input);
        if (!dashing && (velocity.x || velocity.y))
            this.facing = velocity;
        const heading = dashing ? this.facing : velocity;
        const speed = dashing ? movement.dashSpeed : movement.speed;
        // 경계 밖으로 대시해도 화면에서 사라지지 않고 마지막 발판에 착지한다.
        this.position = {
            x: Math.max(0.2, Math.min(arena.columns - 0.2, this.position.x + heading.x * speed * dt)),
            y: Math.max(0.2, Math.min(arena.rows - 0.2, this.position.y + heading.y * speed * dt)),
        };
        this.dashRemaining = Math.max(0, this.dashRemaining - dt);
        if (this.dashRemaining > 0)
            return true;
        if (!board.supports(this.position))
            return false;
        board.step(this.position, time);
        return true;
    }
}
export class Enemy {
    id;
    kind;
    position;
    spawnRemaining = 1.15;
    jumpRemaining = 0;
    jumpWarning = 0;
    jumpCooldown = 0;
    jumpDirection = { x: 0, y: 0 };
    constructor(id, kind, position) {
        this.id = id;
        this.kind = kind;
        this.position = { ...position };
    }
    get snapshot() {
        return {
            ...this.position,
            id: this.id,
            kind: this.kind,
            spawnRemaining: this.spawnRemaining,
            jumpRemaining: this.jumpRemaining,
            jumpWarning: this.jumpWarning,
        };
    }
    update(dt, target, board, time) {
        if (this.spawnRemaining > 0) {
            this.spawnRemaining = Math.max(0, this.spawnRemaining - dt);
            if (this.spawnRemaining === 0 && !board.supports(this.position))
                return 'cancelled';
            return 'alive';
        }
        this.jumpCooldown = Math.max(0, this.jumpCooldown - dt);
        const heading = direction(this.position, target);
        if (this.jumpRemaining > 0) {
            this.position = {
                x: this.position.x + this.jumpDirection.x * 7.5 * dt,
                y: this.position.y + this.jumpDirection.y * 7.5 * dt,
            };
            this.jumpRemaining = Math.max(0, this.jumpRemaining - dt);
        }
        else if (this.jumpWarning > 0) {
            this.jumpWarning = Math.max(0, this.jumpWarning - dt);
            if (this.jumpWarning === 0) {
                this.jumpRemaining = 0.25;
                this.jumpCooldown = 3;
            }
        }
        else {
            const ahead = {
                x: this.position.x + heading.x * 0.55,
                y: this.position.y + heading.y * 0.55,
            };
            if (this.kind === 'hopper' &&
                this.jumpCooldown === 0 &&
                !board.supports(ahead)) {
                this.jumpWarning = 0.22;
                this.jumpDirection = heading;
            }
            else {
                const speed = this.kind === 'hopper' ? 2.05 : 2.35;
                this.position = {
                    x: this.position.x + heading.x * speed * dt,
                    y: this.position.y + heading.y * speed * dt,
                };
            }
        }
        if (this.jumpRemaining > 0)
            return 'alive';
        if (!board.supports(this.position))
            return 'fell';
        board.step(this.position, time);
        return 'alive';
    }
    touches(player) {
        return (this.spawnRemaining === 0 &&
            this.jumpRemaining === 0 &&
            player.dashRemaining === 0 &&
            distance(this.position, player) < movement.contactDistance);
    }
}
