import { rushMotion } from './motions/rush.js';
import { dodgeMotion } from './motions/dodge.js';
import { flyingKickMotion } from './motions/flying-kick.js';
import { slideMotion } from './motions/slide.js';
import { backflipMotion } from './motions/backflip.js';
import { cheolsangoMotion } from './motions/cheolsango.js';
import { drinkMotion } from './motions/drink.js';
import { groundSpinMotion } from './motions/ground-spin.js';
import { elbowTimingMotion } from './motions/elbow-timing.js';
import {
  boxingChain,
  barrageChain,
  leapChain,
} from './motions/compound-chains.js';
import { groundChains } from './motions/ground-chains.js';
import { multiStageChains } from './motions/multi-stage-chains.js';
import { smearAttacks } from './motions/smear-attacks.js';
import { withPresentations } from './motions/presentation-improvements.js';
import { withLegacyEffects } from './motions/legacy-effects.js';
import { withGeneratedEffects } from './motions/generated-effects.js';
import { withPartEffects } from './motions/part-effects.js';
import { withPoseEffects } from './motions/pose-effects.js';
import { withSupplement } from './supplements.js';
import { groundAdditions } from './motions/ground-additions.js';
import { kickAdditions } from './motions/kick-additions.js';
import {
  generatedAttacks,
  hybridAttacks,
} from './motions/generated-attacks.js';

export const comboMotions = [
  rushMotion,
  dodgeMotion,
  flyingKickMotion,
  slideMotion,
  backflipMotion,
  cheolsangoMotion,
  drinkMotion,
  groundSpinMotion,
  elbowTimingMotion,
  boxingChain,
  ...groundChains,
  barrageChain,
  leapChain,
  ...multiStageChains,
  ...groundAdditions,
  ...kickAdditions,
  ...generatedAttacks,
  ...hybridAttacks,
  ...smearAttacks,
]
  .map(withSupplement)
  .map(withPresentations)
  .map(withLegacyEffects)
  .map(withGeneratedEffects)
  .map(withPartEffects)
  .map(withPoseEffects);
