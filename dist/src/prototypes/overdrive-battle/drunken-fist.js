export const drunkenRules = {
    drinksToActivate: 3,
    duration: 3,
    energyRecovery: 8,
    criticalChance: 0.1,
    drunkenCriticalChance: 0.4,
    criticalMultiplier: 1.5,
    skillMultiplier: 1.15,
};
/** 음주 횟수와 취권 수명을 소유한다. 발동한 음주 턴은 지속 턴에 포함하지 않는다. */
export class DrunkenFist {
    drinks = 0;
    turns = 0;
    activatedThisTurn = false;
    get active() {
        return this.turns > 0;
    }
    get snapshot() {
        return { drinks: this.drinks, turns: this.turns };
    }
    drink() {
        // 취권 중 추가 음주는 기력만 회복하며 지속 시간을 연장하지 않는다.
        if (this.active)
            return;
        this.drinks++;
        if (this.drinks < drunkenRules.drinksToActivate)
            return;
        this.drinks = 0;
        this.turns = drunkenRules.duration;
        this.activatedThisTurn = true;
    }
    endTurn() {
        if (this.activatedThisTurn) {
            this.activatedThisTurn = false;
            return;
        }
        this.turns = Math.max(0, this.turns - 1);
    }
    resolveHit(baseDamage, options) {
        const critical = options.roll <
            (this.active
                ? drunkenRules.drunkenCriticalChance
                : drunkenRules.criticalChance);
        const power = options.skill && this.active ? drunkenRules.skillMultiplier : 1;
        return {
            damage: Math.round(baseDamage * power * (critical ? drunkenRules.criticalMultiplier : 1)),
            critical,
        };
    }
}
