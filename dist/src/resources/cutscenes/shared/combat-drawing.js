import { drawSandbag } from '../../characters/ataho-v2-combos/sandbag-drawing.js';
export const gold = '#e8b870';
export const ivory = '#fff0d0';
export const targetDimensions = { width: 54, height: 150 };
/** 조합실의 기존 샌드백 그림을 재사용하며 컷씬의 반응만 시간에서 샘플링한다. */
export function drawTarget(ctx, x, baseY, height, reaction = 0) {
    ctx.save();
    ctx.fillStyle = '#05060875';
    ctx.beginPath();
    ctx.ellipse(x, baseY + 3, height * 0.32, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.translate(x, baseY - height);
    ctx.scale(height / targetDimensions.height, height / targetDimensions.height);
    ctx.beginPath();
    ctx.rect(-160, -150, 320, 320);
    ctx.clip();
    drawSandbag(ctx, {
        anchorX: 0,
        anchorY: -130,
        top: 0,
        width: targetDimensions.width,
        height: targetDimensions.height,
        cornerRadius: 12,
        scale: 2,
        rotation: reaction * 0.12,
        compression: 0,
        offsetY: 0,
        scaleX: 1 + Math.abs(reaction) * 0.08,
        scaleY: 1 - Math.abs(reaction) * 0.05,
        flash: Math.abs(reaction) * 0.8,
        hitHeld: false,
        opacity: 1,
        contacts: [],
    });
    ctx.restore();
}
export function drawImpact(ctx, x, y, ageMs, strength) {
    if (ageMs < 0 || ageMs > 210)
        return;
    const p = ageMs / 210;
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha *= 1 - p;
    ctx.strokeStyle = ivory;
    ctx.lineWidth = (1 - p) * 10 * strength;
    for (let i = 0; i < 10; i++) {
        const angle = i * 2.399;
        const start = (6 + p * 55) * strength;
        const end = (36 + p * (i % 2 === 0 ? 120 : 70)) * strength;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * start, Math.sin(angle) * start * 0.6);
        ctx.lineTo(Math.cos(angle) * end, Math.sin(angle) * end * 0.6);
        ctx.stroke();
    }
    ctx.strokeStyle = gold;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, (25 + p * 115) * strength, (12 + p * 60) * strength, -0.25, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}
