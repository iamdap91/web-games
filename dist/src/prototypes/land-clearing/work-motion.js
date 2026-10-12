import { sequenceFrame, strikeFrame, } from '../../resources/characters/ataho/motion-frame.js';
import { cardinalFacing } from '../../resources/characters/ataho/facing.js';
import { gatherDownFrames, tigerFistFrames, turnKickFrames, workReadyFrames, } from '../../resources/characters/ataho/combat-frames.js';
import { clearing } from './clearing-rules.js';
function attackPose(facing, phase) {
    const { time } = phase;
    if (facing === 'back') {
        const frameIndex = strikeFrame(turnKickFrames, {
            time,
            contactAt: clearing.impactTime,
            recoverAt: clearing.impactTime +
                (clearing.swingDuration - clearing.impactTime) * 0.32,
            endAt: clearing.swingDuration,
        });
        return { motion: 'turn-kick', frameIndex };
    }
    if (facing === 'front') {
        return {
            motion: 'gather-down',
            frameIndex: strikeFrame(gatherDownFrames, {
                time,
                contactAt: clearing.impactTime,
                recoverAt: clearing.impactTime +
                    (clearing.swingDuration - clearing.impactTime) * 0.32,
                endAt: clearing.swingDuration,
            }),
        };
    }
    const turnEnd = clearing.impactTime * 0.35;
    const turnBackAt = clearing.swingDuration * 0.82;
    if (time < turnEnd)
        return {
            motion: 'work-ready',
            frameIndex: sequenceFrame(workReadyFrames, time / turnEnd),
        };
    if (time >= turnBackAt)
        return {
            motion: 'work-ready',
            frameIndex: sequenceFrame(workReadyFrames, 1 - (time - turnBackAt) / (clearing.swingDuration - turnBackAt)),
        };
    if (time >= turnBackAt - 0.025)
        return { motion: 'battle-ready', frameIndex: 0 };
    return {
        motion: 'tiger-fist',
        frameIndex: strikeFrame(tigerFistFrames, {
            time,
            windupAt: turnEnd,
            contactAt: clearing.impactTime,
            recoverAt: clearing.impactTime +
                (clearing.swingDuration - clearing.impactTime) * 0.32,
            endAt: turnBackAt,
        }),
    };
}
/** 준비·전진·접촉·복귀를 실제 타격 시각에 맞춘다. */
export function workMotion(progress, facing) {
    facing = cardinalFacing(facing);
    const time = Math.max(0, Math.min(progress, 1)) * clearing.swingDuration;
    const windupEnd = clearing.impactTime * 0.6;
    const striking = time >= windupEnd && time <= clearing.impactTime;
    const recovery = Math.max(0, (time - clearing.impactTime) /
        (clearing.swingDuration - clearing.impactTime));
    const extension = time < windupEnd
        ? 0
        : striking
            ? Math.pow((time - windupEnd) / (clearing.impactTime - windupEnd), 2)
            : Math.max(0, 1 - recovery * 1.8);
    return {
        pose: attackPose(facing, { time }),
        mirror: facing === 'left',
        extension,
        coil: time < windupEnd ? Math.sin((time / windupEnd) * Math.PI) : 0,
    };
}
