import { frameKey } from './source-frames.js';
export const stageWidth = 900;
export const stageHeight = 410;
const groundY = 325;
const startX = 245;
function drawDojo(ctx) {
    ctx.fillStyle = '#efdfbf';
    ctx.fillRect(0, 0, stageWidth, stageHeight);
    ctx.fillStyle = '#e6cfa7';
    ctx.fillRect(0, 42, stageWidth, groundY - 42);
    ctx.fillStyle = '#7c5844';
    for (const x of [42, 435, 830])
        ctx.fillRect(x, 0, 13, groundY);
    ctx.fillRect(0, 25, stageWidth, 14);
    ctx.fillStyle = '#f7eacb';
    ctx.fillRect(96, 68, 295, 131);
    ctx.fillRect(487, 68, 295, 131);
    ctx.strokeStyle = '#d5b98b';
    ctx.lineWidth = 3;
    for (const x of [170, 245, 320, 560, 635, 710]) {
        ctx.beginPath();
        ctx.moveTo(x, 68);
        ctx.lineTo(x, 199);
        ctx.stroke();
    }
    ctx.fillStyle = '#b88961';
    ctx.fillRect(0, groundY, stageWidth, stageHeight - groundY);
    ctx.strokeStyle = '#946e50';
    ctx.lineWidth = 2;
    for (const y of [groundY + 2, 352, 383]) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(stageWidth, y);
        ctx.stroke();
    }
}
function drawContact(ctx, x, y, elapsed) {
    const progress = Math.min(1, elapsed / 140);
    ctx.save();
    ctx.globalAlpha *= 1 - progress;
    ctx.translate(x, y);
    ctx.strokeStyle = '#fff7d5';
    ctx.lineWidth = 4;
    const radius = 16 + progress * 35;
    for (let i = 0; i < 7; i++) {
        const angle = (i * Math.PI * 2) / 7;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * radius * 0.35, Math.sin(angle) * radius * 0.35);
        ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        ctx.stroke();
    }
    ctx.restore();
}
export function drawCombo(ctx, snapshot, frames, options) {
    drawDojo(ctx);
    const source = frames.get(frameKey(snapshot.step));
    if (!source)
        return;
    const scale = options.scale;
    const moving = options.presentation !== 'poses';
    const x = startX + (moving ? snapshot.x : 0) * scale;
    const y = groundY + (moving ? snapshot.y : 0) * scale;
    ctx.save();
    ctx.globalAlpha = snapshot.opacity;
    const airborne = moving ? Math.max(0, -snapshot.y) : 0;
    ctx.fillStyle = '#59413230';
    ctx.beginPath();
    ctx.ellipse(x, groundY + 3, Math.max(16, 34 - airborne * 0.4), 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.imageSmoothingEnabled = false;
    const anchor = snapshot.step.anchor;
    const anchorX = typeof anchor === 'object' ? anchor.x : source.anchorX;
    const anchorY = typeof anchor === 'object'
        ? anchor.y
        : anchor === 'feet'
            ? source.feetY
            : source.anchorY;
    ctx.drawImage(source.image, Math.round(x - anchorX * scale), Math.round(y - anchorY * scale), source.image.naturalWidth * scale, source.image.naturalHeight * scale);
    if (options.presentation === 'full' &&
        snapshot.step.contact &&
        !snapshot.waiting) {
        drawContact(ctx, x +
            (snapshot.step.contact.reach ??
                (snapshot.step.contact.kind === 'sweep' ? 35 : 26)) *
                scale, groundY - snapshot.step.contact.height * scale, snapshot.stepElapsedMs);
    }
    ctx.restore();
    ctx.fillStyle = '#614630';
    ctx.font = '15px sans-serif';
    ctx.fillText(snapshot.waiting ? '한 동작 완료' : snapshot.step.phase, 28, 391);
}
