export const comparisonRules = {
    characterHeight: 128,
    walkSpeed: 32,
    walkLimit: 36,
    walkCycle: 0.96,
    hitStop: 0.045,
    attacks: {
        punch: { contactAt: 0.3, recoverAt: 0.41, duration: 0.76, advance: 12 },
        kick: { contactAt: 0.46, recoverAt: 0.58, duration: 1, advance: 20 },
    },
};
/** 두 그림이 공유하는 재생·이동·접촉·히트스톱의 시간을 소유한다. */
export class MotionPreview {
    motion = 'idle';
    elapsed = 0;
    ambientTime = 0;
    x = 0;
    facing = 1;
    loopWalk = true;
    paused = false;
    speed = 1;
    freezeRemaining = 0;
    contacted = false;
    impacts = 0;
    play(motion) {
        this.motion = motion;
        this.elapsed = 0;
        this.x = 0;
        this.facing = 1;
        this.freezeRemaining = 0;
        this.contacted = false;
        this.impacts = 0;
        this.paused = false;
        this.loopWalk = true;
    }
    walk({ direction }) {
        if (this.motion !== 'walk')
            this.elapsed = 0;
        this.motion = 'walk';
        this.facing = direction;
        this.loopWalk = false;
        this.freezeRemaining = 0;
        this.paused = false;
    }
    stopWalking() {
        if (this.motion !== 'walk' || this.loopWalk)
            return;
        this.motion = 'idle';
        this.elapsed = 0;
    }
    setPaused(paused) {
        this.paused = paused;
    }
    setSpeed(speed) {
        this.speed = speed;
    }
    seek(progress) {
        const attack = this.attack;
        if (!attack)
            return;
        this.elapsed = Math.max(0, Math.min(1, progress)) * attack.duration;
        this.freezeRemaining = 0;
        this.contacted = this.elapsed >= attack.contactAt;
        this.impacts = this.contacted ? 1 : 0;
        this.paused = true;
        this.updateAttackPosition();
    }
    update(delta) {
        if (this.paused || delta <= 0)
            return;
        let remaining = delta * this.speed;
        const attack = this.attack;
        if (!attack) {
            this.elapsed += remaining;
            this.ambientTime += remaining;
            if (this.motion === 'walk') {
                this.x += this.facing * comparisonRules.walkSpeed * remaining;
                if (Math.abs(this.x) >= comparisonRules.walkLimit) {
                    this.x = this.facing * comparisonRules.walkLimit;
                    if (this.loopWalk)
                        this.facing = this.facing === 1 ? -1 : 1;
                }
            }
            return;
        }
        if (!this.contacted && this.elapsed + remaining >= attack.contactAt) {
            const untilContact = attack.contactAt - this.elapsed;
            this.elapsed = attack.contactAt;
            this.ambientTime += untilContact;
            remaining -= untilContact;
            this.contacted = true;
            this.impacts += 1;
            this.freezeRemaining = comparisonRules.hitStop;
        }
        const frozenTime = Math.min(remaining, this.freezeRemaining);
        this.freezeRemaining -= frozenTime;
        remaining -= frozenTime;
        this.elapsed = Math.min(attack.duration, this.elapsed + remaining);
        this.ambientTime += remaining;
        this.updateAttackPosition();
    }
    get snapshot() {
        const attack = this.attack;
        return {
            motion: this.motion,
            time: this.elapsed,
            ambientTime: this.ambientTime,
            x: this.x,
            facing: this.facing,
            frozen: this.freezeRemaining > 0,
            paused: this.paused,
            finished: attack !== null && this.elapsed >= attack.duration,
            impacts: this.impacts,
            impactAge: this.contacted && attack ? this.elapsed - attack.contactAt : -1,
        };
    }
    get attack() {
        return this.motion === 'punch' || this.motion === 'kick'
            ? comparisonRules.attacks[this.motion]
            : null;
    }
    updateAttackPosition() {
        const attack = this.attack;
        if (attack)
            this.x =
                attack.advance *
                    Math.pow(Math.min(1, this.elapsed / attack.contactAt), 3);
    }
}
