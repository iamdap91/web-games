import { impactSamples, drawImpact } from './impact.js';
import { motionSamples, drawMotion } from './motion.js';
import { effectSamples, drawEffects } from './effects.js';
import { cameraSamples, drawCamera } from './camera.js';
import { emotionSamples, drawEmotion } from './emotion.js';
import { editingSamples, drawEditing } from './editing.js';
import { compositeSamples, drawComposite } from './composites.js';
import { disposeCameraOptics } from './camera-optics.js';
import { disposeHarmonyPlate } from './harmony-plate.js';
import { disposeEmotionPortrait } from './emotion-face.js';
import { disposeShockKoma } from './shock-koma.js';
import { disposeShockKomaV2 } from './shock-koma-v2.js';
import { height, width, } from './types.js';
export const samples = [
    ...impactSamples,
    ...motionSamples,
    ...effectSamples,
    ...cameraSamples,
    ...emotionSamples,
    ...editingSamples,
    ...compositeSamples,
];
const renderers = {
    impact: drawImpact,
    motion: drawMotion,
    effects: drawEffects,
    camera: drawCamera,
    emotion: drawEmotion,
    editing: drawEditing,
    composite: drawComposite,
};
export function disposeSampleSurfaces(ctx) {
    disposeCameraOptics(ctx);
    disposeHarmonyPlate(ctx);
    disposeEmotionPortrait(ctx);
    disposeShockKoma(ctx);
    disposeShockKomaV2(ctx);
}
/** 같은 절대 시각을 화면·시간 탐색·GIF에서 공유한다. */
export function drawSample(ctx, sample, frame) {
    ctx.save();
    try {
        ctx.filter = 'none';
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#141b29';
        ctx.fillRect(0, 0, width, height);
        ctx.beginPath();
        ctx.rect(0, 0, width, height);
        ctx.clip();
        renderers[sample.category](ctx, sample.id, {
            ...frame,
            sampleId: sample.id,
        });
    }
    finally {
        ctx.restore();
    }
}
