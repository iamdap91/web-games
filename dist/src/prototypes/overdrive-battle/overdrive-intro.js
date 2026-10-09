const windupCycle = 0.38;
/** 모션·균열·효과음이 같은 타격 시점을 사용한다. */
export const overdriveIntro = {
    windupCycle,
    chargeEnd: windupCycle * 2,
    tigerAt: 0.88,
    impactAt: 1.03,
    burstAt: 1.2,
    bannerAt: 1.48,
    duration: 1.96,
    lunge: 0.4,
    fistReach: 0.95,
    fistHeight: 1.05,
    tigerReach: 1.3,
};
export function introPose(time) {
    const { windupCycle, chargeEnd, tigerAt, burstAt, lunge } = overdriveIntro;
    if (time < chargeEnd) {
        // 원본 준비 동작 0~3을 두 번 이어 팔을 한 차례 더 돌린다.
        const rotation = (time % windupCycle) / windupCycle;
        return {
            frame: Math.min(3, Math.floor(rotation * 4)),
            offset: -0.14 * (time / chargeEnd) - Math.sin(rotation * Math.PI) * 0.05,
        };
    }
    if (time < tigerAt) {
        const progress = (time - chargeEnd) / (tigerAt - chargeEnd);
        return {
            frame: progress < 0.6 ? 3 : 4,
            offset: -0.14 + (lunge + 0.14) * progress * progress,
        };
    }
    const recovery = Math.max(0, Math.min(1, (time - burstAt - 0.12) / 0.36));
    return { frame: recovery < 0.5 ? 4 : 5, offset: lunge * (1 - recovery) };
}
export function introImpactPoint(fighter) {
    const direction = fighter.facing === 'left' ? -1 : 1;
    return {
        x: fighter.x +
            direction *
                (overdriveIntro.lunge +
                    overdriveIntro.fistReach +
                    overdriveIntro.tigerReach),
        z: fighter.z,
        height: overdriveIntro.fistHeight,
    };
}
