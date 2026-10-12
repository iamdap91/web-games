export const yetiBossRules = {
    maxHealth: 216,
    damage: 42,
    preparationDuration: 1.2,
    openingDamageMultiplier: 2,
};
/** 준비와 강공격을 번갈아 사용한다. 행동이 막히면 모은 힘도 함께 잃는다. */
export class YetiBoss {
    enemyId;
    ready = false;
    exposed = false;
    constructor(enemyId) {
        this.enemyId = enemyId;
    }
    nextAction() {
        const action = this.ready ? 'heavy' : 'prepare';
        this.ready = !this.ready;
        this.exposed = false;
        return action;
    }
    interrupt() {
        const interrupted = this.ready;
        this.ready = false;
        this.exposed = interrupted;
        return interrupted;
    }
    receiveDamage(damage) {
        if (!(damage > 0))
            return damage;
        const multiplier = this.exposed ? yetiBossRules.openingDamageMultiplier : 1;
        this.exposed = false;
        return Math.round(damage * multiplier);
    }
    get snapshot() {
        return { enemyId: this.enemyId, ready: this.ready, exposed: this.exposed };
    }
}
