import { townLifeTiming, } from '../../../games/tiger-rpg/town-life.js';
import { workMotion } from '../../../prototypes/land-clearing/work-motion.js';
import { clearing } from '../../../prototypes/land-clearing/clearing-rules.js';
import { townLifeLayout } from './town-life-layout.js';
/** 생활 모션의 프레임·접촉 시각·발밑 위치를 행동 시간에 맞춘다. */
export function townLifePose(action) {
    if (action.kind === 'attack') {
        const { pose, mirror } = workMotion(action.elapsed / clearing.swingDuration, action.facing);
        return {
            ...action.origin,
            y: 0,
            ...pose,
            facing: mirror ? 'right' : 'left',
        };
    }
    const { kind, elapsed, origin, leaving } = action;
    const seated = kind === 'meal';
    const target = seated
        ? townLifeLayout.table.seat
        : townLifeLayout[kind === 'clear' ? 'path' : kind === 'stoke' ? 'fire' : 'chop'].approach;
    const progress = seated
        ? leaving !== null
            ? 1 - leaving / townLifeTiming.leave
            : Math.min(1, elapsed / townLifeTiming.sit)
        : Math.sin(Math.min(1, elapsed / townLifeTiming[kind].duration) * Math.PI) *
            0.32;
    const blend = progress * progress * (3 - 2 * progress);
    const position = {
        x: origin.x + (target.x - origin.x) * blend,
        z: origin.z + (target.z - origin.z) * blend,
        y: seated ? townLifeLayout.table.seat.y * blend : 0,
    };
    if (seated) {
        if (progress < 1)
            return {
                ...position,
                motion: 'sit',
                frameIndex: Math.min(7, Math.floor(progress * 8)),
            };
        if (kind === 'meal' &&
            leaving === null &&
            elapsed > 0.65 &&
            elapsed < townLifeTiming.meal)
            return {
                ...position,
                motion: 'sit',
                frameIndex: 7,
                mealFrameIndex: [2, 3, 4, 5, 6, 5, 4, 3][Math.floor((elapsed - 0.65) / 0.12) % 8] ??
                    3,
            };
        return {
            ...position,
            motion: 'sit',
            frameIndex: 7,
        };
    }
    const timing = townLifeTiming[kind];
    if (kind === 'chop') {
        const frameIndex = elapsed < timing.contact
            ? Math.min(6, Math.floor((elapsed / timing.contact) * 7))
            : elapsed < timing.contact + 0.06
                ? 7
                : Math.min(14, 8 +
                    Math.floor(((elapsed - timing.contact - 0.06) /
                        (timing.duration - timing.contact - 0.06)) *
                        7));
        return { ...origin, y: 0, motion: 'town-chop', frameIndex };
    }
    if (kind === 'clear') {
        const frameIndex = elapsed < timing.contact
            ? Math.min(3, Math.floor((elapsed / timing.contact) * 4))
            : elapsed < timing.contact + 0.05
                ? 4
                : Math.min(8, 5 +
                    Math.floor(((elapsed - timing.contact - 0.05) /
                        (timing.duration - timing.contact - 0.05)) *
                        4));
        return { ...origin, y: 0, motion: 'gather-down', frameIndex };
    }
    const fire = townLifeLayout.fire;
    const dx = fire.x - origin.x, dz = fire.z - origin.z;
    const distance = Math.max(0.01, Math.hypot(dx, dz));
    const reach = Math.sin(Math.min(1, elapsed / timing.duration) * Math.PI) * 0.18;
    const frameIndex = elapsed < timing.contact
        ? Math.min(4, Math.floor((elapsed / timing.contact) * 5))
        : elapsed < timing.contact + 0.1
            ? 5
            : Math.min(8, 6 +
                Math.floor(((elapsed - timing.contact - 0.1) /
                    (timing.duration - timing.contact - 0.1)) *
                    3));
    return {
        x: origin.x + (dx / distance) * reach,
        z: origin.z + (dz / distance) * reach,
        y: 0,
        motion: 'town-stoke',
        frameIndex,
        facing: origin.x > fire.x + 0.1 ? 'right' : 'left',
    };
}
