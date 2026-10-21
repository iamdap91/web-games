import { battleLayout } from './battle.js';
import { clamp, ellipse, noise, palette, smooth } from './drawing.js';
import { drawEffectSprite } from './effect-sprite.js';
/** 같은 탄도 위에서 원화의 외곽과 굵은 내부 획만 코마마다 교체한다. */
export function drawMoriSprites(ctx, frame) {
    const age = frame.timeMs - battleLayout.contactMs;
    if (age < 0 || age > 1800)
        return;
    const cell = Math.floor(age / (frame.reducedMotion ? 170 : 1000 / 12));
    const motion = frame.reducedMotion ? 0.6 : 1;
    ctx.save();
    ctx.globalAlpha *= 1 - smooth((age - 1200) / 600);
    for (let index = 0; index < 16; index++) {
        const delay = frame.enhanced ? (index % 3) * 60 : 0;
        if (age < delay)
            continue;
        const seconds = (age - delay) / 1000;
        const angle = -0.94 + noise(index) * 1.7;
        const speed = 95 + noise(index + 8) * 190;
        const point = {
            x: 410 + Math.cos(angle) * seconds * speed * motion,
            y: 310 +
                Math.sin(angle) * seconds * speed * motion +
                seconds * seconds * 54,
        };
        if (!frame.enhanced) {
            ellipse(ctx, point.x, point.y, 5, 5, '#c1b388');
            continue;
        }
        const length = (index % 4 === 0 ? 64 : 24 + (index % 5) * 5) *
            (1 - clamp(seconds / 2) * 0.5);
        drawEffectSprite(ctx, frame, {
            key: `mori-shard-${(cell + index) % 4}`,
            point,
            width: length * 2.25,
            // 원화의 오른쪽 위 방향을 진행축에 맞추고 기존의 느린 회전만 남긴다.
            rotation: angle + Math.sin(index) * seconds * 0.4 + 0.38,
        });
    }
    ctx.restore();
}
/** 교차광의 짧은 수축과 뒤늦게 남는 빛 거품을 각각의 원화로 구분한다. */
export function drawArakiSprites(ctx, frame) {
    const age = frame.timeMs - battleLayout.contactMs;
    if (age < 0 || age > 1350)
        return;
    const progress = clamp(age / 1350);
    if (!frame.enhanced) {
        ellipse(ctx, 503, 277, 12 * (1 - progress), 12 * (1 - progress), palette.paper);
        return;
    }
    ctx.save();
    const opacity = ctx.globalAlpha;
    ctx.globalAlpha *= frame.reducedMotion ? 0.55 : 1;
    const reach = (1 - clamp(age / 430)) * (frame.reducedMotion ? 102 : 224);
    if (reach > 0) {
        const key = `araki-cross-${age < 160 ? 0 : 1}`;
        const source = frame.assets.effects.get(`technique:${key}`);
        const width = reach * 2.4;
        drawEffectSprite(ctx, frame, {
            key,
            point: { x: 503, y: 277 },
            width,
            // 실제 빈 영역으로 자른 비정사각 원화의 픽셀 비율을 유지한다.
            height: source
                ? (width * source.image.naturalHeight) / source.image.naturalWidth
                : width,
        });
    }
    for (let index = 0; index < 11; index++) {
        if (age < index * 31)
            continue;
        const local = clamp((age - index * 31) / 950);
        ctx.globalAlpha =
            opacity * (1 - local) * (frame.reducedMotion ? 0.42 : 0.8);
        const radius = 4 + local * (8 + (index % 4) * 2);
        const key = `araki-bubble-${local < 0.55 ? 0 : 1}`;
        const source = frame.assets.effects.get(`technique:${key}`);
        const width = radius * 2.6;
        drawEffectSprite(ctx, frame, {
            key,
            point: {
                x: 503 + (noise(index) - 0.4) * 215 * local,
                y: 277 - local * (45 + noise(index + 5) * 105),
            },
            width,
            height: source
                ? (width * source.image.naturalHeight) / source.image.naturalWidth
                : width,
        });
    }
    ctx.restore();
}
// 합체·목 분리·재결합을 건너뛰지 않고 기존2200ms 안에서 한 번만 진행한다.
const tatsuzoCellEnds = [160, 640, 960, 1120, 1430, 1690, 1950, 2200];
/** 검정 단색의 전체 형상으로 부분의 연결을 읽히며 별도 광이나 윤곽선을 덮지 않는다. */
export function drawTatsuzoSprites(ctx, frame) {
    const age = frame.timeMs - battleLayout.contactMs;
    if (age < 0 || age > 2200)
        return;
    const birth = smooth(age / 160);
    const end = 1 - smooth((age - 1560) / 640);
    if (!frame.enhanced) {
        ellipse(ctx, 551, 284, 90 * birth * end, 90 * birth * end, '#070a12');
        return;
    }
    const cell = Math.min(7, tatsuzoCellEnds.filter((endMs) => age >= endMs).length);
    const size = 300 * birth * end;
    drawEffectSprite(ctx, frame, {
        key: `tatsuzo-morph-${cell}`,
        point: { x: 551, y: 284 },
        // 전체 원화는 목의 이동만 줄일 수 없으므로 감소 모드에서 가로폭만 압축한다.
        width: size * (frame.reducedMotion ? 0.75 : 1),
        height: size,
        rotation: (age / 2200) * 2.8,
    });
}
