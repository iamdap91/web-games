import { clamp, line } from './ki-shapes.js';
import { drawKiSprite, kiSpriteFrame, } from './ki-sprites.js';
/** 모여드는 선은 외형을 대신하지 않고, 그려진 핵으로 수렴하는 작은 빛만 보탠다. */
function drawChargeSparks(ctx, point, sample, options) {
    for (let index = 0; index < options.count; index += 1) {
        const flow = (sample.timeMs / 210 + index / options.count) % 1;
        const angle = index * 2.4 + sample.timeMs * 0.0015;
        const distance = 5 + (1 - flow) * options.reach;
        const length = 2 + flow * 3;
        ctx.globalAlpha = (0.25 + sample.charge * 0.6) * Math.sin(flow * Math.PI);
        line(ctx, [
            {
                x: point.x + Math.cos(angle) * (distance + length),
                y: point.y + Math.sin(angle) * (distance + length),
            },
            {
                x: point.x + Math.cos(angle) * distance,
                y: point.y + Math.sin(angle) * distance,
            },
        ], options.color, 1);
    }
}
/** 손 안의 핵을 압축한 뒤 놓으며 발사광도 실제 탄의 선두에서 자른다. */
export function drawOrbCharge(ctx, definition, sample, frames) {
    const point = definition.chargeOrigin ?? definition.origin;
    const releaseAge = sample.timeMs - definition.releaseMs;
    if (sample.phase !== 'charge' && (releaseAge < 0 || releaseAge > 95))
        return;
    ctx.save();
    if (sample.phase === 'charge') {
        drawChargeSparks(ctx, point, sample, {
            count: 3,
            reach: 15,
            color: definition.accent,
        });
        ctx.globalAlpha = 1;
        const compression = clamp((sample.charge - 0.78) / 0.22);
        const size = 14 + sample.charge * 15 - compression * 3;
        drawKiSprite(ctx, frames, {
            sheet: 'orb',
            frame: Math.min(3, Math.floor(sample.charge * 4)),
            point,
            width: size,
            height: size,
        });
    }
    else {
        const front = sample.shots[0]?.point.x ?? definition.origin.x;
        ctx.beginPath();
        ctx.rect(point.x - 24, point.y - 24, Math.max(0, front - point.x + 24), 48);
        ctx.clip();
        drawKiSprite(ctx, frames, {
            sheet: 'orb',
            frame: kiSpriteFrame(releaseAge, { start: 8, count: 4, frameMs: 26 }),
            point,
            width: 24 + releaseAge * 0.11,
            height: 31 - releaseAge * 0.12,
            alpha: 1 - releaseAge / 95,
        });
    }
    ctx.restore();
}
/** 선두를 판정점에 고정하고 그림 변화와 발사 직후 늘어남으로 작은 탄의 속도를 만든다. */
export function drawOrbProjectile(ctx, shot, sample, accent, frames) {
    if (!shot.visible)
        return;
    ctx.save();
    const radius = shot.shot.radius;
    const stretch = 1 + (1 - clamp(shot.ageMs / 80)) * 0.25;
    // 그림이나 잔광이 판정점보다 앞서면 접촉 전에 명중한 것처럼 보인다.
    ctx.beginPath();
    ctx.rect(shot.point.x - radius * 7, shot.point.y - radius * 3, radius * 7, radius * 6);
    ctx.clip();
    for (let index = 0; index < 3; index += 1) {
        const age = (sample.timeMs + index * 43) % 135;
        const distance = radius * 1.6 + age * 0.2;
        const offset = (index - 1) * radius * 0.6;
        ctx.globalAlpha = (1 - age / 135) * 0.55;
        line(ctx, [
            { x: shot.point.x - distance, y: shot.point.y + offset },
            { x: shot.point.x - distance - 3, y: shot.point.y + offset },
        ], accent, 1);
    }
    ctx.globalAlpha = 1;
    drawKiSprite(ctx, frames, {
        sheet: 'orb',
        frame: kiSpriteFrame(shot.ageMs, {
            start: 4,
            count: 4,
            frameMs: 42,
            loop: true,
        }),
        point: shot.point,
        width: radius * 4 * stretch,
        height: (radius * 2.9) / stretch,
        anchorX: 0.95,
    });
    ctx.restore();
}
/** 크게 모은 핵이 방출 직전에만 작아지며 두 손의 발사 위치로 옮겨간다. */
export function drawBeamCharge(ctx, definition, sample, frames) {
    if (sample.phase !== 'charge')
        return;
    ctx.save();
    const chargeOrigin = definition.chargeOrigin ?? definition.origin;
    const compression = clamp((sample.charge - 0.84) / 0.16);
    const point = {
        x: chargeOrigin.x + (definition.origin.x - chargeOrigin.x) * compression,
        y: chargeOrigin.y + (definition.origin.y - chargeOrigin.y) * compression,
    };
    drawChargeSparks(ctx, point, sample, {
        count: 5,
        reach: 20 + sample.charge * 7,
        color: definition.accent,
    });
    ctx.globalAlpha = 1;
    const size = 18 + sample.charge * 25 - compression * 8;
    drawKiSprite(ctx, frames, {
        sheet: 'beam',
        frame: Math.min(3, Math.floor(sample.charge * 4)),
        point,
        width: size,
        height: size,
    });
    ctx.restore();
}
/** 이어진 띠 안으로 그림 덩어리가 흐르며, 종료 뒤에는 손을 떠난 후단이 전진한다. */
export function drawBeam(ctx, definition, sample, frames) {
    const front = sample.shots[0];
    if (!front || sample.timeMs < definition.releaseMs)
        return;
    const finalHit = definition.hits[definition.hits.length - 1];
    const sustainEnd = (finalHit?.atMs ?? front.shot.arriveMs) + 100;
    const detach = clamp((sample.timeMs - sustainEnd) / 170);
    if (detach >= 1)
        return;
    const releaseAge = sample.timeMs - definition.releaseMs;
    const origin = definition.origin;
    const distance = Math.hypot(front.point.x - origin.x, front.point.y - origin.y);
    if (distance <= 0)
        return;
    const angle = Math.atan2(front.point.y - origin.y, front.point.x - origin.x);
    const tail = distance * detach;
    const remaining = distance - tail;
    const startup = 0.8 + clamp(releaseAge / 65) * 0.2;
    const height = 48 * startup;
    const bodyFrame = kiSpriteFrame(releaseAge, {
        start: 4,
        count: 4,
        frameMs: 48,
        loop: true,
    });
    ctx.save();
    ctx.translate(origin.x, origin.y);
    ctx.rotate(angle);
    // 모든 층을 선두·후단의 같은 범위로 잘라 장식 때문에 먼저 접촉하지 않게 한다.
    ctx.beginPath();
    ctx.rect(tail, -height / 2, remaining, height);
    ctx.clip();
    const tileWidth = 44;
    // 생성 타일 양끝의 투명 한두 픽셀을 겹쳐 코어가 세로로 끊기지 않게 한다.
    const tileAdvance = tileWidth - 3;
    const flow = (releaseAge * 0.18) % tileAdvance;
    ctx.save();
    // 후단의 가느다란 시작부에는 몸통을 깔지 않아 실제로 뾰족하게 끊겨 나간다.
    const tailNeck = detach > 0 ? Math.min(36, remaining) * 0.55 : 0;
    ctx.beginPath();
    ctx.rect(tail + tailNeck, -height / 2, Math.max(0, remaining - tailNeck), height);
    ctx.clip();
    for (let x = tail - tileWidth + flow; x < distance; x += tileAdvance) {
        drawKiSprite(ctx, frames, {
            sheet: 'beam',
            frame: bodyFrame,
            point: { x, y: 0 },
            width: tileWidth,
            height,
            anchorX: 0,
        });
    }
    ctx.restore();
    if (detach === 0) {
        drawKiSprite(ctx, frames, {
            sheet: 'beam',
            frame: kiSpriteFrame(releaseAge, {
                start: 8,
                count: 2,
                frameMs: 55,
                loop: true,
            }),
            point: { x: 0, y: 0 },
            width: 42,
            height: 54 * startup,
            anchorX: 0.25,
        });
    }
    else {
        drawKiSprite(ctx, frames, {
            sheet: 'beam',
            frame: kiSpriteFrame(sample.timeMs - sustainEnd, {
                start: 12,
                count: 2,
                frameMs: 45,
                loop: true,
            }),
            point: { x: tail, y: 0 },
            width: Math.min(36, remaining),
            height,
            anchorX: 0,
        });
    }
    drawKiSprite(ctx, frames, {
        sheet: 'beam',
        frame: kiSpriteFrame(releaseAge, {
            start: 10,
            count: 2,
            frameMs: 50,
            loop: true,
        }),
        point: { x: distance, y: 0 },
        width: Math.min(38, remaining),
        height: 51 * startup,
        anchorX: 0.96,
    });
    ctx.restore();
}
/** 접촉 때 압축·파열·흩어지는 그림을 차례로 보내 비행 구체와 구분한다. */
export function drawOrbImpact(ctx, point, ageMs, strength, accent, frames) {
    if (ageMs < 0 || ageMs >= 240)
        return;
    ctx.save();
    const expansion = clamp(ageMs / 70);
    const dissipating = ageMs >= 140;
    const size = (34 + expansion * 24) * strength;
    drawKiSprite(ctx, frames, {
        sheet: 'orb',
        frame: kiSpriteFrame(dissipating ? ageMs - 140 : ageMs, {
            start: dissipating ? 12 : 8,
            count: 4,
            frameMs: dissipating ? 25 : 35,
        }),
        point,
        width: size * (0.75 + expansion * 0.25),
        height: size,
        alpha: ageMs < 190 ? 1 : 1 - (ageMs - 190) / 50,
    });
    if (ageMs > 45) {
        for (let index = 0; index < 4; index += 1) {
            const angle = index * 1.57 + 0.45;
            const distance = 8 + (ageMs - 45) * 0.12 * strength;
            ctx.globalAlpha = (1 - ageMs / 240) * 0.7;
            line(ctx, [
                {
                    x: point.x + Math.cos(angle) * distance,
                    y: point.y + Math.sin(angle) * distance,
                },
                {
                    x: point.x + Math.cos(angle) * (distance + 3),
                    y: point.y + Math.sin(angle) * (distance + 3),
                },
            ], accent, 1);
        }
    }
    ctx.restore();
}
/** 빔 접촉 그림은 출력 방향으로 부풀며 마지막 타격에서 크게 파열한다. */
export function drawBeamImpact(ctx, point, ageMs, strength, accent, frames) {
    if (ageMs < 0 || ageMs >= 260)
        return;
    ctx.save();
    const expansion = clamp(ageMs / 75);
    const fade = ageMs < 150 ? 1 : 1 - (ageMs - 150) / 110;
    drawKiSprite(ctx, frames, {
        sheet: 'beam',
        frame: kiSpriteFrame(ageMs, {
            start: 14,
            count: 2,
            frameMs: 50,
            loop: true,
        }),
        point: { x: point.x + expansion * 5, y: point.y },
        width: (31 + expansion * 14) * (0.7 + strength * 0.5),
        height: (36 + expansion * 17) * (0.6 + strength * 0.6),
        alpha: fade * 0.9,
    });
    for (const direction of [-1, 1]) {
        const distance = (8 + expansion * 19) * strength;
        ctx.globalAlpha = fade * 0.65;
        line(ctx, [
            { x: point.x + 4 + ageMs * 0.02, y: point.y + direction * distance },
            {
                x: point.x + 8 + ageMs * 0.04,
                y: point.y + direction * (distance + 4),
            },
        ], accent, 1);
    }
    ctx.restore();
}
