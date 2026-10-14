import { rushMotion } from './motions/rush.js';
import { dodgeMotion } from './motions/dodge.js';
import { flyingKickMotion } from './motions/flying-kick.js';
import { slideMotion } from './motions/slide.js';
import { backflipMotion } from './motions/backflip.js';
import { cheolsangoMotion } from './motions/cheolsango.js';
import { drinkMotion } from './motions/drink.js';
import { groundSpinMotion } from './motions/ground-spin.js';
import { elbowChopMotion } from './motions/elbow-chop.js';
import { withSupplement } from './supplements.js';
export const comboMotions = [
    rushMotion,
    dodgeMotion,
    flyingKickMotion,
    slideMotion,
    backflipMotion,
    cheolsangoMotion,
    drinkMotion,
    groundSpinMotion,
    elbowChopMotion,
].map(withSupplement);
