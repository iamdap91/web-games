import { sampleKiShot, sampleOrbitHeld } from './ki-sampling.js';
import { clamp, ellipse, line } from './ki-shapes.js';
import { sampleOrbitViscosity } from './orbit-viscosity.js';
import { drawKiSprite, kiSpriteFrame, } from './ki-sprites.js';
const orbitHeldDiameterScale = 2.6;
const orbitActivationCompression = 0.23;
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
        point: definition.origin,
        width: 18 + sample.charge * 9,
        height: 6 + sample.charge * 9,
        anchorX: 0.5,
        anchorY: 62 / 64,
        alpha: 0.4 + sample.charge * 0.45,
    });
}
export function drawEruption(ctx, definition, sample, frames, options) {
    const firstHit = definition.hits[0];
    const lastHit = definition.hits.at(-1);
    if (!firstHit || !lastHit)
        return;
    const age = sample.timeMs - firstHit.atMs;
    const lastEnd = lastHit.atMs + lastHit.durationMs;
    const fadeAge = sample.timeMs - lastEnd;
    if (age < 0 || fadeAge >= 220)
        return;
    const x = definition.target.x;
    ctx.save();
    // 매 분출이 바닥에서 다시 솟고 사라져야 세 차례의 성장이 분리되어 보인다.
    for (const [index, hit] of definition.hits.entries()) {
        if (options && index !== options.hitIndex)
            continue;
        const hitAge = sample.timeMs - hit.atMs;
        const isLast = index === definition.hits.length - 1;
        const fadeMs = isLast ? 220 : Math.min(55, hit.durationMs * 0.3);
        const riseMs = isLast ? hit.durationMs : hit.durationMs - fadeMs;
        if (hitAge < 0 || hitAge >= riseMs + fadeMs)
            continue;
        const dissolveAge = hitAge - riseMs;
        const frame = dissolveAge < 0
            ? kiSpriteFrame(hitAge, {
                start: 0,
                count: 12,
                frameMs: riseMs / 12,
            })
            : kiSpriteFrame(dissolveAge, {
                start: 12,
                count: 4,
                frameMs: fadeMs / 4,
            });
        ctx.globalAlpha = (1 - clamp(dissolveAge / fadeMs)) * 0.65;
        ellipse(ctx, { x, y: 0 }, hit.radius * 0.9, 2, '#e89c48');
        ctx.globalAlpha = 1;
        drawKiSprite(ctx, frames, {
            sheet: 'eruption',
            frame,
            point: { x, y: 0 },
            width: hit.radius * 2.1,
            height: hit.radius * 3.7,
            anchorX: 0.5,
            anchorY: 62 / 64,
        });
    }
    if (options && options.hitIndex !== definition.hits.length - 1) {
        ctx.restore();
        return;
    }
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
export function drawOrbitHeld(ctx, definition, sample, frames, options = {}) {
    for (const { shot, index, formAge, growth, point, activation, } of sampleOrbitHeld(definition, sample)) {
        const pulse = 1 + Math.sin((sample.timeMs + index * 137) / 92) * 0.055;
        const diameter = shot.radius *
            orbitHeldDiameterScale *
            (0.35 + growth * 0.65) *
            (1 - activation * orbitActivationCompression);
        const compression = options.showViscousOrbit
            ? sampleOrbitViscosity(shot, sample.timeMs, index).compression
            : 0;
        drawKiSprite(ctx, frames, {
            sheet: 'orbit',
            frame: kiSpriteFrame(formAge + index * 137, {
                start: 0,
                count: 4,
                frameMs: 70,
                loop: true,
            }),
            point,
            width: diameter * pulse * (1 - compression * 0.22),
            height: (diameter / pulse) * (1 + compression * 0.22),
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
export function drawOrbitShot(ctx, shot, sample, frames, options = {}) {
    if (!shot.visible)
        return;
    const radius = shot.shot.radius;
    const launchStretch = Math.sin(clamp(shot.ageMs / 100) * Math.PI);
    const emergence = clamp(shot.ageMs / 100);
    const heldDiameter = radius * orbitHeldDiameterScale * (1 - orbitActivationCompression);
    const roundDiameter = heldDiameter + emergence * (radius * 2.9 - heldDiameter);
    const viscosity = options.showViscousOrbit
        ? sampleOrbitViscosity(shot.shot, sample.timeMs, sample.shots.findIndex((item) => item.shot === shot.shot))
        : undefined;
    ctx.save();
    ctx.beginPath();
    ctx.rect(-200, -160, shot.point.x + 200, 220);
    ctx.clip();
    const trail = [80, 50, 24, 0].map((age) => {
        const past = sampleKiShot(shot.shot, Math.max(shot.shot.launchMs, sample.timeMs - age));
        return { x: past.point.x - radius, y: past.point.y };
    });
    // 분리 직후에는 연결부와 잔여 방울이 읽히도록 기존 꼬리를 잠깐 거둔다.
    const trailAlpha = viscosity?.tether
        ? 0
        : viscosity?.droplet
            ? 1 - viscosity.droplet.alpha
            : 1;
    ctx.globalAlpha = 0.2 * trailAlpha;
    line(ctx, trail, '#9b6ed6', radius * 1.3);
    ctx.globalAlpha = 0.7 * trailAlpha;
    line(ctx, trail.slice(1), '#dac2ff', 1.1);
    ctx.globalAlpha = 1;
    drawKiSprite(ctx, frames, {
        sheet: 'orbit',
        frame: kiSpriteFrame(shot.ageMs, {
            start: options.showViscousOrbit ? 0 : 4,
            count: 4,
            frameMs: 50,
            loop: true,
        }),
        point: options.showViscousOrbit
            ? { x: shot.point.x - radius * (1 - emergence * 0.15), y: shot.point.y }
            : shot.point,
        width: options.showViscousOrbit
            ? roundDiameter * (1 + launchStretch * 0.16)
            : radius * (4.4 + launchStretch * 1.2),
        height: options.showViscousOrbit
            ? roundDiameter * (1 - launchStretch * 0.12)
            : radius * (4.4 - launchStretch * 0.8),
        // 비행 셀의 핵과 꼬리는 중심이 다르므로 밝은 선두 끝에 고정한다.
        anchorX: options.showViscousOrbit ? 0.5 : 0.93,
        anchorY: options.showViscousOrbit ? 0.5 : 0.55,
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
