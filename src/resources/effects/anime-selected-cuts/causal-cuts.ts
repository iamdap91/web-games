import { ricochetCut } from './causal-ricochet.js';
import { wallReboundCut } from './causal-wall-rebound.js';
import { smokeDecoyCut } from './causal-smoke-decoy.js';
import { tripleShotCut } from './causal-triple-shot.js';
import type { Cut } from './types.js';

/** 탄도·환경 반발·오인·시간 편집이 각각 주연인 네 유형이다. */
export const causalCuts: readonly (Cut & {
  readonly techniques: readonly string[];
})[] = [ricochetCut, wallReboundCut, smokeDecoyCut, tripleShotCut];
