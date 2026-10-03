import { clamp } from './event-rules.js';
function drawMachine(ctx, assets, x, scale, lean = 0) {
    ctx.save();
    ctx.fillStyle = '#03080bd0';
    ctx.beginPath();
    ctx.ellipse(x, 342, 66 * scale, 9 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.translate(x, 340);
    ctx.rotate(lean);
    ctx.drawImage(assets.machine, -70 * scale, -250 * scale, 140 * scale, 250 * scale);
    ctx.restore();
}
const portal = { x: 1390, y: 70, width: 260, height: 270 };
function doorOpening(ctx, assets, open, inside) {
    const frames = assets.props.get('개폐 철문');
    const index = Math.round(clamp(open) * 5);
    const frame = frames?.[index];
    if (!frame)
        return;
    ctx.save();
    ctx.filter = 'saturate(0.45) brightness(0.7)';
    ctx.drawImage(frame, portal.x, portal.y, portal.width, portal.height);
    ctx.restore();
    // 원본 프레임의 검은 내부를 실제 방으로 채우되 문짝과 문틀은 남긴다.
    const opening = [0, 22, 56, 102, 150, 172][index];
    if (!opening)
        return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(portal.x + 140 - opening / 2, portal.y + 62, opening, 197);
    ctx.clip();
    inside();
    ctx.restore();
}
export function drawBlackoutChamber(ctx, assets, state) {
    const time = state.anomaly.activeElapsed;
    const arrived = time !== null && time >= 0.32;
    doorOpening(ctx, assets, 1, () => {
        ctx.fillStyle = '#09171a';
        ctx.fillRect(portal.x, portal.y, portal.width, portal.height);
        for (let x = portal.x + 40; x < portal.x + 230; x += 30) {
            ctx.fillStyle = '#233438';
            ctx.fillRect(x, 130, 2, 200);
        }
        if (!arrived) {
            ctx.save();
            ctx.translate(0, -8);
            drawMachine(ctx, assets, portal.x + 140, 0.7);
            ctx.restore();
        }
    });
    if (arrived) {
        const settle = Math.max(0, 1 - ((time ?? 0) - 0.32) / 0.45);
        drawMachine(ctx, assets, state.anomaly.blackoutX, 1.18, Math.sin(settle * 9) * settle * 0.025);
    }
}
