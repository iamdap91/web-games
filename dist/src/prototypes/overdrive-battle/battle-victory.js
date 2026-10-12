export const battleVictoryRules = {
    revealDuration: 0.32,
    reducedRevealDuration: 0.12,
};
/** 승리 문구의 등장과 복귀 허용 시점을 소유한다. 창 이탈은 dt=0으로 멈춘다. */
export class BattleVictory {
    elapsed = null;
    confirmed = false;
    duration;
    constructor(options) {
        this.duration = options.reducedMotion
            ? battleVictoryRules.reducedRevealDuration
            : battleVictoryRules.revealDuration;
    }
    show() {
        this.elapsed = 0;
        this.confirmed = false;
    }
    reset() {
        this.elapsed = null;
        this.confirmed = false;
    }
    update(dt) {
        if (this.elapsed === null || !Number.isFinite(dt) || dt <= 0)
            return;
        this.elapsed = Math.min(this.duration, this.elapsed + dt);
    }
    confirm(input) {
        if (!input.freshPress || !this.snapshot.canConfirm)
            return false;
        // 복귀 암전 중에는 마지막 승리 장면을 유지하고 중복 확정만 막는다.
        this.confirmed = true;
        return true;
    }
    get snapshot() {
        const progress = (this.elapsed ?? 0) / this.duration;
        return {
            visible: this.elapsed !== null,
            progress,
            canConfirm: progress >= 1 && !this.confirmed,
        };
    }
}
