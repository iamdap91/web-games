import { strikeFrame } from '../../resources/characters/ataho/motion-frame.js';
import { cardinalFacing } from '../../resources/characters/ataho/facing.js';
import { straightPunchFrames, tigerFistFrames, sweepKickFrames, pushKickFrames, turnKickFrames, } from '../../resources/characters/ataho/combat-frames.js';
// 이동·자세·피해 판정이 같은 구간 경계를 사용해 타격 중 발이 밀리지 않게 한다.
export const turnAttackTimings = {
    attack: {
        arriveAt: 0.15,
        windupAt: 0.19,
        contactTime: 0.36,
        recoverAt: 0.46,
        returnAt: 0.6,
        returnEnd: 0.75,
        duration: 0.8,
    },
    skill: {
        arriveAt: 0.16,
        windupAt: 0.2,
        contactTime: 0.46,
        recoverAt: 0.6,
        returnAt: 0.76,
        returnEnd: 0.92,
        duration: 1,
    },
};
export function turnAttackAdvance(kind, time) {
    const timing = turnAttackTimings[kind];
    if (time < timing.arriveAt)
        return Math.max(0, time / timing.arriveAt);
    if (time < timing.returnAt)
        return 1;
    // 짧은 등속 대시 뒤 정확히 멈추며, 감속 꼬리나 되튐을 남기지 않는다.
    return Math.max(0, 1 - (time - timing.returnAt) / (timing.returnEnd - timing.returnAt));
}
export function turnAttackPose(kind, time, facing, skill = 'tiger') {
    facing = cardinalFacing(facing);
    const timing = turnAttackTimings[kind];
    const mirror = facing === 'left';
    if ((kind === 'attack' && (facing === 'left' || facing === 'right')) ||
        (kind === 'skill' && skill === 'tiger')) {
        const animation = kind === 'attack' ? 'straight-punch' : 'tiger-fist';
        const frames = kind === 'attack' ? straightPunchFrames : tigerFistFrames;
        // 전진·복귀 때 손을 내리지 않고 현재 가드를 유지한다.
        if (time < timing.windupAt || time >= timing.returnAt)
            return { animation: 'battle-ready', frame: 0, mirror };
        if (time < timing.contactTime) {
            const progress = (time - timing.windupAt) / (timing.contactTime - timing.windupAt);
            const index = Math.min(frames.windup.length - 1, Math.floor(progress * frames.windup.length));
            return {
                animation,
                frame: frames.windup[index],
                mirror,
            };
        }
        if (time < timing.recoverAt)
            return {
                animation,
                frame: frames.contact,
                mirror,
            };
        const progress = (time - timing.recoverAt) / (timing.returnAt - timing.recoverAt);
        const index = Math.min(frames.recovery.length - 1, Math.floor(progress * frames.recovery.length));
        return {
            animation,
            frame: frames.recovery[index],
            mirror,
        };
    }
    if ((kind === 'skill' && skill !== 'tiger') || facing === 'back') {
        const kick = kind === 'skill' && skill === 'kick';
        return {
            animation: kick ? 'battle-kick' : 'turn-kick',
            frame: strikeFrame(kick ? pushKickFrames : turnKickFrames, {
                time,
                windupAt: timing.windupAt,
                contactAt: timing.contactTime,
                recoverAt: timing.recoverAt,
                endAt: timing.returnAt,
            }),
            mirror,
        };
    }
    if (time < timing.arriveAt ||
        (time >= timing.returnAt && time < timing.returnEnd)) {
        const suffix = facing === 'front' ? '' : `-${facing}`;
        return {
            animation: `move${suffix}`,
            frame: turnAttackAdvance(kind, time) < 0.5 ? 1 : 2,
            mirror: false,
        };
    }
    if (time >= timing.returnEnd)
        return { animation: 'battle-ready', frame: 0, mirror };
    const windup = Math.max(0, (time - timing.windupAt) / (timing.contactTime - timing.windupAt));
    if (facing === 'front') {
        const animation = 'sweep-kick';
        if (time < timing.windupAt)
            return { animation, frame: sweepKickFrames.ready, mirror: false };
        if (time < timing.contactTime) {
            const index = Math.min(sweepKickFrames.windup.length - 1, Math.floor(windup * sweepKickFrames.windup.length));
            return {
                animation,
                frame: sweepKickFrames.windup[index],
                mirror: false,
            };
        }
        if (time < timing.recoverAt)
            return { animation, frame: sweepKickFrames.contact, mirror: false };
        const recovery = (time - timing.recoverAt) / (timing.returnAt - timing.recoverAt);
        const index = Math.min(sweepKickFrames.recovery.length - 1, Math.floor(recovery * sweepKickFrames.recovery.length));
        return {
            animation,
            frame: sweepKickFrames.recovery[index],
            mirror: false,
        };
    }
    return { animation: 'battle-ready', frame: 0, mirror };
}
