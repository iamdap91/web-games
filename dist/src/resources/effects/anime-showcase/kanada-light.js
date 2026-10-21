import { battleLayout } from './battle.js';
import { clamp, ellipse, noise, palette, smooth } from './drawing.js';
import { drawEffectSprite } from './effect-sprite.js';
const origin = { x: 549, y: 266 };
const strikeAngle = -0.84;
const forwardMotes = [
    { angleOffset: -0.31, size: 58, reach: 108 },
    { angleOffset: -0.15, size: 74, reach: 147 },
    { angleOffset: 0, size: 88, reach: 176 },
    { angleOffset: 0.16, size: 64, reach: 137 },
    { angleOffset: 0.35, size: 46, reach: 102 },
];
/** 짧은 접촉 핵에서 어퍼컷 방향의 큰 빛과 작은 반동·잔광을 나눈다. */
export function drawKanadaLight(ctx, frame) {
    // 단일 견본의 발생·이탈만 압축하고, 기존 기법 조합의 노출은 보존한다.
    const tempo = frame.enhanced &&
        frame.sampleId === 'fx-kanada-light' &&
        !frame.reducedMotion
        ? 1.35
        : 1;
    const age = (frame.timeMs - battleLayout.contactMs) * tempo;
    if (age < 0 || age >= 1150)
        return;
    if (!frame.enhanced) {
        const radius = (18 + age / 22) * (1 - age / 1150);
        ellipse(ctx, origin.x, origin.y, radius, radius, palette.paper);
        return;
    }
    if (age >= 520)
        return;
    const source = frame.assets.effects.get('technique:light-clump');
    if (!source)
        return;
    ctx.save();
    ctx.globalAlpha *= frame.reducedMotion ? 0.65 : 1;
    const motion = frame.reducedMotion ? 0.55 : 1;
    const opacity = ctx.globalAlpha;
    // 핵은 짧게 열고 비워, 흰 덩어리가 회수 자세를 계속 덮지 않게 한다.
    if (age < 96) {
        const pulse = 1 - smooth((age - 20) / 76);
        for (let i = 3; i >= 0; i--) {
            const angle = i * 2.399;
            const radius = i === 0 ? 0 : (6 + (i % 2) * 3) * pulse;
            ctx.globalAlpha = opacity * pulse;
            mote(ctx, frame, {
                point: {
                    x: origin.x + Math.cos(angle) * radius,
                    y: origin.y + Math.sin(angle) * radius,
                },
                size: (i === 0 ? 112 : 72 - i * 8) * (0.9 + pulse * 0.1),
                turn: i,
            });
        }
    }
    // 오른쪽 위로 빠져나가는 다섯 빛에 크기 차이를 두어 힘의 주방향을 만든다.
    for (let i = 0; i < forwardMotes.length; i++) {
        if (frame.reducedMotion && i % 2)
            continue;
        const forward = forwardMotes[i];
        const delay = 8 + i * 6;
        const local = age - delay;
        const life = 275 + noise(i + 43) * 135;
        if (local < 0 || local >= life)
            continue;
        const progress = local / life;
        const release = 1 - (1 - clamp(local / 105)) ** 3;
        const angle = strikeAngle + forward.angleOffset;
        const radius = (14 + forward.reach * release) * motion;
        const point = {
            x: origin.x + Math.cos(angle) * radius,
            y: origin.y + Math.sin(angle) * radius - progress * 5 * motion,
        };
        const fade = smooth(local / 16) * (1 - smooth((progress - 0.16) / 0.84));
        ctx.globalAlpha = opacity * fade;
        mote(ctx, frame, {
            point,
            size: forward.size * (1 - progress * 0.64),
            turn: i,
        });
    }
    // 반대쪽 반동은 작고 짧게 남겨 타격 방향을 흐리지 않는다.
    for (let i = 0; i < (frame.reducedMotion ? 1 : 2); i++) {
        const local = age - 16 - i * 16;
        const life = 190 + i * 45;
        if (local < 0 || local >= life)
            continue;
        const progress = local / life;
        const release = 1 - (1 - clamp(local / 95)) ** 3;
        const angle = strikeAngle + Math.PI + (i === 0 ? -0.16 : 0.2);
        const radius = (8 + (38 + i * 16) * release) * motion;
        ctx.globalAlpha =
            opacity * smooth(local / 15) * (1 - smooth(progress)) * 0.6;
        mote(ctx, frame, {
            point: {
                x: origin.x + Math.cos(angle) * radius,
                y: origin.y + Math.sin(angle) * radius,
            },
            size: (26 - i * 6) * (1 - progress * 0.65),
            turn: i + 2,
        });
    }
    // 짧은 한쪽 호만 남겨 닫힌 고리의 장식보다 타격 직후의 여운으로 읽히게 한다.
    const afterglowCount = frame.reducedMotion ? 3 : 6;
    for (let i = 0; i < afterglowCount; i++) {
        const local = age - 92 - i * 6;
        const life = 260 + noise(i + 181) * 110;
        if (local < 0 || local >= life)
            continue;
        const p = local / life;
        const angle = -1.9 + (i / (afterglowCount - 1)) * 1.25;
        const radius = (42 + 68 * smooth(local / 190)) * motion;
        const unrotated = {
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius * 0.25,
        };
        const tilt = strikeAngle;
        ctx.globalAlpha =
            opacity * smooth(local / 28) * (1 - smooth((p - 0.2) / 0.8)) * 0.42;
        mote(ctx, frame, {
            point: {
                x: origin.x +
                    unrotated.x * Math.cos(tilt) -
                    unrotated.y * Math.sin(tilt),
                y: origin.y +
                    unrotated.x * Math.sin(tilt) +
                    unrotated.y * Math.cos(tilt),
            },
            size: (10 + noise(i + 211) * 9) * (1 - p * 0.75),
            turn: i + 1,
        });
    }
    ctx.restore();
}
function mote(ctx, frame, options) {
    drawEffectSprite(ctx, frame, {
        key: 'light-clump',
        point: { x: Math.round(options.point.x), y: Math.round(options.point.y) },
        width: options.size,
        rotation: ((options.turn % 4) * Math.PI) / 2,
    });
}
