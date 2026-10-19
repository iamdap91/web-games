import { clamp, ellipse, line, noise, palette, polygon, ring, smooth, star, } from './drawing.js';
import { battleLayout } from './battle.js';
function drawKanadaLight(ctx, frame) {
    const age = frame.timeMs - battleLayout.contactMs;
    if (age < 0 || age > 1150)
        return;
    const size = frame.reducedMotion ? 0.62 : 1;
    if (!frame.enhanced) {
        ellipse(ctx, 549, 266, (18 + age / 22) * (1 - age / 1150), (18 + age / 22) * (1 - age / 1150), palette.paper);
        return;
    }
    ctx.save();
    const spike = (1 - clamp(age / 470)) * size;
    ctx.globalAlpha *= frame.reducedMotion ? 0.66 : 1;
    if (spike > 0) {
        star(ctx, 549, 266, 186 * spike, palette.gold, 4, -0.13);
        star(ctx, 549, 266, 142 * spike, palette.paper, 4, -0.13);
        ellipse(ctx, 549, 266, 16 * spike, 16 * spike, '#fff9e2');
    }
    const orbit = clamp((age - 70) / 850);
    if (age >= 70) {
        ctx.globalAlpha *= 1 - orbit;
        ctx.translate(549, 266);
        ctx.rotate(-0.47);
        ring(ctx, 0, 0, (26 + orbit * 151) * size, (8 + orbit * 37) * size, palette.paper, 4 - orbit * 2);
        ring(ctx, 0, 0, (17 + orbit * 103) * size, (5 + orbit * 27) * size, palette.gold, 2);
    }
    ctx.restore();
}
function beamAxis(u, length, bend, tipHeight) {
    const v = 1 - u;
    return {
        x: 267 + length * (3 * v * v * u * 0.2 + 3 * v * u * u * 0.72 + u ** 3),
        y: 300 +
            3 * v * v * u * bend -
            3 * v * u * u * bend * 0.8 +
            u ** 3 * tipHeight,
    };
}
function drawKanadaBeam(ctx, frame) {
    const age = frame.timeMs - battleLayout.contactMs;
    if (age < 0 || age > 2100)
        return;
    const progress = clamp(age / 620);
    const fade = 1 - clamp((age - 1500) / 600);
    const length = 548 * smooth(progress);
    const amount = frame.reducedMotion ? 0.45 : 1;
    const cellTime = frame.reducedMotion ? Math.floor(age / 250) * 250 : age;
    const beats = [80, 160, 245, 380, 540, 760, 1020, 1280, 1560, 1800];
    const phase = beats.filter((timeMs) => cellTime >= timeMs).length;
    const bends = [0, -250, 310, -340, 360, -290, 330, -350, 270, -160, 90];
    const tips = [0, -30, 70, -65, 45, 80, -70, 55, -45, 30, 0];
    const bend = bends[phase] * amount * Math.min(1, progress * 1.5);
    const tipHeight = tips[phase] * amount;
    const head = beamAxis(1, length, bend, tipHeight);
    ctx.save();
    ctx.globalAlpha *= fade * (frame.reducedMotion ? 0.72 : 1);
    if (!frame.enhanced) {
        line(ctx, [
            { x: 267, y: 300 },
            { x: 267 + length, y: 300 },
        ], palette.blue, 25);
        ctx.restore();
        return;
    }
    const top = [];
    const bottom = [];
    const axis = [];
    for (let index = 0; index <= 26; index++) {
        const u = index / 26;
        const point = beamAxis(u, length, bend, tipHeight);
        const prior = beamAxis(Math.max(0, u - 0.012), length, bend, tipHeight);
        const next = beamAxis(Math.min(1, u + 0.012), length, bend, tipHeight);
        const distance = Math.max(1, Math.hypot(next.x - prior.x, next.y - prior.y));
        const nx = -(next.y - prior.y) / distance;
        const ny = (next.x - prior.x) / distance;
        const ridge = (7 +
            u * 18 +
            noise(index + phase * 7) * 21 +
            (index % 5 === phase % 5 ? 20 : 0)) *
            (frame.reducedMotion ? 0.7 : 1);
        axis.push(point);
        top.push({ x: point.x + nx * ridge, y: point.y + ny * ridge });
        bottom.unshift({
            x: point.x - nx * ridge * 0.73,
            y: point.y - ny * ridge * 0.73,
        });
    }
    polygon(ctx, [...top, ...bottom], palette.blue);
    line(ctx, top, '#d7f3ed', 3);
    line(ctx, bottom, '#386d9b', 4);
    line(ctx, axis, '#fff5cd', 7);
    for (let index = 0; index < 5; index++) {
        const u = (index + 0.6) / 6;
        const point = beamAxis(u, length, bend, tipHeight);
        const prior = beamAxis(u - 0.015, length, bend, tipHeight);
        ctx.save();
        ctx.translate(point.x, point.y);
        ctx.rotate(Math.atan2(point.y - prior.y, point.x - prior.x));
        polygon(ctx, [
            { x: -12, y: -12 },
            { x: 24, y: -2 },
            { x: 5, y: 12 },
            { x: -21, y: 4 },
        ], '#29475b');
        ctx.restore();
    }
    star(ctx, head.x, head.y, 28 + (phase % 3) * 5, palette.paper, 5, 0.3 + phase * 0.21);
    ctx.restore();
}
function dragonPoint(progress, trail) {
    return {
        x: 292 + progress * 493 - trail * 297,
        y: 269 +
            Math.sin((progress * 2.3 - trail * 1.2) * Math.PI) * 58 +
            trail * trail * 35,
    };
}
function drawDragon(ctx, frame) {
    const age = frame.timeMs - battleLayout.contactMs;
    if (age < 0 || age > 2400)
        return;
    const p = clamp(age / 1900);
    const head = dragonPoint(p, 0);
    const fade = 1 - clamp((age - 1900) / 500);
    ctx.save();
    ctx.globalAlpha *= fade;
    if (!frame.enhanced) {
        ellipse(ctx, head.x, head.y, 38, 23, palette.gold);
        ctx.restore();
        return;
    }
    const count = 38;
    const top = [];
    const bottom = [];
    for (let index = 0; index <= count; index++) {
        const u = index / count;
        const point = dragonPoint(p, u);
        const thick = (1 - u) * 35 + 2;
        top.push({
            x: point.x,
            y: point.y - thick - (index % 4 === 0 ? (1 - u) * 17 : 0),
        });
        bottom.unshift({ x: point.x, y: point.y + thick * 0.65 });
    }
    polygon(ctx, [...top, ...bottom], '#dc7947');
    line(ctx, top, '#f5d374', 3);
    const center = dragonPoint(p, 0);
    const spine = Array.from({ length: count }, (_, index) => dragonPoint(p, index / count));
    line(ctx, spine, '#f8d98f', 11);
    const x = center.x;
    const y = center.y;
    polygon(ctx, [
        { x: x - 29, y: y - 23 },
        { x: x - 38, y: y - 69 },
        { x: x - 7, y: y - 40 },
        { x: x + 12, y: y - 38 },
        { x: x + 53, y: y - 13 },
        { x: x + 34, y: y + 2 },
        { x: x + 65, y: y + 14 },
        { x: x + 16, y: y + 29 },
        { x: x - 27, y: y + 19 },
    ], '#f5ce75');
    polygon(ctx, [
        { x: x + 7, y: y + 7 },
        { x: x + 43, y: y + 12 },
        { x: x + 12, y: y + 18 },
    ], palette.ink);
    line(ctx, [
        { x: x + 2, y: y - 20 },
        { x: x + 17, y: y - 16 },
    ], palette.ink, 5);
    ctx.restore();
}
function drawAraki(ctx, frame) {
    const age = frame.timeMs - battleLayout.contactMs;
    if (age < 0 || age > 1350)
        return;
    const p = clamp(age / 1350);
    if (!frame.enhanced)
        return ellipse(ctx, 503, 277, 12 * (1 - p), 12 * (1 - p), palette.paper);
    ctx.save();
    ctx.globalAlpha *= frame.reducedMotion ? 0.55 : 1;
    const reach = (1 - clamp(age / 430)) * (frame.reducedMotion ? 102 : 224);
    if (reach > 0) {
        line(ctx, [
            { x: 503 - reach, y: 277 + reach * 0.4 },
            { x: 503 + reach, y: 277 - reach * 0.4 },
        ], palette.blue, 8);
        line(ctx, [
            { x: 503 - reach * 0.35, y: 277 - reach },
            { x: 503 + reach * 0.35, y: 277 + reach },
        ], palette.paper, 5);
    }
    for (let index = 0; index < 11; index++) {
        const local = clamp((age - index * 31) / 950);
        if (age < index * 31)
            continue;
        ctx.globalAlpha = (1 - local) * (frame.reducedMotion ? 0.42 : 0.8);
        const x = 503 + (noise(index) - 0.4) * 215 * local;
        const y = 277 - local * (45 + noise(index + 5) * 105);
        ring(ctx, x, y, 3 + local * (4 + (index % 4)), 3 + local * (4 + (index % 4)), index % 2 ? palette.paper : palette.blue, 2);
    }
    ctx.restore();
}
function viscousBody(ctx, head, neck, connected) {
    ctx.beginPath();
    ctx.moveTo(285, 278);
    if (connected) {
        ctx.bezierCurveTo(345, 268, head.x - 77, head.y - neck, head.x - 28, head.y - 38);
        ctx.bezierCurveTo(head.x + 50, head.y - 79, head.x + 82, head.y + 50, head.x + 8, head.y + 46);
        ctx.bezierCurveTo(head.x - 60, head.y + 52, head.x - 84, head.y + neck, 285, 318);
        ctx.bezierCurveTo(237, 330, 246, 263, 285, 278);
    }
    else {
        ctx.moveTo(head.x - 49, head.y - 18);
        ctx.bezierCurveTo(head.x - 17, head.y - 64, head.x + 60, head.y - 38, head.x + 49, head.y + 18);
        ctx.bezierCurveTo(head.x + 31, head.y + 62, head.x - 71, head.y + 55, head.x - 49, head.y - 18);
    }
    ctx.closePath();
    ctx.fillStyle = '#a9d8b6';
    ctx.fill();
    ctx.strokeStyle = '#e8f1bc';
    ctx.lineWidth = 3;
    ctx.stroke();
}
function drawKozuma(ctx, frame) {
    const age = frame.timeMs - battleLayout.contactMs;
    if (age < 0 || age > 2400)
        return;
    const p = clamp(age / 1900);
    const head = { x: 285 + p * 430, y: 300 - Math.sin(p * Math.PI) * 48 };
    ctx.save();
    ctx.globalAlpha *= 1 - clamp((age - 2000) / 400);
    if (!frame.enhanced)
        ellipse(ctx, head.x, head.y, 39, 39, '#a9d8b6');
    else {
        const split = age > 1270;
        viscousBody(ctx, head, Math.max(1.2, 25 * (1 - clamp(age / 1400))), !split);
        if (split) {
            const since = (age - 1270) / 1000;
            ellipse(ctx, 285 + since * 19, 300 + since * 7, 23 - clamp(since) * 13, 31, '#a9d8b6');
            for (let index = 0; index < 5; index++) {
                const x = 380 + index * 34 + since * (24 + index * 18);
                const y = 286 + Math.sin(index * 1.8) * 24 + since * since * 57;
                ellipse(ctx, x, y, (5 + (index % 3) * 3) * (frame.reducedMotion ? 0.7 : 1), 8 + (index % 2) * 8, '#b5dcb7');
            }
        }
    }
    ctx.restore();
}
function drawTatsuzo(ctx, frame) {
    const age = frame.timeMs - battleLayout.contactMs;
    if (age < 0 || age > 2400)
        return;
    const p = clamp(age / 2400);
    const sway = frame.reducedMotion ? 0.35 : 1;
    const a = Math.sin(p * Math.PI * 2) * sway;
    ctx.save();
    ctx.globalAlpha *= smooth(p * 9) * (1 - smooth((p - 0.82) / 0.18));
    if (!frame.enhanced)
        ellipse(ctx, 551, 284, 90, 90, '#070a12');
    else {
        ctx.beginPath();
        ctx.moveTo(361, 311);
        ctx.bezierCurveTo(327, 203 - a * 49, 441, 152 + a * 40, 494, 234);
        ctx.bezierCurveTo(534, 274, 525 + a * 50, 143, 623, 174);
        ctx.bezierCurveTo(742, 208, 733, 341 + a * 25, 639, 342);
        ctx.bezierCurveTo(576, 332, 587 - a * 61, 427, 508, 365);
        ctx.bezierCurveTo(444, 321, 408, 414, 361, 311);
        ctx.closePath();
        ctx.fillStyle = '#070a12';
        ctx.fill();
    }
    ctx.restore();
}
function drawShigeta(ctx, frame) {
    const age = frame.timeMs - battleLayout.contactMs;
    if (age < 0 || age > 1500)
        return;
    const motion = frame.reducedMotion ? 0.55 : 1;
    if (!frame.enhanced) {
        if (age > 300)
            return;
        ctx.save();
        ctx.globalAlpha *= 1 - age / 300;
        for (let i = 0; i < 6; i++) {
            const a = -0.9 + (i / 5) * 1.8;
            line(ctx, [
                { x: 548, y: 300 },
                { x: 548 + Math.cos(a) * 30, y: 300 + Math.sin(a) * 30 },
            ], palette.gold, 2);
        }
        ctx.restore();
        return;
    }
    ctx.save();
    ctx.globalAlpha *= frame.reducedMotion ? 0.65 : 1;
    if (age < 230) {
        const spread = (17 + age * 0.23) * motion;
        const opacity = ctx.globalAlpha;
        ctx.globalAlpha *= 1 - age / 230;
        for (let i = 0; i < 11; i++) {
            const a = -Math.PI + (i / 11) * Math.PI * 2;
            const bend = {
                x: 548 + Math.cos(a) * spread * 0.52,
                y: 300 + Math.sin(a) * spread * 0.52,
            };
            const tip = {
                x: 548 + Math.cos(a + 0.14) * spread,
                y: 300 + Math.sin(a + 0.14) * spread,
            };
            line(ctx, [{ x: 548, y: 300 }, bend, tip], '#f5cf7e', 3);
            line(ctx, [
                bend,
                {
                    x: bend.x + Math.cos(a - 0.5) * spread * 0.31,
                    y: bend.y + Math.sin(a - 0.5) * spread * 0.31,
                },
            ], '#fff0bd', 1.5);
        }
        ellipse(ctx, 548, 300, 5, 5, '#fff5d9');
        ctx.globalAlpha = opacity;
    }
    // 같은 접촉 탄도로 빛줄기와 선두를 그리며 날아간 금속편은 식은 색으로 사라진다.
    for (let i = 0; i < 42; i++) {
        if (frame.reducedMotion && i % 3)
            continue;
        const delayMs = (i % 7) * 31;
        const seconds = (age - delayMs) / 1000;
        const life = 0.38 + noise(i + 29) * 0.52;
        if (seconds < 0 || seconds > life)
            continue;
        const angle = i % 6 ? -1.08 + noise(i) * 2.05 : -2.8 + noise(i) * 0.8;
        const speed = (155 + noise(i + 7) * 310) * motion;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        const gravity = 350 * motion;
        const position = {
            x: 548 + vx * seconds,
            y: 300 + vy * seconds + (gravity * seconds * seconds) / 2,
        };
        const prior = Math.max(0, seconds - 0.026);
        const color = seconds < 0.13
            ? '#fff2c4'
            : seconds < life * 0.63
                ? '#edbc69'
                : '#b76f48';
        ctx.save();
        ctx.globalAlpha *= 1 - smooth((seconds / life - 0.62) / 0.38);
        line(ctx, [
            {
                x: 548 + vx * prior,
                y: 300 + vy * prior + (gravity * prior * prior) / 2,
            },
            position,
        ], color, i % 4 ? 1.4 : 2.2);
        ellipse(ctx, position.x, position.y, 1.5, 1.5, color);
        const splitAt = 0.1 + (i % 4) * 0.035;
        if (seconds > splitAt && i % 3 === 0) {
            const childAge = seconds - splitAt;
            const from = {
                x: 548 + vx * splitAt,
                y: 300 + vy * splitAt + (gravity * splitAt * splitAt) / 2,
            };
            const childVx = vx * 0.68 - vy * 0.22;
            const childVy = vy * 0.7 + vx * 0.22;
            const child = {
                x: from.x + childVx * childAge,
                y: from.y + childVy * childAge + (gravity * childAge * childAge) / 2,
            };
            line(ctx, [
                {
                    x: child.x - childVx * 0.018,
                    y: child.y - (childVy + gravity * childAge) * 0.018,
                },
                child,
            ], '#e5b273', 1);
        }
        ctx.restore();
    }
    ctx.restore();
}
function drawKutsuna(ctx, frame) {
    const age = frame.timeMs - battleLayout.contactMs;
    if (age < 0 || age > 1700)
        return;
    const p = age / 1700;
    ctx.save();
    ctx.globalAlpha *=
        (1 - smooth((p - 0.73) / 0.27)) * (frame.reducedMotion ? 0.62 : 1);
    if (!frame.enhanced)
        line(ctx, [
            { x: 306, y: 303 },
            { x: 421, y: 250 },
            { x: 478, y: 314 },
            { x: 595, y: 258 },
            { x: 779, y: 292 },
        ], palette.blue, 5);
    else {
        const step = Math.floor(age / (frame.reducedMotion ? 270 : 135));
        const spread = frame.reducedMotion ? 0.6 : 1;
        for (let strand = 0; strand < 11; strand++) {
            const points = Array.from({ length: 100 }, (_, i) => {
                const u = i / 99;
                const amp = Math.sin(u * Math.PI) * spread;
                return {
                    x: 296 +
                        u * 486 +
                        Math.sin(u * (34 + strand) + strand * 1.7 + step) * 58 * amp,
                    y: 288 +
                        Math.cos(u * (23 + strand * 2) + strand + step * 0.8) *
                            (28 + noise(strand) * 65) *
                            amp,
                };
            });
            line(ctx, points, strand % 3 ? '#8bc6db' : '#e9f2da', strand % 3 ? 1.5 : 3);
        }
        ellipse(ctx, 296, 288, 9, 9, palette.paper);
        ellipse(ctx, 782, 288, 11, 11, palette.paper);
    }
    ctx.restore();
}
export function drawLightEffects(ctx, id, frame) {
    if (id === 'fx-kanada-light')
        drawKanadaLight(ctx, frame);
    else if (id === 'fx-kanada-beam')
        drawKanadaBeam(ctx, frame);
    else if (id === 'fx-kanada-dragon')
        drawDragon(ctx, frame);
    else if (id === 'fx-araki')
        drawAraki(ctx, frame);
    else if (id === 'fx-kozuma')
        drawKozuma(ctx, frame);
    else if (id === 'fx-tatsuzo')
        drawTatsuzo(ctx, frame);
    else if (id === 'fx-shigeta')
        drawShigeta(ctx, frame);
    else if (id === 'fx-kutsuna')
        drawKutsuna(ctx, frame);
    else
        return false;
    return true;
}
