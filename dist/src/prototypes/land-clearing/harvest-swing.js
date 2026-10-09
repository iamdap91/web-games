import { clearing } from './clearing-rules.js';
/** 일반 공격의 타격 시점·정지·이동 복귀·종료를 함께 소유한다. */
export class HarvestSwing {
    start;
    elapsed = 0;
    pauseRemaining = 0;
    hit = false;
    movementReleased = false;
    constructor(start) {
        this.start = start;
    }
    get canMove() {
        return this.elapsed >= clearing.moveRecoveryTime;
    }
    get releasedForMovement() {
        return this.movementReleased;
    }
    get finished() {
        return this.elapsed >= clearing.swingDuration;
    }
    releaseForMovement() {
        // 복귀 후반의 이동만 허용하고 공격 시간은 유지해 연타 가속을 막는다.
        if (this.canMove)
            this.movementReleased = true;
    }
    update(dt) {
        const frozen = Math.min(dt, this.pauseRemaining);
        this.pauseRemaining -= frozen;
        this.elapsed += dt - frozen;
        if (this.hit || this.elapsed < clearing.impactTime)
            return null;
        this.hit = true;
        return this.start;
    }
    pause(duration) {
        this.pauseRemaining = Math.max(0, duration - (this.elapsed - clearing.impactTime));
        this.elapsed = clearing.impactTime;
    }
    get target() {
        return { id: this.start.targetId, kind: this.start.kind };
    }
    get snapshot() {
        return {
            kind: this.start.kind,
            aim: { ...this.start.aim },
            contact: { ...this.start.contact },
            advance: this.start.advance,
            progress: this.elapsed / clearing.swingDuration,
        };
    }
}
