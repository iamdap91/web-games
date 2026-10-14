import { rushMotion } from './motions/rush.js';
import { dodgeMotion } from './motions/dodge.js';
import { flyingKickMotion } from './motions/flying-kick.js';
import { slideMotion } from './motions/slide.js';
import { backflipMotion } from './motions/backflip.js';
import { withSupplement } from './supplements.js';
export const comboMotions = [
    rushMotion,
    dodgeMotion,
    flyingKickMotion,
    slideMotion,
    backflipMotion,
].map(withSupplement);
