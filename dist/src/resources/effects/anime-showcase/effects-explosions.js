import { clamp, ellipse, label, noise, palette, polygon, ring, smooth, } from './drawing.js';
function cloudPoints(x, y, rx, ry, phase, seed) {
    return Array.from({ length: 56 }, (_, index) => {
        const a = (index / 56) * Math.PI * 2;
        const r = 1 +
            Math.sin(a * 5 + seed + phase) * 0.11 +
            Math.cos(a * 9 - phase * 0.7) * 0.055;
        return { x: x + Math.cos(a) * rx * r, y: y + Math.sin(a) * ry * r };
    });
}
function path(ctx, points) {
    ctx.beginPath();
    points.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
    ctx.closePath();
}
function simple(ctx, age, color = palette.gold) {
    if (age < 0 || age > 1900)
        return;
    const p = age / 1900;
    ctx.save();
    ctx.globalAlpha *= Math.sin(p * Math.PI);
    ellipse(ctx, 548, 332 - p * 40, 28 + p * 93, 28 + p * 93, color);
    ctx.restore();
}
function drawKanadaExplosion(ctx, frame) {
    const age = frame.timeMs - 1050;
    if (!frame.enhanced)
        return simple(ctx, age);
    if (age < 0 || age > 1700)
        return;
    const p = clamp(age / 1700);
    const expand = 1 - (1 - clamp(age / 510)) ** 3;
    const size = frame.reducedMotion ? 0.68 : 1;
    ctx.save();
    ctx.globalAlpha *= 1 - smooth((p - 0.57) / 0.43);
    for (let layer = 0; layer < 3; layer++) {
        const radius = (135 - layer * 31) * expand * size;
        const points = Array.from({ length: 30 }, (_, i) => {
            const a = (i / 30) * Math.PI * 2;
            const spike = i % 2 ? 0.43 + noise(i + 8) * 0.22 : 1 + noise(i + layer) * 0.49;
            return {
                x: 550 + Math.cos(a) * radius * spike,
                y: 334 + Math.sin(a) * radius * spike * 1.07,
            };
        });
        polygon(ctx, points, ['#dd654d', '#f2bc62', '#f7e7a9'][layer]);
    }
    if (age > 210)
        for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2 + 0.13;
            const fly = (age - 210) / 1200;
            const radius = 75 + fly * 143 * size;
            const x = 550 + Math.cos(a) * radius;
            const y = 334 + Math.sin(a) * radius;
            polygon(ctx, [
                { x, y },
                {
                    x: x + Math.cos(a) * 34 * (1 - p),
                    y: y + Math.sin(a) * 34 * (1 - p),
                },
                { x: x - Math.sin(a) * 6, y: y + Math.cos(a) * 6 },
            ], palette.paper);
        }
    ctx.restore();
}
function drawAnno(ctx, frame) {
    const age = frame.timeMs - 800;
    if (!frame.enhanced)
        return simple(ctx, age, '#847f7e');
    if (age < 0 || age > 2900)
        return;
    const p = age / 2900;
    const motion = frame.reducedMotion ? 0.65 : 1;
    ctx.save();
    ctx.globalAlpha *= 1 - smooth((p - 0.75) / 0.25);
    const rise = smooth(age / 1300);
    for (let i = 0; i < 7; i++) {
        const local = clamp((age - i * 47) / 670);
        const x = 546 + Math.sin(i * 4.3) * (38 + i * 3) * local;
        const y = 393 - rise * (50 + i * 25) * motion;
        polygon(ctx, cloudPoints(x, y, (25 + i * 7) * local, (35 + i * 6) * local, p * 2, i), i % 2 ? '#4d4b55' : '#777272');
    }
    for (let i = 0; i < 8; i++) {
        const side = i % 2 ? 1 : -1;
        const x = 546 + side * (25 + i * 16) * rise;
        polygon(ctx, cloudPoints(x, 409 - (i % 3) * 9, 22 + rise * 19, 13 + rise * 7, p, i), '#55505a');
    }
    if (age < 310)
        ellipse(ctx, 546, 381 - age * 0.19, 28 * (1 - age / 310), 74 * (1 - age / 310), '#f5dfb2');
    for (let i = 0; i < 59; i++) {
        const a = -Math.PI + noise(i) * Math.PI;
        const speed = 95 + noise(i + 12) * 230;
        const seconds = age / 1000;
        const x = 546 + Math.cos(a) * speed * seconds * motion;
        const y = 407 + Math.sin(a) * speed * seconds * motion + seconds * seconds * 95;
        if (y > 426)
            continue;
        const r = 1 + noise(i + 28) * 3;
        ellipse(ctx, x, y, r, r * 1.5, i % 4 ? '#302d39' : '#b8ac9b');
    }
    ctx.restore();
}
function drawIso(ctx, frame) {
    const age = frame.timeMs - 850;
    if (!frame.enhanced)
        return simple(ctx, age, '#a9aca7');
    if (age < 0 || age > 2900)
        return;
    ctx.save();
    ctx.globalAlpha *= 1 - smooth((age - 2300) / 600);
    const motion = frame.reducedMotion ? 0.55 : 1;
    for (let i = 0; i < 6; i++) {
        const localAge = age - i * 65;
        if (localAge < 0)
            continue;
        const grow = 1 - (1 - clamp(localAge / 1150)) ** 3;
        const phase = localAge / 950;
        const x = 548 + Math.cos(i * 2.25) * 71 * grow + Math.sin(phase + i) * 14 * motion;
        const y = 352 - grow * (32 + (i % 3) * 29) * motion;
        const radius = (55 + (i % 3) * 16) * grow;
        const points = cloudPoints(x, y, radius * (1 + Math.sin(phase) * 0.1), radius * 0.91, phase * motion, i);
        polygon(ctx, points, i % 2 ? '#c5c6b9' : '#aeb9b1');
        ctx.save();
        path(ctx, points);
        ctx.clip();
        ctx.fillStyle = '#596b6a';
        ctx.beginPath();
        ctx.moveTo(x - radius, y + radius * 0.5);
        ctx.bezierCurveTo(x + radius * Math.sin(phase) * 0.5, y - radius * 0.8, x + radius * 1.3, y - radius * 0.25, x + radius * 0.5, y + radius * 0.6);
        ctx.bezierCurveTo(x + radius * 0.05, y + radius * 0.92, x - radius * 0.5, y + radius * 0.06, x - radius, y + radius * 0.5);
        ctx.fill();
        ctx.strokeStyle = '#8fa29b';
        ctx.lineWidth = Math.max(2, radius * 0.14);
        ctx.beginPath();
        ctx.arc(x + Math.sin(phase * 1.5) * radius * 0.24, y + radius * 0.05, radius * 0.43, phase * 0.7, phase * 0.7 + Math.PI * 1.45);
        ctx.stroke();
        ctx.restore();
    }
    ctx.restore();
}
function drawHashimoto(ctx, frame) {
    const age = frame.timeMs - 950;
    if (!frame.enhanced)
        return simple(ctx, age, '#c8c8bb');
    if (age < 0 || age > 2600)
        return;
    const motion = frame.reducedMotion ? 0.6 : 1;
    ctx.save();
    ctx.globalAlpha *= 1 - smooth((age - 2050) / 550);
    for (let i = 0; i < 9; i++) {
        const local = age - i * 42;
        if (local < 0)
            continue;
        const p = clamp(local / 1100);
        const rise = smooth(local / 370);
        const squash = 1 - rise;
        const x = 548 + Math.cos(i * 2.4) * p * 107 * motion;
        const y = 387 - (26 + (i % 4) * 29) * rise * motion - p * 40 * motion;
        const radius = (19 + rise * (27 + (i % 3) * 7)) * (1 - p * 0.2);
        ellipse(ctx, x, y, radius * (1 + squash * 0.85), radius * (0.28 + rise * 0.85), '#242934');
        ellipse(ctx, x, y - 2, Math.max(1, radius * (1 + squash * 0.85) - 3), Math.max(1, radius * (0.28 + rise * 0.85) - 3), '#d8d7c5');
    }
    for (let i = 0; i < 12; i++) {
        const seconds = age / 1000;
        const x = 548 + (noise(i) - 0.5) * seconds * 270 * motion;
        const y = 388 -
            seconds * (80 + noise(i + 6) * 125) * motion +
            seconds * seconds * 98;
        if (y > 420)
            continue;
        polygon(ctx, [
            { x: x - 4, y },
            { x, y: y - 7 },
            { x: x + 6, y: y + 2 },
            { x: x + 2, y: y + 6 },
        ], '#101725');
    }
    ctx.restore();
}
function drawNorio(ctx, frame) {
    const age = frame.timeMs - 900;
    if (!frame.enhanced)
        return simple(ctx, age, '#b8b4a8');
    if (age < 0 || age > 2800)
        return;
    const p = age / 2800;
    const grow = smooth(age / 660);
    ctx.save();
    ctx.globalAlpha *= 1 - smooth((p - 0.72) / 0.28);
    // 내부 음영 없이 같은 색 외곽의 겹침과 분열만으로 연기를 읽힌다.
    for (let i = 0; i < 8; i++) {
        const drift = frame.reducedMotion ? 0 : p * (70 + i * 12);
        const x = 380 + i * 35 + drift;
        const y = 372 - Math.sin(i * 0.73 + p * 2) * 23 * grow;
        const rx = (30 + (i % 3) * 13) * grow * (1 + p * 0.2);
        polygon(ctx, cloudPoints(x, y, rx, (31 + (i % 4) * 9) * grow, p * 2, i), '#bbb8ac');
    }
    ctx.restore();
}
function drawYoshinari(ctx, frame) {
    const age = frame.timeMs - 920;
    if (!frame.enhanced)
        return simple(ctx, age, '#cfae72');
    if (age < 0 || age > 2350)
        return;
    const p = age / 2350;
    const grow = 1 - (1 - clamp(age / 770)) ** 3;
    const scale = frame.reducedMotion ? 0.72 : 1;
    ctx.save();
    ctx.globalAlpha *= 1 - smooth((p - 0.66) / 0.34);
    polygon(ctx, cloudPoints(548, 325, 130 * grow * scale, 118 * grow * scale, p, 2), '#b9634e');
    polygon(ctx, cloudPoints(543, 316, 105 * grow * scale, 88 * grow * scale, p + 1, 4), '#e6b46b');
    for (let i = 0; i < 42; i++) {
        const a = i * 2.399;
        const r = Math.sqrt((i + 0.5) / 42) * 141 * grow * scale;
        const x = 548 + Math.cos(a) * r;
        const y = 325 + Math.sin(a) * r * 0.84;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(a + p * 0.8);
        const length = (11 + (i % 4) * 5) * (1 - p * 0.4);
        ctx.beginPath();
        ctx.moveTo(-length * 0.25, -length * 0.5);
        ctx.quadraticCurveTo(length * 0.65, -length * 0.03, length * 0.25, length * 0.54);
        ctx.quadraticCurveTo(length * 0.2, length * 0.08, -length * 0.12, length * 0.12);
        ctx.closePath();
        ctx.fillStyle = i % 3 ? '#f9df9b' : '#8b4b4b';
        ctx.fill();
        ctx.restore();
    }
    ctx.restore();
}
function drawOki(ctx, frame) {
    const age = frame.timeMs - 840;
    if (!frame.enhanced)
        return simple(ctx, age, '#d58d5b');
    if (age < 0 || age > 2900)
        return;
    const whole = smooth(age / 370) * (1 - smooth((age - 2400) / 500));
    ctx.save();
    ctx.globalAlpha *= whole;
    const tempo = frame.reducedMotion ? 0.45 : 1;
    for (let i = 0; i < 35; i++) {
        const cycle = ((age * tempo + i * 73) % (720 + (i % 4) * 113)) / (720 + (i % 4) * 113);
        const a = i * 2.399;
        const spread = Math.sqrt((i + 0.5) / 35) * 139 * smooth(age / 850);
        const x = 550 + Math.cos(a) * spread;
        const y = 330 + Math.sin(a) * spread * 0.75 - cycle * 25;
        const radius = (13 + (i % 4) * 5) * Math.sin(cycle * Math.PI) * whole;
        ellipse(ctx, x, y, radius, radius * 0.93, '#4b353a');
        ellipse(ctx, x - 1, y - 2, Math.max(0.1, radius - 2), Math.max(0.1, radius * 0.93 - 2), i % 3 ? '#d48b57' : '#f2bb69');
        if (radius > 8)
            ring(ctx, x - radius * 0.2, y - radius * 0.15, radius * 0.48, radius * 0.43, '#f8d292', 1.5);
    }
    ctx.restore();
}
export function drawExplosionEffects(ctx, id, frame) {
    if (id === 'fx-kanada-explosion')
        drawKanadaExplosion(ctx, frame);
    else if (id === 'fx-anno')
        drawAnno(ctx, frame);
    else if (id === 'fx-iso-explosion')
        drawIso(ctx, frame);
    else if (id === 'fx-hashimoto')
        drawHashimoto(ctx, frame);
    else if (id === 'fx-norio')
        drawNorio(ctx, frame);
    else if (id === 'fx-yoshinari')
        drawYoshinari(ctx, frame);
    else if (id === 'fx-oki')
        drawOki(ctx, frame);
    else
        return false;
    label(ctx, frame.enhanced
        ? '외곽 · 내부의 면 · 남는 순서를 비교'
        : '한 덩어리가 커졌다 사라지는 기본 표현');
    return true;
}
