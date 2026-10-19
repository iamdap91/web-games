import { drawInkSprite } from './ink-sprites.js';
import { drawWithTextureErosion } from './texture-erosion.js';
/** 앞뒤 겹침과 절대 시각만으로 그려 정지·탐색에서도 같은 모양을 유지한다. */
export function drawInkEffects(ctx, samples, frames, options) {
    for (const sample of samples) {
        if (sample.layer !== options.layer)
            continue;
        const source = frames.get(`ink-vfx:${sample.sheet}`);
        if (!source || sample.durationMs <= 0)
            continue;
        const progress = sample.ageMs / sample.durationMs;
        if (progress < 0 || progress >= 1)
            continue;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        // 이로전 비교에서는 남은 조각의 농도를 지키고 구멍으로만 거둔다.
        const fade = options.showErosion ? 1 : Math.min(1, (1 - progress) / 0.2);
        ctx.globalAlpha *= sample.opacity * fade;
        ctx.translate(sample.x, sample.y);
        ctx.rotate(sample.rotation);
        ctx.scale(sample.mirrorX ? -1 : 1, 1);
        drawWithTextureErosion(ctx, {
            bounds: {
                x: -sample.width,
                y: -sample.height,
                width: sample.width * 2,
                height: sample.height * 2,
            },
            progress: options.showErosion
                ? Math.max(0, (progress - 0.55) / 0.45)
                : 0,
            seed: sample.sheet === 'arc' ? 13 : sample.sheet === 'stroke' ? 37 : 59,
            pixelSize: 3,
        }, () => drawInkSprite(ctx, source, {
            sheet: sample.sheet,
            frame: Math.floor(progress * 16),
            width: sample.width,
            height: sample.height,
        }));
        ctx.restore();
    }
}
