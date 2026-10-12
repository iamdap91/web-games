export const hollowLayout = {
    x: 4.8,
    z: -4.4,
    radius: 0.65,
    inspectSeconds: 1.05,
    reward: { wood: 2, stone: 2 },
};
/** 자루 발견은 한 번만 완료하며 완료 순간에 보상을 반환한다. */
export class HollowTree {
    phase = 'unsearched';
    elapsed = 0;
    searchingElapsed = 0;
    claimedAt = null;
    constructor(claimed = false) {
        if (claimed)
            this.phase = 'claimed';
    }
    get snapshot() {
        return {
            phase: this.phase,
            claimedAt: this.claimedAt,
            progress: Math.min(1, this.searchingElapsed / hollowLayout.inspectSeconds),
        };
    }
    inspect() {
        if (this.phase !== 'unsearched')
            return false;
        this.phase = 'searching';
        return true;
    }
    update(delta) {
        if (!Number.isFinite(delta) || delta <= 0)
            return null;
        this.elapsed += delta;
        if (this.phase !== 'searching')
            return null;
        this.searchingElapsed += delta;
        if (this.searchingElapsed < hollowLayout.inspectSeconds)
            return null;
        this.phase = 'claimed';
        this.claimedAt =
            this.elapsed - (this.searchingElapsed - hollowLayout.inspectSeconds);
        return hollowLayout.reward;
    }
}
