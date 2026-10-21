import { battleLayout } from './battle.js';
import { clamp, smooth } from './drawing.js';
import { drawEffectSprite } from './effect-sprite.js';
import { drawKiSprite, kiSpriteFrame, } from '../../characters/ataho-v2-combos/ki-sprites.js';
const origin = { x: 285, y: 300 };
const headPixelScale = 3.125;
function progressAt(age, frame) {
    const ordinary = age < 930
        ? smooth(age / 930) * 0.38
        : 0.38 + smooth((age - 930) / 970) * 0.62;
    return frame.enhanced && !frame.reducedMotion
        ? age < 980
            ? smooth(age / 980) * 0.18
            : 0.18 + smooth((age - 980) / 620) * 0.82
        : ordinary;
}
function headAt(age, frame) {
    const progress = progressAt(age, frame);
    return {
        x: origin.x + progress * 430,
        y: origin.y - Math.sin(progress * Math.PI) * 48,
    };
}
/** 무손실 분리한 실제 앵커와 같은 원본 픽셀 배율로 앞덩어리의 위치·부피를 잇는다. */
function materialSprite(ctx, frame, options) {
    const source = frame.assets.effects.get(`technique:${options.key}`);
    if (!source)
        return;
    drawEffectSprite(ctx, frame, {
        key: options.key,
        point: options.point,
        width: source.image.naturalWidth * options.pixelScale,
        height: source.image.naturalHeight * options.pixelScale,
        rotation: options.rotation,
        opacity: options.opacity,
    });
}
/** 목 셀의 실제 가는 연결부만 늘여 뿌리와 머리의 부피가 함께 늘어나지 않게 한다. */
function paintedNeck(ctx, frame, head, age) {
    const source = frame.assets.effects.get('technique:kozuma-neck');
    if (!source)
        return;
    const to = { x: head.x - 16, y: head.y };
    const dx = to.x - origin.x;
    const dy = to.y - origin.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 4 || dx < 0)
        return;
    const neckRadius = Math.max(0.6, 24 * (1 - smooth((age - 760) / 440)));
    // 74×64 목 자재에서 왼뿌리와 큰 앞덩어리를 제외한 실제 연결부다.
    const nativeAngle = Math.atan2(-5, 18);
    const bend = -12 * Math.sin(progressAt(age, frame) * Math.PI);
    const pointAt = (u) => ({
        x: origin.x + dx * u - (dy / distance) * Math.sin(u * Math.PI) * bend,
        y: origin.y + dy * u + (dx / distance) * Math.sin(u * Math.PI) * bend,
    });
    // 잔여가 태어나는 원래 휜 목 위로 그림 조각을 이어 분리 전후의 위치를 맞춘다.
    for (let index = 0; index < 6; index++) {
        const u = index / 6;
        const from = pointAt(u);
        const next = pointAt((index + 1) / 6);
        const x = 15 + 18 * u;
        const y = 42 - 5 * u;
        ctx.save();
        ctx.translate(from.x, from.y);
        ctx.rotate(Math.atan2(next.y - from.y, next.x - from.x));
        ctx.scale(Math.hypot(next.x - from.x, next.y - from.y) / (Math.hypot(18, 5) / 6), Math.max(0.25, neckRadius * 0.3));
        ctx.rotate(-nativeAngle);
        ctx.translate(-x, -y);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(source.image, x - 0.35, 29, 18 / 6 + 0.7, 20, x - 0.35, 29, 18 / 6 + 0.7, 20);
        ctx.restore();
    }
}
function residue(ctx, frame, options) {
    if (options.progress >= 1)
        return;
    materialSprite(ctx, frame, {
        key: 'kozuma-residue',
        point: options.point,
        pixelScale: ((options.radius * 3.4) / 64) * (1 - clamp(options.progress) * 0.45),
        rotation: options.angle,
        opacity: options.opacity * (1 - smooth((options.progress - 0.45) / 0.55)),
    });
}
/** 새 자재는 점성의 윤곽만 바꾸며 980ms 가속·1200ms 분리와 목 위의 발생점을 유지한다. */
export function drawKozumaSprites(ctx, frame) {
    const age = frame.timeMs - battleLayout.contactMs;
    if (age < 0 || age > 2400)
        return;
    const head = headAt(age, frame);
    ctx.save();
    ctx.globalAlpha *= 1 - clamp((age - 2000) / 400);
    const birth = smooth(age / 180);
    ctx.translate(origin.x, origin.y);
    ctx.scale(birth, birth);
    ctx.translate(-origin.x, -origin.y);
    if (!frame.enhanced) {
        const release = smooth((age - 920) / 120);
        for (const flying of [false, true])
            drawKiSprite(ctx, frame.assets.effects, {
                sheet: 'orbit',
                frame: kiSpriteFrame(flying ? Math.max(0, age - 980) : age, {
                    start: flying ? 4 : 0,
                    count: 4,
                    frameMs: frame.reducedMotion ? 240 : 110,
                    loop: true,
                }),
                point: head,
                width: 165,
                height: 152,
                anchorX: flying ? 0.65 : 0.5,
                alpha: flying ? release : 1 - release,
            });
        ctx.restore();
        return;
    }
    if (age <= 1200) {
        paintedNeck(ctx, frame, head, age);
        if (head.x - origin.x > 20)
            materialSprite(ctx, frame, {
                key: 'kozuma-head-0',
                point: origin,
                pixelScale: (26 - smooth(age / 1200) * 12) * 0.065625,
            });
    }
    else {
        const since = (age - 1200) / 1000;
        residue(ctx, frame, {
            point: { x: origin.x + since * 19, y: origin.y + since * 7 },
            radius: 14 - clamp(since) * 8,
            angle: 0,
            progress: since / 0.9,
            opacity: 1,
        });
        const separation = headAt(1200, frame);
        const dx = separation.x - 16 - origin.x;
        const dy = separation.y - origin.y;
        const distance = Math.max(1, Math.hypot(dx, dy));
        const bend = -12 * Math.sin(progressAt(1200, frame) * Math.PI);
        for (let index = 0; index < 5; index++) {
            const residueAge = age - 1200 - index * 20;
            if (residueAge < 0)
                continue;
            const seconds = residueAge / 1000;
            const u = (index + 1) / 6;
            const curl = Math.sin(u * Math.PI) * bend;
            residue(ctx, frame, {
                point: {
                    x: origin.x +
                        dx * u -
                        (dy / distance) * curl +
                        seconds * (45 + index * 21),
                    y: origin.y +
                        dy * u +
                        (dx / distance) * curl +
                        seconds * (index - 2) * 9 +
                        seconds * seconds * 57,
                },
                radius: (4 + index * 1.5) * (frame.reducedMotion ? 0.7 : 1),
                angle: Math.sin(index * 1.8) * 0.4,
                progress: residueAge / (900 + index * 40),
                opacity: smooth(residueAge / (frame.reducedMotion ? 140 : 70)),
            });
        }
    }
    if (age > 1200)
        materialSprite(ctx, frame, {
            key: 'kozuma-head-1',
            point: head,
            pixelScale: headPixelScale,
        });
    else {
        const stretch = smooth((age - 760) / 160);
        materialSprite(ctx, frame, {
            key: 'kozuma-head-0',
            point: head,
            pixelScale: headPixelScale,
            opacity: 1 - stretch,
        });
        if (stretch > 0) {
            ctx.save();
            // 목 셀 뒤쪽의 별도 뿌리를 숨겨 같은 장력이 두 번 붙어 보이지 않게 한다.
            ctx.beginPath();
            ctx.rect(head.x - 55, head.y - 120, 190, 240);
            ctx.clip();
            materialSprite(ctx, frame, {
                key: 'kozuma-neck',
                point: head,
                pixelScale: headPixelScale,
                opacity: stretch,
            });
            ctx.restore();
        }
    }
    ctx.restore();
}
