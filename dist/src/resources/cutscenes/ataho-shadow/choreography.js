import { comboDuration, sampleComboMotion, } from '../../characters/ataho-v2-combos/player.js';
import { sampleFinisher } from '../../characters/ataho-v2-combos/finisher-presentation.js';
import { sampleSandbag } from '../../characters/ataho-v2-combos/sandbag.js';
import { rushMotion, rushOptions, rushContacts, presetRushTime, } from './preset-rush.js';
export { rushMotion, rushOptions, rushContacts } from './preset-rush.js';
export const rushDurationMs = comboDuration(rushMotion);
function beatStart(emphasis) {
    const beat = rushMotion.finisher?.beats.find((item) => item.emphasis === emphasis);
    if (!beat)
        throw new Error(`순옥살 구간이 없습니다: ${emphasis}`);
    return rushMotion.steps
        .slice(0, beat.fromStep)
        .reduce((sum, step) => sum + step.durationMs, 0);
}
export const rushClimaxMs = presetRushTime(beatStart('climax'));
export const rushStillMs = beatStart('finish');
export function sampleRush(timeMs) {
    const pose = sampleComboMotion(rushMotion, timeMs);
    const snapshot = {
        ...pose,
        paused: true,
        waiting: false,
        opacity: 1,
    };
    const finisher = sampleFinisher(snapshot, rushOptions);
    if (!finisher)
        throw new Error('순옥살 연출 구간을 찾을 수 없습니다.');
    return {
        snapshot,
        finisher,
        target: sampleSandbag(snapshot, rushOptions),
        hitCount: rushContacts.filter((contact) => contact.connected && contact.timeMs <= snapshot.elapsedMs).length,
        totalHits: rushContacts.length,
    };
}
