export const mushroomHealerRules = {
    amount: 24,
    preparationDuration: 0.8,
    castingDuration: 0.65,
    idleDuration: 0.22,
};
/** 예고와 실행을 번갈아 처리하며, 실행할 때 실제로 가장 다친 동료를 고른다. */
export class MushroomHealer {
    enemyId;
    ready = false;
    targetId = null;
    castRemaining = 0;
    constructor(enemyId) {
        this.enemyId = enemyId;
    }
    beginTurn(allies) {
        this.targetId = null;
        this.castRemaining = 0;
        const target = allies
            .filter((ally) => ally.id !== this.enemyId &&
            ally.health > 0 &&
            ally.health < ally.maxHealth)
            .reduce((selected, ally) => selected === null ||
            ally.maxHealth - ally.health > selected.maxHealth - selected.health
            ? ally
            : selected, null);
        if (target === null) {
            this.ready = false;
            return { kind: 'idle', duration: mushroomHealerRules.idleDuration };
        }
        if (!this.ready) {
            this.ready = true;
            return {
                kind: 'prepare',
                duration: mushroomHealerRules.preparationDuration,
            };
        }
        this.ready = false;
        this.targetId = target.id;
        this.castRemaining = mushroomHealerRules.castingDuration;
        return {
            kind: 'heal',
            targetId: target.id,
            amount: mushroomHealerRules.amount,
            duration: mushroomHealerRules.castingDuration,
        };
    }
    interrupt() {
        const interrupted = this.ready;
        this.ready = false;
        this.targetId = null;
        this.castRemaining = 0;
        return interrupted;
    }
    update(dt) {
        if (!Number.isFinite(dt) || dt <= 0)
            return;
        this.castRemaining = Math.max(0, this.castRemaining - dt);
        if (this.castRemaining === 0)
            this.targetId = null;
    }
    get snapshot() {
        return {
            enemyId: this.enemyId,
            ready: this.ready,
            targetId: this.targetId,
        };
    }
}
