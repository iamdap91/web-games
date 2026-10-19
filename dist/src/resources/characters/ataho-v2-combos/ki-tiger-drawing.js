import { tigerChargePoint } from './ki-sampling.js';
import { clamp, ellipse, line, polygon } from './ki-shapes.js';
import { drawKiSprite, kiSpriteFrame, } from './ki-sprites.js';
export const tigerManifestFinalWidth = 74;
/** 호랑이의 실체는 그림이 맡고 흐르는 권기와 발톱 압력만 좌표로 연결한다. */
function drawTigerForm(ctx, frames, options) {
    drawKiSprite(ctx, frames, {
        sheet: 'tiger',
        ...options,
        // 64px 셀의 실체는 61px, 옅은 끝은 62px까지라 주둥이를 자르지 않는다.
        anchorX: 62 / 64,
        anchorY: 0.5,
    });
}
export function drawTigerCharge(ctx, definition, sample, frames) {
    if (sample.phase !== 'charge')
        return;
    const amount = sample.charge;
    const origin = tigerChargePoint(definition, sample);
    ctx.save();
    // 대상에는 예고 명중을 만들지 않고 주먹에 빨려 드는 기세만 보인다.
    for (let index = 0; index < 5; index++) {
        const cycle = (sample.timeMs / 310 + index * 0.2) % 1;
        const angle = index * 1.3 + cycle * 0.45;
        const radius = 5 + cycle * (13 + amount * 9);
        const point = {
            x: origin.x + Math.cos(angle) * radius,
            y: origin.y + Math.sin(angle) * radius * 0.58,
        };
        ctx.globalAlpha = (1 - cycle) * amount * 0.75;
        line(ctx, [
            point,
            {
                x: origin.x + Math.cos(angle - 0.25) * radius * 0.55,
                y: origin.y + Math.sin(angle - 0.25) * radius * 0.3,
            },
            origin,
        ], index % 2 ? '#fff0b6' : '#eeb456', index % 2 ? 0.8 : 1.2);
    }
    ctx.globalAlpha = 1;
    ellipse(ctx, origin, 5 + amount * 5, 3 + amount * 3, '#ffd36920');
    drawKiSprite(ctx, frames, {
        sheet: 'tiger',
        frame: Math.min(3, Math.floor(amount * 4)),
        point: origin,
        width: 15 + amount * 15,
        height: 12 + amount * 14,
        alpha: clamp(amount * 1.8),
    });
    ctx.globalAlpha = amount * 0.45;
    for (let index = 0; index < 2; index++) {
        const progress = (sample.timeMs / 500 + index * 0.5) % 1;
        ctx.strokeStyle = index ? '#fff3bc' : '#d58c38';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.ellipse(-3, 0, 15 + progress * 13, 3 + progress, -progress * 0.08, 0, Math.PI * 1.6);
        ctx.stroke();
    }
    ctx.restore();
}
function manifestFrame(ageMs, pulseIndex) {
    // 첫 두 박자는 한 형상의 포효를 이어 가고 마지막에만 완전히 파열한다.
    if (pulseIndex < 2) {
        const first = pulseIndex ? 6 : 4;
        return ageMs < 50
            ? first
            : kiSpriteFrame(ageMs - 50, {
                start: first + 1,
                count: pulseIndex ? 1 : 2,
                frameMs: 45,
            });
    }
    if (ageMs < 50)
        return 8;
    if (ageMs < 185)
        return kiSpriteFrame(ageMs - 50, {
            start: 9,
            count: 3,
            frameMs: 45,
        });
    return kiSpriteFrame(ageMs - 185, {
        start: 12,
        count: 4,
        frameMs: 40,
    });
}
export function drawTigerManifest(ctx, definition, sample, frames, options = {}) {
    const pulse = sample.hits.filter((hit) => hit.occurred).at(-1);
    if (!pulse)
        return;
    const index = definition.hits.indexOf(pulse.hit);
    const age = pulse.ageMs;
    if (index === definition.hits.length - 1 && age >= 345)
        return;
    const final = index === definition.hits.length - 1;
    const push = age < 50 ? 0 : Math.sin(clamp((age - 50) / 110) * Math.PI);
    const width = (final ? tigerManifestFinalWidth : 64 + index * 4) + push * (final ? 5 : 3);
    const height = (final ? 66 : 54 + index * 4) - push * 2;
    ctx.save();
    const haloAlpha = ctx.globalAlpha;
    ctx.globalAlpha *= options.showEffectHierarchy ? 0.55 : 1;
    ellipse(ctx, pulse.point, width * 0.25, height * 0.3, '#ffc96814');
    ctx.globalAlpha = haloAlpha;
    drawTigerForm(ctx, frames, {
        point: pulse.point,
        frame: manifestFrame(age, index),
        width,
        height,
    });
    ctx.restore();
}
/** 금빛 꼬리의 두께와 끊김을 흘려 보내 호랑이를 균일한 띠와 구분한다. */
function drawTigerFlow(ctx, from, head, timeMs, width) {
    const length = Math.max(0, head.x - from.x);
    if (length < 4 || width <= 0)
        return;
    for (let strand = 0; strand < 3; strand++) {
        const top = [];
        const bottom = [];
        for (let index = 0; index <= 24; index++) {
            const progress = index / 24;
            const taper = Math.sin(progress * Math.PI * 0.82);
            const flow = progress * 17 - timeMs / 38 + strand * 2;
            const ripple = Math.sin(flow) * (1.3 + strand * 0.65) * taper;
            const center = from.y +
                (head.y - from.y) * progress +
                Math.sin(progress * Math.PI * 2.4 - timeMs / 80 + strand * 2.1) *
                    (strand === 0 ? 2 : 7) *
                    taper;
            const spread = width *
                (strand === 0 ? 0.68 : strand === 1 ? 0.31 : 0.12) *
                (0.2 + taper * 0.8) *
                (0.8 + Math.sin(flow * 1.7) * 0.2);
            const x = from.x + length * progress;
            top.push({ x, y: center - spread + ripple });
            bottom.unshift({ x, y: center + spread + ripple });
        }
        polygon(ctx, [...top, ...bottom], strand === 0 ? '#d99435' : strand === 1 ? '#ffcb67' : '#fff0bb');
    }
    // 짧은 암부와 떨어진 조각이 기운 속에서 각기 다른 속도로 흐른다.
    for (let index = 0; index < 6; index++) {
        const progress = (timeMs / 240 + index / 6) % 1;
        const x = from.x + length * progress;
        const y = from.y +
            (head.y - from.y) * progress +
            Math.sin(progress * Math.PI * 3 - timeMs / 90) * width * 0.55;
        const size = 2 + (index % 3);
        ctx.fillStyle = index % 2 ? '#fff6d4' : '#ad622c';
        ctx.fillRect(x - size, y, size, index % 2 ? 1 : 2);
    }
}
export function drawTigerWave(ctx, definition, sample, frames, options = {}) {
    const shot = sample.shots[0];
    if (!shot || shot.ageMs < 0)
        return;
    const contactAge = sample.timeMs - shot.shot.arriveMs;
    const coreEnd = shot.shot.arriveMs + 170;
    const residue = clamp((sample.timeMs - coreEnd) / 300);
    if (residue >= 1)
        return;
    const from = definition.origin;
    const head = shot.point;
    const length = Math.max(0, head.x - from.x);
    ctx.save();
    // 비행 중 그림이 앞서 튀어나오지 않게 선두와 판정의 도착 시각을 맞춘다.
    ctx.beginPath();
    ctx.rect(from.x - 65, -150, head.x - from.x + 65, 210);
    ctx.clip();
    const width = (8 + clamp(shot.ageMs / 75) * 6) * (1 - clamp(contactAge / 230));
    drawTigerFlow(ctx, from, head, sample.timeMs, width);
    if (contactAge < 50) {
        const growth = clamp(shot.ageMs / 70);
        drawTigerForm(ctx, frames, {
            point: head,
            frame: growth < 1
                ? Math.min(3, Math.floor(growth * 4))
                : kiSpriteFrame(shot.ageMs - 70, {
                    start: 4,
                    count: 4,
                    frameMs: 45,
                    loop: true,
                }),
            width: 30 + growth * 48,
            height: 24 + growth * 36,
        });
    }
    if (shot.progress > 0.65) {
        ctx.globalAlpha = sample.timeMs < coreEnd ? 0.25 : 1 - residue;
        if (options.showEffectHierarchy && contactAge >= 0)
            ctx.globalAlpha *= 0.45;
        const points = Array.from({ length: 30 }, (_, index) => {
            const progress = index / 29;
            return {
                x: from.x + length * progress,
                y: from.y +
                    (head.y - from.y) * progress +
                    Math.sin(index * 1.25 - sample.timeMs / 55) * (2 + progress * 3),
            };
        });
        line(ctx, points, '#a3422b', 2.8 * (1 - residue * 0.6));
        line(ctx, points, '#ffc677', 0.85);
    }
    ctx.restore();
    if (contactAge < 50 || contactAge >= 345)
        return;
    drawTigerForm(ctx, frames, {
        point: head,
        frame: manifestFrame(contactAge, definition.hits.length + 1),
        width: 78,
        height: 64,
    });
}
export function drawTigerImpact(ctx, point, ageMs, strength, frames, options = {}) {
    const hierarchy = !!options.showEffectHierarchy;
    const lifetimeMs = hierarchy ? (strength > 1 ? 155 : 125) : 170;
    if (ageMs < 0 || ageMs > lifetimeMs)
        return;
    const life = ageMs / lifetimeMs;
    ctx.save();
    if (strength > 1 && (!hierarchy || ageMs < 95))
        drawKiSprite(ctx, frames, {
            sheet: 'tiger',
            frame: kiSpriteFrame(ageMs, {
                start: 12,
                count: 4,
                frameMs: 40,
            }),
            point,
            width: 48 + life * 16,
            height: 40 + life * 16,
            alpha: hierarchy ? 0.32 * (1 - clamp((ageMs - 35) / 60)) : 0.55,
        });
    ctx.globalAlpha = (1 - life) * (hierarchy ? 0.52 : 0.9);
    for (let index = 0; index < 3; index++) {
        if (hierarchy && (index === 1 || ageMs < 20))
            continue;
        const offset = (index - 1) * 8;
        const travel = Math.max(0, ageMs - 35) / 135;
        line(ctx, [
            { x: point.x - 11 + travel * 4, y: point.y - 18 + offset },
            { x: point.x + travel * 15, y: point.y + offset },
            { x: point.x + 13 + travel * 19, y: point.y + 13 + offset },
        ], index === 1 ? '#fff8d3' : '#efbb59', (1 - life) * strength + 0.6);
    }
    ctx.restore();
}
