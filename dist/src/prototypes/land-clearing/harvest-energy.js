export const energyRules = {
    capacity: 3,
    costs: { rush: 2, slam: 3 },
};
/** 두 기술이 같은 기세와 하나의 입력 예약을 공유한다. */
export class HarvestEnergy {
    charge = 0;
    requested = null;
    recordHarvest() {
        this.charge = Math.min(energyRules.capacity, this.charge + 1);
    }
    canUse(skill) {
        return this.charge >= energyRules.costs[skill];
    }
    request(skill) {
        if (this.canUse(skill) && !this.requested)
            this.requested = skill;
    }
    spendRequested() {
        const skill = this.requested;
        this.requested = null;
        if (!skill || !this.canUse(skill))
            return null;
        this.charge -= energyRules.costs[skill];
        return skill;
    }
    cancelRequest() {
        this.requested = null;
    }
    get snapshot() {
        return { charge: this.charge, capacity: energyRules.capacity };
    }
    reset() {
        this.charge = 0;
        this.cancelRequest();
    }
}
