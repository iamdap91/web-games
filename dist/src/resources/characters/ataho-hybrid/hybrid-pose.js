import { comparisonRules } from './motion-preview.js';
function smooth(value) {
    const clamped = Math.max(0, Math.min(1, value));
    return clamped * clamped * (3 - 2 * clamped);
}
/** 모션 샘플링은 캔버스나 뼈대 객체를 변경하지 않는다. */
export function hybridPose(snapshot) {
    const breathing = Math.sin(snapshot.ambientTime * 2.1);
    const walking = snapshot.motion === 'walk';
    const phase = (snapshot.time / comparisonRules.walkCycle) * Math.PI * 2;
    const stride = walking ? Math.sin(phase) : 0;
    let pose = {
        bob: walking ? -Math.abs(Math.cos(phase)) * 0.7 : breathing * 0.35,
        lean: walking ? Math.sin(phase) * 0.012 : breathing * 0.003,
        turn: 1,
        leftArm: 0.05 - stride * 0.12,
        rightArm: -0.05 + stride * 0.12,
        leftElbow: -0.02,
        rightElbow: 0.02,
        leftLeg: stride * 0.17,
        rightLeg: -stride * 0.17,
        leftKnee: Math.max(0, stride) * 0.12,
        rightKnee: Math.max(0, -stride) * -0.12,
        tail: Math.sin(snapshot.ambientTime * 1.7 - 0.6) * 0.065,
        attachment: 'rig',
    };
    if (snapshot.motion !== 'punch' && snapshot.motion !== 'kick')
        return pose;
    const kind = snapshot.motion;
    const attack = comparisonRules.attacks[kind];
    const { time } = snapshot;
    const preparation = smooth(time / (attack.contactAt * 0.72));
    const recovery = 1 -
        smooth((time - attack.recoverAt) / (attack.duration - attack.recoverAt));
    const weight = time < attack.contactAt ? preparation : recovery;
    const contact = time >= attack.contactAt && time < attack.recoverAt;
    const turn = kind === 'kick' && !contact
        ? 1 - Math.sin(Math.min(1, time / attack.duration) * Math.PI) * 0.22
        : 1;
    pose = {
        ...pose,
        bob: weight * 2,
        lean: -weight * (kind === 'punch' ? 0.045 : 0.09),
        turn,
        leftArm: weight * -0.3,
        rightArm: weight * 0.5,
        leftElbow: weight * -0.45,
        rightElbow: weight * 0.5,
        leftLeg: kind === 'kick' ? weight * 0.14 : weight * 0.04,
        rightLeg: kind === 'kick' ? weight * -0.42 : weight * -0.04,
        leftKnee: 0,
        rightKnee: kind === 'kick' ? weight * 0.25 : 0,
        attachment: contact ? kind : 'rig',
    };
    return pose;
}
