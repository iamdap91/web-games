import { clamp, ellipse, label, line, mix, noise, palette, polygon, ring, smooth, } from './drawing.js';
function targetAt(timeMs) {
    return {
        x: 714 + Math.sin(timeMs / 370) * 53,
        y: 226 + Math.cos(timeMs / 510) * 61,
    };
}
function craft(ctx, point) {
    polygon(ctx, [
        { x: point.x - 30, y: point.y + 12 },
        { x: point.x + 29, y: point.y },
        { x: point.x - 19, y: point.y - 15 },
        { x: point.x - 8, y: point.y },
    ], '#b5c8ce');
    line(ctx, [
        { x: point.x - 12, y: point.y },
        { x: point.x + 15, y: point.y },
    ], '#2c465a', 3);
}
function missile(ctx, point, prior, color, flame) {
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate(Math.atan2(point.y - prior.y, point.x - prior.x));
    polygon(ctx, [
        { x: 10, y: 0 },
        { x: -7, y: -5 },
        { x: -7, y: 5 },
    ], color);
    if (flame > 0)
        polygon(ctx, [
            { x: -7, y: -3 },
            { x: -7 - flame, y: 0 },
            { x: -7, y: 3 },
        ], '#eec76f');
    ctx.restore();
}
function circusPoint(p, index, enhanced) {
    const arrival = 1970 + index * 93;
    const destination = targetAt(arrival);
    const start = { x: 179 + (index % 3) * 25, y: 385 - (index % 4) * 37 };
    if (!enhanced)
        return {
            x: mix(start.x, destination.x, p),
            y: mix(start.y, destination.y, p),
        };
    const arc = Math.sin(p * Math.PI);
    return {
        x: mix(start.x, destination.x, p) +
            Math.sin(p * Math.PI * 2 + index * 0.85) * arc * 109,
        y: mix(start.y, destination.y, p) +
            Math.sin(p * Math.PI * 2.2 + index * 1.3) * arc * (92 + (index % 3) * 35),
    };
}
function drawItano(ctx, frame) {
    const reduced = frame.reducedMotion;
    const t = reduced ? 1850 : frame.timeMs;
    craft(ctx, targetAt(t));
    for (let index = 0; index < 9; index++) {
        const launch = 800 + index * 93;
        const p = (t - launch) / 1170;
        if (p < 0 || p > 1.15)
            continue;
        const position = circusPoint(clamp(p), index, frame.enhanced);
        if (p <= 1) {
            const points = Array.from({ length: 29 }, (_, step) => circusPoint(clamp(p - 0.32 + (step / 28) * 0.32), index, frame.enhanced));
            line(ctx, points, frame.enhanced ? '#e6e3c199' : '#8da6bb66', frame.enhanced ? 3 : 2);
            missile(ctx, position, circusPoint(clamp(p - 0.006), index, frame.enhanced), palette.paper, 11);
        }
        else {
            const life = (p - 1) / 0.15;
            ctx.save();
            ctx.globalAlpha *= 1 - life;
            ring(ctx, position.x, position.y, 4 + life * 28, 4 + life * 28, palette.gold, 2);
            ctx.restore();
        }
    }
}
function murakiPoint(p, index, enhanced) {
    const movement = !enhanced
        ? p
        : p < 0.43
            ? p * 0.28
            : 0.12 + (1 - (1 - clamp((p - 0.43) / 0.57)) ** 1.6) * 0.88;
    const spread = Math.sin(movement * Math.PI);
    return {
        x: 232 + movement * 555,
        y: 335 -
            movement * 94 +
            (index - 3) * 24 * (1 - movement) +
            (enhanced
                ? Math.sin(movement * Math.PI * 1.7) * (index % 2 ? 113 : -113) * spread
                : 0),
    };
}
function drawMuraki(ctx, frame) {
    const t = frame.reducedMotion ? 1850 : frame.timeMs;
    craft(ctx, { x: 787, y: 241 });
    for (let index = 0; index < 7; index++) {
        const age = t - 790 - index * 61;
        const p = age / 1450;
        if (p < 0 || p > 1)
            continue;
        const head = murakiPoint(p, index, frame.enhanced);
        const trail = Array.from({ length: 25 }, (_, j) => murakiPoint(clamp(p - 0.21 + (j / 24) * 0.21), index, frame.enhanced));
        line(ctx, trail, '#a9bbd58c', frame.enhanced ? 4 : 2);
        const thrust = frame.enhanced && p >= 0.43 ? 36 + Math.sin(age / 71) * 9 : 7;
        missile(ctx, head, murakiPoint(clamp(p - 0.007), index, frame.enhanced), '#dce8e4', thrust);
        if (frame.enhanced && p > 0.43)
            for (let k = 0; k < 4; k++) {
                const tail = murakiPoint(clamp(p - 0.025 - k * 0.032), index, true);
                ellipse(ctx, tail.x, tail.y, 5 + k * 2, 2 + k, '#a9c0d65c');
            }
    }
}
function shardShape(ctx, point, radius, index, color) {
    const points = Array.from({ length: 7 }, (_, k) => {
        const a = (k / 7) * Math.PI * 2;
        const r = radius * (0.55 + noise(index * 11 + k) * 0.65);
        return {
            x: point.x + Math.cos(a) * r,
            y: point.y + Math.sin(a) * r * 0.73,
        };
    });
    polygon(ctx, points, color);
}
function drawIsoDebris(ctx, frame) {
    const age = frame.timeMs - 1030;
    if (age < 0 || age > 2100)
        return;
    const seconds = age / 1000;
    const motion = frame.reducedMotion ? 0.55 : 1;
    ctx.save();
    ctx.globalAlpha *= 1 - smooth((age - 1570) / 530);
    for (let cluster = 0; cluster < 3; cluster++)
        for (let i = 0; i < 7; i++) {
            const index = cluster * 7 + i;
            const fan = clamp((age - 360) / 800);
            const direction = -2.55 + cluster * 0.98;
            const vx = Math.cos(direction) * (144 + cluster * 23);
            const vy = Math.sin(direction) * (180 + cluster * 17);
            const spread = frame.enhanced ? 8 + fan * 48 : 70;
            const x = 550 + vx * seconds * motion + (noise(index) - 0.5) * spread * seconds;
            const y = 390 +
                vy * seconds * motion +
                seconds * seconds * 122 +
                (noise(index + 12) - 0.5) * spread * seconds;
            if (y > 432)
                continue;
            if (frame.enhanced) {
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(((index % 3) - 1) * seconds);
                shardShape(ctx, { x: 0, y: 0 }, (8 + (6 - i) * 2.1) * (1 - fan * 0.24), index, cluster % 2 ? '#9caaa4' : '#657981');
                ctx.restore();
            }
            else
                ellipse(ctx, x, y, 5, 5, '#9caaa4');
        }
    ctx.restore();
}
function cube(ctx, x, y, size, rotation) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    const a = { x: -size, y: -size * 0.55 };
    const b = { x: 0, y: -size };
    const c = { x: size, y: -size * 0.55 };
    const d = { x: 0, y: 0 };
    const e = { x: -size, y: size * 0.6 };
    const f = { x: 0, y: size * 1.05 };
    const g = { x: size, y: size * 0.6 };
    polygon(ctx, [a, b, c, d], '#c9c9ad');
    polygon(ctx, [a, d, f, e], '#778b89');
    polygon(ctx, [d, c, g, f], '#425f70');
    ctx.restore();
}
function drawNakamura(ctx, frame) {
    const age = frame.timeMs - 1100;
    if (age < 0) {
        polygon(ctx, [
            { x: 463, y: 354 },
            { x: 550, y: 328 },
            { x: 643, y: 355 },
            { x: 551, y: 385 },
        ], '#b8bba8');
        polygon(ctx, [
            { x: 463, y: 354 },
            { x: 551, y: 385 },
            { x: 551, y: 422 },
            { x: 463, y: 392 },
        ], '#728b89');
        polygon(ctx, [
            { x: 551, y: 385 },
            { x: 643, y: 355 },
            { x: 643, y: 391 },
            { x: 551, y: 422 },
        ], '#425d6d');
        return;
    }
    if (age > 2350)
        return;
    const motion = frame.reducedMotion ? 0.5 : 1;
    for (let i = 0; i < 16; i++) {
        const s = age / 1000;
        const x = 551 + (noise(i) - 0.5) * s * 330 * motion;
        const y = 389 - (118 + noise(i + 17) * 125) * s * motion + s * s * 151;
        if (y > 431)
            continue;
        const size = 7 + (i % 4) * 5;
        if (frame.enhanced)
            cube(ctx, x, y, size, (noise(i + 9) - 0.5) * s * 3.8);
        else {
            ctx.fillStyle = '#879b93';
            ctx.fillRect(x - 6, y - 6, 12, 12);
        }
    }
    if (frame.enhanced && age > 370)
        for (let i = 0; i < 22; i++) {
            const s = (age - 370) / 1000;
            const x = 551 + (noise(i + 54) - 0.5) * s * 440 * motion;
            const y = 394 - (80 + noise(i + 32) * 125) * s * motion + s * s * 125;
            if (y > 429)
                continue;
            cube(ctx, x, y, 2 + (i % 3) * 1.5, s * (i % 2 ? 3 : -3));
        }
}
function drawMori(ctx, frame) {
    const age = frame.timeMs - 1150;
    if (age < 0 || age > 1800)
        return;
    const s = age / 1000;
    const motion = frame.reducedMotion ? 0.6 : 1;
    ctx.save();
    ctx.globalAlpha *= 1 - smooth((age - 1200) / 600);
    for (let i = 0; i < 19; i++) {
        const angle = -0.75 + noise(i) * 1.5;
        const dist = (36 + s * (100 + noise(i + 8) * 160)) * motion;
        const x = 410 + Math.cos(angle) * dist;
        const y = 310 + Math.sin(angle) * dist + s * s * 28;
        if (!frame.enhanced)
            ellipse(ctx, x, y, 5, 5, '#c1b388');
        else {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle + Math.sin(i) * s * 0.3);
            const length = (18 + (i % 5) * 7) * (1 - clamp(s / 2) * 0.5);
            polygon(ctx, [
                { x: -length, y: -2 },
                { x: -length * 0.2, y: -6 - (i % 3) * 3 },
                { x: length * 0.7, y: -2 },
                { x: length, y: 1 },
                { x: length * 0.25, y: 5 },
                { x: -length * 0.5, y: 7 },
                { x: -length * 0.3, y: 2 },
            ], i % 3 ? '#e4c388' : '#121b2a');
            ctx.restore();
        }
    }
    ctx.restore();
}
function drawAnimeR(ctx, frame) {
    const age = frame.timeMs - 900;
    if (age < 0 || age > 2800)
        return;
    const motion = frame.reducedMotion ? 0.55 : 1;
    for (let i = 0; i < 18; i++) {
        const s = age / 1000;
        const a = -Math.PI + noise(i) * Math.PI;
        const speed = 80 + noise(i + 8) * 160;
        const x = 548 + Math.cos(a) * speed * s * motion;
        const y = 371 + Math.sin(a) * speed * s * motion + s * s * 76;
        if (y > 429)
            continue;
        const dissolveAt = 570 + (i % 5) * 165;
        const split = clamp((age - dissolveAt) / 900);
        if (!frame.enhanced) {
            ctx.save();
            ctx.globalAlpha *= 1 - clamp(age / 2400);
            shardShape(ctx, { x, y }, 13, i, '#d4c7a6');
            ctx.restore();
        }
        else {
            if (split < 1)
                shardShape(ctx, { x, y }, 16 * (1 - split), i, '#d4c7a6');
            if (split > 0 && split < 1)
                for (let piece = 0; piece < 3; piece++) {
                    const dx = (piece - 1) * split * 25;
                    const dy = Math.sin(piece + i) * split * 27;
                    shardShape(ctx, { x: x + dx, y: y + dy }, 5 * Math.sin(split * Math.PI), i + piece, '#a8b3b1');
                }
        }
    }
}
export function drawFlightEffects(ctx, id, frame) {
    if (id === 'fx-itano')
        drawItano(ctx, frame);
    else if (id === 'fx-muraki')
        drawMuraki(ctx, frame);
    else if (id === 'fx-iso-debris')
        drawIsoDebris(ctx, frame);
    else if (id === 'fx-nakamura')
        drawNakamura(ctx, frame);
    else if (id === 'fx-mori')
        drawMori(ctx, frame);
    else if (id === 'fx-anime-r')
        drawAnimeR(ctx, frame);
    else
        return false;
    label(ctx, frame.reducedMotion && (id === 'fx-itano' || id === 'fx-muraki')
        ? '움직임 줄이기 · 고정 경로 도해'
        : frame.enhanced
            ? '궤도 · 추진 · 파편의 묶임과 분열'
            : '직선 경로와 균일한 점으로 비교');
    return true;
}
