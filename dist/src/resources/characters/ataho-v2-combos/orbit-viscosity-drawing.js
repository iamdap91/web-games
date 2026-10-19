import { polygon } from './ki-shapes.js';
import { drawKiSprite } from './ki-sprites.js';
/** 연결부의 가는 실만 그리고 뿌리와 끊긴 잔여의 윤곽은 원화에 맡긴다. */
function drawNeck(ctx, tether, inset, color) {
    const dx = tether.to.x - tether.from.x;
    const dy = tether.to.y - tether.from.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 0.5)
        return;
    const normal = { x: -dy / distance, y: dx / distance };
    const upper = [];
    const lower = [];
    for (let step = 0; step <= 16; step += 1) {
        const progress = step / 16;
        const width = (tether.neckRadius * Math.sin(progress * Math.PI) +
            tether.tipRadius * progress ** 5) *
            inset;
        const bend = Math.sin(progress * Math.PI) * tether.bend;
        const center = {
            x: tether.from.x + dx * progress + normal.x * bend,
            y: tether.from.y + dy * progress + normal.y * bend,
        };
        upper.push({
            x: Math.round(center.x + normal.x * width),
            y: Math.round(center.y + normal.y * width),
        });
        lower.push({
            x: Math.round(center.x - normal.x * width),
            y: Math.round(center.y - normal.y * width),
        });
    }
    polygon(ctx, [...upper, ...lower.reverse()], color);
}
export function drawOrbitViscosity(ctx, sample, frames) {
    if (sample.tether) {
        const tether = sample.tether;
        drawNeck(ctx, tether, 1, '#7146aa');
        drawNeck(ctx, tether, 0.55, '#c6a8ff');
        drawKiSprite(ctx, frames, {
            sheet: 'orbit-residue',
            frame: tether.frame,
            point: tether.from,
            width: tether.rootRadius * 3.2,
            height: tether.rootRadius * 3.2,
        });
    }
    if (!sample.droplet)
        return;
    const residue = sample.droplet;
    ctx.save();
    ctx.globalAlpha *= residue.alpha;
    ctx.translate(residue.point.x, residue.point.y);
    ctx.rotate(residue.angle);
    drawKiSprite(ctx, frames, {
        sheet: 'orbit-residue',
        frame: residue.frame,
        point: { x: 0, y: 0 },
        width: residue.radius * 3.2,
        height: residue.radius * 3.2,
    });
    ctx.restore();
}
