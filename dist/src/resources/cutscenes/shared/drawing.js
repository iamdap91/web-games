import { sceneWidth, sceneHeight } from './playback.js';
/** 투명 여백을 잘라 표시하되 생성 원본 픽셀이나 좌우 방향을 변경하지 않는다. */
export function sprite(ctx, source, x, baseY, height) {
    const b = source.bounds;
    const width = (height * (b.right - b.left)) / (b.bottom - b.top);
    ctx.drawImage(source.image, b.left, b.top, b.right - b.left, b.bottom - b.top, Math.round(x - width / 2), Math.round(baseY - height), Math.round(width), Math.round(height));
}
export function animated(frames, timeMs, frameMs = 75) {
    return frames[Math.floor(Math.max(0, timeMs) / frameMs) % frames.length];
}
export function mist(ctx, timeMs, opacity = 1) {
    ctx.save();
    ctx.globalAlpha *= opacity;
    for (let i = 0; i < 40; i++) {
        const phase = (timeMs / (5500 + (i % 5) * 600) + i * 0.173) % 1;
        const x = (i * 173.7 + Math.sin(i) * 63) % sceneWidth;
        const y = 490 - phase * 380;
        ctx.fillStyle = i % 4 === 0 ? '#ffdaad' : '#ac8059';
        ctx.globalAlpha = opacity * Math.sin(phase * Math.PI) * 0.35;
        ctx.fillRect(Math.floor(x), Math.floor(y), i % 3 === 0 ? 3 : 2, 2);
    }
    ctx.restore();
}
export function voidBackground(ctx, timeMs, warm = false) {
    ctx.fillStyle = '#080a0e';
    ctx.fillRect(0, 0, sceneWidth, sceneHeight);
    const glow = ctx.createRadialGradient(480, 310, 10, 480, 310, 460);
    glow.addColorStop(0, warm ? '#36271c' : '#1c2028');
    glow.addColorStop(1, '#080a0e');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, sceneWidth, sceneHeight);
    mist(ctx, timeMs, 0.5);
}
export function stage(ctx, timeMs) {
    ctx.fillStyle = '#171a20';
    ctx.fillRect(0, 0, sceneWidth, sceneHeight);
    const sky = ctx.createLinearGradient(0, 100, 0, 400);
    sky.addColorStop(0, '#383534');
    sky.addColorStop(1, '#62523d');
    ctx.fillStyle = sky;
    ctx.fillRect(110, 100, 740, 285);
    ctx.fillStyle = '#1b1d23';
    for (const x of [88, 274, 470, 666, 852])
        ctx.fillRect(x, 64, 20, 365);
    ctx.fillRect(75, 80, 810, 24);
    ctx.fillRect(75, 195, 810, 9);
    ctx.fillStyle = '#443a32';
    ctx.fillRect(0, 406, sceneWidth, 134);
    ctx.strokeStyle = '#75604745';
    ctx.lineWidth = 1;
    for (let y = 420; y < 540; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(sceneWidth, y);
        ctx.stroke();
    }
    for (const x of [-400, -140, 120, 380, 640, 900, 1160]) {
        ctx.beginPath();
        ctx.moveTo(480 + (x - 480) * 0.5, 406);
        ctx.lineTo(x, 540);
        ctx.stroke();
    }
    mist(ctx, timeMs, 0.25);
}
export function streaks(ctx, timeMs, opacity) {
    ctx.save();
    ctx.globalAlpha *= opacity;
    for (let i = 0; i < 22; i++) {
        const x = ((i * 127 + timeMs * 1.8) % 1600) - 320;
        const y = 60 + ((i * 83) % 400);
        ctx.strokeStyle = i % 4 ? '#ac82543d' : '#ffdfae66';
        ctx.lineWidth = (i % 3) + 1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 90 + (i % 4) * 45, y - 24);
        ctx.stroke();
    }
    ctx.restore();
}
