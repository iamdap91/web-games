export const rushRules = {
    duration: 3,
    speedMultiplier: 1.6,
    damage: 2,
    contactMargin: 0.08,
    recoilDuration: 0.22,
    recoilHold: 0.035,
    recoilDistance: 0.55,
};
function recoilTravel(elapsed) {
    const progress = Math.max(0, Math.min(1, (elapsed - rushRules.recoilHold) /
        (rushRules.recoilDuration - rushRules.recoilHold)));
    return (1 - (1 - progress) ** 2) * rushRules.recoilDistance;
}
/** 진행 방향·남은 시간·충돌 후 반동을 함께 소유한다. */
export class HarvestRush {
    action = null;
    begin(heading) {
        this.action = { elapsed: 0, heading: { ...heading }, recoil: null };
        this.steer(heading);
    }
    steer(input) {
        const length = Math.hypot(input.x, input.z);
        if (!this.action || !Number.isFinite(length) || length <= 0)
            return;
        this.action.heading = { x: input.x / length, z: input.z / length };
    }
    rebound(aim) {
        if (!this.canStrike || !this.action)
            return;
        // 튕기는 방향은 충돌 시점에 고정하고, 조작은 다음 돌진 방향에 반영한다.
        this.action.recoil = { elapsed: 0, aim: { ...aim } };
    }
    displacement(dt, speed) {
        const action = this.action;
        if (!action || !Number.isFinite(dt) || dt <= 0)
            return { x: 0, z: 0 };
        const time = Math.min(dt, rushRules.duration - action.elapsed);
        if (action.recoil) {
            const { elapsed, aim } = action.recoil;
            const distance = recoilTravel(elapsed + time) - recoilTravel(elapsed);
            return { x: -aim.x * distance, z: -aim.z * distance };
        }
        const distance = speed * rushRules.speedMultiplier * time;
        return { x: action.heading.x * distance, z: action.heading.z * distance };
    }
    update(dt) {
        if (!this.action || !Number.isFinite(dt) || dt <= 0)
            return;
        this.action.elapsed += dt;
        if (this.action.recoil) {
            this.action.recoil.elapsed += dt;
            if (this.action.recoil.elapsed >= rushRules.recoilDuration - 1e-9)
                this.action.recoil = null;
        }
        if (this.action.elapsed >= rushRules.duration - 1e-9)
            this.reset();
    }
    get active() {
        return this.action !== null;
    }
    get canStrike() {
        return this.action !== null && this.action.recoil === null;
    }
    get snapshot() {
        return this.action
            ? {
                elapsed: this.action.elapsed,
                remaining: Math.max(0, rushRules.duration - this.action.elapsed),
                heading: { ...this.action.heading },
                recoil: this.action.recoil
                    ? {
                        progress: this.action.recoil.elapsed / rushRules.recoilDuration,
                        aim: { ...this.action.recoil.aim },
                    }
                    : null,
            }
            : null;
    }
    reset() {
        this.action = null;
    }
}
