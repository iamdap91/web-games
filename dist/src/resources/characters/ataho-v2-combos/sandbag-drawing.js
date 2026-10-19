import { groundY } from './pose-drawing.js';
import { sandbagBodyTransform } from './sandbag.js';
function bagOutline(ctx, state) {
    const left = -state.width * 0.5;
    const right = state.width * 0.5;
    const radius = state.cornerRadius;
    ctx.beginPath();
    ctx.moveTo(left + radius, 0);
    ctx.lineTo(right - radius, 0);
    ctx.arcTo(right, 0, right, radius, radius);
    ctx.lineTo(right, state.height - radius);
    ctx.arcTo(right, state.height, right - radius, state.height, radius);
    ctx.lineTo(left + radius, state.height);
    ctx.arcTo(left, state.height, left, state.height - radius, radius);
    ctx.lineTo(left, radius);
    ctx.arcTo(left, 0, left + radius, 0, radius);
    ctx.closePath();
}
function drawBagMaterial(ctx, state) {
    bagOutline(ctx, state);
    ctx.fillStyle = '#98654b';
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#b98460';
    ctx.fillRect(-state.width * 0.3, 0, state.width * 0.25, state.height);
    ctx.fillStyle = '#704b3c';
    ctx.fillRect(state.width * 0.29, 0, state.width * 0.3, state.height);
    ctx.fillStyle = '#58453d';
    for (const y of [state.scale * 6, state.height - state.scale * 12]) {
        ctx.fillRect(-state.width * 0.5, y, state.width, state.scale * 5);
    }
    ctx.strokeStyle = '#d9b28a';
    ctx.lineWidth = state.scale * 0.6;
    ctx.setLineDash([state.scale * 2, state.scale * 2]);
    ctx.beginPath();
    ctx.moveTo(state.width * 0.12, state.scale * 13);
    ctx.lineTo(state.width * 0.12, state.height - state.scale * 14);
    ctx.stroke();
    ctx.setLineDash([]);
    if (state.flash > 0) {
        ctx.globalAlpha *= state.flash * 0.65;
        ctx.fillStyle = '#fff3c9';
        ctx.fillRect(-state.width * 0.5, 0, state.width, state.height);
    }
    ctx.restore();
    bagOutline(ctx, state);
    ctx.strokeStyle = '#513c32';
    ctx.lineWidth = state.scale;
    ctx.stroke();
}
/** 도장 좌표에서 지지점은 고정하고 줄·몸통만 충격 방향으로 흔든다. */
export function drawSandbag(ctx, state, jitter = { x: 0, y: 0 }) {
    ctx.save();
    ctx.globalAlpha *= state.opacity;
    const transform = sandbagBodyTransform(state);
    ctx.fillStyle = '#59413225';
    ctx.beginPath();
    ctx.ellipse(transform.c * state.height + transform.e, groundY + 7, state.width * 0.65, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    const bodyTransform = {
        ...transform,
        e: transform.e + jitter.x,
        f: transform.f + jitter.y,
    };
    ctx.strokeStyle = '#513f34';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(state.anchorX - state.width * 0.65, state.anchorY - 4);
    ctx.lineTo(state.anchorX + state.width * 0.65, state.anchorY - 4);
    ctx.stroke();
    ctx.strokeStyle = '#665c51';
    ctx.lineWidth = 2;
    for (const direction of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(state.anchorX, state.anchorY);
        ctx.lineTo(bodyTransform.a * state.width * 0.23 * direction + bodyTransform.e, bodyTransform.b * state.width * 0.23 * direction + bodyTransform.f);
        ctx.stroke();
    }
    ctx.transform(transform.a, transform.b, transform.c, transform.d, bodyTransform.e, bodyTransform.f);
    drawBagMaterial(ctx, state);
    ctx.restore();
}
