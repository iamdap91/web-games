export const overdriveRules = {
    capacity: 100,
    duration: 8,
    attackCharge: 34,
    skillCharge: 40,
    guardCharge: 34,
    finisherInterval: 4,
    rushDuration: 0.23,
    rushContactTime: 0.085,
};
export const driveFinishers = {
    sweep: {
        name: '회전 강타',
        damage: 26,
        radius: 3.15,
        duration: 0.42,
        contactTime: 0.17,
        hitStop: 0.08,
    },
    pierce: {
        name: '관통 정권',
        damage: 32,
        radius: 3.35,
        duration: 0.44,
        contactTime: 0.18,
        hitStop: 0.1,
    },
    push: {
        name: '밀어차기',
        damage: 38,
        radius: 3.6,
        duration: 0.48,
        contactTime: 0.2,
        hitStop: 0.12,
    },
};
const finisherOrder = ['sweep', 'pierce', 'push'];
/** 게이지와 제한 시간, 이번 발동의 공격 성과를 함께 관리한다. */
export class Overdrive {
    gauge = overdriveRules.capacity;
    remaining = 0;
    hits = 0;
    damage = 0;
    attacks = 0;
    get nextFinisher() {
        return (this.attacks + 1) % overdriveRules.finisherInterval === 0
            ? this.upcomingFinisher
            : null;
    }
    get upcomingFinisher() {
        return finisherOrder[Math.floor(this.attacks / overdriveRules.finisherInterval) %
            finisherOrder.length];
    }
    get ready() {
        return this.gauge >= overdriveRules.capacity;
    }
    get expired() {
        return this.remaining <= 0;
    }
    get snapshot() {
        return {
            gauge: this.gauge,
            remaining: this.remaining,
            hits: this.hits,
            damage: this.damage,
            chain: this.attacks,
            upcomingFinisher: this.upcomingFinisher,
        };
    }
    charge(amount) {
        this.gauge = Math.min(overdriveRules.capacity, this.gauge + amount);
    }
    setGaugeForDevelopment(amount) {
        if (!Number.isFinite(amount))
            return;
        this.gauge = Math.max(0, Math.min(overdriveRules.capacity, amount));
    }
    activate() {
        if (!this.ready)
            return false;
        this.gauge = 0;
        this.remaining = overdriveRules.duration;
        this.hits = 0;
        this.damage = 0;
        this.attacks = 0;
        return true;
    }
    update(dt) {
        this.remaining = Math.max(0, this.remaining - dt);
    }
    recordHit(damage) {
        this.hits++;
        this.damage += damage;
    }
    recordAttack() {
        this.attacks++;
    }
}
