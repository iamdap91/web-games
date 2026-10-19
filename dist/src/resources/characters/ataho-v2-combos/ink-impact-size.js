import { inkPivots } from './ink-types.js';
export const inkImpactScaleRange = {
    min: 0,
    max: 5,
    step: 0.1,
    initial: 1,
};
export function inkImpactSizeMultiplier(options) {
    const value = options.inkImpactScale ?? inkImpactScaleRange.initial;
    return Number.isFinite(value)
        ? Math.max(inkImpactScaleRange.min, Math.min(inkImpactScaleRange.max, value))
        : inkImpactScaleRange.initial;
}
/** 시트 중심이 아닌 실제 명중점을 고정해 방향·반전에 따라 크기만 바꾼다. */
export function resizeInkImpact(sample, multiplier) {
    if (sample.phase !== 'impact' || multiplier === 1)
        return sample;
    if (multiplier === 0)
        return undefined;
    const direction = sample.mirrorX ? -1 : 1;
    const shift = sample.width * (0.5 - inkPivots.impact.x) * (multiplier - 1);
    return {
        ...sample,
        x: sample.x + Math.cos(sample.rotation) * direction * shift,
        y: sample.y + Math.sin(sample.rotation) * direction * shift,
        width: sample.width * multiplier,
        height: sample.height * multiplier,
    };
}
