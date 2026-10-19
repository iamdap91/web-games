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
/** 견본의 기본 무대만 그리며 배우의 자세와 시간은 호출한 견본이 소유한다. */
export function stage(ctx, timeMs = 0) {
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#172237');
    sky.addColorStop(1, '#534a57');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);
    ellipse(ctx, 765, 105, 54, 54, '#e8d6b3');
    for (let layer = 0; layer < 3; layer++) {
        const offset = Math.sin(timeMs / 6000) * layer * 4;
        polygon(ctx, [
            { x: -50, y: height },
            { x: -50, y: 250 + layer * 54 },
            { x: 110 + offset, y: 140 + layer * 65 },
            { x: 300 + offset, y: 265 + layer * 35 },
            { x: 515 + offset, y: 180 + layer * 60 },
            { x: 745 + offset, y: 285 + layer * 45 },
            { x: 1010, y: 200 + layer * 50 },
            { x: 1010, y: height },
        ], ['#344254', '#293547', '#202b3b'][layer]);
    }
    ctx.fillStyle = '#242a37';
    ctx.fillRect(0, 410, width, 130);
    ctx.strokeStyle = '#65717b30';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++)
        line(ctx, [
            { x: 480 + (i - 4) * 100, y: 410 },
            { x: 480 + (i - 4) * 240, y: 540 },
        ], '#69748730', 1);
    for (const y of [430, 464, 515])
        line(ctx, [
            { x: 0, y },
            { x: 960, y },
        ], '#69748730', 1);
}
/** 간단한 관절을 가진 견본용 도형 배우이며 기존 캐릭터 원화를 변형하지 않는다. */
export function actor(ctx, x, ground = 420, scale = 1, pose = {}) {
    ctx.save();
    ctx.translate(x, ground);
    ctx.scale(scale * (pose.facing ?? 1), scale);
    const crouch = pose.crouch ?? 0;
    const lean = pose.lean ?? 0;
    const hip = { x: lean * 0.35, y: -75 + crouch * 24 };
    const shoulder = { x: lean, y: -135 + crouch * 43 };
    const color = pose.silhouette ? palette.ink : (pose.color ?? palette.gold);
    ellipse(ctx, 0, 4, 39, 8, '#070b1355');
    line(ctx, [
        { x: -24, y: 0 },
        { x: -22 + hip.x, y: -36 + crouch * 13 },
        hip,
        { x: 23 + hip.x, y: -35 + crouch * 12 },
        { x: 32 + (pose.kick ?? 0) * 65, y: -(pose.kick ?? 0) * 73 },
    ], color, 17);
    line(ctx, [hip, shoulder], color, 39);
    const arm = pose.arm ?? 0;
    line(ctx, [
        { x: shoulder.x - 7, y: shoulder.y + 7 },
        { x: shoulder.x - 31, y: shoulder.y + 40 },
        { x: shoulder.x - 13, y: shoulder.y + 63 },
    ], color, 13);
    line(ctx, [
        { x: shoulder.x + 10, y: shoulder.y + 4 },
        { x: shoulder.x + 30 + arm * 17, y: shoulder.y + 29 - arm * 24 },
        { x: shoulder.x + 40 + arm * 60, y: shoulder.y + 52 - arm * 47 },
    ], color, 14);
    ellipse(ctx, shoulder.x + (pose.headTurn ?? 0) * 5, shoulder.y - 28, 22, 27, color);
    if (!pose.silhouette) {
        line(ctx, [
            { x: shoulder.x + 8, y: shoulder.y - 29 },
            { x: shoulder.x + 15, y: shoulder.y - 29 },
        ], palette.ink, 3);
        ctx.fillStyle = palette.paper;
        ctx.fillRect(hip.x - 22, hip.y - 8, 45, 6);
    }
    ctx.restore();
}
export function face(ctx, x = 480, y = 280, scale = 1, emotion = 'calm') {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ellipse(ctx, 0, 0, 100, 116, palette.gold);
    polygon(ctx, [
        { x: -100, y: -22 },
        { x: -107, y: -98 },
        { x: -49, y: -126 },
        { x: 29, y: -130 },
        { x: 94, y: -85 },
        { x: 100, y: -20 },
        { x: 47, y: -67 },
        { x: -5, y: -44 },
        { x: -40, y: -73 },
    ], palette.ink);
    const empty = emotion === 'empty';
    const white = emotion === 'white';
    for (const s of [-1, 1]) {
        const eyeX = s * 37;
        if (white)
            ellipse(ctx, eyeX, -3, 22, 23, palette.paper);
        else if (empty)
            ellipse(ctx, eyeX, -4, 19, 15, '#5a4b44');
        else {
            ellipse(ctx, eyeX, -4, 20, 16, palette.paper);
            ellipse(ctx, eyeX + (emotion === 'shock' ? 0 : 3), -4, emotion === 'shock' ? 5 : 8, emotion === 'shock' ? 7 : 11, palette.ink);
        }
        line(ctx, [
            { x: eyeX - 22, y: -31 + (emotion === 'anger' ? s * 8 : 0) },
            { x: eyeX + 20, y: -31 - (emotion === 'anger' ? s * 8 : 0) },
        ], palette.ink, 6);
    }
    if (emotion === 'shock' || white)
        ellipse(ctx, 0, 53, 13, 19, palette.ink);
    else if (emotion === 'sad')
        line(ctx, [
            { x: -17, y: 65 },
            { x: 0, y: 58 },
            { x: 17, y: 65 },
        ], palette.ink, 4);
    else
        line(ctx, [
            { x: -17, y: 56 },
            { x: 16, y: 53 },
        ], palette.ink, 4);
    ctx.restore();
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
