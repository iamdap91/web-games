import { driveAdvance, drivePose, } from '../../../prototypes/overdrive-battle/overdrive-motion.js';
import { driveFinishers } from '../../../prototypes/overdrive-battle/overdrive.js';
import { turnKickFrames } from '../../characters/ataho/combat-frames.js';
import { sequenceFrame } from '../../characters/ataho/motion-frame.js';
const sweep = driveFinishers.sweep;
export const combatPreviewRules = {
    contactAt: sweep.contactTime,
    actionDuration: sweep.duration,
    hitStop: sweep.hitStop,
    duration: sweep.duration + sweep.hitStop,
    baselineRecoverAt: sweep.contactTime + (sweep.duration - sweep.contactTime) * 0.58,
    enhancedRecoverAt: sweep.contactTime + (sweep.duration - sweep.contactTime) * 0.7,
    originX: -73,
    destinationX: -45,
    spriteScale: 1.18,
    contactPixel: { x: 60, fromBottom: 30, pivotX: 31 },
};
function clampProgress(progress) {
    return Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
}
/** 양쪽의 접촉·타격 정지·이동 시간을 함께 소유한다. 그림의 박자는 이 시간을 바꾸지 않는다. */
export class CombatPreview {
    elapsed = 0;
    active = false;
    attack() {
        this.elapsed = 0;
        this.active = true;
    }
    reset() {
        this.elapsed = 0;
        this.active = false;
    }
    seek(progress) {
        this.active = true;
        this.elapsed = clampProgress(progress) * combatPreviewRules.duration;
    }
    update(delta) {
        if (!this.active || !Number.isFinite(delta) || delta <= 0)
            return;
        this.elapsed = Math.min(combatPreviewRules.duration, this.elapsed + delta);
    }
    get progress() {
        return this.elapsed / combatPreviewRules.duration;
    }
    get finished() {
        return this.active && this.elapsed >= combatPreviewRules.duration;
    }
    get snapshot() {
        const { contactAt, hitStop } = combatPreviewRules;
        const contacted = this.active && this.elapsed >= contactAt;
        // 전투의 효과 시간은 타격 정지 중에도 흐르고, 포즈·이동 시간만 멈춘다.
        const stopped = Math.min(hitStop, Math.max(0, this.elapsed - contactAt));
        return {
            active: this.active,
            time: this.elapsed,
            actionTime: this.elapsed - stopped,
            impactAge: contacted ? this.elapsed - contactAt : -1,
            impactCount: Number(contacted),
            frozen: contacted && this.elapsed < contactAt + hitStop,
            finished: this.finished,
        };
    }
}
function sweepAction(snapshot) {
    return {
        kind: 'finisher',
        actorId: 0,
        targetIds: [1],
        origin: { x: combatPreviewRules.originX, z: 0 },
        destination: { x: combatPreviewRules.destinationX, z: 0 },
        elapsed: snapshot.actionTime,
        duration: sweep.duration,
        contactTime: sweep.contactTime,
        driveFinisher: 'sweep',
        driveBeat: 4,
    };
}
function enhancedFrame(time) {
    // 뒤로 모으는 2번 자세를 길게 읽힌 뒤 마지막 세 준비 그림을 빠르게 넘긴다.
    const starts = [0, 0.034, 0.057, 0.108, 0.126, 0.145];
    if (time < combatPreviewRules.contactAt) {
        const next = starts.findIndex((start) => start > time);
        const index = next < 0 ? starts.length - 1 : Math.max(0, next - 1);
        return turnKickFrames.windup[index];
    }
    if (time < combatPreviewRules.enhancedRecoverAt)
        return turnKickFrames.contact;
    return sequenceFrame(turnKickFrames.recovery, (time - combatPreviewRules.enhancedRecoverAt) /
        (combatPreviewRules.actionDuration -
            combatPreviewRules.enhancedRecoverAt));
}
export function combatPose(snapshot, options) {
    if (!snapshot.active)
        return {
            frameIndex: turnKickFrames.windup[0],
            x: combatPreviewRules.originX,
            phase: '대기',
        };
    const action = sweepAction(snapshot);
    const adjusted = options.variant === 'enhanced' && options.timing;
    const frameIndex = adjusted
        ? enhancedFrame(snapshot.actionTime)
        : drivePose(action, 'right').frame;
    const recoverAt = adjusted
        ? combatPreviewRules.enhancedRecoverAt
        : combatPreviewRules.baselineRecoverAt;
    const phase = snapshot.finished
        ? '완료'
        : snapshot.actionTime <
            (adjusted ? 0.108 : combatPreviewRules.contactAt * 0.5)
            ? '준비'
            : snapshot.actionTime < combatPreviewRules.contactAt
                ? '뻗음'
                : snapshot.actionTime < recoverAt
                    ? '접촉'
                    : '회수';
    return {
        frameIndex,
        x: action.origin.x +
            (action.destination.x - action.origin.x) * driveAdvance(action),
        phase,
    };
}
