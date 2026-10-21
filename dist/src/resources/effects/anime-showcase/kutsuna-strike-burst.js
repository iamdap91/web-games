import record from '../../../../resources/kutsuna-lightning-sprite.json' with { type: 'json' };
import { clamp, smooth } from './drawing.js';
import { drawEffectSprite } from './effect-sprite.js';
const strikeChannels = [
    { delayMs: 0, angle: -0.04, reach: 290, layer: 'front' },
    { delayMs: 24, angle: -0.55, reach: 225, layer: 'back' },
    { delayMs: 48, angle: 0.48, reach: 210, layer: 'back' },
    { delayMs: 112, angle: 0.08, reach: 260, layer: 'front' },
];
/** 명중도 번개 본체만 사용해 고리·접힘·끊긴 전류의 순서를 빠르게 방출한다. */
export function drawKutsunaStrikeBurst(ctx, frame, options) {
    const { elapsedMs, point, layer } = options;
    if (elapsedMs < 0 || elapsedMs >= 460)
        return;
    const motion = frame.reducedMotion ? 0.6 : 1;
    ctx.save();
    ctx.globalAlpha *= frame.reducedMotion ? 0.55 : 1;
    for (const [index, channel] of strikeChannels.entries()) {
        if (channel.layer !== layer || (frame.reducedMotion && index > 0))
            continue;
        const local = elapsedMs - channel.delayMs;
        const lifeMs = frame.reducedMotion ? 280 : 240 + index * 24;
        if (local < 0 || local >= lifeMs)
            continue;
        const head = 0.2 + (1 - (1 - clamp(local / 55)) ** 3) * 0.8;
        const tail = smooth((local - 92) / (lifeMs - 92));
        if (tail >= head)
            continue;
        const exposure = frame.reducedMotion
            ? 0
            : Math.min(4, Math.floor(local / (1000 / 24)));
        const order = [3, 0, 1, 3, 2];
        const source = record.frames[order[exposure]];
        const reach = channel.reach * motion;
        const pixelScale = reach / (source.tipX - source.anchorX);
        const spriteHeight = source.height * pixelScale;
        ctx.save();
        ctx.translate(point.x, point.y);
        ctx.rotate(channel.angle);
        // 선단과 꼬리를 따로 움직여 늘어난 전류가 그 자리에서 흐려지지 않게 한다.
        ctx.beginPath();
        ctx.rect(tail * reach, -source.anchorY * pixelScale, (head - tail) * reach + pixelScale, spriteHeight);
        ctx.clip();
        drawEffectSprite(ctx, frame, {
            key: source.key,
            point: { x: 0, y: 0 },
            width: source.width * pixelScale,
            height: spriteHeight,
            opacity: 1 - smooth((local - lifeMs + 70) / 70),
        });
        ctx.restore();
    }
    ctx.restore();
}
