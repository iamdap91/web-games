import { drawInkSprite } from './ink-sprites.js';
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
        // 그림의 찢김이 끝난 뒤 남은 조각만 거두어 마지막 셀의 갑작스러운 소멸을 막는다.
        const fade = Math.min(1, (1 - progress) / 0.2);
        ctx.globalAlpha *= sample.opacity * fade;
        ctx.translate(sample.x, sample.y);
        ctx.rotate(sample.rotation);
        ctx.scale(sample.mirrorX ? -1 : 1, 1);
        drawInkSprite(ctx, source, {
            sheet: sample.sheet,
            frame: Math.floor(progress * 16),
            width: sample.width,
            height: sample.height,
        });
        ctx.restore();
    }
}
