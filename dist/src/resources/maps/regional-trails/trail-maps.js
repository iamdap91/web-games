import { regionalJourneys } from './regional-journeys.js';
import { buildBambooJourney } from './bamboo-journey-scenery.js';
import { buildPineJourney } from './pine-journey-scenery.js';
import { buildFrostJourney } from './frost-journey-scenery.js';
import { buildEmberJourney } from './ember-journey-scenery.js';
import { trailDefinitions, buildTrailEnvironment, } from './route-layouts.js';
import { alternateTrailDefinitions, buildAlternateTrailEnvironment, } from './route-alternate.js';
export function trailDefinition(region, variant) {
    if (variant === 'seamless')
        return regionalJourneys[region].definition;
    return (variant === 'alternate' ? alternateTrailDefinitions : trailDefinitions)[region];
}
export function buildTrailMap(kit, ground) {
    const { region, variant } = ground;
    if (variant === 'seamless') {
        const builders = {
            boar: buildPineJourney,
            bear: buildFrostJourney,
            armadillo: buildEmberJourney,
            mantis: buildBambooJourney,
        };
        builders[region](kit, ground);
    }
    else if (variant === 'alternate')
        buildAlternateTrailEnvironment(kit, region);
    else
        buildTrailEnvironment(kit, region);
}
