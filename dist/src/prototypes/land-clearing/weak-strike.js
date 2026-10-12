import { clearing } from './clearing-rules.js';
export const weakStrikeRules = {
    duration: 0.55,
    impactTime: (0.55 * clearing.impactTime) / clearing.swingDuration,
};
/** 새 눌림으로 시작한 강타의 시간과 한 번의 접촉을 소유한다. */
export class WeakStrike {
    start;
    elapsed = 0;
    hit = false;
    constructor(start) {
        this.start = start;
    }
    update(dt) {
        this.elapsed = Math.min(weakStrikeRules.duration, this.elapsed + dt);
        if (this.hit || this.elapsed < weakStrikeRules.impactTime)
            return false;
        this.hit = true;
        return true;
    }
    get finished() {
        return this.elapsed >= weakStrikeRules.duration;
    }
    get snapshot() {
        return { ...this.start, progress: this.elapsed / weakStrikeRules.duration };
    }
}
