import { mushroomHealerRules } from './mushroom-healer.js';
export const mushroomMotionRules = {
    hitPause: 0.12,
    recoilDuration: 0.22,
    deathHold: 0.12,
    deathSettle: 0.3,
};
function duration(animation) {
    return animation.frames.reduce((sum, frame) => sum + (frame.durationSeconds ?? 0.14), 0);
}
function frameAt(animation, time, playback) {
    let remaining = playback === 'loop' ? time % duration(animation) : time;
    for (const frame of animation.frames) {
        remaining -= frame.durationSeconds ?? 0.14;
        if (remaining < 0)
            return frame;
    }
    return animation.frames.at(-1);
}
/** 표시 시간만 소유하며 회복·중단 판정은 실제 상태와 이벤트를 따른다. */
export class MushroomMotion {
    animations;
    idleTime = 0;
    prepareTime = 0;
    preparing = false;
    healTime = null;
    deathTime = null;
    hitRemaining = 0;
    currentFrame = null;
    mode = 'idle';
    idle;
    constructor(animations) {
        this.animations = animations;
        const idle = animations.get('stand');
        if (!idle?.frames.length)
            throw new Error('버섯 정령 대기 프레임이 없습니다.');
        this.idle = idle;
    }
    hit() {
        if (this.deathTime === null)
            this.hitRemaining = mushroomMotionRules.hitPause;
    }
    cast() {
        if (this.deathTime === null)
            this.healTime = 0;
    }
    update(options) {
        const dt = Number.isFinite(options.dt) ? Math.max(0, options.dt) : 0;
        if (!options.alive || this.deathTime !== null) {
            this.deathTime = this.deathTime === null ? 0 : this.deathTime + dt;
            this.healTime = null;
            this.preparing = false;
            this.prepareTime = 0;
            this.hitRemaining = 0;
            this.mode = 'dead';
            return;
        }
        const advance = Math.max(0, dt - this.hitRemaining);
        this.hitRemaining = Math.max(0, this.hitRemaining - dt);
        if (options.preparing !== this.preparing)
            this.prepareTime = 0;
        this.preparing = options.preparing;
        if (!options.healing)
            this.healTime = null;
        if (this.healTime !== null) {
            this.healTime = Math.min(mushroomHealerRules.castingDuration, this.healTime + advance);
            this.mode = 'heal';
        }
        else if (this.preparing) {
            this.prepareTime += advance;
            this.mode = 'prepare';
        }
        else {
            this.idleTime += advance;
            this.mode = 'idle';
        }
    }
    frame(options) {
        const idle = this.idle;
        if (this.mode === 'dead' || this.hitRemaining > 0) {
            this.currentFrame ??= idle.frames[0];
            return this.currentFrame;
        }
        if (this.mode === 'prepare') {
            const animation = this.animations.get('prepare') ?? idle;
            this.currentFrame = options.reducedMotion
                ? animation.frames.at(-1)
                : frameAt(animation, this.prepareTime, 'hold');
        }
        else if (this.mode === 'heal') {
            const animation = this.animations.get('heal') ?? idle;
            // 기존 회복 차례 안에 전체 프레임을 재생해 전투 대기 시간을 늘리지 않는다.
            const time = (this.healTime / mushroomHealerRules.castingDuration) *
                duration(animation);
            this.currentFrame = options.reducedMotion
                ? animation.frames[0]
                : frameAt(animation, time, 'hold');
        }
        else {
            this.currentFrame = options.reducedMotion
                ? idle.frames[0]
                : frameAt(idle, this.idleTime, 'loop');
        }
        return this.currentFrame;
    }
    get snapshot() {
        return {
            mode: this.mode,
            prepareTime: this.prepareTime,
            healTime: this.healTime ?? 0,
            deathTime: this.deathTime ?? 0,
        };
    }
    reset() {
        this.idleTime = this.prepareTime = this.hitRemaining = 0;
        this.preparing = false;
        this.healTime = this.deathTime = null;
        this.currentFrame = null;
        this.mode = 'idle';
    }
}
