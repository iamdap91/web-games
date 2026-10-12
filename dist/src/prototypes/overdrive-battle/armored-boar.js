export const armoredBoarRules = {
    maxHealth: 360,
    damage: 52,
    armorMultiplier: 0.8,
    preparationDuration: 1.2,
    chargeDuration: 0.9,
    contactTime: 0.4,
};
/** 돌진 예고와 갑옷의 빈틈을 소유한다. 돌진·행동 차단 뒤 한 번의 공격 기회를 준다. */
export class ArmoredBoar {
    enemyId;
    ready = false;
    exposed = false;
    constructor(enemyId) {
        this.enemyId = enemyId;
    }
    nextAction() {
        if (this.ready) {
            this.ready = false;
            return 'charge';
        }
        this.ready = true;
        this.exposed = false;
        return 'prepare';
    }
    finishCharge() {
        this.exposed = true;
    }
    interrupt() {
        this.ready = false;
        this.exposed = true;
    }
    receiveDamage(damage) {
        if (damage <= 0)
            return 0;
        return this.exposed
            ? damage
            : Math.max(1, Math.ceil(damage * armoredBoarRules.armorMultiplier));
    }
    receiveOverdriveDamage(damage) {
        // 일시적인 빈틈은 활용하지 않지만 원래 갑옷은 그대로 적용한다.
        return damage > 0
            ? Math.max(1, Math.ceil(damage * armoredBoarRules.armorMultiplier))
            : 0;
    }
    get snapshot() {
        return { enemyId: this.enemyId, ready: this.ready, exposed: this.exposed };
    }
}
