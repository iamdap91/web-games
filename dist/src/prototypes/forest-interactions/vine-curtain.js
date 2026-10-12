import { clearing } from '../land-clearing/clearing-rules.js';
export const vineLayout = {
    x: 4,
    z: -1,
    halfWidth: 1.15,
    pocket: { minX: 2, maxX: 7, minZ: -6.5, maxZ: -1 },
    hits: 3,
    cutSeconds: clearing.swingDuration,
    impactSeconds: clearing.impactTime,
    openingSeconds: 0.85,
};
/** 타격의 접촉 시점과 장막 개방 시간이 판정·그림에 함께 쓰인다. */
export class VineCurtain {
    hits = 0;
    elapsed = 0;
    cutStartedAt = null;
    hitApplied = false;
    lastHitAt = null;
    constructor(opened = false) {
        if (opened)
            this.hits = vineLayout.hits;
    }
    get snapshot() {
        const opened = this.hits === vineLayout.hits;
        const opening = !opened
            ? 0
            : this.lastHitAt === null
                ? 1
                : Math.min(1, (this.elapsed - this.lastHitAt) / vineLayout.openingSeconds);
        return {
            hits: this.hits,
            opened,
            opening,
            passable: opening === 1,
            cutProgress: this.cutStartedAt === null
                ? null
                : (this.elapsed - this.cutStartedAt) / vineLayout.cutSeconds,
            lastHitAt: this.lastHitAt,
        };
    }
    cut() {
        if (this.hits >= vineLayout.hits || this.cutStartedAt !== null)
            return false;
        this.cutStartedAt = this.elapsed;
        this.hitApplied = false;
        return true;
    }
    update(delta) {
        if (!Number.isFinite(delta) || delta <= 0)
            return;
        this.elapsed += delta;
        if (this.cutStartedAt === null)
            return;
        const age = this.elapsed - this.cutStartedAt;
        if (!this.hitApplied && age >= vineLayout.impactSeconds) {
            this.hits++;
            this.lastHitAt = this.cutStartedAt + vineLayout.impactSeconds;
            this.hitApplied = true;
        }
        if (age >= vineLayout.cutSeconds)
            this.cutStartedAt = null;
    }
}
