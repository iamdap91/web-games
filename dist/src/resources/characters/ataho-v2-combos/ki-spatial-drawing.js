import { sampleKiShot } from './ki-sampling.js';
import { clamp, ellipse, line } from './ki-shapes.js';
import { drawKiSprite, kiSpriteFrame, } from './ki-sprites.js';
export function drawCrescentCharge(ctx, definition, sample, frames) {
    if (sample.phase !== 'charge')
        return;
    drawKiSprite(ctx, frames, {
        sheet: 'crescent',
        frame: kiSpriteFrame(sample.timeMs - definition.chargeStartMs, {
            start: 0,
            count: 4,
            frameMs: (definition.releaseMs - definition.chargeStartMs) / 4,
        }),
        point: definition.origin,
        width: 20 + sample.charge * 14,
        height: 22 + sample.charge * 23,
        anchorX: 0.85,
        alpha: 0.5 + sample.charge * 0.5,
    });
}
export function drawCrescent(ctx, shot, sample, frames) {
    if (!shot.visible)
        return;
    ctx.save();
    // 그림의 파편도 실제 선두보다 앞에 두지 않아 도착 전 명중처럼 보이지 않는다.
    ctx.beginPath();
    ctx.rect(-200, -160, shot.point.x + 200, 220);
    ctx.clip();
    for (const age of [58, 27]) {
        if (shot.ageMs < age)
            continue;
        const past = sampleKiShot(shot.shot, sample.timeMs - age);
        drawKiSprite(ctx, frames, {
            sheet: 'crescent',
            frame: kiSpriteFrame(past.ageMs, {
                start: 4,
                count: 4,
                frameMs: 45,
                loop: true,
            }),
            point: past.point,
            width: 34,
            height: 73,
            anchorX: 0.85,
            alpha: age === 58 ? 0.12 : 0.26,
        });
    }
    drawKiSprite(ctx, frames, {
        sheet: 'crescent',
        frame: kiSpriteFrame(shot.ageMs, {
            start: 4,
            count: 4,
            frameMs: 45,
            loop: true,
        }),
        point: shot.point,
        width: 30 + clamp(shot.ageMs / 65) * 9,
        height: 69 + clamp(shot.ageMs / 65) * 12,
        anchorX: 0.85,
    });
    ctx.restore();
}
const groundOutlet = { x: 40, y: 0 };
export function drawEruptionCharge(ctx, definition, sample, frames) {
    if (sample.phase !== 'charge')
        return;
    drawKiSprite(ctx, frames, {
        sheet: 'eruption',
        frame: kiSpriteFrame(sample.timeMs - definition.chargeStartMs, {
            start: 0,
            count: 4,
            frameMs: (definition.releaseMs - definition.chargeStartMs) / 4,
        }),
        point: groundOutlet,
        width: 18 + sample.charge * 9,
        height: 6 + sample.charge * 9,
        anchorX: 0.5,
        anchorY: 62 / 64,
        alpha: 0.4 + sample.charge * 0.45,
    });
}
function groundTransfer(ctx, definition, sample, firstHitMs) {
    const age = sample.timeMs - definition.releaseMs;
    if (age < 0 || sample.timeMs > firstHitMs + 150)
        return;
    const progress = clamp(age / Math.max(1, firstHitMs - definition.releaseMs));
    const fade = 1 - clamp((sample.timeMs - firstHitMs) / 150);
    const headX = groundOutlet.x + (definition.target.x - groundOutlet.x) * progress;
    ctx.save();
    // 손이 땅에 닿는 자세가 아니므로 방출과 지면을 짧은 기운으로 잇는다.
    if (age < 150) {
        ctx.globalAlpha = 1 - age / 150;
        line(ctx, [definition.origin, { x: 34, y: -10 }, groundOutlet], '#e99848', 2.2);
        line(ctx, [definition.origin, { x: 34, y: -10 }, groundOutlet], '#fff2be', 0.7);
    }
    ctx.globalAlpha = fade;
    const count = Math.max(1, Math.ceil((headX - groundOutlet.x) / 7));
    const points = Array.from({ length: count + 1 }, (_, index) => ({
        x: groundOutlet.x + ((headX - groundOutlet.x) * index) / count,
        y: index === 0 ? 0 : Math.sin(index * 2.8) * 1.3,
    }));
    line(ctx, points, '#b36a34', 3.2);
    line(ctx, points, '#f8c46d', 1.5);
    line(ctx, points, '#fff3c8', 0.6);
    if (progress < 1) {
        ellipse(ctx, { x: headX, y: 0 }, 4, 1.2, '#ffe7a7');
        for (let index = 0; index < 3; index++) {
            const cycle = (age / 85 + index * 0.33) % 1;
            ctx.fillStyle = index % 2 ? '#f0c180' : '#916239';
            ctx.fillRect(Math.round(headX - cycle * 10), Math.round(-2 - Math.sin(cycle * Math.PI) * 7), 2, 2);
        }
    }
    ctx.restore();
}
export function drawEruption(ctx, definition, sample, frames) {
    const firstHit = definition.hits[0];
    const lastHit = definition.hits.at(-1);
    if (!firstHit || !lastHit)
        return;
    groundTransfer(ctx, definition, sample, firstHit.atMs);
    const age = sample.timeMs - firstHit.atMs;
    const lastEnd = lastHit.atMs + lastHit.durationMs;
    const fadeAge = sample.timeMs - lastEnd;
    if (age < 0 || fadeAge >= 220)
        return;
    const pressure = definition.hits.reduce((largest, hit) => {
        const hitAge = sample.timeMs - hit.atMs;
        if (hitAge < 0 || hitAge > hit.durationMs)
            return largest;
        return Math.max(largest, Math.sin((hitAge / hit.durationMs) * Math.PI));
    }, 0);
    const finish = clamp((sample.timeMs - lastHit.atMs) / 70);
    const x = definition.target.x;
    let frame;
    if (age < 100) {
        frame = kiSpriteFrame(age, { start: 0, count: 4, frameMs: 25 });
    }
    else if (sample.timeMs < lastHit.atMs) {
        frame = kiSpriteFrame(age - 100, {
            start: 4,
            count: 4,
            frameMs: 45,
            loop: true,
        });
    }
    else if (fadeAge < 0) {
        frame = kiSpriteFrame(sample.timeMs - lastHit.atMs, {
            start: 8,
            count: 4,
            frameMs: lastHit.durationMs / 4,
        });
    }
    else {
        frame = kiSpriteFrame(fadeAge, { start: 12, count: 4, frameMs: 55 });
    }
    ctx.save();
    const groundFade = 1 - clamp(fadeAge / 220);
    ctx.globalAlpha = groundFade * 0.65;
    ellipse(ctx, { x, y: 0 }, 18 + pressure * 6 + finish * 6, 2, '#e89c48');
    ctx.globalAlpha = 1;
    drawKiSprite(ctx, frames, {
        sheet: 'eruption',
        frame,
        point: { x, y: 0 },
        width: 43 + pressure * 6 + finish * 10,
        height: 76 + pressure * 6 + finish * 18,
        anchorX: 0.5,
        anchorY: 62 / 64,
    });
    // 마지막 분열에 맞춘 파편은 반복하지 않고 착지까지 같은 궤도를 유지한다.
    for (let index = 0; index < 8; index++) {
        const particleAge = sample.timeMs - lastHit.atMs - index * 11;
        if (particleAge < 0 || particleAge > 400)
            continue;
        const life = particleAge / 400;
        const side = index % 2 ? -1 : 1;
        ctx.globalAlpha = 1 - life;
        ctx.fillStyle = index % 3 ? '#ca883f' : '#ffe6a2';
        ctx.fillRect(Math.round(x + side * (7 + life * (14 + index * 2))), Math.round(-Math.sin(life * Math.PI) * (12 + index * 3)), 2 + (index % 2), 2);
    }
    ctx.restore();
}
export function drawOrbitHeld(ctx, definition, sample, frames) {
    for (const [index, shot] of definition.shots.entries()) {
        const formMs = definition.chargeStartMs + index * 90;
        if (sample.timeMs < formMs || sample.timeMs >= shot.launchMs)
            continue;
        const formAge = sample.timeMs - formMs;
        const growth = clamp(formAge / 180);
        const spread = 1 - Math.pow(1 - growth, 3);
        const destination = { x: shot.from.x - shot.radius, y: shot.from.y };
        const point = {
            x: definition.origin.x + (destination.x - definition.origin.x) * spread,
            y: definition.origin.y + (destination.y - definition.origin.y) * spread,
        };
        const activation = clamp((sample.timeMs - shot.launchMs + 130) / 130);
        const pulse = 1 + Math.sin((sample.timeMs + index * 137) / 92) * 0.055;
        const diameter = shot.radius * 2.6 * (0.35 + growth * 0.65) * (1 - activation * 0.23);
        drawKiSprite(ctx, frames, {
            sheet: 'orbit',
            frame: kiSpriteFrame(formAge + index * 137, {
                start: 0,
                count: 4,
                frameMs: 70,
                loop: true,
            }),
            point,
            width: diameter * pulse,
            height: diameter / pulse,
            alpha: 0.55 + growth * 0.45,
        });
        if (activation <= 0)
            continue;
        ctx.save();
        ctx.globalAlpha = activation * 0.8;
        for (const side of [-1, 1]) {
            line(ctx, [
                { x: point.x + side * (11 - activation * 3), y: point.y },
                { x: point.x + side * (16 - activation * 3), y: point.y },
            ], '#e7d2ff', 0.8);
        }
        ctx.restore();
    }
}
export function drawOrbitShot(ctx, shot, sample, frames) {
    if (!shot.visible)
        return;
    const radius = shot.shot.radius;
    const launchStretch = Math.sin(clamp(shot.ageMs / 100) * Math.PI);
    ctx.save();
    ctx.beginPath();
    ctx.rect(-200, -160, shot.point.x + 200, 220);
    ctx.clip();
    const trail = [80, 50, 24, 0].map((age) => {
        const past = sampleKiShot(shot.shot, Math.max(shot.shot.launchMs, sample.timeMs - age));
        return { x: past.point.x - radius, y: past.point.y };
    });
    ctx.globalAlpha = 0.2;
    line(ctx, trail, '#9b6ed6', radius * 1.3);
    ctx.globalAlpha = 0.7;
    line(ctx, trail.slice(1), '#dac2ff', 1.1);
    ctx.globalAlpha = 1;
    drawKiSprite(ctx, frames, {
        sheet: 'orbit',
        frame: kiSpriteFrame(shot.ageMs, {
            start: 4,
            count: 4,
            frameMs: 50,
            loop: true,
        }),
        point: shot.point,
        width: radius * (4.4 + launchStretch * 1.2),
        height: radius * (4.4 - launchStretch * 0.8),
        // 비행 셀의 핵과 꼬리는 중심이 다르므로 밝은 선두 끝에 고정한다.
        anchorX: 0.93,
        anchorY: 0.55,
    });
    ctx.restore();
}
/** 파열 그림도 기술 실체이므로 접촉 표시의 켜짐과 무관하게 재생한다. */
export function drawSpatialImpact(ctx, definition, point, ageMs, strength, frames) {
    if (ageMs < 0 || ageMs >= 300)
        return;
    const sheet = definition.style;
    if (sheet !== 'crescent' && sheet !== 'eruption' && sheet !== 'orbit')
        return;
    const dissolve = ageMs >= 150;
    const frame = kiSpriteFrame(dissolve ? ageMs - 150 : ageMs, {
        start: dissolve ? 12 : 8,
        count: 4,
        frameMs: 37.5,
    });
    const amount = 0.8 + strength * 0.2;
    const expansion = 1 + Math.sin(clamp(ageMs / 160) * Math.PI) * 0.14;
    drawKiSprite(ctx, frames, {
        sheet,
        frame,
        point,
        width: (sheet === 'crescent' ? 70 : sheet === 'eruption' ? 30 : 43) *
            amount *
            expansion,
        height: (sheet === 'crescent' ? 85 : sheet === 'eruption' ? 46 : 45) *
            amount *
            expansion,
        anchorX: 0.5,
        anchorY: 0.5,
    });
}
