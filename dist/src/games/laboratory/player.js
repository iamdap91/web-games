import { world, playerBody, playerBounds } from './layout.js';
export const movement = {
    speed: 240,
    gravity: 1500,
    jumpSpeed: 440,
    flashSpeed: 850,
    flashDuration: 0.2,
};
export class Player {
    x = 360;
    y = world.ground;
    velocityY = 0;
    inverted = false;
    facing = 1;
    flashDirection = 1;
    flashRemaining = 0;
    flashAvailable = true;
    motion = 'stand';
    motionElapsed = 0;
    captureMotion() {
        return {
            player: this.snapshot,
            velocityY: this.velocityY,
            flashDirection: this.flashDirection,
        };
    }
    rewindTo(capture) {
        const saved = capture.player;
        this.x = saved.x;
        this.y = saved.y;
        this.facing = saved.facing;
        this.inverted = saved.inverted;
        this.flashAvailable = saved.flashAvailable;
        this.flashRemaining = saved.flashRemaining;
        this.motion = saved.motion;
        this.motionElapsed = saved.motionElapsed;
        this.velocityY = capture.velocityY;
        this.flashDirection = capture.flashDirection;
    }
    pullToward(x, distance) {
        this.x += Math.sign(x - this.x) * Math.min(Math.abs(x - this.x), distance);
    }
    dropIn() {
        this.y = -65;
        this.velocityY = 220;
        this.motion = 'jump';
    }
    invertGravity() {
        if (this.inverted)
            return;
        this.inverted = true;
        this.velocityY = -50;
        this.flashRemaining = 0;
    }
    get floor() {
        return this.inverted ? 0 : world.ground;
    }
    reflectMotion() {
        this.facing = this.facing === 1 ? -1 : 1;
        this.flashDirection = this.flashDirection === 1 ? -1 : 1;
    }
    squash() {
        this.y = world.ground;
        this.velocityY = 0;
        this.flashRemaining = 0;
        this.motion = 'stand';
    }
    stopAtCeiling(height) {
        if (this.inverted || this.y - playerBody.height >= height)
            return;
        this.y = Math.min(world.ground, height + playerBody.height);
        this.velocityY = Math.max(0, this.velocityY);
    }
    face(direction) {
        if (direction !== 0)
            this.facing = direction;
    }
    jump(direction) {
        this.face(direction);
        if (this.y === this.floor) {
            this.velocityY = (this.inverted ? 1 : -1) * movement.jumpSpeed;
            // 입력이 같은 물리 틱에 두 번 들어와도 두 번째는 공중 입력이다.
            this.y += this.inverted ? 0.01 : -0.01;
        }
        else if (this.flashAvailable) {
            this.flashAvailable = false;
            this.flashDirection = this.facing;
            this.flashRemaining = movement.flashDuration;
            this.velocityY = this.inverted ? 180 : -180;
        }
    }
    update(seconds, direction, minimum = playerBounds.minimum, maximum = playerBounds.maximum) {
        if (direction !== 0)
            this.facing = direction;
        const flashing = this.flashRemaining > 0;
        const velocityX = flashing
            ? this.flashDirection * movement.flashSpeed
            : direction * movement.speed;
        this.flashRemaining = Math.max(0, this.flashRemaining - seconds);
        this.x = Math.max(minimum, Math.min(maximum, this.x + velocityX * seconds));
        this.velocityY += movement.gravity * seconds * (this.inverted ? -1 : 1);
        this.y += this.velocityY * seconds;
        if (this.inverted ? this.y <= this.floor : this.y >= this.floor) {
            this.y = this.floor;
            this.velocityY = 0;
            this.flashAvailable = true;
            this.flashRemaining = 0;
        }
        const motion = this.y !== this.floor ? 'jump' : velocityX !== 0 ? 'move' : 'stand';
        this.motionElapsed =
            motion === this.motion ? this.motionElapsed + seconds : 0;
        this.motion = motion;
    }
    get snapshot() {
        return {
            x: this.x,
            y: this.y,
            facing: this.facing,
            grounded: this.y === this.floor,
            inverted: this.inverted,
            flashAvailable: this.flashAvailable,
            flashRemaining: this.flashRemaining,
            motion: this.motion,
            motionElapsed: this.motionElapsed,
        };
    }
}
