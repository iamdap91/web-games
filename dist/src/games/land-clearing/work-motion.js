import { clearing } from './world.js';
const readyPose = {
    motion: 'battle-arm',
    frameIndex: 0,
    hand: { x: 40, y: 33 },
};
const raisedPose = {
    motion: 'battle-arm',
    frameIndex: 1,
    hand: { x: 41, y: 24 },
};
const strikePose = {
    motion: 'crouch',
    frameIndex: 0,
    hand: { x: 34, y: 40 },
};
/** 몸·도구·타격이 독립적으로 반복되지 않도록 실제 작업 시간 하나를 따른다. */
export function workMotion(progress, facing) {
    const time = Math.max(0, Math.min(progress, 1)) * clearing.swingDuration;
    const windupEnd = clearing.impactTime * 0.55;
    const recovery = Math.max(0, (time - clearing.impactTime) /
        (clearing.swingDuration - clearing.impactTime));
    let angle;
    if (time < windupEnd) {
        angle = -0.45 - (0.8 * time) / windupEnd;
    }
    else if (time < clearing.impactTime) {
        const strike = (time - windupEnd) / (clearing.impactTime - windupEnd);
        angle = -1.25 + 3.2 * strike * strike;
    }
    else {
        angle = 1.95 - 1.6 * recovery;
    }
    const pose = time < windupEnd
        ? readyPose
        : time < clearing.impactTime
            ? raisedPose
            : recovery < 0.55
                ? strikePose
                : readyPose;
    const effort = time < clearing.impactTime ? 0 : Math.pow(1 - recovery, 2);
    return {
        pose: facing === 'back' ? null : pose,
        hand: facing === 'back' ? { x: 34, y: 33 } : pose.hand,
        mirror: facing === 'left',
        angle,
        effort,
    };
}
