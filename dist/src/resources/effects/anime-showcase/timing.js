import { SceneTiming } from '../../cutscenes/scene-timing.js';
import { actionTimingProfiles } from './action-timing.js';
import { effectTimingProfiles } from './effect-timing.js';
import { cameraEditingTimingProfiles } from './camera-editing-timing.js';
import { combinationTimingProfiles } from '../anime-selected-cuts/timing.js';
import { durationMs } from './types.js';
import { getShockKomaVariant } from './shock-koma-variant-data.js';
const profiles = {
    ...actionTimingProfiles,
    ...effectTimingProfiles,
    ...cameraEditingTimingProfiles,
    ...combinationTimingProfiles,
};
/** 비교판·배우·효과와 주요 순간에 한 시간표를 적용한다. */
export function retimeSample(sample) {
    const shock = sample.id === 'shock-koma'
        ? getShockKomaVariant(sample.shockVariant)
        : undefined;
    const profile = shock
        ? [
            { endMs: 900, rate: 3 },
            { endMs: 1680, rate: 2 },
            { endMs: shock.finishMs, rate: 1 },
            { endMs: 2850, rate: 1.8 },
            { endMs: 3500, rate: 2.5 },
            { endMs: 4200, rate: 4 },
        ]
        : sample.category === 'emotion'
            ? [{ endMs: durationMs, rate: 1 }]
            : profiles[sample.id];
    if (!profile)
        throw new Error(`기법의 재생 시간표가 없습니다: ${sample.id}`);
    const timing = new SceneTiming(durationMs, profile);
    const previewMs = timing.toPresentation(sample.previewMs ?? 1900);
    const beats = sample.beats ?? [
        { timeMs: sample.previewMs ?? 1900, label: '핵심 순간' },
    ];
    return {
        ...sample,
        timing,
        durationMs: timing.durationMs,
        previewMs,
        beats: beats.map((beat) => ({
            ...beat,
            timeMs: timing.toPresentation(beat.timeMs),
        })),
    };
}
