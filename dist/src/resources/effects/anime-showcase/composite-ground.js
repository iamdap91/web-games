import { gameImpact } from '../../cutscenes/game-effects.js';
import { battleLayout } from './battle.js';
import { clamp, ring, smooth } from './drawing.js';
import { drawEffectLayer } from './effect-layer.js';
import { drawEffectSprite } from './effect-sprite.js';
import { drawHeadFirstFall, headFirstFallTiming } from './impact-resource.js';
import { durationMs, height, width, } from './types.js';
const timing = {
    shockEndMs: 150,
    debrisDelayMs: 45,
    dustDelayMs: 90,
    lowDustDelayMs: 130,
    lowDustDurationMs: 500,
    fadeStartMs: 3800,
    endMs: durationMs - 40,
};
/** 보유 압축 파열을 얇게 눌러 지면 양옆으로 짧게 전달한다. */
function drawLowShock(context, frame, point, age) {
    if (age < 0 || age >= timing.shockEndMs)
        return;
    const progress = age / timing.shockEndMs;
    const release = 1 - (1 - progress) ** 3;
    context.save();
    context.globalAlpha *= (1 - progress) * (frame.reducedMotion ? 0.45 : 0.85);
    ring(context, point.x, point.y - 2, 24 + release * (frame.reducedMotion ? 92 : 170), 3 + release * 22, '#eadbbb', 4 * (1 - progress) + 0.5);
    context.restore();
    for (const direction of [-1, 1]) {
        context.save();
        context.translate(point.x, point.y - 2);
        context.scale(direction, 0.22);
        gameImpact(context, frame.assets.effects, {
            x: 0,
            y: 0,
            progress: age / timing.shockEndMs,
            size: frame.reducedMotion ? 150 : 230,
        });
        context.restore();
    }
}
/** 중앙 접촉 표정은 비우고 낮은 먼지와 파편이 양옆으로 통과하게 한다. */
function clearContactFace(context, point) {
    context.beginPath();
    context.rect(0, 0, width, height);
    context.moveTo(point.x + 70, point.y - 24);
    context.ellipse(point.x, point.y - 24, 70, 42, 0, 0, Math.PI * 2);
    context.clip('evenodd');
}
function drawLowDust(context, frame, point, age, layer) {
    const motion = frame.reducedMotion ? 0.55 : 1;
    const count = frame.reducedMotion ? 2 : 4;
    for (let i = 0; i < count; i++) {
        if ((i < 2 ? 'front' : 'back') !== layer)
            continue;
        const local = age - timing.lowDustDelayMs - Math.floor(i / 2) * 55;
        const life = timing.lowDustDurationMs + 240;
        if (local < 0 || local >= life)
            continue;
        const p = local / life;
        const release = 1 - (1 - clamp(local / 380)) ** 3;
        const direction = i % 2 ? 1 : -1;
        const distance = (18 + release * (126 + Math.floor(i / 2) * 38)) * motion;
        const grow = smooth(local / 120) * (1 - smooth((p - 0.65) / 0.35));
        context.save();
        clearContactFace(context, point);
        context.globalAlpha *= (1 - smooth((p - 0.45) / 0.55)) * 0.85;
        drawEffectSprite(context, frame, {
            key: `smoke-${Math.min(3, Math.floor(p * 4))}`,
            point: {
                x: point.x + direction * distance,
                y: point.y - 10 - release * 8,
            },
            width: (38 + release * 62) * grow,
            height: (22 + release * 20) * grow,
        });
        context.restore();
    }
}
/** 배우·낙차·구도는 공유하고, 한 번의 착지에 지면 재질 반응을 덧붙인다. */
export function drawCompositeGround(context, frame) {
    const scene = { ...frame, enhanced: true };
    drawHeadFirstFall(context, scene, {
        impactEffects: (effectContext, { point, layer }) => {
            const age = frame.timeMs - headFirstFallTiming.contactMs;
            if (age < 0 || frame.timeMs >= timing.endMs)
                return;
            const opacity = 1 -
                smooth((frame.timeMs - timing.fadeStartMs) /
                    (timing.endMs - timing.fadeStartMs));
            const impact = {
                ...scene,
                timeMs: battleLayout.contactMs + age,
            };
            effectContext.save();
            try {
                effectContext.globalAlpha *= opacity;
                // 비교판도 같은 시각·크기의 안노 분진을 써서 추가한 반응만 비교한다.
                drawEffectLayer(effectContext, 'fx-anno', { ...impact, timeMs: impact.timeMs - timing.dustDelayMs }, { layer, point, anchor: 'ground', scale: 0.72 });
                if (!frame.enhanced)
                    return;
                drawLowDust(effectContext, scene, point, age, layer);
                if (layer !== 'front')
                    return;
                drawLowShock(effectContext, scene, point, age);
                // 큰 돌의 밀집 대신 낮고 작은 파편만 남기고, 바닥 아래 궤도는 자른다.
                effectContext.save();
                clearContactFace(effectContext, point);
                drawEffectLayer(effectContext, 'fx-iso-debris', { ...impact, timeMs: impact.timeMs - timing.debrisDelayMs }, {
                    layer,
                    point,
                    anchor: 'ground',
                    scale: 0.46,
                    opacity: 0.72 * (1 - smooth((age - 690) / 360)),
                });
                effectContext.restore();
            }
            finally {
                effectContext.restore();
            }
        },
    });
}
