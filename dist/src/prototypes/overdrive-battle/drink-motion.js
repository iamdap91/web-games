import { drinkFrames } from '../../resources/characters/ataho/combat-frames.js';
import { strikeFrame } from '../../resources/characters/ataho/motion-frame.js';
import { drinkMotion } from './battle-skills.js';
/** 병을 들어 마시는 시점은 유지하고, 전후에 적을 향한 가드로 돌아선다. */
export function drinkPose(time) {
    return strikeFrame(drinkFrames, {
        time,
        contactAt: drinkMotion.contactTime,
        recoverAt: drinkMotion.contactTime + 0.08,
        endAt: drinkMotion.duration,
    });
}
