import { guardFrames, hurtFrames, } from '../../resources/characters/ataho/combat-frames.js';
import { sequenceFrame } from '../../resources/characters/ataho/motion-frame.js';
export const reactionTimings = {
    guardEntry: 0.16,
    guardReturn: 0.14,
    hurtHold: 0.065,
    hurtDuration: 0.23,
};
/** 방어의 진입·유지·해제 시간을 소유하며, 판정 상태를 바꾸지 않는다. */
export class GuardMotion {
    stage = 'inactive';
    elapsed = 0;
    update(guarding, dt) {
        if (guarding && (this.stage === 'inactive' || this.stage === 'leaving')) {
            this.stage = 'entering';
            this.elapsed = 0;
        }
        else if (!guarding &&
            (this.stage === 'entering' || this.stage === 'holding')) {
            this.stage = 'leaving';
            this.elapsed = 0;
        }
        this.elapsed += dt;
        if (this.stage === 'entering' && this.elapsed >= reactionTimings.guardEntry)
            this.stage = 'holding';
        if (this.stage === 'leaving' && this.elapsed >= reactionTimings.guardReturn)
            this.stage = 'inactive';
    }
    get frame() {
        if (this.stage === 'inactive')
            return null;
        if (this.stage === 'holding')
            return guardFrames.held;
        return this.stage === 'entering'
            ? sequenceFrame(guardFrames.entry, this.elapsed / reactionTimings.guardEntry)
            : sequenceFrame(guardFrames.recovery, this.elapsed / reactionTimings.guardReturn);
    }
    reset() {
        this.stage = 'inactive';
        this.elapsed = 0;
    }
}
/** 접촉은 즉시 표시하고 남은 시간에 상체와 주먹을 원래 가드로 되돌린다. */
export function hurtPose(age) {
    return age < reactionTimings.hurtHold
        ? hurtFrames.contact
        : sequenceFrame(hurtFrames.recovery, (age - reactionTimings.hurtHold) /
            (reactionTimings.hurtDuration - reactionTimings.hurtHold));
}
