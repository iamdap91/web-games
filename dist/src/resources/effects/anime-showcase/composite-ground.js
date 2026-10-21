import { gameDust, gameImpact } from '../../cutscenes/game-effects.js';
import { battleLayout } from './battle.js';
import { clamp, ring, smooth } from './drawing.js';
import { drawEffectLayer } from './effect-layer.js';
import { drawEffectSprite } from './effect-sprite.js';
import { drawHeadFirstFall, headFirstFallTiming } from './impact-resource.js';
import { drawGameShard } from './technique-effect-resources.js';
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
const debrisGravity = 900;
const debrisBounceRatio = 0.3;
const debrisFriction = 0.56;
const landingShards = [
    {
        delayMs: 0,
        direction: -1,
        offset: 54,
        speedX: 144,
        speedY: 166,
        size: 6,
        spin: -3.2,
        layer: 'back',
    },
    {
        delayMs: 28,
        direction: 1,
        offset: 58,
        speedX: 173,
        speedY: 188,
        size: 6.8,
        spin: 2.8,
        layer: 'back',
    },
    {
        delayMs: 62,
        direction: -1,
        offset: 72,
        speedX: 158,
        speedY: 203,
        size: 4.8,
        spin: -4.1,
        layer: 'front',
    },
    {
        delayMs: 90,
        direction: 1,
        offset: 76,
        speedX: 196,
        speedY: 176,
        size: 5.5,
        spin: 3.6,
        layer: 'front',
    },
];
export const compositeGroundDebrisTiming = {
    firstLandMs: landingShards.map((shard) => headFirstFallTiming.contactMs +
        timing.debrisDelayMs +
        shard.delayMs +
        ((2 * shard.speedY) / debrisGravity) * 1000),
    secondLandMs: landingShards.map((shard) => headFirstFallTiming.contactMs +
        timing.debrisDelayMs +
        shard.delayMs +
        ((2 * shard.speedY) / debrisGravity) * (1 + debrisBounceRatio) * 1000),
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
/** 일부 돌은 짧은 비행을 끝낸 같은 위치에서 한 번 되튀고, 먼지와 함께 멎는다. */
function drawLandingShards(context, frame, point, age, layer) {
    const motion = frame.reducedMotion ? 0.55 : 1;
    context.save();
    clearContactFace(context, point);
    context.beginPath();
    context.rect(0, 0, width, point.y);
    context.clip();
    for (let index = 0; index < landingShards.length; index++) {
        const shard = landingShards[index];
        if (shard.layer !== layer || (frame.reducedMotion && index < 2))
            continue;
        const local = age - timing.debrisDelayMs - shard.delayMs;
        if (local < 0)
            continue;
        const speedX = shard.direction * shard.speedX * motion;
        const speedY = shard.speedY * motion;
        const gravity = debrisGravity * motion;
        const flightSeconds = (2 * speedY) / gravity;
        const bounceSeconds = flightSeconds * debrisBounceRatio;
        const elapsedSeconds = local / 1000;
        const firstFlight = Math.min(elapsedSeconds, flightSeconds);
        const afterLand = Math.max(0, elapsedSeconds - flightSeconds);
        const bounce = Math.min(afterLand, bounceSeconds);
        const restingMs = (afterLand - bounceSeconds) * 1000;
        const fade = 1 - smooth((restingMs - 100) / 240);
        if (fade <= 0)
            continue;
        const slide = clamp((afterLand - bounceSeconds) / 0.1);
        const x = point.x +
            shard.direction * shard.offset +
            speedX * firstFlight +
            speedX * debrisFriction * bounce +
            speedX * debrisFriction * 0.1 * (slide - (slide * slide) / 2);
        const size = shard.size * (frame.reducedMotion ? 0.8 : 1);
        const floorY = point.y - size * 1.5;
        const y = elapsedSeconds <= flightSeconds
            ? floorY -
                speedY * firstFlight +
                (gravity * firstFlight * firstFlight) / 2
            : floorY -
                speedY * debrisBounceRatio * bounce +
                (gravity * bounce * bounce) / 2;
        context.save();
        context.globalAlpha *= fade * smooth(local / 28);
        context.translate(x, y);
        context.rotate(index * 0.73 + shard.spin * (firstFlight + bounce * debrisFriction));
        drawGameShard(context, frame, { point: { x: 0, y: 0 }, size, index });
        context.restore();
        // 착지 표시는 현재 돌을 쫓지 않고, 각 지면 접촉 때의 좌표에 고정한다.
        const firstX = point.x + shard.direction * shard.offset + speedX * flightSeconds;
        const firstDustMs = local - flightSeconds * 1000;
        const secondDustMs = firstDustMs - bounceSeconds * 1000;
        for (const landing of [
            {
                age: firstDustMs,
                x: firstX,
                durationMs: 320,
                size: 58 + shard.size * 3,
                alpha: 0.5,
            },
            {
                age: secondDustMs,
                x: firstX + speedX * debrisFriction * bounceSeconds,
                durationMs: 180,
                size: 38,
                alpha: 0.24,
            },
        ]) {
            if (landing.age < 0 || landing.age >= landing.durationMs)
                continue;
            context.save();
            context.globalAlpha *= landing.alpha * (frame.reducedMotion ? 0.65 : 1);
            gameDust(context, frame.assets.effects, {
                x: landing.x,
                y: point.y,
                progress: landing.age / landing.durationMs,
                size: landing.size * (frame.reducedMotion ? 0.72 : 1),
            });
            context.restore();
        }
    }
    context.restore();
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
                drawLandingShards(effectContext, scene, point, age, layer);
                if (layer !== 'front')
                    return;
                drawLowShock(effectContext, scene, point, age);
                // 초기의 군집 파열은 짧게 넘기고, 일부 돌의 실제 착지로 후반을 이어 간다.
                effectContext.save();
                clearContactFace(effectContext, point);
                drawEffectLayer(effectContext, 'fx-iso-debris', { ...impact, timeMs: impact.timeMs - timing.debrisDelayMs }, {
                    layer,
                    point,
                    anchor: 'ground',
                    scale: 0.46,
                    opacity: 0.55 * (1 - smooth((age - 220) / 180)),
                });
                effectContext.restore();
            }
            finally {
                effectContext.restore();
            }
        },
    });
}
