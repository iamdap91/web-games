import { height, width } from './types.js';
export const palette = {
    ink: '#121727',
    paper: '#f5e8cb',
    gold: '#edb85b',
    blue: '#81bdd5',
    red: '#e47867',
    purple: '#9d83c0',
};
export const clamp = (v) => Math.max(0, Math.min(1, v));
export const smooth = (v) => {
    const p = clamp(v);
    return p * p * (3 - 2 * p);
};
export const mix = (a, b, p) => a + (b - a) * p;
export const noise = (i) => {
    const n = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return n - Math.floor(n);
};
export const windowed = (t, begin, end, fade = 200) => smooth((t - begin) / fade) * (1 - smooth((t - end) / fade));
export function line(ctx, points, color = palette.paper, thickness = 3) {
    if (!points[0])
        return;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (const point of points.slice(1))
        ctx.lineTo(point.x, point.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
}
export function polygon(ctx, points, color) {
    if (!points[0])
        return;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (const point of points.slice(1))
        ctx.lineTo(point.x, point.y);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
}
export function ellipse(ctx, x, y, rx, ry, color) {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), 0, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
}
export function star(ctx, x, y, radius, color = palette.paper, points = 4, rotation = 0) {
    polygon(ctx, Array.from({ length: points * 2 }, (_, i) => {
        const a = rotation + (i * Math.PI) / points;
        const r = radius * (i % 2 ? 0.14 : 1);
        return { x: x + Math.cos(a) * r, y: y + Math.sin(a) * r };
    }), color);
}
export function ring(ctx, x, y, rx, ry, color = palette.gold, thickness = 3) {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), 0, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    ctx.stroke();
}
/** 서리갈기 곰왕과 맞서는 설원 무대. 두 배우와 효과의 대비를 위한 낮은 채도다. */
export function stage(ctx, timeMs = 0) {
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#182738');
    sky.addColorStop(1, '#738d9b');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);
    ellipse(ctx, 765, 95, 43, 43, '#d6e5e8');
    for (let layer = 0; layer < 3; layer++) {
        const offset = Math.sin(timeMs / 6000) * layer * 3;
        polygon(ctx, [
            { x: -50, y: 430 },
            { x: 110 + offset, y: 110 + layer * 66 },
            { x: 280 + offset, y: 290 + layer * 28 },
            { x: 480 + offset, y: 170 + layer * 52 },
            { x: 730 + offset, y: 300 + layer * 20 },
            { x: 1010, y: 180 + layer * 56 },
            { x: 1010, y: 540 },
            { x: -50, y: 540 },
        ], ['#7495a3', '#547888', '#355a70'][layer]);
    }
    for (const x of [70, 185, 810, 910]) {
        line(ctx, [
            { x, y: 185 },
            { x, y: 440 },
        ], '#264a5b', 9);
        for (let i = 0; i < 5; i++)
            polygon(ctx, [
                { x, y: 160 + i * 38 },
                { x: x - 38 - i * 7, y: 230 + i * 38 },
                { x: x + 38 + i * 7, y: 230 + i * 38 },
            ], i % 2 ? '#adc9ce' : '#6c969f');
    }
    const snow = ctx.createLinearGradient(0, 405, 0, 540);
    snow.addColorStop(0, '#adc8cf');
    snow.addColorStop(1, '#688b9d');
    ctx.fillStyle = snow;
    ctx.fillRect(0, 410, width, 130);
    for (let i = 0; i < 23; i++) {
        const x = noise(i + 20) * 960, y = 421 + noise(i + 70) * 110;
        line(ctx, [
            { x, y },
            { x: x + 20 + noise(i) * 35, y: y + 2 },
        ], '#d6e6e84d', 2);
    }
}
export function burst(ctx, x, y, progress, color = palette.gold, count = 14) {
    const p = clamp(progress);
    ctx.save();
    ctx.globalAlpha *= 1 - p;
    for (let i = 0; i < count; i++) {
        const angle = (i * Math.PI * 2) / count + noise(i) * 0.15;
        const start = 12 + p * 50;
        const end = 40 + p * (90 + noise(i) * 80);
        line(ctx, [
            { x: x + Math.cos(angle) * start, y: y + Math.sin(angle) * start },
            { x: x + Math.cos(angle) * end, y: y + Math.sin(angle) * end },
        ], color, 5 * (1 - p) + 1);
    }
    ctx.restore();
}
export function label(ctx, text, x = 40, y = 492) {
    ctx.save();
    ctx.font = '16px sans-serif';
    ctx.fillStyle = palette.paper;
    ctx.globalAlpha *= 0.8;
    ctx.fillText(text, x, y);
    ctx.restore();
}
