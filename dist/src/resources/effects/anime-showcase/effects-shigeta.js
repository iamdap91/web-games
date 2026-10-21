import { battleLayout } from './battle.js';
import { line, noise, palette, smooth } from './drawing.js';
import { drawEffectSprite } from './effect-sprite.js';
const origin = { x: 548, y: 300 };
/** 셀 중앙 대신 실제 가지 뿌리·금속편의 밝은 선두를 같은 탄도점에 맞춘다. */
function sparkSprite(ctx, frame, options) {
    const source = frame.assets.effects.get(`technique:${options.key}`);
    if (!source)
        return;
    const angle = options.rotation ?? 0;
    const x = ((source.anchorX - options.anchor.x) / source.image.naturalWidth) *
        options.width;
    const y = ((source.anchorY - options.anchor.y) / source.image.naturalHeight) *
        options.width;
    drawEffectSprite(ctx, frame, {
        key: options.key,
        point: {
            x: options.point.x + x * Math.cos(angle) - y * Math.sin(angle),
            y: options.point.y + x * Math.sin(angle) + y * Math.cos(angle),
        },
        width: options.width,
        rotation: angle,
        opacity: options.opacity,
    });
}
/** 가지 파열과 발광 금속편만 교체하고 기존 분리 위치·탄도·냉각 수명을 유지한다. */
export function drawShigetaSprites(ctx, frame) {
    const age = frame.timeMs - battleLayout.contactMs;
    if (age < 0 || age > 1500)
        return;
    const motion = frame.reducedMotion ? 0.55 : 1;
    if (!frame.enhanced) {
        if (age > 300)
            return;
        ctx.save();
        ctx.globalAlpha *= 1 - age / 300;
        for (let index = 0; index < 6; index++) {
            const angle = -0.9 + (index / 5) * 1.8;
            line(ctx, [
                origin,
                {
                    x: origin.x + Math.cos(angle) * 30,
                    y: origin.y + Math.sin(angle) * 30,
                },
            ], palette.gold, 2);
        }
        ctx.restore();
        return;
    }
    ctx.save();
    ctx.globalAlpha *= frame.reducedMotion ? 0.65 : 1;
    if (age < 230) {
        const opened = age >= 90;
        sparkSprite(ctx, frame, {
            key: opened ? 'shigeta-burst-1' : 'shigeta-burst-0',
            point: origin,
            anchor: opened ? { x: 11, y: 37 } : { x: 20, y: 40 },
            width: (82 + age * 0.42) * motion,
            opacity: 1 - age / 230,
        });
    }
    for (let index = 0; index < 42; index++) {
        if (frame.reducedMotion && index % 3)
            continue;
        const delayMs = (index % 7) * 31;
        const seconds = (age - delayMs) / 1000;
        const life = 0.38 + noise(index + 29) * 0.52;
        if (seconds < 0 || seconds > life)
            continue;
        const angle = index % 6 ? -1.08 + noise(index) * 2.05 : -2.8 + noise(index) * 0.8;
        const speed = (155 + noise(index + 7) * 310) * motion;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        const gravity = 350 * motion;
        const position = {
            x: origin.x + vx * seconds,
            y: origin.y + vy * seconds + (gravity * seconds * seconds) / 2,
        };
        const cooled = seconds >= life * 0.63;
        ctx.save();
        ctx.globalAlpha *= 1 - smooth((seconds / life - 0.62) / 0.38);
        sparkSprite(ctx, frame, {
            key: cooled ? 'shigeta-cool' : 'shigeta-hot',
            point: position,
            anchor: cooled ? { x: 42, y: 31 } : { x: 41, y: 31 },
            width: (18 + noise(index + 51) * 9) * motion,
            rotation: Math.atan2(vy + gravity * seconds, vx),
        });
        const splitAt = 0.1 + (index % 4) * 0.035;
        if (seconds > splitAt && index % 3 === 0) {
            const childAge = seconds - splitAt;
            const from = {
                x: origin.x + vx * splitAt,
                y: origin.y + vy * splitAt + (gravity * splitAt * splitAt) / 2,
            };
            const childVx = vx * 0.68 - vy * 0.22;
            const childVy = vy * 0.7 + vx * 0.22;
            const child = {
                x: from.x + childVx * childAge,
                y: from.y + childVy * childAge + (gravity * childAge * childAge) / 2,
            };
            sparkSprite(ctx, frame, {
                key: cooled ? 'shigeta-cool' : 'shigeta-hot',
                point: child,
                anchor: cooled ? { x: 42, y: 31 } : { x: 41, y: 31 },
                width: (12 + noise(index + 77) * 5) * motion,
                rotation: Math.atan2(childVy + gravity * childAge, childVx),
            });
        }
        ctx.restore();
    }
    ctx.restore();
}
