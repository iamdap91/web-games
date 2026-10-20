import { atahoPosition, battleImpact, battleLayout, drawAtaho, drawBear, } from './battle.js';
import { ellipse, smooth, stage } from './drawing.js';
import { drawEffectLayer } from './effect-layer.js';
import { drawEffectSprite } from './effect-sprite.js';
const timing = {
    emissionMs: 1900,
    currentMs: 2200,
    releaseMs: 2840,
    endMs: 3500,
};
function actorTime(timeMs) {
    if (timeMs < battleLayout.contactMs)
        return timeMs;
    if (timeMs < timing.releaseMs)
        return 1830;
    return 1830 + smooth((timeMs - timing.releaseMs) / 650) * 1100;
}
function beamFrame(frame) {
    return {
        ...frame,
        sampleId: 'fx-kanada-beam',
        enhanced: true,
        timeMs: battleLayout.contactMs + (frame.timeMs - timing.emissionMs) * 1.4,
    };
}
function drawBeamLayer(ctx, frame, point) {
    if (frame.timeMs < timing.emissionMs)
        return;
    drawEffectLayer(ctx, 'fx-kanada-beam', beamFrame(frame), {
        layer: 'front',
        point,
        scale: 0.92,
        opacity: 1 - smooth((frame.timeMs - 3310) / 190),
    });
}
function drawCurrent(ctx, frame, point) {
    if (frame.timeMs < timing.currentMs || frame.timeMs >= timing.endMs)
        return;
    const age = frame.timeMs - timing.currentMs;
    const fade = 1 - smooth((age - 900) / 350);
    drawEffectLayer(ctx, 'fx-kutsuna', { ...frame, enhanced: true, timeMs: battleLayout.contactMs + age }, { layer: 'front', point, scale: 0.94, opacity: fade * 0.78 });
}
/** 굵은 축이 먼저 뻗고 가는 전류가 뒤따라, 두 효과의 정점을 나눠 읽힌다. */
export function drawCompositeBeam(ctx, frame) {
    const current = {
        ...frame,
        sampleId: 'fx-kanada-beam',
        timeMs: actorTime(frame.timeMs),
    };
    const impact = battleImpact(current);
    const source = { x: impact.x - 160, y: impact.y };
    const position = atahoPosition(current, { action: 'straight' });
    stage(ctx, frame, 0);
    ellipse(ctx, position.x - 160, 448, 58, 10, '#14293b32');
    ellipse(ctx, 657, 448, 115, 15, '#14293b32');
    drawBear(ctx, { ...frame, timeMs: frame.timeMs - 370 }, {
        recoil: {
            displacementX: smooth((frame.timeMs - 2170) / 600) * (frame.reducedMotion ? 8 : 28),
            lift: 0,
        },
    });
    ctx.save();
    ctx.translate(-160, 0);
    drawAtaho(ctx, current, { action: 'straight' });
    ctx.restore();
    drawBeamLayer(ctx, frame, source);
    if (!frame.enhanced)
        return;
    drawCurrent(ctx, frame, source);
    const age = frame.timeMs - 1810;
    if (age < 0 || age >= 250)
        return;
    const pulse = smooth(age / 55) * (1 - smooth((age - 85) / 165));
    drawEffectSprite(ctx, frame, {
        key: 'light-clump',
        point: source,
        width: (frame.reducedMotion ? 23 : 34) * pulse,
        opacity: pulse * 0.9,
    });
}
