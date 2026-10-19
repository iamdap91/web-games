import savedPresets from '../../../../resources/ataho-v2-finisher-presets.json' with { type: 'json' };
import { parseFinisherPresetDocument } from '../../characters/ataho-v2-combos/finisher-presets.js';
import { cinematicFinishers } from '../../characters/ataho-v2-combos/motions/cinematic-finishers.js';
import { ComboPlayer, } from '../../characters/ataho-v2-combos/player.js';
import { collectSandbagContacts, contactHitStopMs, } from '../../characters/ataho-v2-combos/sandbag.js';
const selectedPreset = parseFinisherPresetDocument(savedPresets).presets.find((preset) => preset.id === '39a36b0f-b374-4058-8d10-3bcaaee16c55');
if (!selectedPreset || selectedPreset.name !== '순옥살 v1')
    throw new Error('암중 공방에 사용할 저장 설정 순옥살 v1이 없습니다.');
if (selectedPreset.presentationId !== 'base' ||
    selectedPreset.supplement !== 'original')
    throw new Error('암중 공방은 기본 박자와 원본 그림의 순옥살 v1만 지원합니다.');
export const rushPreset = selectedPreset;
const sourceMotion = cinematicFinishers.find((motion) => motion.id === rushPreset.motionId);
if (!sourceMotion?.finisher)
    throw new Error('순옥살 v1의 원본 필살기 동작이 없습니다.');
export const rushMotion = sourceMotion;
export const rushOptions = {
    ...rushPreset.drawing,
    scale: rushPreset.preview.scale,
    showMovement: rushPreset.preview.showMovement,
    showContacts: rushPreset.preview.showContacts,
    showSandbag: rushPreset.preview.showSandbag,
    enabledEffects: new Set(rushPreset.drawing.enabledEffects),
    finisherOpacity: { ...rushPreset.drawing.finisherOpacity },
};
export const rushContacts = collectSandbagContacts(rushMotion, rushOptions);
const cutoverIndex = rushMotion.steps.findIndex((step) => step.motion === 'presentation-aerial-smash-south-east');
if (cutoverIndex < 0)
    throw new Error('순옥살 v1에서 교체할 공중 끝타의 시작 자세가 없습니다.');
export const rushSourceCutoverMs = rushMotion.steps
    .slice(0, cutoverIndex)
    .reduce((sum, step) => sum + step.durationMs, 0);
const targetEnabled = rushOptions.showMovement && !!rushOptions.showSandbag;
const hitStops = targetEnabled && rushPreset.timing.hitStop
    ? rushContacts.flatMap((contact, index) => {
        const durationMs = contactHitStopMs(contact, {
            finalContact: index === rushContacts.length - 1,
            finisherClimax: true,
        });
        return durationMs ? [{ timeMs: contact.timeMs, durationMs }] : [];
    })
    : [];
const finalSlowStartMs = targetEnabled && rushPreset.timing.finalSlow
    ? rushContacts.filter((contact) => contact.connected).at(-1)?.timeMs
    : undefined;
/** 교체 전20타는 명중 정지가 없으므로 원본 시각에 저장 배속만 반영한다. */
export function presetRushTime(sourceMs) {
    return Math.max(0, sourceMs) / rushPreset.preview.speed;
}
// finalSlow와 마지막 명중 정지는 교체할 공중 끝타 이후여서 이 구간에 적용되지 않는다.
export const rushPreludeDurationMs = presetRushTime(rushSourceCutoverMs);
/** 같은 절대시각을 매번 독립 재생해 정지·탐색 순서에 영향을 받지 않는다. */
export function samplePresetRush(presentationMs) {
    const player = new ComboPlayer(rushMotion);
    player.setSpeed(rushPreset.preview.speed);
    player.setRepeating(false);
    player.setHitStops(hitStops);
    player.setFinalSlowMotion(finalSlowStartMs);
    player.play();
    player.update(Math.max(0, presentationMs));
    return {
        snapshot: player.snapshot,
        hitStopElapsedMs: targetEnabled &&
            rushPreset.timing.hitStop &&
            rushPreset.timing.hitStopShake
            ? player.hitStopElapsedMs
            : undefined,
    };
}
