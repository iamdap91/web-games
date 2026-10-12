import { cardinalFacing } from '../../resources/characters/ataho/facing.js';
const windupCycle = 0.38;
const chargeFrameCount = 5;
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
    const { chargeEnd, tigerAt, burstAt, lunge } = overdriveIntro;
    if (time < chargeEnd) {
        // 기합을 모으는 전용 동작을 한 번 진행하며 발은 제자리에 고정한다.
        return {
            animation: 'overdrive-charge',
            frame: Math.min(chargeFrameCount - 1, Math.floor((Math.max(0, time) / chargeEnd) * chargeFrameCount)),
            offset: 0,
        };
    }
    if (time < tigerAt) {
        const progress = (time - chargeEnd) / (tigerAt - chargeEnd);
        return {
            animation: 'tiger-fist',
            frame: progress < 0.35 ? 2 : progress < 0.65 ? 3 : 4,
            offset: lunge * progress * progress,
        };
    }
    const recovery = Math.max(0, Math.min(1, (time - burstAt - 0.12) / 0.36));
    return {
        animation: 'tiger-fist',
        frame: recovery < 0.5 ? 4 : 5,
        offset: lunge * (1 - recovery),
    };
}
export function introImpactPoint(fighter) {
    const direction = cardinalFacing(fighter.facing) === 'left' ? -1 : 1;
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
