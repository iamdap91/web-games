export const rageRules = { capacity: 100, turnCharge: 10 };
/** 피격과 턴 진행으로만 분노를 모아 필살기 한 번에 모두 소모한다. */
export class Rage {
    amount = 0;
    get gauge() {
        return this.amount;
    }
    setGaugeForDevelopment(amount) {
        if (!Number.isFinite(amount))
            return;
        this.amount = Math.max(0, Math.min(rageRules.capacity, amount));
    }
    beginTurn() {
        this.charge(rageRules.turnCharge);
    }
    takeDamage(damage, maxHealth) {
        this.charge((damage / maxHealth) * rageRules.capacity);
    }
    consume() {
        if (this.amount < rageRules.capacity)
            return false;
        this.amount = 0;
        return true;
    }
    charge(amount) {
        this.amount = Math.min(rageRules.capacity, this.amount + amount);
    }
}
