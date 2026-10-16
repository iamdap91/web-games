import { sampleKiShot } from './ki-sampling.js';
import { clamp, ellipse, line, polygon } from './ki-shapes.js';
/** 채워진 구체와 구별되도록 날의 안쪽은 배경이 보이는 열린 면으로 둔다. */
function blade(ctx, point, height, outlineOnly = false) {
    const unit = height / 48;
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.scale(unit, unit);
    ctx.beginPath();
    ctx.moveTo(-17, -24);
    ctx.bezierCurveTo(-5, -20, 0, -9, 0, 0);
    ctx.bezierCurveTo(0, 9, -5, 20, -17, 24);
    ctx.lineTo(-12, 15);
    ctx.bezierCurveTo(-6, 10, -4, 4, -4, 0);
    ctx.bezierCurveTo(-4, -4, -6, -10, -12, -15);
    ctx.closePath();
    if (!outlineOnly) {
        ctx.fillStyle = '#66cde2';
        ctx.fill();
    }
    ctx.strokeStyle = outlineOnly ? '#97e6f7' : '#193b59';
    ctx.lineWidth = outlineOnly ? 0.7 : 1;
    ctx.stroke();
    if (!outlineOnly) {
        ctx.beginPath();
        ctx.moveTo(-15, -22);
        ctx.bezierCurveTo(-4, -16, -1, -7, -1, 0);
        ctx.bezierCurveTo(-1, 7, -4, 16, -15, 22);
        ctx.strokeStyle = '#edffff';
        ctx.lineWidth = 1.9;
        ctx.stroke();
        line(ctx, [
            { x: -15, y: -19 },
            { x: -22, y: -25 },
        ], '#b3f7ff', 0.8);
        line(ctx, [
            { x: -15, y: 19 },
            { x: -22, y: 25 },
        ], '#b3f7ff', 0.8);
    }
    ctx.restore();
}
export function drawCrescentCharge(ctx, definition, sample) {
    if (sample.phase !== 'charge')
        return;
    const amount = sample.charge;
    ctx.save();
    ctx.globalAlpha = 0.22 + amount * 0.65;
    const point = {
        x: definition.origin.x - 5 + amount * 4,
        y: definition.origin.y,
    };
    blade(ctx, point, 12 + amount * 22, true);
    for (const side of [-1, 1]) {
        line(ctx, [
            { x: point.x - 24, y: point.y + side * (10 + amount * 7) },
            { x: point.x - 13, y: point.y + side * 9 },
        ], '#4e9fb9', 0.65);
    }
    ctx.restore();
}
export function drawCrescent(ctx, shot, sample) {
    if (!shot.visible)
        return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(-200, -160, shot.point.x + 200, 220);
    ctx.clip();
    for (const age of [65, 33]) {
        if (sample.timeMs - age < shot.shot.launchMs)
            continue;
        const past = sampleKiShot(shot.shot, sample.timeMs - age);
        ctx.globalAlpha = age === 65 ? 0.12 : 0.25;
        blade(ctx, past.point, 44, true);
    }
    ctx.globalAlpha = 1;
    blade(ctx, shot.point, 37 + clamp(shot.ageMs / 65) * 11);
    ctx.restore();
}
const groundOutlet = { x: 40, y: 0 };
export function drawEruptionCharge(ctx, _definition, sample) {
    if (sample.phase !== 'charge')
        return;
    ctx.save();
    ctx.globalAlpha = 0.18 + sample.charge * 0.45;
    ellipse(ctx, groundOutlet, 8 + sample.charge * 6, 1.3, '#c78843');
    line(ctx, [
        { x: groundOutlet.x - 9, y: 1 },
        { x: groundOutlet.x - 3, y: -0.5 },
        { x: groundOutlet.x + 2, y: 0.7 },
        { x: groundOutlet.x + 8, y: -0.4 },
    ], '#ffdc83', 0.7);
    ctx.restore();
}
function groundTransfer(ctx, definition, sample, firstHitMs) {
    const age = sample.timeMs - definition.releaseMs;
    if (age < 0 || sample.timeMs > firstHitMs + 180)
        return;
    const progress = clamp(age / Math.max(1, firstHitMs - definition.releaseMs));
    const fade = 1 - clamp((sample.timeMs - firstHitMs) / 180);
    const headX = groundOutlet.x + (definition.target.x - groundOutlet.x) * progress;
    ctx.save();
    // 손이 땅에 닿는 그림이 아니므로 손바닥에서 지면으로 짧은 도관을 잇는다.
    if (age < 180) {
        ctx.globalAlpha = 1 - age / 180;
        line(ctx, [definition.origin, { x: 34, y: -10 }, groundOutlet], '#a95323', 4);
        line(ctx, [definition.origin, { x: 34, y: -10 }, groundOutlet], '#ffe0a0', 1.3);
    }
    ctx.globalAlpha = fade;
    const count = Math.max(1, Math.ceil((headX - groundOutlet.x) / 7));
    const points = Array.from({ length: count + 1 }, (_, index) => ({
        x: groundOutlet.x + ((headX - groundOutlet.x) * index) / count,
        y: index === 0 ? 0 : Math.sin(index * 2.8) * 1.3,
    }));
    line(ctx, points, '#79421e', 4.3);
    line(ctx, points, '#e6a94c', 2);
    line(ctx, points, '#fff1b5', 0.65);
    if (progress < 1) {
        ellipse(ctx, { x: headX, y: 0 }, 6, 1.7, '#fbe3a0');
        for (let index = 0; index < 3; index++) {
            const cycle = (age / 80 + index * 0.33) % 1;
            ctx.fillStyle = index % 2 ? '#f0c180' : '#916239';
            ctx.fillRect(headX - cycle * 10, -2 - Math.sin(cycle * Math.PI) * 7, 2, 2);
        }
    }
    ctx.restore();
}
export function drawEruption(ctx, definition, sample) {
    const firstHit = definition.hits[0];
    const lastHit = definition.hits.at(-1);
    if (!firstHit || !lastHit)
        return;
    groundTransfer(ctx, definition, sample, firstHit.atMs);
    const age = sample.timeMs - firstHit.atMs;
    const lastEnd = lastHit.atMs + lastHit.durationMs;
    if (age < 0 || sample.timeMs > lastEnd + 200)
        return;
    const rise = clamp(age / 75);
    const decay = 1 - clamp((sample.timeMs - lastEnd + 50) / 170);
    const pressure = definition.hits.reduce((largest, hit) => {
        const hitAge = sample.timeMs - hit.atMs;
        if (hitAge < 0 || hitAge > hit.durationMs)
            return largest;
        return Math.max(largest, Math.sin((hitAge / hit.durationMs) * Math.PI));
    }, 0);
    const finalPressure = clamp((sample.timeMs - lastHit.atMs) / 55);
    const height = Math.min(80, 53 + pressure * 12 + finalPressure * 15) * rise;
    const width = 13 + pressure * 3 + finalPressure * 4;
    const x = definition.target.x;
    const sway = Math.sin(sample.timeMs / 37) * 1.2;
    ctx.save();
    if (decay > 0) {
        ctx.globalAlpha = decay;
        ellipse(ctx, { x, y: 0 }, width * 1.6, 3, '#ba713a');
        polygon(ctx, [
            { x: x - width, y: 0 },
            { x: x - width * 0.72, y: -height * 0.42 },
            { x: x - width * 0.46 + sway, y: -height * 0.93 },
            { x: x - width * 0.05, y: -height * 0.71 },
            { x: x + width * 0.33 + sway, y: -height },
            { x: x + width * 0.56, y: -height * 0.56 },
            { x: x + width * 0.88, y: -height * 0.81 },
            { x: x + width, y: 0 },
        ], '#9e5229');
        polygon(ctx, [
            { x: x - width * 0.65, y: 0 },
            { x: x - width * 0.4, y: -height * 0.48 },
            { x: x - width * 0.25, y: -height * 0.83 },
            { x, y: -height * 0.53 },
            { x: x + width * 0.27, y: -height * 0.91 },
            { x: x + width * 0.68, y: 0 },
        ], '#efac50');
        polygon(ctx, [
            { x: x - width * 0.22, y: 0 },
            { x: x - width * 0.1, y: -height * 0.47 },
            { x: x + width * 0.17, y: -height * 0.73 },
            { x: x + width * 0.32, y: 0 },
        ], '#fff0b2');
        for (let index = 0; index < 5; index++) {
            const fraction = (sample.timeMs / 190 + index / 5) % 1;
            const y = -height * fraction;
            line(ctx, [
                { x: x - width * (0.25 + fraction * 0.2), y: y + 5 },
                { x: x - width * 0.15 + sway, y: y - 4 },
            ], '#ffe5a0', 0.8);
        }
    }
    const emberLife = clamp((sample.timeMs - lastEnd + 80) / 280);
    ctx.globalAlpha = (1 - emberLife) * 0.7;
    ellipse(ctx, { x, y: 0 }, 14 + emberLife * 12, 1.1, '#bc8542');
    for (let index = 0; index < 7; index++) {
        const life = (age / 340 + index * 0.173) % 1;
        const side = index % 2 ? -1 : 1;
        ctx.fillStyle = index % 3 ? '#9d713f' : '#e0b47a';
        ctx.fillRect(Math.round(x + side * (10 + life * (12 + index))), Math.round(-Math.sin(life * Math.PI) * (9 + index * 2)), 2 + (index % 2), 2);
    }
    ctx.restore();
}
function floatingOrb(ctx, point, radius, activation, timeMs) {
    ctx.save();
    const color = activation > 0 ? '#bd8af5' : '#6085be';
    ellipse(ctx, point, radius + 0.8, radius + 0.8, '#1d2946');
    ellipse(ctx, point, radius * 0.82, radius * 0.82, color);
    ellipse(ctx, point, radius * 0.57, radius * 0.57, '#33365f');
    if (activation > 0) {
        ellipse(ctx, point, radius * (0.14 + activation * 0.27), radius * 0.41, '#f8eaff');
    }
    ctx.strokeStyle = activation > 0 ? '#f2d5ff' : '#9bbde5';
    ctx.lineWidth = activation > 0 ? 1.1 : 0.65;
    ctx.beginPath();
    ctx.ellipse(point.x, point.y, radius * 0.98, radius * 0.53, timeMs / 460, 0, Math.PI * 1.8);
    ctx.stroke();
    if (activation > 0) {
        for (const side of [-1, 1]) {
            line(ctx, [
                { x: point.x + side * (radius + 1), y: point.y },
                { x: point.x + side * (radius + 3 + activation * 3), y: point.y },
            ], '#d8b7ff', 0.8);
        }
    }
    ctx.restore();
}
export function drawOrbitHeld(ctx, definition, sample) {
    ctx.save();
    for (const [index, shot] of definition.shots.entries()) {
        const formMs = definition.chargeStartMs + index * 90;
        if (sample.timeMs < formMs || sample.timeMs >= shot.launchMs)
            continue;
        const growth = clamp((sample.timeMs - formMs) / 180);
        const spread = 1 - Math.pow(1 - growth, 3);
        const destination = { x: shot.from.x - shot.radius, y: shot.from.y };
        const point = {
            x: definition.origin.x + (destination.x - definition.origin.x) * spread,
            y: definition.origin.y + (destination.y - definition.origin.y) * spread,
        };
        const activation = clamp((sample.timeMs - shot.launchMs + 90) / 90);
        ctx.globalAlpha = growth;
        floatingOrb(ctx, point, shot.radius * (0.25 + growth * 0.75), activation, sample.timeMs + index * 180);
        if (activation > 0) {
            line(ctx, [
                { x: point.x + shot.radius + 2, y: point.y },
                { x: point.x + shot.radius + 7 + activation * 6, y: point.y },
            ], '#e5c6ff', 0.6);
        }
    }
    ctx.restore();
}
export function drawOrbitShot(ctx, shot, sample) {
    if (!shot.visible)
        return;
    ctx.save();
    // 활성 구체의 조준 섬광도 비행 중에는 실제 선두를 넘지 않게 한다.
    ctx.beginPath();
    ctx.rect(-200, -160, shot.point.x + 200, 220);
    ctx.clip();
    const radius = shot.shot.radius;
    const center = { x: shot.point.x - radius, y: shot.point.y };
    const trail = [75, 45, 20, 0].map((age) => {
        const past = sampleKiShot(shot.shot, Math.max(shot.shot.launchMs, sample.timeMs - age));
        return { x: past.point.x - radius, y: past.point.y };
    });
    ctx.globalAlpha = 0.2;
    line(ctx, trail, '#7d5bb2', radius * 1.1);
    ctx.globalAlpha = 0.55;
    line(ctx, trail.slice(1), '#bfa4e9', 1.5);
    ctx.globalAlpha = 1;
    floatingOrb(ctx, center, radius, 1, sample.timeMs);
    line(ctx, [
        { x: center.x - radius * 0.2, y: center.y },
        { x: shot.point.x - 1, y: center.y },
    ], '#f9eaff', 1.5);
    ctx.restore();
}
export function drawSpatialImpact(ctx, definition, point, ageMs, strength) {
    if (ageMs < 0 || ageMs >= 230)
        return;
    const life = ageMs / 230;
    const size = (10 + life * 16) * (0.7 + strength * 0.3);
    ctx.save();
    ctx.globalAlpha = 1 - life;
    if (definition.style === 'crescent') {
        for (const side of [-1, 1]) {
            const x = point.x + life * 6;
            line(ctx, [
                { x: x - 3, y: point.y + side * (5 + life * 9) },
                { x: x + 2, y: point.y + side * size },
            ], '#dcffff', 1.8 * (1 - life) + 0.3);
            line(ctx, [
                { x: x - 5, y: point.y + side * 5 },
                { x: x - 2, y: point.y + side * (size + 3) },
            ], '#58bdd4', 0.8);
        }
        if (ageMs < 65)
            line(ctx, [
                { x: point.x - 13, y: point.y },
                { x: point.x + 7, y: point.y },
            ], '#f3ffff', 1.3);
    }
    else if (definition.style === 'eruption') {
        for (let index = 0; index < 5; index++) {
            const offset = (index - 2) * 3.3;
            line(ctx, [
                { x: point.x + offset * 0.5, y: point.y + 3 },
                { x: point.x + offset, y: point.y - size * (0.4 + index * 0.08) },
            ], index % 2 ? '#f2ba68' : '#fff2bd', index % 2 ? 0.7 : 1.2);
        }
    }
    else if (definition.style === 'orbit') {
        for (let index = 0; index < 4; index++) {
            const angle = index * Math.PI * 0.5 + 0.6;
            const start = size * 0.2;
            line(ctx, [
                {
                    x: point.x + Math.cos(angle) * start,
                    y: point.y + Math.sin(angle) * start,
                },
                {
                    x: point.x + Math.cos(angle) * size,
                    y: point.y + Math.sin(angle) * size,
                },
            ], index % 2 ? '#c59bec' : '#f3e6ff', index % 2 ? 0.9 : 1.5);
        }
        if (ageMs < 65)
            ellipse(ctx, point, 3 * (1 - life), 5 * (1 - life), '#fff3ff');
    }
    ctx.restore();
}
