export const groundSlamRules = {
    radius: 3.4,
    impactTime: 0.32,
    impactHold: 0.11,
    duration: 0.78,
};
export function slamReaches(origin, point, radius = 0) {
    return (Math.hypot(point.x - origin.x, point.z - origin.z) <=
        groundSlamRules.radius + radius + 1e-9);
}
/** 강타 동작과 한 번의 착지 판정을 소유한다. */
export class GroundSlam {
    action = null;
    begin(origin) {
        if (this.action)
            return false;
        this.action = {
            origin: { x: origin.x, z: origin.z },
            elapsed: 0,
            struck: false,
        };
        return true;
    }
    update(dt) {
        const action = this.action;
        if (!action || !Number.isFinite(dt) || dt <= 0)
            return null;
        action.elapsed += dt;
        const strike = !action.struck && action.elapsed >= groundSlamRules.impactTime;
        if (strike)
            action.struck = true;
        if (action.elapsed >= groundSlamRules.duration)
            this.action = null;
        return strike ? { ...action.origin } : null;
    }
    get active() {
        return this.action !== null;
    }
    get snapshot() {
        return this.action
            ? { origin: { ...this.action.origin }, elapsed: this.action.elapsed }
            : null;
    }
    reset() {
        this.action = null;
    }
}
/** 팔을 들어 짧게 뛰고 웅크린 착지로 이어지는 기존 포즈 조합이다. */
export function slamMotion(elapsed) {
    const { impactTime, impactHold, duration } = groundSlamRules;
    if (elapsed < 0.1)
        return {
            motion: 'crouch',
            frameIndex: 0,
            lift: 0,
            squash: 1 - elapsed * 0.8,
        };
    if (elapsed < impactTime) {
        const t = (elapsed - 0.1) / (impactTime - 0.1);
        const lift = t < 0.6
            ? Math.sin(((t / 0.6) * Math.PI) / 2) * 0.65
            : (1 - ((t - 0.6) / 0.4) ** 2) * 0.65;
        return { motion: 'battle-arm', frameIndex: 1, lift, squash: 1.03 };
    }
    if (elapsed < impactTime + impactHold)
        return { motion: 'crouch', frameIndex: 1, lift: 0, squash: 0.8 };
    const recovery = Math.min(1, (elapsed - impactTime - impactHold) / (duration - impactTime - impactHold));
    return {
        motion: recovery < 0.5 ? 'crouch' : 'battle-ready',
        frameIndex: 0,
        lift: 0,
        squash: 0.8 + recovery * 0.2,
    };
}
