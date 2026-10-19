import biwolCombatIdle from '../../../resources/biwol-combat-idle.json' with { type: 'json' };
import biwol from '../../../resources/companion-basic-attacks/biwol.json' with { type: 'json' };
import biwolAdditions from '../../../resources/companion-basic-attacks/biwol-additions.json' with { type: 'json' };
import { yeonmukBattleAnimations } from '../../resources/characters/yeonmuk/yeonmuk-visual.js';
export const partyFormation = {
    ataho: { x: 225, ground: 330 },
    yeonmuk: { x: 355, ground: 275 },
    biwol: { x: 355, ground: 420 },
};
export function animationDuration(animation) {
    return animation.frames.reduce((sum, frame) => sum + (frame.durationSeconds ?? 0.14), 0);
}
export function animationAt(animation, progress) {
    let remaining = Math.max(0, Math.min(1, progress)) * animationDuration(animation);
    for (const frame of animation.frames) {
        remaining -= frame.durationSeconds ?? 0.14;
        if (remaining < 0)
            return frame;
    }
    return animation.frames[animation.frames.length - 1];
}
export function partyMotions(ataho) {
    const yeonmuk = yeonmukBattleAnimations();
    return {
        ataho: new Map([
            ['idle', ataho.get('fight-stance-idle-8-frames-south-east')],
            ['attack', ataho.get('cross-punch-south-east')],
            ['heavy', ataho.get('surprise-uppercut-south-east')],
            ['hit', ataho.get('ataho-hit-skeleton-south-east-south-east')],
            ['defeat', ataho.get('ataho-fall-skeleton-south-east-south-east')],
        ]),
        yeonmuk: new Map([
            ['idle', yeonmuk.get('battle-ready')],
            ['attack', yeonmuk.get('talisman-cast')],
            ['hit', yeonmuk.get('hit1')],
            ['defeat', yeonmuk.get('die1')],
        ]),
        biwol: new Map([
            ['idle', biwolCombatIdle.directions['south-east']],
            ['attack', { frames: biwol.directions['south-east'].frames }],
            [
                'finish',
                {
                    frames: biwolAdditions.motions.lunge.directions['south-east'].frames,
                },
            ],
        ]),
    };
}
/** 원본의 준비·접촉·회수 자세를 판정 시점에 맞춰 재생한다. */
export function partyAttackFrame(motions, actor, action, progress, timing = { contactAt: 0.55, recoverAt: 0.72 }) {
    const heavy = actor === 'ataho' && action === 'heavy';
    const lunge = actor === 'biwol' && action === 'finish';
    const animation = motions.get(heavy ? 'heavy' : lunge ? 'finish' : 'attack');
    const preparation = actor === 'ataho'
        ? heavy
            ? [0, 1, 2]
            : [0, 1, 2, 3, 4]
        : actor === 'yeonmuk'
            ? [0, 1, 2]
            : lunge
                ? [0, 1, 2, 3, 4]
                : [0, 1, 2, 3];
    const contact = actor === 'ataho'
        ? heavy
            ? 3
            : 5
        : actor === 'yeonmuk'
            ? 3
            : lunge
                ? 5
                : 4;
    const recovery = actor === 'ataho'
        ? heavy
            ? [4, 5, 6]
            : [4, 3, 2, 1, 0]
        : actor === 'yeonmuk'
            ? [4, 5, 6, 7]
            : lunge
                ? [6, 7, 8, 9, 10, 11]
                : [5, 6, 7];
    let index = contact;
    if (progress < timing.contactAt) {
        index =
            preparation[Math.min(preparation.length - 1, Math.floor((progress / timing.contactAt) * preparation.length))];
    }
    else if (progress >= timing.recoverAt) {
        index =
            recovery[Math.min(recovery.length - 1, Math.floor(((progress - timing.recoverAt) / (1 - timing.recoverAt)) *
                recovery.length))];
    }
    return animation.frames[index];
}
