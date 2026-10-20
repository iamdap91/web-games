import { battleImpact, battleLayout, drawBattleActors } from './battle.js';
import { smooth, stage } from './drawing.js';
import { drawEffectLayer } from './effect-layer.js';
import { drawHarmonyPlate } from './harmony-plate.js';
const timing = {
    prepareHoldMs: 1600,
    contactEndMs: 1880,
    actorHeldMs: 1920,
    inkDelayMs: 70,
    inkFadeMs: 2450,
    harmonyMs: 2700,
};
function actorTime(timeMs) {
    if (timeMs < timing.prepareHoldMs)
        return timeMs;
    if (timeMs < battleLayout.contactMs)
        return timing.prepareHoldMs;
    if (timeMs < timing.actorHeldMs)
        return battleLayout.contactMs + (timeMs - battleLayout.contactMs) * 0.25;
    return 1830;
}
/** 같은 접촉 자세를 공유하고 흑백의 짧은 충격을 거친 먹획과 정지판으로 끝낸다. */
export function drawCompositeInk(ctx, frame) {
    const scene = {
        ...frame,
        sampleId: 'harmony',
        timeMs: actorTime(frame.timeMs),
    };
    ctx.save();
    try {
        if (frame.enhanced && frame.timeMs >= timing.harmonyMs) {
            // 기존 하모니의 1830ms 밑그림과 같은 자세에서 종결 판으로 컷을 잇는다.
            drawHarmonyPlate(ctx, scene);
            return;
        }
        if (frame.enhanced &&
            frame.timeMs >= battleLayout.contactMs &&
            frame.timeMs < timing.contactEndMs)
            ctx.filter = frame.reducedMotion
                ? 'grayscale(1)'
                : 'grayscale(1) contrast(1.55)';
        stage(ctx, scene, 0);
        drawBattleActors(ctx, scene, { action: 'uppercut' });
        drawInkFragments(ctx, frame, scene);
    }
    finally {
        ctx.restore();
    }
}
function drawInkFragments(ctx, frame, scene) {
    const opacity = 1 -
        smooth((frame.timeMs - timing.inkFadeMs) / (timing.harmonyMs - timing.inkFadeMs));
    if (opacity <= 0)
        return;
    ctx.save();
    try {
        // 모리의 원래 획·꺾임·내부 선은 유지하고 먹빛 종결에 맞춰 명도만 낮춘다.
        ctx.filter = 'grayscale(1) brightness(0.38)';
        drawEffectLayer(ctx, 'fx-mori', {
            ...scene,
            timeMs: frame.timeMs - timing.inkDelayMs,
            enhanced: true,
        }, { layer: 'front', point: battleImpact(scene), scale: 0.9, opacity });
    }
    finally {
        ctx.restore();
    }
}
