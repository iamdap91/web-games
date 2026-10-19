import { pineVillage, buildPineVillage } from './pine-village.js';
import { frostVillage, buildFrostVillage } from './frost-village.js';
import { emberVillage, buildEmberVillage } from './ember-village.js';
import { bambooVillage, buildBambooVillage } from './bamboo-village.js';
export const settlements = {
    boar: pineVillage,
    bear: frostVillage,
    armadillo: emberVillage,
    mantis: bambooVillage,
};
export const settlementBuilders = {
    boar: buildPineVillage,
    bear: buildFrostVillage,
    armadillo: buildEmberVillage,
    mantis: buildBambooVillage,
};
