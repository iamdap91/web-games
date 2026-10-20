import { height } from './types.js';
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
const gameCamera = {
    position: { x: 0, y: 5, z: 13 },
    target: { x: 0, y: 3.15, z: 0 },
    focal: 750,
};
/** 기법의 960×540 좌표를 공통 무대의 1280×720 투영에 맞춘다. */
export function gameStage(ctx, frame, options = {}) {
    const camera = options.camera ?? gameCamera;
    const pose = { ...camera, focal: (camera.focal ?? 750) * (4 / 3) };
    const stageOptions = {
        principalY: (options.principalY ?? height / 2) * (4 / 3),
        viewOffsetX: (options.viewOffsetX ?? 0) * (4 / 3),
        focus: options.focus,
    };
    ctx.save();
    ctx.scale(0.75, 0.75);
    const time = (options.timeMs ?? frame.timeMs) / 1000;
    if (options.layer === 'foreground')
        frame.stage.foreground(ctx, options.kind ?? 'arena', pose, time, stageOptions);
    else
        frame.stage.background(ctx, options.kind ?? 'arena', pose, time, stageOptions);
    ctx.restore();
}
/** 배우와 효과의 기본 무대도 실제 본게임 숲 공터를 사용한다. */
export function stage(ctx, frame, timeMs = 0) {
    gameStage(ctx, frame, { timeMs });
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
