import { clamp, ellipse, noise, palette, polygon, ring, smooth, } from './drawing.js';
import { battleLayout } from './battle.js';
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
function simple(ctx, age, color, origin) {
    if (age < 0 || age > 1900)
        return;
    const p = age / 1900;
    ctx.save();
    ctx.globalAlpha *= Math.sin(p * Math.PI);
    ellipse(ctx, origin.x, origin.y - p * 40, 28 + p * 93, 28 + p * 93, color);
    ctx.restore();
}
/** 각진 방사형·창·갈고리를 서로 다른 셀에 써서 확대만으로 폭발을 대신하지 않는다. */
function kanadaFlame(ctx, center, radius, kind, seed, color) {
    let points;
    if (kind === 1) {
        points = [
            { x: -0.25, y: 0.6 },
            { x: -0.5, y: -0.3 },
            { x: -0.12, y: -0.15 },
            { x: 0.04, y: -1.7 },
            { x: 0.3, y: -0.55 },
            { x: 0.75, y: -0.9 },
            { x: 0.35, y: 0.12 },
            { x: 0.13, y: 0.8 },
        ];
    }
    else if (kind === 2) {
        points = [
            { x: -0.9, y: 0.45 },
            { x: -0.8, y: -0.12 },
            { x: -0.23, y: -0.96 },
            { x: 0.5, y: -1.1 },
            { x: 0.97, y: -0.32 },
            { x: 0.3, y: -0.56 },
            { x: 0.04, y: -0.17 },
            { x: 0.67, y: 0.02 },
            { x: 0.28, y: 0.6 },
            { x: -0.15, y: 0.12 },
            { x: -0.45, y: 0.68 },
        ];
    }
    else {
        const count = 12 + (seed % 3) * 2;
        points = Array.from({ length: count }, (_, index) => {
            const angle = (index / count) * Math.PI * 2 + noise(seed + 3) * 0.7;
            const spike = index % 2
                ? 0.24 + noise(index * 3 + seed) * 0.22
                : 0.64 + noise(index + seed * 11) * 0.66;
            return { x: Math.cos(angle) * spike, y: Math.sin(angle) * spike };
        });
    }
    polygon(ctx, points.map((point) => ({
        x: center.x + point.x * radius,
        y: center.y + point.y * radius,
    })), color);
}
function drawKanadaExplosion(ctx, frame) {
    const age = (frame.timeMs - battleLayout.contactMs) * 1.25;
    if (!frame.enhanced)
        return simple(ctx, age, palette.gold, { x: 550, y: 334 });
    if (age < 0 || age >= 1700)
        return;
    const cellTime = frame.reducedMotion ? Math.floor(age / 240) * 240 : age;
    const ends = [65, 110, 185, 260, 360, 485, 650, 900, 1180, 1460, 1700];
    const cell = ends.findIndex((end) => cellTime < end);
    const radii = [21, 84, 156, 104, 145, 117, 136, 97, 72, 45, 24];
    const radius = radii[Math.max(0, cell)] * (frame.reducedMotion ? 0.6 : 1);
    const colors = frame.reducedMotion
        ? ['#b87853', '#c6a365', '#d4c28d']
        : ['#b64c42', '#ed9d53', '#f1deb0'];
    ctx.save();
    ctx.globalAlpha *=
        (frame.reducedMotion ? 0.65 : 1) * (1 - smooth((age - 1300) / 400));
    if (cell === 0) {
        polygon(ctx, [
            { x: 550, y: 334 - radius },
            { x: 550 + radius * 0.45, y: 334 },
            { x: 550, y: 334 + radius },
            { x: 550 - radius * 0.45, y: 334 },
        ], colors[2]);
    }
    else if (cell < 4) {
        for (let layer = 0; layer < 3; layer++) {
            kanadaFlame(ctx, { x: 550 + (cell === 3 ? layer * 11 : 0), y: 334 - layer * 8 }, radius * (1 - layer * 0.24), cell === 1 ? 1 : cell === 3 ? 2 : 0, cell * 19 + layer, colors[layer]);
        }
        if (cell === 3)
            kanadaFlame(ctx, { x: 540, y: 336 }, radius * 0.32, 2, 9, '#342e36');
    }
    else if (cell === 4) {
        for (let branch = 0; branch < 3; branch++) {
            ctx.save();
            ctx.translate(550 + (branch - 1) * radius * 0.44, 334 - radius * 0.12);
            ctx.rotate((branch - 1) * 0.83);
            for (let layer = 0; layer < 3; layer++)
                kanadaFlame(ctx, { x: 0, y: 0 }, radius * (0.7 - layer * 0.16), 1, branch * 3 + layer, colors[layer]);
            ctx.restore();
        }
    }
    else {
        const count = Math.max(2, 12 - cell);
        for (let index = 0; index < count; index++) {
            const angle = (index / count) * Math.PI * 2 - 1.6 + cell * 0.17;
            const spread = (cell - 3) * (frame.reducedMotion ? 9 : 15);
            const center = {
                x: 550 + Math.cos(angle) * spread,
                y: 334 + Math.sin(angle) * spread - (cell - 4) * 7,
            };
            ctx.save();
            ctx.translate(center.x, center.y);
            ctx.rotate(angle + 1.4);
            const size = radius * (0.4 + noise(index + cell * 17) * 0.23);
            kanadaFlame(ctx, { x: 0, y: 0 }, size, index % 3 === 0 ? 0 : 2, index + cell * 7, colors[0]);
            kanadaFlame(ctx, { x: 0, y: -size * 0.1 }, size * 0.68, 2, index + cell * 7, colors[1]);
            ctx.restore();
        }
    }
    ctx.restore();
}
function drawAnno(ctx, frame) {
    const age = (frame.timeMs - battleLayout.contactMs) * 1.25;
    if (!frame.enhanced)
        return simple(ctx, age, '#847f7e', { x: 546, y: 407 });
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
        ellipse(ctx, 546, 407 - age * 0.19, 28 * (1 - age / 310), 74 * (1 - age / 310), '#f5dfb2');
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
    const age = (frame.timeMs - battleLayout.contactMs) * 1.25;
    if (!frame.enhanced)
        return simple(ctx, age, '#a9aca7', { x: 548, y: 352 });
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
    const age = (frame.timeMs - battleLayout.contactMs) * 1.25;
    if (!frame.enhanced)
        return simple(ctx, age, '#c8c8bb', { x: 548, y: 387 });
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
    const age = (frame.timeMs - battleLayout.contactMs) * 1.25;
    if (!frame.enhanced)
        return simple(ctx, age, '#b8b4a8', { x: 548, y: 372 });
    if (age < 0 || age > 2800)
        return;
    const p = age / 2800;
    const grow = smooth(age / 660);
    ctx.save();
    ctx.globalAlpha *= 1 - smooth((p - 0.72) / 0.28);
    // 내부 음영 없이 같은 색 외곽의 겹침과 분열만으로 연기를 읽힌다.
    for (let i = 0; i < 8; i++) {
        const drift = frame.reducedMotion ? 0 : p * (70 + i * 12);
        const x = 548 + (i - 3.5) * 35 * grow + drift;
        const y = 372 - Math.sin(i * 0.73 + p * 2) * 23 * grow;
        const rx = (30 + (i % 3) * 13) * grow * (1 + p * 0.2);
        polygon(ctx, cloudPoints(x, y, rx, (31 + (i % 4) * 9) * grow, p * 2, i), '#bbb8ac');
    }
    ctx.restore();
}
function drawYoshinari(ctx, frame) {
    const age = (frame.timeMs - battleLayout.contactMs) * 1.25;
    if (!frame.enhanced)
        return simple(ctx, age, '#cfae72', { x: 548, y: 325 });
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
    const age = (frame.timeMs - battleLayout.contactMs) * 1.25;
    if (!frame.enhanced)
        return simple(ctx, age, '#d58d5b', { x: 550, y: 330 });
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
    return true;
}
