import { projectileReturnCut } from './projectile-return.js';
import { beamClashCut } from './beam-clash.js';
import { targetChainCut } from './target-chain.js';
import { propStrikeCut } from './prop-strike.js';
import type { Cut } from './types.js';

/** 왕복·대치·표적 사이 이동·소품 접촉을 서로 다른 사건으로 둔다. */
export const projectileCuts: readonly (Cut & {
  readonly techniques: readonly string[];
})[] = [projectileReturnCut, beamClashCut, targetChainCut, propStrikeCut];
